import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const required = ["package.json","package-lock.json","src","supabase/migrations",".ai/00_AI_START_HERE.md",".ai/EWU-STUDYHUB-ULTIMATE-MASTER-CONTEXT.md",".ai/EWU-STUDYHUB-MASTER-DETAILED.md",".ai/EWU-STUDYHUB-WBS.md",".ai/EWU-STUDYHUB-HANDOFF.md",".ai/EWU-STUDYHUB-CHANGELOG.md"];
const missing = required.filter(x => !fs.existsSync(path.join(root,x)));
const forbiddenRoutes = ["src/app/tools/grade-calculator","src/app/tools/prerequisite-checker"].filter(x => fs.existsSync(path.join(root,x)));
const oldHandoffs = fs.readdirSync(root).filter(x => /^EWU-StudyHub-Handoff-Update-\d+\.md$/.test(x));
const gitignore = fs.existsSync(path.join(root,".gitignore")) ? fs.readFileSync(path.join(root,".gitignore"),"utf8") : "";
const lines = [];
for (const file of walk(path.join(root,"src"))) { if (/\.(ts|tsx)$/.test(file)) lines.push(fs.readFileSync(file,"utf8")); }
const anyCount = lines.join("\n").match(/\bas any\b/g)?.length ?? 0;
const migrations = fs.readdirSync(path.join(root,"supabase/migrations")).filter(f => /^\d{4}_.*\.sql$/.test(f));
const seen = new Map();
for (const f of migrations) { const n=f.slice(0,4); seen.set(n,[...(seen.get(n)||[]),f]); }
const duplicateMigrations=[...seen.entries()].filter(([,arr])=>arr.length>1);
if(missing.length) console.error("Missing:",missing.join(", "));
if(!gitignore.split(/\r?\n/).includes(".ai/")) console.error(".ai/ is not ignored by Git");
if(forbiddenRoutes.length) console.error("Removed routes still present:",forbiddenRoutes.join(", "));
if(oldHandoffs.length) console.error("Old numbered handoffs still at project root:",oldHandoffs.join(", "));
if(duplicateMigrations.length) console.warn("Historical duplicate migration numbers:", JSON.stringify(Object.fromEntries(duplicateMigrations)));
console.log(`Project verification: ${missing.length || forbiddenRoutes.length || oldHandoffs.length ? "FAIL" : "PASS"}`);
console.log(`Remaining 'as any' count: ${anyCount}`);
console.log(`Migrations: ${migrations.length}`);
function walk(dir){ if(!fs.existsSync(dir)) return []; const out=[]; for(const e of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,e.name); if(e.isDirectory()) out.push(...walk(p)); else out.push(p); } return out; }
