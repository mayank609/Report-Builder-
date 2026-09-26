#!/usr/bin/env node
/**
 * Supply-chain guard: fails if any tracked source/config file hides code the
 * way the Aug 2026 postcss.config.mjs payload did — a very long line, a long
 * run of whitespace followed by more code, or well-known loader markers.
 * Runs in CI before install/build so an injected config can never execute.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const SOURCE_EXT = /\.(c|m)?(j|t)sx?$/;
const MAX_LINE = 1000;
const HIDDEN_AFTER_WHITESPACE = /\S[ \t]{40,}\S/;
const MARKERS = [
  /global\[['"]r['"]\]\s*=\s*require/,
  /global\[['"]m['"]\]\s*=\s*module/,
  /\b_0x[0-9a-f]{4,}\b/i,
  /createRequire\(import\.meta\.url\)/,
];
/** Files allowed to use createRequire legitimately (none today). */
const CREATE_REQUIRE_ALLOW = new Set([]);

const files = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter((f) => SOURCE_EXT.test(f) && !f.startsWith("node_modules/") && f !== "scripts/check-hidden-code.mjs");

const problems = [];
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    const where = `${file}:${i + 1}`;
    if (line.length > MAX_LINE) problems.push(`${where} line is ${line.length} chars (max ${MAX_LINE})`);
    if (HIDDEN_AFTER_WHITESPACE.test(line)) problems.push(`${where} code hidden after a long whitespace run`);
    MARKERS.forEach((marker, idx) => {
      if (idx === 3 && CREATE_REQUIRE_ALLOW.has(file)) return;
      if (marker.test(line)) problems.push(`${where} suspicious pattern ${marker}`);
    });
  });
}

if (problems.length) {
  console.error("Hidden/obfuscated code check FAILED:\n" + problems.map((p) => `  - ${p}`).join("\n"));
  process.exit(1);
}
console.log(`Hidden/obfuscated code check passed (${files.length} files).`);
