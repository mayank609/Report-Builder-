#!/usr/bin/env node
/**
 * Verifies integration/contract.ts matches the checksum shared by both
 * modules (Finance-Module and Report-Builder-). Run with --write after an
 * intentional contract change, then copy both files to the sibling repo.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const source = readFileSync("integration/contract.ts");
const actual = createHash("sha256").update(source).digest("hex");

if (process.argv.includes("--write")) {
  writeFileSync("integration/contract.sha256", `${actual}\n`);
  console.log(`integration/contract.sha256 updated: ${actual}`);
  process.exit(0);
}

const expected = readFileSync("integration/contract.sha256", "utf8").trim();
if (actual !== expected) {
  console.error(
    `Integration contract drift: integration/contract.ts sha256 is ${actual}, expected ${expected}.\n` +
      "Keep the contract byte-identical in both modules and run `npm run contract:hash`.",
  );
  process.exit(1);
}
console.log("Integration contract checksum OK.");
