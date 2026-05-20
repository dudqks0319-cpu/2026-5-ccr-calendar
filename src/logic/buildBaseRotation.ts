import type { CCRCalendarState } from '../types/ccr.js';

export function buildBaseRotation(dayTeams: CCRCalendarState['dayTeams']) {
  const conveyor = dayTeams.conveyor.members.filter(Boolean);
  const robot = dayTeams.robot.members.filter(Boolean);
  const main = dayTeams.main.members.filter(Boolean);
  const maxLength = Math.max(conveyor.length, robot.length, main.length);
  const result: string[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    if (conveyor[index]) result.push(conveyor[index]);
    if (robot[index]) result.push(robot[index]);
    if (main[index]) result.push(main[index]);
  }

  return result;
}
