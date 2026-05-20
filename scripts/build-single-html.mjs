#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const distDir = join(repoRoot, 'dist');
const outFile = join(repoRoot, 'CCR캘린더_단일파일.html');

function escapeClosingScript(value) {
  return value.replaceAll('</script', '<\\/script');
}

function escapeClosingStyle(value) {
  return value.replaceAll('</style', '<\\/style');
}

function jsDataUrl(code) {
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}

function readAssetName(html, pattern, label) {
  const match = html.match(pattern);
  if (!match?.[1]) {
    throw new Error(`${label} 파일 경로를 찾지 못했습니다.`);
  }
  return match[1].replace(/^\.\//, '');
}

async function optionalRead(path) {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return '';
  }
}

const indexHtml = await readFile(join(distDir, 'index.html'), 'utf8');
const mainJsPath = readAssetName(indexHtml, /<script[^>]+src="([^"]+)"[^>]*><\/script>/, '메인 JS');
const cssPath = readAssetName(indexHtml, /<link[^>]+href="([^"]+)"[^>]*>/, 'CSS');

const mainJsName = mainJsPath.split('/').at(-1);
const css = await readFile(join(distDir, cssPath), 'utf8');
let mainJs = await readFile(join(distDir, mainJsPath), 'utf8');

const html2canvasName = mainJs.match(/import\("\.\/([^"]*html2canvas[^"]+\.js)"\)/)?.[1] || '';
const purifyName = mainJs.match(/import\("\.\/([^"]*purify[^"]+\.js)"\)/)?.[1] || '';
const canvgName = mainJs.match(/import\("\.\/([^"]*index\.es[^"]+\.js)"\)/)?.[1] || '';

if (html2canvasName) {
  const html2canvasCode = await readFile(join(distDir, 'assets', html2canvasName), 'utf8');
  mainJs = mainJs.replaceAll(
    `import("./${html2canvasName}")`,
    `import("${jsDataUrl(html2canvasCode)}")`,
  );
}

if (purifyName) {
  const purifyCode = await readFile(join(distDir, 'assets', purifyName), 'utf8');
  mainJs = mainJs.replaceAll(`import("./${purifyName}")`, `import("${jsDataUrl(purifyCode)}")`);
}

if (canvgName) {
  let canvgCode = await optionalRead(join(distDir, 'assets', canvgName));
  if (canvgCode) {
    const typeofHelper = `function _typeof(value){"@babel/helpers - typeof";return _typeof=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(input){return typeof input}:function(input){return input&&typeof Symbol=="function"&&input.constructor===Symbol&&input!==Symbol.prototype?"symbol":typeof input},_typeof(value)}export{_typeof as _};`;
    canvgCode = canvgCode.replaceAll(`from"./${mainJsName}"`, `from"${jsDataUrl(typeofHelper)}"`);
    mainJs = mainJs.replaceAll(`import("./${canvgName}")`, `import("${jsDataUrl(canvgCode)}")`);
  }
}

if (/import\("\.\//.test(mainJs) || /from"\.\//.test(mainJs) || /href="\.\//.test(mainJs)) {
  throw new Error('단일 HTML 안에 상대 asset 참조가 남아 있습니다.');
}

const standaloneHtml = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CCR 캘린더</title>
    <style>
${escapeClosingStyle(css)}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
${escapeClosingScript(mainJs)}
    </script>
  </body>
</html>
`;

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, standaloneHtml, 'utf8');
console.log(outFile);
