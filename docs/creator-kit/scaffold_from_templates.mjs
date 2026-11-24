#!/usr/bin/env node
// Creates a new project from CREATOR_TEMPLATES.md in one step: writes every templated file with the placeholders
// filled in, adds the matching pnpm lockfile, marks scripts executable and runs `git init`. Plain Node, no packages.
//
//   node scaffold_from_templates.mjs --name EmailManager_BA --out ~/Workshop/EmailManager_BA \
//     [--ports 5190,3701,5460,5461,4799] [--templates CREATOR_TEMPLATES.md] [--lockfile pnpm-lock.yaml]
//
// --name: letters, digits and underscores, starting with a letter (it becomes part of code identifiers).
// --templates / --lockfile: local files; when omitted they're downloaded from the public EmailManager repository.
// The output folder must not exist yet, or must be empty.

import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const RAW = 'https://raw.githubusercontent.com/howardpodeswa/EmailManager/main'

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .reduce((pairs, arg, i, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
)
const fail = (message) => {
  console.error(`scaffold: ${message}`)
  process.exit(1)
}

const name = args.name ?? fail('--name is required (e.g. --name EmailManager_BA)')
if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) fail('--name may contain only letters, digits and underscores')
const out = path.resolve((args.out ?? fail('--out is required')).replace(/^~(?=$|\/)/, homedir()))
if (existsSync(out) && readdirSync(out).filter((f) => f !== '.DS_Store').length > 0) {
  fail(`${out} already exists and isn't empty`)
}
const [webPort, apiPort, dbPort, dbTestPort, fixturePort] = (args.ports ?? '5190,3701,5460,5461,4799')
  .split(',')
  .map((p) => p.trim())
if (![webPort, apiPort, dbPort, dbTestPort, fixturePort].every((p) => /^\d{4,5}$/.test(p ?? ''))) {
  fail('--ports needs five port numbers: web,api,db,dbTest,fixture')
}

const slug = name.toLowerCase()
const values = {
  '{{Name}}': name,
  '{{slug}}': slug,
  '{{SLUG_UPPER}}': name.toUpperCase(),
  '{{nameCamel}}': name[0].toLowerCase() + name.slice(1),
  '{{WEB_PORT}}': webPort,
  '{{API_PORT}}': apiPort,
  '{{DB_PORT}}': dbPort,
  '{{DB_TEST_PORT}}': dbTestPort,
  '{{FIXTURE_PORT}}': fixturePort,
}
const fill = (text) => Object.entries(values).reduce((acc, [k, v]) => acc.split(k).join(v), text)

const load = async (localPath, remotePath) => {
  if (localPath) return readFileSync(localPath.replace(/^~(?=$|\/)/, homedir()), 'utf8')
  const response = await fetch(`${RAW}/${remotePath}`)
  if (!response.ok) fail(`couldn't download ${remotePath} (${response.status})`)
  return response.text()
}

const templates = await load(args.templates, 'docs/creator-kit/CREATOR_TEMPLATES.md')
const lockfile = await load(args.lockfile, 'pnpm-lock.yaml')

// Each file: a "### `path`" heading followed by a fenced block (``` or ````).
const files = []
const lines = templates.split('\n')
for (let i = 0; i < lines.length; i++) {
  const heading = /^### `(.+)`$/.exec(lines[i])
  if (!heading) continue
  let j = i + 1
  while (j < lines.length && lines[j].trim() === '') j++
  const fence = /^(`{3,})/.exec(lines[j] ?? '')
  if (!fence) continue
  const end = lines.findIndex((line, k) => k > j && line === fence[1])
  if (end < 0) fail(`unterminated block for ${heading[1]}`)
  files.push({ path: heading[1], content: lines.slice(j + 1, end).join('\n') + '\n' })
  i = end
}
if (files.length < 50) fail(`only found ${files.length} files in the templates; is this the right file?`)

mkdirSync(out, { recursive: true })
for (const file of files) {
  const target = path.join(out, fill(file.path))
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, fill(file.content))
  if (/\.(sh|command)$/.test(target)) chmodSync(target, 0o755)
}
writeFileSync(path.join(out, 'pnpm-lock.yaml'), lockfile.split('emailmanager').join(slug))

if (!existsSync(path.join(out, '.git'))) {
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: out })
}
console.log(`Created ${files.length} files in ${out}`)
console.log(`Name ${name}, slug ${slug}, ports web ${webPort}, api ${apiPort}, db ${dbPort}/${dbTestPort}`)
console.log('Next: pnpm install --frozen-lockfile, then generate the first migration (see CREATOR_TEMPLATES.md).')
