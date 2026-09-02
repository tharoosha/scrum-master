import type { Settings } from './types.js';

/**
 * Default calculation constants. Mirrors:
 *   aidlc-docs/construction/sprint-planner/functional-design/business-rules.md (BR-*)
 *
 * Buffer % of gross hours:
 *   Dev  = discussion(5+2.5) + devBuffer(3+1.5) + buffer(3+1.5)          = 11.0 capex + 5.5 opex = 16.5%
 *   QA   = discussion(5+2.5) + buffer(3+1.5) + commonQa(5+2.5)           = 13.0 capex + 6.5 opex = 19.5%
 */
export const DEFAULT_SETTINGS: Settings = {
  hoursPerDay: 7,
  defaultCapacityPercent: 90,
  defaultToleranceHours: 4,
  ceremonies: {
    dailyScrumPerWorkingDay: 0.25,
    planning: 1,
    grooming: 2,
    retro: 0.5,
    demo: 1.5,
  },
  smActivityHours: 20,
  defaultMauiReviewHours: 0,
  commonAutomation: { capexHours: 20, opexHours: 10 },
  bufferConfig: {
    discussion: { capexPct: 5.0, opexPct: 2.5, appliesTo: ['Dev', 'QA'] },
    devBuffer: { capexPct: 3.0, opexPct: 1.5, appliesTo: ['Dev'] },
    buffer: { capexPct: 3.0, opexPct: 1.5, appliesTo: ['Dev', 'QA'] },
    commonQa: { capexPct: 5.0, opexPct: 2.5, appliesTo: ['QA'] },
  },
  additionalDevBufferPercent: 50,
};

/** Fields of Settings the SM is allowed to change via the API. */
export const EDITABLE_SETTINGS_KEYS: readonly (keyof Settings)[] = [
  'defaultCapacityPercent',
  'defaultToleranceHours',
  'smActivityHours',
  'defaultMauiReviewHours',
  'commonAutomation',
  'bufferConfig',
  'additionalDevBufferPercent',
];

export const SERVER_PORT = Number(process.env.PORT ?? 4319);
