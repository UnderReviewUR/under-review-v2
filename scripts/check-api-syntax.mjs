/**
 * Syntax-check all api/*.js modules (catches duplicate ESM bindings before deploy).
 */
import { readdirSync } from "node:fs";
import { execSync } from "node:child_process";

const files = readdirSync("api")
  .filter((name) => name.endsWith(".js"))
  .sort();

for (const name of files) {
  const path = `api/${name}`;
  execSync(`node --check ${path}`, { stdio: "inherit" });
}

console.log(`check:api OK (${files.length} modules)`);
