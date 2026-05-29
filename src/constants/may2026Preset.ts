import type { CCRCalendarState, DayOverride } from '../types/ccr.js';

const may2026Overrides: Record<string, DayOverride> = {
  '2026-05-01': { isOff: true, holidayName: '노동절' },
  '2026-05-02': { isOff: true },
  '2026-05-03': { isOff: true },
  '2026-05-04': { am: '찬우', pm: '이진' },
  '2026-05-05': { isOff: true, holidayName: '어린이날' },
  '2026-05-06': { am: '이진', pm: '윤수' },
  '2026-05-07': { am: '윤수', pm: '성광' },
  '2026-05-08': { am: '성광', pm: '성운' },
  '2026-05-09': { isOff: true },
  '2026-05-11': { am: '찬우', pm: '우용' },
  '2026-05-12': { am: '우용', pm: '윤수' },
  '2026-05-13': { am: '윤수', pm: '성광' },
  '2026-05-14': { am: '성광', pm: '재령' },
  '2026-05-15': { am: '재령', pm: '호빈' },
  '2026-05-16': { isOff: true },
  '2026-05-18': { am: '성운', pm: '호빈' },
  '2026-05-19': { am: '호빈', pm: '광수' },
  '2026-05-20': { am: '광수', pm: '승현' },
  '2026-05-21': { am: '승현', pm: '동인' },
  '2026-05-22': { am: '동인', pm: '영빈' },
  '2026-05-23': { am: '영빈', pm: '우용', isSaturdayOvertime: true, specialWorkLabel: '생산특근' },
  '2026-05-24': { isOff: true, holidayName: '석가탄신일' },
  '2026-05-25': { am: '호빈', pm: '광수' },
  '2026-05-26': { am: '광수', pm: '민혁' },
  '2026-05-27': { am: '민혁', pm: '민성' },
  '2026-05-28': { am: '민성', pm: '영빈' },
  '2026-05-29': { am: '영빈', pm: '이진' },
  '2026-05-30': { am: '이진', pm: '동인', isSaturdayOvertime: true, specialWorkLabel: '생산특근' },
};

export function applyMay2026PhotoPreset(state: CCRCalendarState): CCRCalendarState {
  return {
    ...state,
    selectedYear: 2026,
    selectedMonthIndex: 4,
    startWithNight: false,
    monthStartWithNight: {
      ...state.monthStartWithNight,
      '2026-05': false,
    },
    monthCTeamKeys: {
      ...state.monthCTeamKeys,
      '2026-05': 'A',
    },
    monthCTeams: {
      ...state.monthCTeams,
      '2026-05': ['민성', '서용', '재령'],
    },
    monthStartPointer: {
      ...state.monthStartPointer,
      '2026-05': 10,
    },
    selectedCTeamKey: 'A',
    cTeams: {
      ...state.cTeams,
      A: {
        label: 'A팀',
        members: ['민성', '서용', '재령'],
        departments: {
          conveyor: ['민성'],
          robot: ['서용'],
          main: ['재령'],
        },
      },
    },
    offDays: {
      ...state.offDays,
      '2026-05-01': true,
      '2026-05-02': true,
      '2026-05-03': true,
      '2026-05-05': true,
      '2026-05-09': true,
      '2026-05-16': true,
      '2026-05-24': true,
    },
    overrides: {
      ...state.overrides,
      ...may2026Overrides,
    },
    saturdayOvertime: {
      ...state.saturdayOvertime,
      '2026-05-23': true,
      '2026-05-30': true,
    },
    monthMemo: {
      ...state.monthMemo,
      '2026-05':
        '1직 평일 협정 : C팀 /\n1직 휴무 정취근무 협정 : B팀 /\n2직 평일 협정(C조 결원 시 순서변경) : C팀 /\n\n일요일 야간근무자 일요일 주간협정과 결원 시 다음팀과 주간변경(23.09.18 변경)',
    },
  };
}
