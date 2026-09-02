import type { ReportRow } from '../../shared/types.js';
import type { Repository } from '../repository/index.js';
import type { IterationService } from './iterationService.js';
import type { AllocationService } from './allocationService.js';

/** ReportService — cross-iteration planned-allocation report (US-20). */
export class ReportService {
  constructor(
    private readonly repo: Repository,
    private readonly iterations: IterationService,
    private readonly allocation: AllocationService,
  ) {}

  allocationReport(): ReportRow[] {
    return [...this.repo.db.iterations]
      .sort((a, b) => a.number - b.number)
      .map((it) => {
        const alloc = this.allocation.allocation(it.id);
        return {
          iterationId: it.id,
          number: it.number,
          startDate: it.startDate,
          endDate: it.endDate,
          devPoolCapacity: alloc.pools.dev.available,
          qaPoolCapacity: alloc.pools.qa.available,
          devPoolAllocated: alloc.pools.dev.allocated,
          qaPoolAllocated: alloc.pools.qa.allocated,
          overCount: alloc.people.filter((p) => p.status === 'Over').length,
          underCount: alloc.people.filter((p) => p.status === 'Under').length,
        };
      });
  }
}
