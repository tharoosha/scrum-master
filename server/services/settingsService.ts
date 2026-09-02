import type { Settings } from '../../shared/types.js';
import type { Repository } from '../repository/index.js';
import { EDITABLE_SETTINGS_KEYS } from '../../shared/constants.js';
import { assert } from '../errors.js';

/** SettingsService — read the global settings, update the editable subset. */
export class SettingsService {
  constructor(private readonly repo: Repository) {}

  getSettings(): Settings {
    return this.repo.db.settings;
  }

  updateSettings(patch: Partial<Settings>): Settings {
    const current = this.repo.db.settings;
    for (const [key, value] of Object.entries(patch) as [keyof Settings, unknown][]) {
      assert(
        EDITABLE_SETTINGS_KEYS.includes(key),
        `Setting "${key}" is read-only`,
      );
      (current as unknown as Record<string, unknown>)[key] = value;
    }
    this.validate(current);
    void this.repo.save();
    return current;
  }

  private validate(s: Settings): void {
    assert(s.defaultCapacityPercent >= 1 && s.defaultCapacityPercent <= 100, 'defaultCapacityPercent 1..100');
    assert(s.defaultToleranceHours >= 0, 'defaultToleranceHours >= 0');
    assert(s.smActivityHours >= 0, 'smActivityHours >= 0');
    assert(s.defaultMauiReviewHours >= 0, 'defaultMauiReviewHours >= 0');
    assert(s.commonAutomation.capexHours >= 0 && s.commonAutomation.opexHours >= 0, 'commonAutomation hours >= 0');
    assert(
      s.additionalDevBufferPercent >= 0 && s.additionalDevBufferPercent <= 100,
      'additionalDevBufferPercent 0..100',
    );
  }
}
