import { describe, it, expect, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';
import { makeInMemoryRepository } from '../repository/index.js';
import { RosterService } from './rosterService.js';
import { CalendarService } from './calendarService.js';
import { IterationService } from './iterationService.js';
import { TaskService } from './taskService.js';
import { AllocationService } from './allocationService.js';
import { ExcelExportService } from './excelExportService.js';

function wire() {
  const repo = makeInMemoryRepository();
  const roster = new RosterService(repo);
  const calendars = new CalendarService(repo);
  const iterations = new IterationService(repo, roster, calendars);
  const tasks = new TaskService(repo, iterations);
  const allocation = new AllocationService(repo, iterations, tasks);
  const excel = new ExcelExportService(repo, iterations, tasks, allocation);
  return { repo, roster, calendars, iterations, tasks, allocation, excel };
}

describe('ExcelExportService — matches the source spreadsheet layout', () => {
  let ctx: ReturnType<typeof wire>;
  let iterationId: string;

  beforeEach(async () => {
    ctx = wire();
    // Vihidun is the seeded Scrum Master
    const detail = ctx.iterations.createIteration({
      number: 205,
      startDate: '2026-08-17',
      endDate: '2026-09-04',
    });
    iterationId = detail.iteration.id;
    const dev = ctx.iterations.participantsOf(iterationId).find((p) => p.role === 'Dev')!;
    const qa = ctx.iterations.participantsOf(iterationId).find((p) => p.role === 'QA')!;
    const t = ctx.tasks.createTask(iterationId, {
      title: 'Recalculate Due Next',
      externalId: 'AB-12510',
      devEstimateH: 10,
      qaEstimateH: 7,
      category: 'Capex',
    });
    ctx.tasks.assignTask(t.id, { devParticipantId: dev.id, qaParticipantId: qa.id });
    ctx.iterations.updateIteration(iterationId, { devBufferHours: 30, qaBufferHours: 12 });
  });

  async function load() {
    const { buffer, fileName } = await ctx.excel.exportIteration(iterationId);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    return { wb, fileName };
  }

  it('has an "Iteration <n>" sheet and a "Time Allocation" sheet', async () => {
    const { wb, fileName } = await load();
    expect(fileName).toBe('iteration-205.xlsx');
    expect(wb.worksheets.map((w) => w.name)).toEqual(['Iteration 205', 'Time Allocation']);
  });

  it('Iteration Planning sheet: header block + column headers match the source', async () => {
    const { wb } = await load();
    const ws = wb.getWorksheet('Iteration 205')!;
    expect(ws.getCell('A1').value).toBe('Iteration 205');
    expect(ws.getCell('A2').value).toBe('Iteration No');
    expect(ws.getCell('B2').value).toBe(205);
    expect(ws.getCell('A8').value).toBe('SL Working Days');
    expect(ws.getCell('A11').value).toBe('Malaysia Working Days');
    expect(ws.getCell('H1').value).toBe('Leave Plan');
    expect(ws.getCell('AB13').value).toBe('DEV');
    expect(ws.getCell('AB15').value).toBe('QA');
    // row 17 column headers
    expect(ws.getCell('A17').value).toBe('Team Member');
    expect(ws.getCell('C17').value).toBe('Working hours');
    expect(ws.getCell('E17').value).toBe('Daily Scrum');
    expect(ws.getCell('J17').value).toBe('SM Activity');
    expect(ws.getCell('K17').value).toBe('MAUI Review');
    expect(ws.getCell('AA17').value).toBe('Remaining');
    expect(ws.getCell('AB17').value).toBe('90% Capacity');
    expect(ws.getCell('AC17').value).toBe('Additional Dev Buffer');
    // row 16 group headers
    expect(ws.getCell('O16').value).toBe('Discussions');
    expect(ws.getCell('W16').value).toBe('Common Automation');
  });

  it('Iteration Planning sheet: a person row reconciles (gross − total = remaining)', async () => {
    const { wb } = await load();
    const ws = wb.getWorksheet('Iteration 205')!;
    const arshadRow = [...Array(15)].map((_, i) => i + 18).find((rr) => ws.getCell(`A${rr}`).value === 'Arshad')!;
    expect(arshadRow).toBeGreaterThanOrEqual(18);
    const gross = ws.getCell(`C${arshadRow}`).value as number;
    const total = ws.getCell(`Z${arshadRow}`).value as number;
    const remaining = ws.getCell(`AA${arshadRow}`).value as number;
    expect(gross - total).toBeCloseTo(remaining, 6); // sheet reconciles: C − Z = Remaining
    // AB = Remaining × 70% (Arshad); AC = AB × 50% — both rounded to 2 dp in the sheet
    const ab = ws.getCell(`AB${arshadRow}`).value as number;
    const ac = ws.getCell(`AC${arshadRow}`).value as number;
    expect(ab).toBeCloseTo(remaining * 0.7, 1);
    expect(ac).toBeCloseTo(ab * 0.5, 1);
  });

  it('Time Allocation sheet: capacity header + task rows + buffers + total', async () => {
    const { wb } = await load();
    const ws = wb.getWorksheet('Time Allocation')!;
    expect(ws.getCell('B2').value).toBe('Dev');
    expect(ws.getCell('C2').value).toBe('QA');
    expect(ws.getCell('A4').value).toBe('Capacity');
    expect(typeof ws.getCell('B4').value).toBe('number');
    expect(ws.getCell('A12').value).toBe('Task');
    expect(ws.getCell('B12').value).toBe('ID');
    // first task row
    expect(ws.getCell('A13').value).toBe('Recalculate Due Next');
    expect(ws.getCell('B13').value).toBe('AB-12510');
    expect(ws.getCell('C13').value).toBe(10);
    expect(ws.getCell('D13').value).toBe(7);
    expect(ws.getCell('E13').value).toBe('Capex');
    // buffers on their own rows
    const devBuf = [...Array(20)].map((_, i) => i + 14).find((rr) => ws.getCell(`A${rr}`).value === 'Dev Buffer')!;
    expect(ws.getCell(`C${devBuf}`).value).toBe(30);
    expect(ws.getCell(`A${devBuf + 1}`).value).toBe('QA buffer');
    expect(ws.getCell(`D${devBuf + 1}`).value).toBe(12);
    expect(ws.getCell(`A${devBuf + 2}`).value).toBe('Total');
    // Total is a SUM formula
    expect((ws.getCell(`C${devBuf + 2}`).value as { formula?: string }).formula).toContain('SUM(C13');
  });
});
