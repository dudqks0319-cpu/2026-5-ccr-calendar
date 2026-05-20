import assert from 'node:assert/strict';
import test from 'node:test';
import type { CCRCalendarState } from '../src/types/ccr.js';
import { DEFAULT_STATE } from '../src/constants/defaults.js';
import { buildBaseRotation } from '../src/logic/buildBaseRotation.js';
import {
  generateMonthSchedule,
  getMonthCTeamMembers,
  getTwoWeekTeamLabel,
  isNightWeek,
} from '../src/logic/generateMonthSchedule.js';
import { getSealerTeam } from '../src/logic/getSealerTeam.js';
import { mergeState } from '../src/logic/storage.js';

function stateWith(partial: Partial<CCRCalendarState>): CCRCalendarState {
  return {
    ...structuredClone(DEFAULT_STATE),
    monthCTeams: {},
    monthStartPointer: {},
    monthStartWithNight: {},
    saturdayDefaultOff: false,
    twoWeekTeamRotation: {
      ...DEFAULT_STATE.twoWeekTeamRotation,
      enabled: false,
    },
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
    monthCTeams: {},
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
    monthCTeams: {},
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
    monthCTeams: {},
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
    monthCTeams: {},
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

test('2026년 6월 프리셋은 5월 30일 후반 동인 다음 순번부터 이어지고 토요일 특근이 없다', () => {
  const state = mergeState({
    version: 2,
    selectedYear: 2026,
    selectedMonthIndex: 5,
  });
  const schedule = generateMonthSchedule(state, 2026, 5);

  const expectedAssignments: Record<string, [string, string]> = {
    '2026-06-01': ['동인', '민혁'],
    '2026-06-02': ['민혁', '선우'],
    '2026-06-04': ['선우', '찬우'],
    '2026-06-05': ['찬우', '이진'],
    '2026-06-08': ['이진', '윤수'],
    '2026-06-12': ['승현', '호빈'],
    '2026-06-15': ['호빈', '광수'],
    '2026-06-19': ['동인', '민혁'],
    '2026-06-22': ['민혁', '선우'],
    '2026-06-26': ['윤수', '성광'],
    '2026-06-29': ['성광', '성운'],
    '2026-06-30': ['성운', '승현'],
  };

  for (const [dateKey, assignment] of Object.entries(expectedAssignments)) {
    const day = schedule.days.find((item) => item.dateKey === dateKey);
    assert.deepEqual([day?.am, day?.pm], assignment);
  }

  for (const dateKey of ['2026-06-06', '2026-06-13', '2026-06-20', '2026-06-27']) {
    const day = schedule.days.find((item) => item.dateKey === dateKey);
    assert.equal(day?.isOff, true);
    assert.equal(day?.isSaturdayOvertime, false);
  }

  assert.equal(schedule.days.find((day) => day.dateKey === '2026-06-03')?.comment, '지방선거');
  assert.equal(schedule.days.find((day) => day.dateKey === '2026-06-06')?.comment, '현충일');
});

test('2026년 4월 사진 기준 C조, 토요일 OFF, 2주 팀 라벨, 날짜별 CCR 조합을 검증한다', () => {
  const state = mergeState({
    version: 2,
    selectedYear: 2026,
    selectedMonthIndex: 3,
  });
  const schedule = generateMonthSchedule(state, 2026, 3);

  assert.deepEqual(getMonthCTeamMembers(state, 2026, 3), ['선우', '영빈', '우용']);
  assert.equal(getTwoWeekTeamLabel('2026-04-06', state), '컨베어');
  assert.equal(getTwoWeekTeamLabel('2026-04-20', state), '로보트');
  assert.equal(schedule.days.find((day) => day.dateKey === '2026-04-04')?.isOff, true);
  assert.equal(schedule.days.find((day) => day.dateKey === '2026-04-06')?.weekTeamLabel, '컨베어');
  assert.equal(schedule.days.find((day) => day.dateKey === '2026-04-20')?.weekTeamLabel, '로보트');

  const expectedAssignments: Record<string, [string, string]> = {
    '2026-04-01': ['성광', '재령'],
    '2026-04-02': ['재령', '호빈'],
    '2026-04-03': ['호빈', '광수'],
    '2026-04-06': ['윤수', '성광'],
    '2026-04-07': ['성광', '승현'],
    '2026-04-08': ['승현', '호빈'],
    '2026-04-09': ['호빈', '광수'],
    '2026-04-10': ['광수', '재령'],
    '2026-04-13': ['광수', '민혁'],
    '2026-04-14': ['민혁', '민성'],
    '2026-04-15': ['민성', '영빈'],
    '2026-04-16': ['영빈', '이진'],
    '2026-04-17': ['이진', '동인'],
    '2026-04-20': ['재령', '민성'],
    '2026-04-21': ['민성', '서용'],
    '2026-04-22': ['서용', '민혁'],
    '2026-04-23': ['민혁', '동인'],
    '2026-04-24': ['동인', '찬우'],
    '2026-04-27': ['동인', '서용'],
    '2026-04-28': ['서용', '승현'],
    '2026-04-29': ['승현', '선우'],
    '2026-04-30': ['선우', '찬우'],
  };

  for (const [dateKey, assignment] of Object.entries(expectedAssignments)) {
    const day = schedule.days.find((item) => item.dateKey === dateKey);
    assert.deepEqual([day?.am, day?.pm], assignment);
  }
});

test('2026년 5월 사진 기준 월별 C조, 특근, 2주 팀 라벨, 날짜별 CCR 조합을 검증한다', () => {
  const state = mergeState({
    version: 2,
    selectedYear: 2026,
    selectedMonthIndex: 4,
  });
  const schedule = generateMonthSchedule(state, 2026, 4);

  assert.deepEqual(getMonthCTeamMembers(state, 2026, 4), ['민성', '서용', '재령']);
  assert.equal(schedule.days.find((day) => day.dateKey === '2026-05-04')?.weekTeamLabel, '주설비');
  assert.equal(schedule.days.find((day) => day.dateKey === '2026-05-18')?.weekTeamLabel, '컨베어');
  assert.equal(schedule.days.find((day) => day.dateKey === '2026-05-23')?.specialWorkLabel, '생산특근');
  assert.equal(schedule.days.find((day) => day.dateKey === '2026-05-30')?.specialWorkLabel, '생산특근');

  const expectedAssignments: Record<string, [string, string]> = {
    '2026-05-04': ['찬우', '이진'],
    '2026-05-06': ['이진', '윤수'],
    '2026-05-07': ['윤수', '성광'],
    '2026-05-08': ['성광', '성운'],
    '2026-05-11': ['찬우', '우용'],
    '2026-05-12': ['우용', '윤수'],
    '2026-05-13': ['윤수', '성광'],
    '2026-05-14': ['성광', '재령'],
    '2026-05-15': ['재령', '호빈'],
    '2026-05-18': ['성운', '호빈'],
    '2026-05-19': ['호빈', '광수'],
    '2026-05-20': ['광수', '승현'],
    '2026-05-21': ['승현', '동인'],
    '2026-05-22': ['동인', '영빈'],
    '2026-05-23': ['영빈', '우용'],
    '2026-05-25': ['호빈', '광수'],
    '2026-05-26': ['광수', '민혁'],
    '2026-05-27': ['민혁', '민성'],
    '2026-05-28': ['민성', '영빈'],
    '2026-05-29': ['영빈', '이진'],
    '2026-05-30': ['이진', '동인'],
  };

  for (const [dateKey, assignment] of Object.entries(expectedAssignments)) {
    const day = schedule.days.find((item) => item.dateKey === dateKey);
    assert.deepEqual([day?.am, day?.pm], assignment);
  }
});

test('저장값 병합은 기존 localStorage가 있어도 새 월별 프리셋 레코드를 보존한다', () => {
  const state = mergeState({
    version: 2,
    selectedYear: 2026,
    selectedMonthIndex: 4,
    offDays: {
      '2026-05-01': true,
    },
    overrides: {
      '2026-05-01': { isOff: true, comment: '노동절' },
    },
  });

  assert.equal(state.offDays['2026-06-13'], true);
  assert.equal(state.overrides['2026-06-15']?.am, '호빈');
  assert.equal(state.monthMemo['2026-06']?.includes('1직 평일 협정'), true);
  assert.deepEqual(
    mergeState({
      version: 2,
      cTeams: {
        A: { label: 'A팀', members: ['민성', '서용', '재령'] },
      } as CCRCalendarState['cTeams'],
    }).cTeams.A.departments,
    {
      conveyor: ['민성'],
      robot: ['서용'],
      main: ['재령'],
    },
  );
});
