import { useEffect, useState } from 'react';
import type { ReportRow } from '@shared/types.js';
import { api } from '../api/client.js';
import { n2 } from '../ui/kit.js';

export function ReportScreen() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  useEffect(() => {
    void api.getReport().then(setRows);
  }, []);

  return (
    <div>
      <h2>Cross-iteration report</h2>
      <p className="muted">Planned figures. Actual-hours tracking is not part of this release.</p>
      <div className="panel">
        <table data-testid="report-table">
          <thead>
            <tr>
              <th>Iteration</th>
              <th className="num">Dev pool cap.</th>
              <th className="num">QA pool cap.</th>
              <th className="num">Dev allocated</th>
              <th className="num">QA allocated</th>
              <th className="num"># Over</th>
              <th className="num"># Under</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.iterationId} data-testid={`report-row-${r.number}`}>
                <td>{r.number}</td>
                <td className="num">{n2(r.devPoolCapacity)}</td>
                <td className="num">{n2(r.qaPoolCapacity)}</td>
                <td className="num">{n2(r.devPoolAllocated)}</td>
                <td className="num">{n2(r.qaPoolAllocated)}</td>
                <td className="num">{r.overCount}</td>
                <td className="num">{r.underCount}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No iterations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
