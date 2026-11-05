import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import path from 'node:path';

const result = spawnSync(
  process.execPath,
  ['node_modules/@angular/cli/bin/ng.js', 'build', 'standalone-preview'],
  {
    stdio: 'inherit',
    windowsHide: true,
  },
);
if (result.status !== 0) process.exit(result.status ?? 1);
const directory = 'dist/standalone-preview/browser';
const index = await readFile(`${directory}/index.html`, 'utf8');
const scripts = [...index.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
const styles = [...index.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map((match) => match[1]);
if (
  !scripts.length ||
  !styles.length ||
  [...scripts, ...styles].some((file) => !/^[\w.-]+$/.test(file))
)
  throw new Error('Unexpected standalone build layout');
const bundled = await build({
  stdin: {
    contents: scripts.map((file) => `import './${file}';`).join('\n'),
    resolveDir: path.resolve(directory),
  },
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  legalComments: 'inline',
});
const style = (
  await Promise.all(styles.map((file) => readFile(`${directory}/${file}`, 'utf8')))
).join('\n');
if (
  /@import/i.test(style) ||
  [...style.matchAll(/url\(([^)]+)\)/gi)].some((match) => !/^['"]?data:/i.test(match[1].trim()))
)
  throw new Error('External preview stylesheet resource');
const runtime = {
  version: 1,
  script: bundled.outputFiles[0].text,
  style,
  worker: await readFile('src/assets/preview-pattern.worker.js', 'utf8'),
  licenses: `${await readFile('LICENSE', 'utf8')}\n${await readFile('dist/standalone-preview/3rdpartylicenses.txt', 'utf8')}`,
};
if (JSON.stringify(runtime).length > 3_000_000) throw new Error('Standalone runtime too large');
await mkdir('dist/standalone-package', { recursive: true });
await writeFile('dist/standalone-package/preview-runtime.json', JSON.stringify(runtime));
console.log(`Standalone runtime packaged: ${JSON.stringify(runtime).length} UTF-16 units`);
