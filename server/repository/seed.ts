import { nanoid } from 'nanoid';
import type { TeamMember, Role, LocationGroup } from '../../shared/types.js';

interface SeedRow {
  name: string;
  role: Role;
  locationGroup: LocationGroup;
  capacityPercent?: number;
  additionalDevBuffer?: boolean;
  isScrumMaster?: boolean;
}

/**
 * Seed roster from the Balancer Iteration Planning Sheet.
 * Malaysia team = Arshad, Meng, Ameerah. Arshad: 70% capacity + Additional Dev Buffer.
 * Default Scrum Master = Vihidun (reassignable in the app).
 */
const SEED_ROWS: SeedRow[] = [
  { name: 'Arshad', role: 'Dev', locationGroup: 'MY', capacityPercent: 70, additionalDevBuffer: true },
  { name: 'Meng', role: 'Dev', locationGroup: 'MY' },
  { name: 'Ameerah', role: 'Dev', locationGroup: 'MY' },
  { name: 'Prasanna', role: 'Dev', locationGroup: 'SL' },
  { name: 'Tharindu', role: 'Dev', locationGroup: 'SL' },
  { name: 'Vihidun', role: 'Dev', locationGroup: 'SL', isScrumMaster: true },
  { name: 'Thilina', role: 'Dev', locationGroup: 'SL' },
  { name: 'Chamath', role: 'Dev', locationGroup: 'SL' },
  { name: 'Ishara', role: 'QA', locationGroup: 'SL' },
  { name: 'Sandun', role: 'QA', locationGroup: 'SL' },
  { name: 'Charitha', role: 'QA', locationGroup: 'SL' },
];

export function buildSeedMembers(defaultCapacityPercent: number): TeamMember[] {
  return SEED_ROWS.map((r) => ({
    id: nanoid(),
    name: r.name,
    role: r.role,
    locationGroup: r.locationGroup,
    capacityPercent: r.capacityPercent ?? defaultCapacityPercent,
    additionalDevBuffer: r.additionalDevBuffer ?? false,
    isScrumMaster: r.isScrumMaster ?? false,
    active: true,
  }));
}
