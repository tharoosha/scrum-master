import ExcelJS from 'exceljs';
import type { ExpenseCategory, Role } from '@shared/types.js';
import type { Repository } from '../repository/index.js';
import { round2 } from '../calc/capacityEngine.js';
import { netWorkingDays } from '../calc/workingDays.js';
import type { IterationService } from './iterationService.js';
import type { TaskService } from './taskService.js';
import type { AllocationService } from './allocationService.js';

/**
 * ExcelExportService — produces a workbook that mirrors the two source spreadsheets:
 *   sheet "Iteration Planning"  -> the per-person capacity table (Iteration Planning Sheet)
 *   sheet "Time Allocation"     -> the task list + Dev/QA capacity header (Time Allocation Sheet)
 * Layout (column letters, header rows) matches the originals so it can be dropped in / compared.
 */
export class ExcelExportService {
  constructor(
    private readonly repo: Repository,
    private readonly iterations: IterationService,
    private readonly tasks: TaskService,
    private readonly allocation: AllocationService,
  ) {}

  async exportIteration(iterationId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Scrum Master';
    wb.created = new Date();

    const pools = this.buildIterationPlanningSheet(wb, iterationId);
    this.buildTimeAllocationSheet(wb, iterationId, pools);

    const arrayBuffer = await wb.xlsx.writeBuffer();
    const it = this.iterations.getIterationRecord(iterationId);
    return { buffer: Buffer.from(arrayBuffer), fileName: `iteration-${it.number}.xlsx` };
  }

  // -------------------------------------------------------------------------
  // Sheet 1 — Iteration Planning
  // -------------------------------------------------------------------------

