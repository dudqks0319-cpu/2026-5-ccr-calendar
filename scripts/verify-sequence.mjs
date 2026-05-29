#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tscBin = join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');
const testFile = join(repoRoot, '.tmp', 'test-build', 'test', 'logic.test.js');
const sequencePattern = [
  '기본 순번',
  '전반/후반',
  '주간 자재담당자',
  '야간 C조 제외',
  '2026년 4월',
  '2026년 5월',
  '2026년 6월',
  '다음달 C조',
  '7월 첫 야간',
  '6월 기본 OFF',
].join('|');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('CCR 순번 검증 시작');
run(process.execPath, [tscBin, '-p', 'tsconfig.test.json']);
run(process.execPath, ['--test', '--test-name-pattern', sequencePattern, testFile]);
console.log('CCR 순번 검증 통과');
