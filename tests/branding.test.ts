import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

test("Realty Adwise uses the logo for browser and installed-app icons", () => {
  assert.equal(existsSync(resolve(root, "public/ralogo.png")), true);
  assert.equal(existsSync(resolve(root, "public/ralogo-mark.png")), true);
  assert.equal(existsSync(resolve(root, "public/logo.png")), true);
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

test("in-app branding uses the visible square logo", () => {
  for (const file of ["components/shell/AppShell.tsx", "components/AuthLayout.tsx", "components/InstallPrompt.tsx"]) {
    const source = readFileSync(resolve(root, file), "utf8");
    assert.match(source, /\/ralogo-mark\.png/);
    assert.doesNotMatch(source, /\/ra\.png/);
  }

  const shell = readFileSync(resolve(root, "components/shell/AppShell.tsx"), "utf8");
  assert.match(shell, />Realty Adwise</);
  assert.match(shell, /src="\/logo\.png"/);
  assert.match(shell, /src="\/logo\.png" alt="" className="size-6/);
  assert.match(shell, /src="\/logo\.png" alt="" className="size-7/);
  assert.match(shell, /lg:w-64/);
  assert.match(shell, /lg:pl-64/);
});

test("admin-enabled managers get a compact mobile navigation", () => {
  const shell = readFileSync(resolve(root, "components/shell/AppShell.tsx"), "utf8");
  assert.match(shell, /const mobilePrimary = user\.role === "MANAGER" && canAccessAdmin \? NAV\.ADMIN\.filter/);
  assert.match(shell, /mobilePrimary\.map\(\(item\) =>/);
});

test("app shell includes the Aonami build credit", () => {
  const shell = readFileSync(resolve(root, "components/shell/AppShell.tsx"), "utf8");
  assert.match(shell, /Built by Aonami/);
  assert.match(shell, /text-xs font-semibold/);
  assert.match(shell, /aonami-credit/);
});

test("logout confirms once and prevents duplicate submissions", () => {
  const shell = readFileSync(resolve(root, "components/shell/AppShell.tsx"), "utf8");
  assert.match(shell, /window\.confirm\(/);
  assert.match(shell, /disabled=\{loggingOut\}/);
  assert.match(shell, /Logging out…/);
});
