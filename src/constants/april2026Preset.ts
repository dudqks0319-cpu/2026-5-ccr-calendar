import type { CCRCalendarState, DayOverride } from '../types/ccr.js';

const april2026Overrides: Record<string, DayOverride> = {
  '2026-04-01': { am: '성광', pm: '재령' },
  '2026-04-02': { am: '재령', pm: '호빈' },
  '2026-04-03': { am: '호빈', pm: '광수' },
  '2026-04-06': { am: '윤수', pm: '성광' },
  '2026-04-07': { am: '성광', pm: '승현' },
  '2026-04-08': { am: '승현', pm: '호빈' },
  '2026-04-09': { am: '호빈', pm: '광수' },
  '2026-04-10': { am: '광수', pm: '재령' },
  '2026-04-13': { am: '광수', pm: '민혁' },
  '2026-04-14': { am: '민혁', pm: '민성' },
  '2026-04-15': { am: '민성', pm: '영빈' },
  '2026-04-16': { am: '영빈', pm: '이진' },
  '2026-04-17': { am: '이진', pm: '동인' },
  '2026-04-20': { am: '재령', pm: '민성' },
  '2026-04-21': { am: '민성', pm: '서용' },
  '2026-04-22': { am: '서용', pm: '민혁' },
  '2026-04-23': { am: '민혁', pm: '동인' },
  '2026-04-24': { am: '동인', pm: '찬우' },
  '2026-04-27': { am: '동인', pm: '서용' },
  '2026-04-28': { am: '서용', pm: '승현' },
  '2026-04-29': { am: '승현', pm: '선우' },
  '2026-04-30': { am: '선우', pm: '찬우' },
};

export function applyApril2026PhotoPreset(state: CCRCalendarState): CCRCalendarState {
  return {
    ...state,
    monthStartWithNight: {
      ...state.monthStartWithNight,
      '2026-04': false,
    },
    monthCTeams: {
      ...state.monthCTeams,
      '2026-04': ['선우', '영빈', '우용'],
    },
    monthStartPointer: {
      ...state.monthStartPointer,
      '2026-04': 13,
    },
    overrides: {
      ...state.overrides,
      ...april2026Overrides,
    },
    monthMemo: {
      ...state.monthMemo,
      '2026-04':
        '1직 평일 협정 : C팀 /\n1직 휴무 정취근무 협정 : B팀 /\n2직 평일 협정(C조 결원 시 순서변경) : C팀 /\n\n일요일 야간근무자 일요일 주간협정과 결원 시 다음팀과 주간변경(23.09.18 변경)',
    },
  };
}
