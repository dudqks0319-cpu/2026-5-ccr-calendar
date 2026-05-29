import type { CCRCalendarState, DayOverride } from '../types/ccr.js';

const june2026Overrides: Record<string, DayOverride> = {
  '2026-06-01': { presetAm: '동인', presetPm: '민혁' },
  '2026-06-02': { presetAm: '민혁', presetPm: '선우' },
  '2026-06-03': { isOff: true, holidayName: '지방선거' },
  '2026-06-04': { presetAm: '선우', presetPm: '찬우' },
  '2026-06-05': { presetAm: '찬우', presetPm: '이진' },
  '2026-06-06': { isOff: true, isSaturdayOvertime: false, holidayName: '현충일' },
  '2026-06-08': { presetAm: '이진', presetPm: '윤수' },
  '2026-06-09': { presetAm: '윤수', presetPm: '성광' },
  '2026-06-10': { presetAm: '성광', presetPm: '성운' },
  '2026-06-11': { presetAm: '성운', presetPm: '승현' },
  '2026-06-12': { presetAm: '승현', presetPm: '호빈' },
  '2026-06-13': { isOff: true, isSaturdayOvertime: false },
  '2026-06-15': { presetAm: '호빈', presetPm: '광수' },
  '2026-06-16': { presetAm: '광수', presetPm: '우용' },
  '2026-06-17': { presetAm: '우용', presetPm: '영빈' },
  '2026-06-18': { presetAm: '영빈', presetPm: '동인' },
  '2026-06-19': { presetAm: '동인', presetPm: '민혁' },
  '2026-06-20': { isOff: true, isSaturdayOvertime: false },
  '2026-06-22': { presetAm: '민혁', presetPm: '선우' },
  '2026-06-23': { presetAm: '선우', presetPm: '찬우' },
  '2026-06-24': { presetAm: '찬우', presetPm: '이진' },
  '2026-06-25': { presetAm: '이진', presetPm: '윤수' },
  '2026-06-26': { presetAm: '윤수', presetPm: '성광' },
  '2026-06-27': { isOff: true, isSaturdayOvertime: false },
  '2026-06-29': { presetAm: '성광', presetPm: '성운' },
  '2026-06-30': { presetAm: '성운', presetPm: '승현' },
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
    monthCTeamKeys: {
      ...state.monthCTeamKeys,
      '2026-06': 'A',
    },
    monthCTeams: {
      ...state.monthCTeams,
      '2026-06': ['민성', '서용', '재령'],
    },
    monthStartPointer: {
      ...state.monthStartPointer,
      '2026-06': 6,
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
