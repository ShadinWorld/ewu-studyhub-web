#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import process from 'node:process';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
console.log('Installing Playwright test runner locally...');
const r = spawnSync(npm, ['install','-D','@playwright/test'], {stdio:'inherit', shell:false});
if (r.status !== 0) process.exit(r.status ?? 1);
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
console.log('Installing Chromium browser...');
const b = spawnSync(npx, ['playwright','install','chromium'], {stdio:'inherit', shell:false});
process.exit(b.status ?? 1);
