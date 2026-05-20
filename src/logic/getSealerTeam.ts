import type { SealerRotation } from '../types/ccr.js';
import { diffLocalDays } from '../utils/date.js';

export function getSealerTeam(dateKey: string, sealerRotation: SealerRotation) {
  if (!sealerRotation.enabled) return '';
  if (!sealerRotation.startDate) return '';
  if (sealerRotation.teams.length === 0) return '';
  if (sealerRotation.intervalDays <= 0) return '';

  const diffDays = diffLocalDays(dateKey, sealerRotation.startDate);
  if (diffDays < 0) return '';

  const cycleIndex =
    Math.floor(diffDays / sealerRotation.intervalDays) % sealerRotation.teams.length;
  return sealerRotation.teams[cycleIndex] || '';
}
