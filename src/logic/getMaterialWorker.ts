import type { CCRCalendarState } from '../types/ccr.js';
import { diffLocalDays, toDateKey } from '../utils/date.js';

export function getMaterialWorker(dateKey: string, state: CCRCalendarState) {
  const rule = state.materialRule;
  if (!rule.enabled) return '';

  if (rule.mode === 'fixed') {
    return rule.fixedWorkerName || '';
  }

  if (rule.mode === 'date') {
    return rule.dateWorkers[dateKey] || '';
  }

  const order = rule.rotationOrder.filter(Boolean);
  if (order.length === 0) return '';

  const monthStartKey = toDateKey(state.selectedYear, state.selectedMonthIndex, 1);
  const diffDays = diffLocalDays(dateKey, monthStartKey);
  if (diffDays < 0) return '';

  return order[diffDays % order.length] || '';
}
