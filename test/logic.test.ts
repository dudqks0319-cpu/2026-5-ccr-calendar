import assert from 'node:assert/strict';
import test from 'node:test';
import type { CCRCalendarState } from '../src/types/ccr.js';
import { DEFAULT_STATE } from '../src/constants/defaults.js';
import { buildBaseRotation } from '../src/logic/buildBaseRotation.js';
import { generateMonthSchedule, isNightWeek } from '../src/logic/generateMonthSchedule.js';
import { getSealerTeam } from '../src/logic/getSealerTeam.js';

function stateWith(partial: Partial<CCRCalendarState>): CCRCalendarState {
  return {
    ...structuredClone(DEFAULT_STATE),
    ...partial,
  };
}

test('기본 순번 생성은 팀별 같은 인덱스를 교차 배치한다', () => {
  assert.deepEqual(buildBaseRotation(DEFAULT_STATE.dayTeams), [
    '호빈',
    '광수',
    '우용',
    '민성',
    '영빈',
    '재령',
    '동인',
    '서용',
    '민혁',
    '선우',
    '찬우',
    '이진',
    '윤수',
    '성광',
    '성운',
    '승현',
  ]);
});

test('전반/후반은 기존 CCR 방식처럼 하루 1칸만 이동한다', () => {
  const state = stateWith({
    selectedYear: 2026,
    selectedMonthIndex: 5,
    dayTeams: {
      conveyor: { label: '컨베어', members: ['호빈', '민성'] },
      robot: { label: '로보트', members: ['광수'] },
      main: { label: '주설비', members: ['우용'] },
    },
    cTeamExcludeMode: 'none',
  });
  const schedule = generateMonthSchedule(state, 2026, 5);
  const workDays = schedule.days.filter((day) => !day.isOff).slice(0, 4);
  assert.deepEqual(
    workDays.map((day) => [day.am, day.pm]),
    [
      ['호빈', '광수'],
      ['광수', '우용'],
      ['우용', '민성'],
      ['민성', '호빈'],
    ],
  );
});

test('일요일 OFF는 순번 카운트를 증가시키지 않는다', () => {
  const state = stateWith({
    selectedYear: 2026,
    selectedMonthIndex: 4,
    cTeamExcludeMode: 'none',
  });
  const schedule = generateMonthSchedule(state, 2026, 4);
  const sunday = schedule.days.find((day) => day.dateKey === '2026-05-03');
  const monday = schedule.days.find((day) => day.dateKey === '2026-05-04');
  assert.equal(sunday?.isOff, true);
  assert.equal(sunday?.am, 'OFF');
  assert.equal(sunday?.pm, 'OFF');
  assert.equal(monday?.am, '우용');
  assert.equal(monday?.pm, '민성');
});

test('수동 휴무일은 OFF 처리되고 다음 근무일 순번은 이어진다', () => {
  const state = stateWith({
    selectedYear: 2026,
    selectedMonthIndex: 4,
    cTeamExcludeMode: 'none',
    offDays: {
      '2026-05-06': true,
    },
  });
  const schedule = generateMonthSchedule(state, 2026, 4);
  const tuesday = schedule.days.find((day) => day.dateKey === '2026-05-05');
  const wednesday = schedule.days.find((day) => day.dateKey === '2026-05-06');
  const thursday = schedule.days.find((day) => day.dateKey === '2026-05-07');
  assert.deepEqual([tuesday?.am, tuesday?.pm], ['민성', '영빈']);
  assert.deepEqual([wednesday?.am, wednesday?.pm], ['OFF', 'OFF']);
  assert.deepEqual([thursday?.am, thursday?.pm], ['영빈', '재령']);
});

