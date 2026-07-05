#!/usr/bin/env node
// run.mjs — design-system lint runner for this Astro project.
// Globs the design-system surfaces (src/**/*.astro + design/wireframes/*.html)
// and runs lint-core.mjs on each, aggregating exit codes.
// Usage: node design/lint/run.mjs [glob-root...]   (defaults to src + design/wireframes)
// Exit 0 = all clean, Exit 1 = at least one file has errors.

import { readdirSync, existsSync, statSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const linter = resolve(here, 'lint-core.mjs');

const TARGET_EXT = /\.(astro|html)$/;

function walk(dir, acc) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.astro' || name === 'pkg') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (TARGET_EXT.test(name)) acc.push(p);
  }
  return acc;
}

const roots = process.argv.slice(2).length
  ? process.argv.slice(2).map((r) => resolve(root, r))
  : [resolve(root, 'src'), resolve(root, 'design', 'wireframes')];

const files = roots.flatMap((r) => walk(r, []));

if (!files.length) {
  console.log('[lint:ds] no .astro/.html targets found — nothing to lint.');
  process.exit(0);
}

let failed = 0;
let errorFiles = 0;
for (const f of files) {
  const res = spawnSync('node', [linter, f, resolve(root, 'design')], {
    encoding: 'utf8',
  });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  if (res.status === 1) {
    failed = 1;
    errorFiles += 1;
  }
}

console.log(
  `\n[lint:ds] ${files.length} file(s) checked · ${errorFiles} with errors · gate ${failed ? 'RED' : 'GREEN'}`
);
process.exit(failed);
