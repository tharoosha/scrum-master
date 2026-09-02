import { nanoid } from 'nanoid';
import type { NewTeamMember, Role, TeamMember } from '../../shared/types.js';
import type { Repository } from '../repository/index.js';
import { NotFoundError, assert } from '../errors.js';

const ROLES: Role[] = ['Dev', 'QA'];

/** RosterService — master team list + Scrum Master designation. BR-R*. */
export class RosterService {
  constructor(private readonly repo: Repository) {}

  listMembers(opts: { activeOnly?: boolean } = {}): TeamMember[] {
    const all = [...this.repo.db.teamMembers].sort((a, b) => a.name.localeCompare(b.name));
    return opts.activeOnly ? all.filter((m) => m.active) : all;
  }

  getMember(id: string): TeamMember {
    const m = this.repo.db.teamMembers.find((x) => x.id === id);
    if (!m) throw new NotFoundError('Team member');
    return m;
  }

  createMember(input: NewTeamMember): TeamMember {
    this.validate(input);
    assert(
      !this.repo.db.teamMembers.some(
        (m) => m.active && m.name.toLowerCase() === input.name.trim().toLowerCase(),
      ),
      `An active member named "${input.name}" already exists`,
    );
    const member: TeamMember = {
      id: nanoid(),
      name: input.name.trim(),
      role: input.role,
      locationGroup: input.locationGroup,
      capacityPercent: input.capacityPercent ?? this.repo.db.settings.defaultCapacityPercent,
      additionalDevBuffer: input.additionalDevBuffer ?? false,
      isScrumMaster: false,
      active: true,
    };
    this.repo.db.teamMembers.push(member);
    if (input.isScrumMaster) this.setScrumMaster(member.id);
    void this.repo.save();
    return member;
  }

  updateMember(id: string, patch: Partial<TeamMember>): TeamMember {
    const m = this.getMember(id);
    const next = { ...m, ...patch, id: m.id };
    this.validate(next);
    if (patch.name && patch.name.trim().toLowerCase() !== m.name.toLowerCase()) {
      assert(
        !this.repo.db.teamMembers.some(
          (o) => o.id !== id && o.active && o.name.toLowerCase() === patch.name!.trim().toLowerCase(),
        ),
        `An active member named "${patch.name}" already exists`,
      );
      next.name = patch.name.trim();
    }
    Object.assign(m, next);
    if (patch.isScrumMaster === true) this.setScrumMaster(id);
    void this.repo.save();
    return m;
  }

  deactivateMember(id: string): TeamMember {
    const m = this.getMember(id);
    m.active = false;
    m.isScrumMaster = false;
    void this.repo.save();
    return m;
  }

  /** BR-R4: exactly one active member is Scrum Master. */
  setScrumMaster(id: string): TeamMember[] {
    const target = this.getMember(id);
    assert(target.active, 'Cannot make an inactive member the Scrum Master');
    for (const m of this.repo.db.teamMembers) m.isScrumMaster = m.id === id;
    void this.repo.save();
    return this.listMembers();
  }

  getScrumMaster(): TeamMember | null {
    return this.repo.db.teamMembers.find((m) => m.active && m.isScrumMaster) ?? null;
  }

  private validate(input: {
    name?: string;
    role?: Role;
    locationGroup?: string;
    capacityPercent?: number;
  }): void {
    assert(input.name && input.name.trim().length > 0, 'Name is required');
    assert(input.role && ROLES.includes(input.role), 'Role must be Dev or QA');
    assert(
      input.locationGroup === 'SL' || input.locationGroup === 'MY',
      'Location group must be SL or MY',
    );
    if (input.capacityPercent !== undefined) {
      assert(
        Number.isFinite(input.capacityPercent) &&
          input.capacityPercent >= 1 &&
          input.capacityPercent <= 100,
        'Capacity % must be between 1 and 100',
      );
    }
  }
}
