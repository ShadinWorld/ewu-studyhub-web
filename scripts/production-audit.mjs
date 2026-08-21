import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "package.json",
  "package-lock.json",
  "supabase/migrations/0031_transparency_activity_events.sql",
  ".ai/00_AI_START_HERE.md",
  ".ai/EWU-STUDYHUB-ULTIMATE-MASTER-CONTEXT.md",
  ".ai/EWU-STUDYHUB-MASTER-DETAILED.md",
  ".ai/EWU-STUDYHUB-WBS.md",
  ".ai/EWU-STUDYHUB-HANDOFF.md",
  ".ai/EWU-STUDYHUB-CHANGELOG.md",
];

let failed = 0;
const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

for (const file of required) {
  if (!exists(file)) {
    console.error(`MISSING: ${file}`);
    failed++;
  }
}

const nextConfig = read("next.config.js");
for (const header of ["X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options", "Permissions-Policy"]) {
  if (!nextConfig.includes(header)) {
    console.error(`MISSING SECURITY HEADER: ${header}`);
    failed++;
  }
}

const downloadRoute = read("src/app/api/files/[id]/download/route.ts");
const viewRoute = read("src/app/api/files/[id]/view/route.ts");
const purchaseAction = read("src/app/checkout/[fileId]/actions.ts");
for (const [label, text, needles] of [
  ["download ownership gate", downloadRoute, ["isOwner", "pricing_type === \"paid\" && !isOwner"]],
  ["view ownership gate", viewRoute, ["isOwner", "pricing_type === \"paid\" && !isOwner"]],
  ["self purchase guard", purchaseAction, ["file.seller_id === user.id", "cannot purchase your own resource"]],
]) {
  for (const needle of needles) {
    if (!text.includes(needle)) {
      console.error(`MISSING ${label}: ${needle}`);
      failed++;
    }
  }
}

const docs = read(".ai/EWU-STUDYHUB-HANDOFF.md");
for (const marker of ["Update 0048", "Previous numbered handoffs", "6-hour"]) {
  if (!docs.toLowerCase().includes(marker.toLowerCase())) {
    console.error(`MISSING HANDOFF MARKER: ${marker}`);
    failed++;
  }
}

const gitignore = read(".gitignore");
if (!gitignore.split(/\r?\n/).includes(".ai/")) {
  console.error("MISSING .gitignore rule: .ai/");
  failed++;
}

if (exists("src/app/tools/grade-calculator") || exists("src/app/tools/prerequisite-checker")) {
  console.error("REMOVED TOOL ROUTES STILL PRESENT");
  failed++;
}

console.log(`Production audit: ${failed ? "FAIL" : "PASS"}`);
if (failed) process.exit(1);
