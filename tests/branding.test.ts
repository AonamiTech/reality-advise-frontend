import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

test("Realty Adwise uses the logo for browser and installed-app icons", () => {
  assert.equal(existsSync(resolve(root, "public/ralogo.png")), true);
  assert.equal(existsSync(resolve(root, "app/icon.png")), true);
  assert.equal(existsSync(resolve(root, "app/apple-icon.png")), true);
  assert.equal(existsSync(resolve(root, "app/icon.tsx")), false);
  assert.equal(existsSync(resolve(root, "app/apple-icon.tsx")), false);

  const manifest = readFileSync(resolve(root, "app/manifest.ts"), "utf8");
  assert.match(manifest, /src:\s*"\/icon\.png"/);
  assert.match(manifest, /src:\s*"\/apple-icon\.png"/);

  const layout = readFileSync(resolve(root, "app/layout.tsx"), "utf8");
  assert.match(layout, /icons:\s*\{[\s\S]*icon:\s*"\/ralogo\.png"/);
});