  private buildIterationPlanningSheet(
    wb: ExcelJS.Workbook,
    iterationId: string,
  ): { devPool: number; qaPool: number } {
    const it = this.iterations.getIterationRecord(iterationId);
    const settings = this.repo.db.settings;
    const cap = this.iterations.computeCapacity(iterationId);
    const extras = this.iterations.extraAssignmentsOf(iterationId);

    const ws = wb.addWorksheet(`Iteration ${it.number}`);
    const set = (addr: string, value: unknown) => {
      ws.getCell(addr).value = value as ExcelJS.CellValue;
    };
    const bold = (addr: string) => {
      ws.getCell(addr).font = { bold: true };
    };

    const slHolidays = it.holidayDatesSL.length;
    const myHolidays = it.holidayDatesMY.length;

    // --- header block (rows 1-15) ---
    set('A1', `Iteration ${it.number}`);
    bold('A1');
    ws.mergeCells('A1:B1');
    set('A2', 'Iteration No');
    set('B2', it.number);
    set('A3', 'Starting Date');
    set('B3', it.startDate);
    set('A4', 'Ending Date');
    set('B4', it.endDate);
    set('A7', 'SL Holidays');
    set('B7', slHolidays);
    set('A8', 'SL Working Days');
    set('B8', netWorkingDays(it.startDate, it.endDate, it.holidayDatesSL));
    set('A10', 'Malaysia Holidays');
    set('B10', myHolidays);
    set('A11', 'Malaysia Working Days');
    set('B11', netWorkingDays(it.startDate, it.endDate, it.holidayDatesMY));

    set('H1', 'Leave Plan');
    set('I1', 'No of Days');
    set('J1', 'Dates');
    ['H1', 'I1', 'J1'].forEach(bold);

    const participants = this.orderedParticipants(iterationId);
    participants.forEach((p, i) => {
      const r = 2 + i;
      set(`H${r}`, p.name);
      set(`I${r}`, p.personalLeaveDays);
    });

    set('AB12', 'Remaining');
    set('AB13', 'DEV');
    set('AB15', 'QA');
    ['AB12', 'AB13', 'AB15'].forEach(bold);
    // AC13 / AC15 written after the per-person rows (sum of the displayed values)

    // --- group headers (row 16) ---
    const groups: [string, string][] = [
      ['O16', 'Discussions'],
      ['Q16', 'Dev Buffer'],
      ['S16', 'Buffer'],
      ['U16', 'Common QA'],
      ['W16', 'Common Automation'],
    ];
    for (const [addr, label] of groups) {
      set(addr, label);
      bold(addr);
      const col = addr.replace('16', '');
      ws.mergeCells(`${col}16:${this.nextCol(col)}16`);
    }

    // --- column headers (row 17) ---
    const headers: [string, string][] = [
      ['A17', 'Team Member'],
      ['C17', 'Working hours'],
      ['E17', 'Daily Scrum'],
      ['F17', 'Planning'],
      ['G17', 'Grooming'],
      ['H17', 'Retro'],
      ['I17', 'Demo'],
      ['J17', 'SM Activity'],
      ['K17', 'MAUI Review'],
      ['M17', 'Scrum ceremonies'],
      ['O17', 'Capex'],
      ['P17', 'Opex'],
      ['Q17', 'Capex'],
      ['R17', 'Opex'],
      ['S17', 'Capex'],
      ['T17', 'Opex'],
      ['U17', 'Capex'],
      ['V17', 'Opex'],
      ['W17', 'Capex'],
      ['X17', 'Opex'],
      ['Z17', 'Total'],
      ['AA17', 'Remaining'],
      ['AB17', '90% Capacity'],
      ['AC17', 'Additional Dev Buffer'],
    ];
    for (const [addr, label] of headers) {
      set(addr, label);
      bold(addr);
    }
    ws.mergeCells('A17:B17');

    // --- per-person rows (from row 18) ---
    const bc = settings.bufferConfig;
    const first = 18;
    let devPool = 0;
    let qaPool = 0;
    participants.forEach((p, i) => {
      const r = first + i;
      const b = cap.breakdowns.find((x) => x.participantId === p.id);
      if (!b) return;
      const gross = b.grossHours;
      const pe = extras.filter((e) => e.participantId === p.id);
      const sum = (kind: string) =>
        pe.filter((e) => e.kind === kind).reduce((s, e) => s + e.capexHours + e.opexHours, 0);
      const smActivity = sum('sm-activity');
      const mauiReview = sum('maui-review') + sum('custom');
      const commonAutoCapex = pe
        .filter((e) => e.kind === 'common-automation')
        .reduce((s, e) => s + e.capexHours, 0);
      const commonAutoOpex = pe
        .filter((e) => e.kind === 'common-automation')
        .reduce((s, e) => s + e.opexHours, 0);

      const dailyScrum = b.ceremonyExcluded
        ? 0
        : b.personWorkingDays * settings.ceremonies.dailyScrumPerWorkingDay;
      const c = settings.ceremonies;
      const planning = b.ceremonyExcluded ? 0 : c.planning;
      const grooming = b.ceremonyExcluded ? 0 : c.grooming;
      const retro = b.ceremonyExcluded ? 0 : c.retro;
      const demo = b.ceremonyExcluded ? 0 : c.demo;
      const ceremonyTotal =
        dailyScrum + planning + grooming + retro + demo + smActivity + mauiReview;

      const pct = (line: { capexPct: number; opexPct: number; appliesTo: Role[] }, which: 'capexPct' | 'opexPct') =>
        line.appliesTo.includes(p.role) ? round2((gross * line[which]) / 100) : 0;

      const mHeaders = round2(ceremonyTotal);
      const bufferCells = [
        pct(bc.discussion, 'capexPct'),
        pct(bc.discussion, 'opexPct'),
        pct(bc.devBuffer, 'capexPct'),
        pct(bc.devBuffer, 'opexPct'),
        pct(bc.buffer, 'capexPct'),
        pct(bc.buffer, 'opexPct'),
        pct(bc.commonQa, 'capexPct'),
        pct(bc.commonQa, 'opexPct'),
        round2(commonAutoCapex),
        round2(commonAutoOpex),
      ];
      // Total / Remaining are derived from the *displayed* cells so the sheet reconciles
      // internally (Z = M + all buffer columns; Remaining = Working hours − Z), exactly
      // like the source spreadsheet.
      const zTotal = round2(mHeaders + bufferCells.reduce((s, v) => s + v, 0));
      const remaining = round2(round2(gross) - zTotal);
      const capacityAdjusted = round2((remaining * b.capacityPercent) / 100);
      const additionalDevBuffer = b.additionalDevBuffer
        ? round2((capacityAdjusted * settings.additionalDevBufferPercent) / 100)
        : 0;

      const cells: [string, number][] = [
        [`C${r}`, round2(gross)],
        [`E${r}`, round2(dailyScrum)],
        [`F${r}`, planning],
        [`G${r}`, grooming],
        [`H${r}`, retro],
        [`I${r}`, demo],
        [`J${r}`, round2(smActivity)],
        [`K${r}`, round2(mauiReview)],
        [`M${r}`, mHeaders],
        [`O${r}`, bufferCells[0]!],
        [`P${r}`, bufferCells[1]!],
        [`Q${r}`, bufferCells[2]!],
        [`R${r}`, bufferCells[3]!],
        [`S${r}`, bufferCells[4]!],
        [`T${r}`, bufferCells[5]!],
        [`U${r}`, bufferCells[6]!],
        [`V${r}`, bufferCells[7]!],
        [`W${r}`, bufferCells[8]!],
        [`X${r}`, bufferCells[9]!],
        [`Z${r}`, zTotal],
        [`AA${r}`, remaining],
        [`AB${r}`, capacityAdjusted],
        [`AC${r}`, additionalDevBuffer],
      ];
      set(`A${r}`, p.name);
      for (const [addr, v] of cells) set(addr, v);

      const finalAvailable = b.additionalDevBuffer ? additionalDevBuffer : capacityAdjusted;
      if (p.role === 'Dev') devPool += finalAvailable;
      else qaPool += finalAvailable;
    });

    set('AC13', round2(devPool));
    set('AC15', round2(qaPool));
    // (values also returned so the Time Allocation sheet's Capacity row matches exactly)

    // --- totals row ---
    const lastPerson = first + participants.length - 1;
    const totalRow = lastPerson + 1;
    for (const col of ['C', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'M', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Z', 'AA', 'AB', 'AC']) {
      ws.getCell(`${col}${totalRow}`).value = {
        formula: `SUM(${col}${first}:${col}${lastPerson})`,
      } as ExcelJS.CellValue;
    }
    set(`A${totalRow + 2}`, 'Tot Available(h)');
    ws.getCell(`B${totalRow + 2}`).value = {
      formula: `SUM(C${first}:C${lastPerson})`,
    } as ExcelJS.CellValue;
    set(`A${totalRow + 3}`, 0.9);
    ws.getCell(`B${totalRow + 3}`).value = {
      formula: `B${totalRow + 2}*0.9`,
    } as ExcelJS.CellValue;

    this.autoWidth(ws);
    return { devPool: round2(devPool), qaPool: round2(qaPool) };
  }

  // -------------------------------------------------------------------------
  // Sheet 2 — Time Allocation
  // -------------------------------------------------------------------------

  private buildTimeAllocationSheet(
    wb: ExcelJS.Workbook,
    iterationId: string,
    pools: { devPool: number; qaPool: number },
  ): void {
    const it = this.iterations.getIterationRecord(iterationId);
    const tasks = this.tasks.listTasks(iterationId);

    const ws = wb.addWorksheet('Time Allocation');
    const set = (addr: string, value: unknown) => {
      ws.getCell(addr).value = value as ExcelJS.CellValue;
    };

    set('B2', 'Dev');
    set('C2', 'QA');
    ['B2', 'C2'].forEach((a) => (ws.getCell(a).font = { bold: true }));

    set('A4', 'Capacity');
    set('B4', pools.devPool);
    set('C4', pools.qaPool);
    // (mirrors the Iteration Planning sheet's DEV / QA totals — same figures)

    set('A9', 'Sprint Goal');

    set('A12', 'Task');
    set('B12', 'ID');
    set('C12', 'Dev');
    set('D12', 'QA');
    set('E12', 'Capex/Opex');
    ['A12', 'B12', 'C12', 'D12', 'E12'].forEach((a) => (ws.getCell(a).font = { bold: true }));

    let r = 13;
    for (const t of tasks) {
      set(`A${r}`, t.title);
      set(`B${r}`, t.externalId);
      set(`C${r}`, t.devEstimateH || null);
      set(`D${r}`, t.qaEstimateH || null);
      set(`E${r}`, (t.category as ExpenseCategory | null) ?? '');
      r += 1;
    }

    const devBufRow = r + 1;
    set(`A${devBufRow}`, 'Dev Buffer');
    set(`C${devBufRow}`, round2(it.devBufferHours));
    const qaBufRow = devBufRow + 1;
    set(`A${qaBufRow}`, 'QA buffer');
    set(`D${qaBufRow}`, round2(it.qaBufferHours));

    const totalRow = qaBufRow + 1;
    set(`A${totalRow}`, 'Total');
    ws.getCell(`C${totalRow}`).value = { formula: `SUM(C13:C${qaBufRow})` } as ExcelJS.CellValue;
    ws.getCell(`D${totalRow}`).value = { formula: `SUM(D13:D${qaBufRow})` } as ExcelJS.CellValue;

    // Remaining = Capacity − Total (mirrors the source's row 6)
    set('A6', 'Remaining');
    ws.getCell('B6').value = { formula: `B4-C${totalRow}` } as ExcelJS.CellValue;
    ws.getCell('C6').value = { formula: `C4-D${totalRow}` } as ExcelJS.CellValue;

    this.autoWidth(ws);
  }

  // -------------------------------------------------------------------------

  /** Dev participants first (as in the source sheet), then QA; each group by name. */
  private orderedParticipants(iterationId: string) {
    const rank: Record<Role, number> = { Dev: 0, QA: 1 };
    return this.iterations
      .participantsOf(iterationId)
      .filter((p) => p.included)
      .sort((a, b) => rank[a.role] - rank[b.role] || a.name.localeCompare(b.name));
  }

  private nextCol(col: string): string {
    // single-letter columns only (O,Q,S,U,W) -> next letter
    return String.fromCharCode(col.charCodeAt(0) + 1);
  }

  private autoWidth(ws: ExcelJS.Worksheet): void {
    ws.columns.forEach((col) => {
      let max = 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value ?? '').length;
        if (len > max) max = len;
      });
      col.width = Math.min(48, max + 2);
    });
  }
}
