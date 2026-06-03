// Étape « moteur » du pipeline de build/déploiement.
//
// Le moteur narratif (engine/) est un crate Rust compilé en WASM. Avant de
// builder le site, on tente : (1) les tests du crate (garde-fou), (2) le glue
// WASM (`pkg/`) que l'island importera.
//
//   pnpm build:engine        # tests + build wasm
//   SKIP_ENGINE=1 pnpm …      # saute tout (ex. machine sans toolchain Rust)
//   ENGINE_TESTS_ONLY=1 …     # tests seuls, sans wasm-pack
//   ENGINE_STRICT=1 …         # bloque le déploiement si le moteur casse
//
// TOLÉRANT PAR DÉFAUT : tant que l'island n'est pas câblée, tout problème
// (toolchain absente, test/build en échec) n'est qu'un AVERTISSEMENT et laisse
// le déploiement du site continuer. Poser ENGINE_STRICT=1 pour en faire un gate.
//
// Branché AVANT `astro build` dans `deploy:prod` : le `.wasm` doit exister pour
// que Vite le bundle dans dist/.

import { execSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ENGINE = resolve(ROOT, 'engine')
// Où l'island importera le glue : sous src/, donc résolu par Vite/Astro.
const PKG_OUT = resolve(ROOT, 'src/scripts/narrative/pkg')

const log = (msg) => console.log(msg)
const time = (label) => {
  const start = Date.now()
  return () => log(`  ${label} : ${((Date.now() - start) / 1000).toFixed(1)}s`)
}

const has = (cmd) => {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })

const STRICT = process.env.ENGINE_STRICT === '1'

// En mode strict : échoue (gate). Sinon : avertit et laisse passer le déploiement.
const fail = (msg) => {
  if (STRICT) {
    console.error(`\n✗ ${msg}\n`)
    process.exit(1)
  }
  console.warn(`\n⚠ ${msg}\n  → toléré (ENGINE_STRICT=1 pour bloquer) ; le déploiement continue.\n`)
  process.exit(0)
}

// --- 0. Échappatoire (machine sans Rust, ou build site seul) ------------------
if (process.env.SKIP_ENGINE === '1') {
  log('\n[moteur] SKIP_ENGINE=1 → étape moteur ignorée.')
  process.exit(0)
}

log(`\n=== Build moteur (engine/)${STRICT ? ' [strict]' : ' [tolérant]'} ===`)

if (!existsSync(ENGINE)) {
  fail(`Dossier engine/ introuvable à ${ENGINE}.`)
}

// --- 1. Toolchain Rust --------------------------------------------------------
if (!has('cargo')) {
  fail(
    'cargo introuvable. Installer Rust (https://rustup.rs), ' +
      'ou poser SKIP_ENGINE=1 pour déployer le site sans rebuild du moteur.',
  )
}

// --- 2. Tests du crate (garde-fou avant tout artefact) ------------------------
log('\n[moteur] cargo test (garde-fou)…')
const doneTests = time('Tests')
try {
  run('cargo test', { cwd: ENGINE })
} catch {
  fail('cargo test a échoué.')
}
doneTests()

if (process.env.ENGINE_TESTS_ONLY === '1') {
  log('\n[moteur] ENGINE_TESTS_ONLY=1 → pas de build wasm. Terminé ✓')
  process.exit(0)
}

// --- 3. Cible wasm32 (auto-ajout si rustup dispo) -----------------------------
let hasWasmTarget = false
try {
  hasWasmTarget = execSync('rustup target list --installed', { encoding: 'utf8' })
    .includes('wasm32-unknown-unknown')
} catch {
  // pas de rustup : on suppose la cible présente, wasm-pack le confirmera.
  hasWasmTarget = true
}
if (!hasWasmTarget) {
  log('\n[moteur] ajout de la cible wasm32-unknown-unknown…')
  run('rustup target add wasm32-unknown-unknown')
}

// --- 4-5. Build du glue WASM dans src/…/pkg ----------------------------------
// wasm-pack si présent (fait aussi wasm-opt) ; sinon repli wasm-bindgen-cli
// (n'utilise que crates.io, sans téléchargement GitHub). Sans aucun des deux,
// on garde le pkg/ committé tel quel (toléré).
const doneWasm = time('Build wasm')
try {
  if (has('wasm-pack')) {
    log(`\n[moteur] wasm-pack build → ${PKG_OUT}`)
    run(
      `wasm-pack build wasm --release --target web --out-dir "${PKG_OUT}" --out-name cn_engine`,
      { cwd: ENGINE },
    )
  } else if (has('wasm-bindgen')) {
    log(`\n[moteur] wasm-pack absent → repli wasm-bindgen-cli → ${PKG_OUT}`)
    run('cargo build -p cn-wasm --target wasm32-unknown-unknown --release', { cwd: ENGINE })
    run(
      `wasm-bindgen target/wasm32-unknown-unknown/release/cn_wasm.wasm ` +
        `--out-dir "${PKG_OUT}" --target web --out-name cn_engine`,
      { cwd: ENGINE },
    )
  } else {
    fail(
      'Ni wasm-pack ni wasm-bindgen-cli. Installer l\'un des deux ' +
        '(`cargo install wasm-pack` ou `cargo install wasm-bindgen-cli`). ' +
        'Le pkg/ committé (s\'il existe) sera utilisé tel quel.',
    )
  }
} catch {
  fail('Build wasm échoué — le pkg/ committé (s\'il existe) sera utilisé tel quel.')
}
doneWasm()

// --- 6. Récap ----------------------------------------------------------------
const size = () => {
  let total = 0
  for (const f of readdirSync(PKG_OUT, { recursive: true })) {
    try {
      total += statSync(resolve(PKG_OUT, f)).size
    } catch {}
  }
  return `${(total / 1024).toFixed(0)}K`
}
log(`\n[moteur] pkg/ produit (${size()}) ✓`)
