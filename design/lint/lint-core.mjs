#!/usr/bin/env node
// lint-core.mjs — portable design-system linter
// Derives valid sets from tokens.json + components.json at runtime; no hard-coded values.
// Usage: node lint-core.mjs <html-file> [<contract-dir>]
// Exit 0 = clean (warnings only), Exit 1 = errors found, Exit 2 = usage error

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

const [,, htmlFile, contractDirArg] = process.argv;

if (!htmlFile) {
  console.error('Usage: node lint-core.mjs <html-file> [<contract-dir>]');
  process.exit(2);
}

const htmlPath = resolve(htmlFile);
const htmlDir = dirname(htmlPath);
const cwd = process.cwd();

// Resolve contract dir:
// 1) explicit CLI arg
// 2) same directory as the HTML file (fixture pattern)
// 3) design/ at CWD (production pattern)
function findContractDir() {
  if (contractDirArg) {
    const d = resolve(contractDirArg);
    if (existsSync(resolve(d, 'tokens.json')) && existsSync(resolve(d, 'components.json'))) return d;
    console.error(`Contract not found in provided dir: ${contractDirArg}`);
    process.exit(2);
  }
  if (existsSync(resolve(htmlDir, 'tokens.json')) && existsSync(resolve(htmlDir, 'components.json'))) {
    return htmlDir;
  }
  const designDir = resolve(cwd, 'design');
  if (existsSync(resolve(designDir, 'tokens.json')) && existsSync(resolve(designDir, 'components.json'))) {
    return designDir;
  }
  console.error(
    'Contract not found.\n' +
    '  Looked in: ' + htmlDir + '\n' +
    '  Looked in: ' + designDir + '\n' +
    '  Provide a contract dir as the second argument, or run from project root.'
  );
  process.exit(2);
}

const contractDir = findContractDir();
const tokens = JSON.parse(readFileSync(resolve(contractDir, 'tokens.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(resolve(contractDir, 'components.json'), 'utf8'));
const html = readFileSync(htmlPath, 'utf8');

// Build valid class sets from manifest — no hard-coded values
const components = manifest.components || {};
const validClasses = new Set();
const knownBases = new Set();

for (const comp of Object.values(components)) {
  validClasses.add(comp.base);
  knownBases.add(comp.base);
  for (const cls of Object.values(comp.elements || {})) validClasses.add(cls);
  for (const cls of Object.values(comp.modifiers || {})) validClasses.add(cls);
}

// Flatten token paths from tokens.json — no hard-coded paths
function flattenTokenPaths(obj, prefix) {
  const paths = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && '$value' in v) {
      paths.add(path);
    } else if (v && typeof v === 'object') {
      for (const p of flattenTokenPaths(v, path)) paths.add(p);
    }
  }
  return paths;
}

const tokenPaths = flattenTokenPaths(tokens, '');

// PATCH LOCAL (vs core amont) : le mapping inverse `-`→`.` est ambigu quand une clé
// de token contient un tiret (ex. `text-muted`). On construit à la place l'ensemble des
// noms de vars VALIDES dans le sens direct (chemin → `--a-b-c`), comme l'adapter, puis on
// compare le nom utilisé à cet ensemble. Round-trip déterministe.
const validVarNames = new Set([...tokenPaths].map((p) => '--' + p.replace(/\./g, '-')));

const errors = [];
const warnings = [];

// Rule 1: class vocabulary check (ERROR)
// Only flags classes whose block part is a known component base — skips utility classes.
for (const match of html.matchAll(/class\s*=\s*["']([^"']+)["']/g)) {
  for (const cls of match[1].trim().split(/\s+/)) {
    if (!cls) continue;
    const blockPart = cls.split('__')[0].split('--')[0];
    if (!knownBases.has(blockPart)) continue; // utility or unknown — not our scope
    if (!validClasses.has(cls)) {
      errors.push(`Unknown design-system class "${cls}" (block "${blockPart}" is declared but this element/modifier is not)`);
    }
  }
}

// Rule 2: CSS custom property reference check (ERROR)
// Catches var(--token-name) references to non-existent tokens.
for (const match of html.matchAll(/var\((--[\w-]+)\)/g)) {
  const varName = match[1];
  if (!validVarNames.has(varName)) {
    errors.push(`Unknown token reference var(${varName}) — no matching token in tokens.json`);
  }
}

// Report
const label = `[lint-core] ${htmlFile}`;
for (const w of warnings) console.warn(`  WARN  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);

if (errors.length) {
  console.error(`${label}: ${errors.length} error(s), ${warnings.length} warning(s) — FAIL`);
  process.exit(1);
} else {
  console.log(`${label}: ${warnings.length} warning(s) — OK`);
  process.exit(0);
}
