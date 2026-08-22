#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import process from 'node:process';

const root = process.cwd();
const isWin = process.platform === 'win32';
const npx = isWin ? 'npx.cmd' : 'npx';
const npm = isWin ? 'npm.cmd' : 'npm';

const results = [];
function pass(name, detail='') { results.push({name, ok:true, detail}); console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`); }
function warn(name, detail='') { results.push({name, ok:true, warn:true, detail}); console.log(`⚠️ ${name}${detail ? ` — ${detail}` : ''}`); }
function fail(name, detail='') { results.push({name, ok:false, detail}); console.log(`❌ ${name}${detail ? ` — ${detail}` : ''}`); }
function run(name, command, args) {
  const cmd = [command, ...args].map(a => /\s/.test(a) ? `"${a.replaceAll('"','\\"')}"` : a).join(' ');
  try {
    const out = execSync(cmd, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWin ? 'cmd.exe' : true,
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
    });
    const text = String(out || '').trim();
    if (text) console.log(`\n--- ${name} output ---\n${text}\n--- end ${name} output ---\n`);
    pass(name, 'passed');
    return true;
  } catch (e) {
    const stdout = String(e.stdout || '').trim();
    const stderr = String(e.stderr || '').trim();
    const out = [stdout, stderr].filter(Boolean).join('\n').trim();
    if (out) console.log(`\n--- ${name} output ---\n${out}\n--- end ${name} output ---\n`);
    const status = typeof e.status === 'number' ? `exit code ${e.status}` : `failed to start: ${e.message}`;
    fail(name, `${status}${out ? '; see output above' : ''}`);
    return false;
  }
}

console.log('\nEWU StudyHub Automated QA\n');

run('TypeScript', npx, ['tsc','--noEmit']);
run('Project verification', npm, ['run','verify']);
run('Production audit', npm, ['run','production-audit']);
run('Production build', npm, ['run','build']);

// Dependency audit is informational; always show the actual severity counts when available.
try {
  let raw = '';
  let auditStatus = 0;
  try {
    raw = execSync(`${npm} audit --json`, {cwd:root, encoding:'utf8', stdio:['ignore','pipe','pipe'], shell:isWin ? 'cmd.exe' : true, windowsHide:true, maxBuffer:20*1024*1024});
  } catch (e) {
    auditStatus = typeof e.status === 'number' ? e.status : 1;
    raw = String(e.stdout || e.stderr || '').trim();
  }
  raw = String(raw || '').trim();
  if (!raw) {
    warn('Dependency audit', `npm audit returned exit code ${auditStatus} with no JSON output`);
  } else {
    try {
      const data = JSON.parse(raw);
      const v = data?.metadata?.vulnerabilities ?? {};
      const total = Object.values(v).reduce((a,n)=>a + Number(n||0), 0);
      const parts = ['critical','high','moderate','low','info']
        .filter(k => Number(v[k] || 0) > 0)
        .map(k => `${k}=${v[k]}`);
      if (total > 0) warn('Dependency audit', `${total} known vulnerability findings${parts.length ? ` (${parts.join(', ')})` : ''}`);
      else pass('Dependency audit', 'no known findings');
    } catch (e) {
      warn('Dependency audit', `unable to parse npm audit JSON: ${e.message}`);
    }
  }
} catch (e) { warn('Dependency audit', `unable to run npm audit: ${e.message}`); }

// Static consistency checks.
const aiFiles = [
  '.ai/00_AI_START_HERE.md',
  '.ai/EWU-STUDYHUB-ULTIMATE-MASTER-CONTEXT.md',
  '.ai/EWU-STUDYHUB-MASTER-DETAILED.md',
  '.ai/EWU-STUDYHUB-WBS.md',
  '.ai/EWU-STUDYHUB-HANDOFF.md',
  '.ai/EWU-STUDYHUB-CHANGELOG.md',
];
const missing = aiFiles.filter(f=>!fs.existsSync(path.join(root,f)));
if (missing.length) fail('AI documentation', `missing: ${missing.join(', ')}`); else pass('AI documentation');

const migrationsDir = path.join(root,'supabase','migrations');
if (fs.existsSync(migrationsDir)) {
  const groups = new Map();
  for (const file of fs.readdirSync(migrationsDir)) {
    const m = file.match(/^(\d+)_/);
    if (!m) continue;
    const key = m[1];
    groups.set(key,[...(groups.get(key)||[]),file]);
  }
  const dupes = [...groups.entries()].filter(([,v])=>v.length>1);
  if (dupes.length) warn('Migration numbering', dupes.map(([k,v])=>`${k}: ${v.join(', ')}`).join(' | '));
  else pass('Migration numbering');
}

// Static scan for suspicious production-only leaks.
const leakHits = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    if (['node_modules','.next','.git'].includes(entry.name)) continue;
    const full = path.join(dir,entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      const s = fs.readFileSync(full,'utf8');
      if (/SUPABASE_SERVICE_ROLE_KEY\s*=\s*['\"]/.test(s)) leakHits.push(full);
    }
  }
}
walk(path.join(root,'src'));
if (leakHits.length) fail('Service-role key scan', leakHits.join(', ')); else pass('Service-role key scan');

// Optional live URL smoke tests. Requires QA_BASE_URL.
const base = process.env.QA_BASE_URL?.replace(/\/$/,'');
const publicRoutes = ['/', '/courses', '/departments', '/search', '/login'];
if (base) {
  console.log(`\nLive smoke target: ${base}\n`);
  for (const route of publicRoutes) {
    try {
      const res = await fetch(base+route, {redirect:'manual'});
      if (res.status >= 500) fail(`Live ${route}`, `HTTP ${res.status}`);
      else pass(`Live ${route}`, `HTTP ${res.status}`);
    } catch (e) { fail(`Live ${route}`, e.message); }
  }
} else {
  warn('Live smoke tests', 'skipped; set QA_BASE_URL=https://your-domain');
}

// Optional Playwright E2E layer. It only runs when the package is already installed.
const playwrightBin = path.join(root,'node_modules','.bin',isWin?'playwright.cmd':'playwright');
if (fs.existsSync(playwrightBin)) {
  const r = spawnSync(playwrightBin, ['test'], {cwd:root, stdio:'inherit', shell:false});
  if (r.status === 0) pass('Playwright E2E'); else fail('Playwright E2E', `exit code ${r.status ?? 'unknown'}`);
} else {
  warn('Playwright E2E', 'skipped; run npm run qa:install-browser-tests once to enable browser automation');
}

const failed = results.filter(r=>!r.ok);
const warnings = results.filter(r=>r.warn);
console.log('\n================ QA SUMMARY ================');
console.log(`PASS: ${results.length - failed.length - warnings.length}`);
console.log(`WARN: ${warnings.length}`);
console.log(`FAIL: ${failed.length}`);
console.log('=============================================\n');

process.exitCode = failed.length ? 1 : 0;
