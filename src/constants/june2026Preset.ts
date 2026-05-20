import type { CCRCalendarState, DayOverride } from '../types/ccr.js';

const june2026Overrides: Record<string, DayOverride> = {
  '2026-06-01': { am: '동인', pm: '민혁' },
  '2026-06-02': { am: '민혁', pm: '선우' },
  '2026-06-03': { isOff: true, comment: '지방선거' },
  '2026-06-04': { am: '선우', pm: '찬우' },
  '2026-06-05': { am: '찬우', pm: '이진' },
  '2026-06-06': { isOff: true, isSaturdayOvertime: false, comment: '현충일' },
  '2026-06-08': { am: '이진', pm: '윤수' },
  '2026-06-09': { am: '윤수', pm: '성광' },
  '2026-06-10': { am: '성광', pm: '성운' },
  '2026-06-11': { am: '성운', pm: '승현' },
  '2026-06-12': { am: '승현', pm: '호빈' },
  '2026-06-13': { isOff: true, isSaturdayOvertime: false },
  '2026-06-15': { am: '호빈', pm: '광수' },
  '2026-06-16': { am: '광수', pm: '우용' },
  '2026-06-17': { am: '우용', pm: '영빈' },
  '2026-06-18': { am: '영빈', pm: '동인' },
  '2026-06-19': { am: '동인', pm: '민혁' },
  '2026-06-20': { isOff: true, isSaturdayOvertime: false },
  '2026-06-22': { am: '민혁', pm: '선우' },
  '2026-06-23': { am: '선우', pm: '찬우' },
  '2026-06-24': { am: '찬우', pm: '이진' },
  '2026-06-25': { am: '이진', pm: '윤수' },
  '2026-06-26': { am: '윤수', pm: '성광' },
  '2026-06-27': { isOff: true, isSaturdayOvertime: false },
  '2026-06-29': { am: '성광', pm: '성운' },
  '2026-06-30': { am: '성운', pm: '승현' },
};

export function applyJune2026PhotoPreset(state: CCRCalendarState): CCRCalendarState {
  return {
    ...state,
    selectedYear: 2026,
    selectedMonthIndex: 5,
    startWithNight: true,
    monthStartWithNight: {
      ...state.monthStartWithNight,
      '2026-06': true,
    },
    selectedCTeamKey: 'A',
    cTeams: {
      ...state.cTeams,
      A: {
        label: 'A팀',
        members: ['민성', '서용', '재령'],
      },
    },
    offDays: {
      ...state.offDays,
      '2026-06-03': true,
      '2026-06-06': true,
      '2026-06-13': true,
      '2026-06-20': true,
      '2026-06-27': true,
    },
    overrides: {
      ...state.overrides,
      ...june2026Overrides,
    },
    saturdayOvertime: {
      ...state.saturdayOvertime,
      '2026-06-06': false,
      '2026-06-13': false,
      '2026-06-20': false,
      '2026-06-27': false,
    },
    monthMemo: {
      ...state.monthMemo,
      '2026-06':
        '1직 평일 협정 : C팀 /\n1직 휴무 정취근무 협정 : B팀 /\n2직 평일 협정(C조 결원 시 순서변경) : C팀 /\n\n일요일 야간근무자 일요일 주간협정과 결원 시 다음팀과 주간변경(23.09.18 변경)',
    },
  };
}
