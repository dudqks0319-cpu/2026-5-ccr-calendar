import { buildBaseRotation } from './buildBaseRotation.js';
import type { CCRCalendarState, MonthSchedule, WorkerStats } from '../types/ccr.js';

function splitNames(text: string) {
  return text
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

function ensureStats(stats: Map<string, WorkerStats>, workerName: string) {
  if (!workerName || workerName === 'OFF') return undefined;
  if (!stats.has(workerName)) {
    stats.set(workerName, {
      workerName,
      total: 0,
      am: 0,
      pm: 0,
      dayShift: 0,
      nightShift: 0,
      material: 0,
      cTeam: 0,
    });
  }
  return stats.get(workerName);
}

export function calculateWorkerStats(state: CCRCalendarState, schedule: MonthSchedule) {
  const stats = new Map<string, WorkerStats>();
  buildBaseRotation(state.dayTeams).forEach((workerName) => ensureStats(stats, workerName));

  Object.values(state.cTeams).forEach((team) => {
    team.members.forEach((workerName) => ensureStats(stats, workerName));
  });

  schedule.days.forEach((day) => {
    if (!day.isOff) {
      const amStats = ensureStats(stats, day.am);
      if (amStats) {
        amStats.total += 1;
        amStats.am += 1;
        if (day.isNight) amStats.nightShift += 1;
        else amStats.dayShift += 1;
      }

      const pmStats = ensureStats(stats, day.pm);
      if (pmStats) {
        pmStats.total += 1;
        pmStats.pm += 1;
        if (day.isNight) pmStats.nightShift += 1;
        else pmStats.dayShift += 1;
      }
    }

    const materialStats = ensureStats(stats, day.materialWorker);
    if (materialStats) materialStats.material += 1;

    splitNames(day.cTeamText).forEach((workerName) => {
      const cTeamStats = ensureStats(stats, workerName);
      if (cTeamStats) cTeamStats.cTeam += 1;
    });
  });

  return [...stats.values()].sort((a, b) => b.total - a.total || a.workerName.localeCompare(b.workerName, 'ko'));
}
