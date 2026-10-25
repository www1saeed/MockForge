import type { PatternResult } from './pattern-check.service';
import type { DataReason } from './preview-test-data';
import type { CopyKey } from './translations';

export const DATA_REASON_MESSAGES: Record<DataReason, CopyKey> = {
  applied: 'dataApplied',
  preserved: 'dataPreserved',
  unsupported: 'dataUnsupported',
  unavailable: 'dataUnavailable',
  mismatch: 'dataMismatch',
  protected: 'dataProtected',
  timeout: 'dataPatternTimeout',
  budget: 'dataPatternBudget',
  workerUnavailable: 'dataWorkerUnavailable',
  workerError: 'dataWorkerError',
  representation: 'dataRepresentation',
  cancelled: 'dataCancelled',
};

const PATTERN_FAILURE_REASONS: Record<Exclude<PatternResult['status'], 'checked'>, DataReason> = {
  timeout: 'timeout',
  budget: 'budget',
  unavailable: 'workerUnavailable',
  error: 'workerError',
  cancelled: 'cancelled',
};

/** Generation diagnostics and manual validation describe the same worker outcome. */
export function patternFailureReason(result?: PatternResult): DataReason {
  return !result || result.status === 'checked'
    ? 'unsupported'
    : PATTERN_FAILURE_REASONS[result.status];
}
