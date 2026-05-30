import { execSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'

const time = (label) => {
  const start = Date.now()
  return () => console.log(`  ${label} : ${((Date.now() - start) / 1000).toFixed(1)}s`)
}

const dirSize = (dir) => {
  let total = 0
  for (const f of readdirSync(dir, { recursive: true })) {
    try { total += statSync(`${dir}/${f}`).size } catch {}
  }
  return total < 1024 * 1024 ? `${(total / 1024).toFixed(0)}K` : `${(total / 1024 / 1024).toFixed(1)}M`
}

const sshKey = `${homedir()}/.ssh/cabpart_ci`
const remote = 'jdrspace@ssh-jdrspace.alwaysdata.net'
const remotePath = '/home/jdrspace/www/choixnarratifs'

console.log(`\nTransfert dist/ vers Alwaysdata... (${dirSize('dist')})`)
const doneTransfer = time('Transfert')
execSync(
  `tar czf - -C dist . | ssh -i ${sshKey} -o IdentitiesOnly=yes ${remote} "rm -rf ${remotePath} && mkdir -p ${remotePath} && tar xzf - -C ${remotePath} && chmod -R 755 ${remotePath}"`,
  { stdio: 'inherit' }
)
doneTransfer()

console.log('\nDeployed successfully ✓')