test('C조는 야간 주차에만 표시하고 일요일 야간도 조기가동 이름 목록을 유지한다', () => {
  const state = stateWith({
    selectedYear: 2026,
    selectedMonthIndex: 4,
    startWithNight: true,
  });
  const schedule = generateMonthSchedule(state, 2026, 4);
  const friday = schedule.days.find((day) => day.dateKey === '2026-05-01');
  const sunday = schedule.days.find((day) => day.dateKey === '2026-05-10');
  const nextWeekMonday = schedule.days.find((day) => day.dateKey === '2026-05-04');
  assert.equal(friday?.isNight, true);
  assert.equal(friday?.cTeamText, '민성, 광수, 이진');
  assert.equal(sunday?.isNight, true);
  assert.equal(sunday?.cTeamText, '민성, 광수, 이진');
  assert.equal(nextWeekMonday?.isNight, false);
  assert.equal(nextWeekMonday?.cTeamText, '');
});

test('날짜별 C조 직접 수정은 해당 날짜만 우선한다', () => {
  const state = stateWith({
    selectedYear: 2026,
    selectedMonthIndex: 4,
    startWithNight: true,
    overrides: {
      '2026-05-01': {
        cTeamText: '호빈, 우용, 성광',
      },
    },
  });
  const schedule = generateMonthSchedule(state, 2026, 4);
  assert.equal(schedule.days[0]?.cTeamText, '호빈, 우용, 성광');
  assert.equal(schedule.days[1]?.cTeamText, '민성, 광수, 이진');
});

test('주간 자재담당자는 전반/후반 후보에서 제외하되 순번 흐름은 유지한다', () => {
  const state = stateWith({
    selectedYear: 2026,
    selectedMonthIndex: 5,
    startWithNight: false,
    cTeamExcludeMode: 'none',
    dayTeams: {
      conveyor: { label: '컨베어', members: ['호빈', '민성'] },
      robot: { label: '로보트', members: ['광수'] },
      main: { label: '주설비', members: ['우용'] },
    },
    materialRule: {
      ...DEFAULT_STATE.materialRule,
      fixedWorkerName: '광수',
    },
  });
  const schedule = generateMonthSchedule(state, 2026, 5);
  const firstWorkDay = schedule.days.find((day) => !day.isOff);
  const secondWorkDay = schedule.days.filter((day) => !day.isOff)[1];
  assert.deepEqual([firstWorkDay?.am, firstWorkDay?.pm], ['호빈', '우용']);
  assert.deepEqual([secondWorkDay?.am, secondWorkDay?.pm], ['우용', '민성']);
});

test('야간에는 자재담당자 제외가 적용되지 않는다', () => {
  const state = stateWith({
    selectedYear: 2026,
    selectedMonthIndex: 4,
    startWithNight: true,
    cTeamExcludeMode: 'none',
    materialRule: {
      ...DEFAULT_STATE.materialRule,
      fixedWorkerName: '광수',
    },
  });
  const schedule = generateMonthSchedule(state, 2026, 4);
  assert.deepEqual([schedule.days[0]?.am, schedule.days[0]?.pm], ['호빈', '광수']);
});

test('야간 C조 제외 기본값은 선택 C조 멤버를 자동 배정에서 제외한다', () => {
  const state = stateWith({
    selectedYear: 2026,
    selectedMonthIndex: 4,
    startWithNight: true,
    cTeamExcludeMode: 'nightOnly',
  });
  const schedule = generateMonthSchedule(state, 2026, 4);
  assert.deepEqual([schedule.days[0]?.am, schedule.days[0]?.pm], ['호빈', '우용']);
});

test('내판실러 안착불량 14일 로테이션을 계산한다', () => {
  const rotation = DEFAULT_STATE.sealerRotation;
  assert.equal(getSealerTeam('2025-01-05', rotation), '컨베어팀');
  assert.equal(getSealerTeam('2025-01-19', rotation), '로보트팀');
  assert.equal(getSealerTeam('2025-02-02', rotation), '주설비팀');
  assert.equal(getSealerTeam('2025-02-16', rotation), '컨베어팀');
  assert.equal(getSealerTeam('2025-01-04', rotation), '');
});

test('주간/야간 주차는 첫 주 시작 설정에 따라 반전된다', () => {
  assert.equal(isNightWeek(1, 5, false), false);
  assert.equal(isNightWeek(4, 5, false), true);
  assert.equal(isNightWeek(1, 5, true), true);
  assert.equal(isNightWeek(4, 5, true), false);
});
