// Génère les types TS depuis les types Rust du moteur (ts-rs) — le MOTEUR est la
// source de vérité du schéma de données. Les consommateurs importent ces types
// générés ; ils ne maintiennent plus de miroir à la main.
//
//   pnpm gen:types     # régénère src/scripts/narrative/generated/ + index.ts
//
// Sortie VERSIONNÉE (comme pkg/) : builder/déployer le site n'exige aucune toolchain
// Rust. Ne régénérer que quand les types Rust de frontière changent, puis committer.

import { execSync } from 'node:child_process'
import { readdirSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENGINE = resolve(ROOT, 'engine')
const OUT = resolve(ROOT, 'src/scripts/narrative/generated')

console.log(`\n=== Génération des types TS (ts-rs) → ${OUT} ===`)

// 1. Repart propre (un type renommé/supprimé côté Rust ne doit pas laisser d'orphelin).
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

// 2. ts-rs écrit un fichier par type quand les tests `export_bindings_*` tournent.
execSync('cargo test -p cn-core --features ts export_bindings', {
  cwd: ENGINE,
  stdio: 'inherit',
  env: { ...process.env, TS_RS_EXPORT_DIR: OUT },
})

// 3. Contrat de données runtime (« possibles », façon template.json Foundry) :
//    le moteur émet le JSON, on l'écrit à côté des types.
console.log('\n[contrat] émission de contract.json (possibles)…')
const contrat = execSync('cargo run -q -p cn-core --example emit_possibles', {
  cwd: ENGINE,
  encoding: 'utf8',
})
writeFileSync(resolve(OUT, 'contract.json'), contrat)

// 4. Barrel index.ts : un point d'import unique pour les consommateurs.
const fichiers = readdirSync(OUT)
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
  .map((f) => f.replace(/\.ts$/, ''))
  .sort()

const banniere =
  '// Barrel généré par scripts/gen-types.mjs — NE PAS éditer à la main.\n' +
  '// Types réexportés depuis les types Rust du moteur (source de vérité).\n\n'
const corps = fichiers.map((nom) => `export type { ${nom} } from './${nom}';`).join('\n')
writeFileSync(resolve(OUT, 'index.ts'), banniere + corps + '\n')

console.log(`\n[types] ${fichiers.length} types + contract.json + index.ts ✓`)

