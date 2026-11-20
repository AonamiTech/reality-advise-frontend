import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

test("admin table wrappers contain wide tables on narrow viewports", () => {
  const tableWrap = css.match(/\.table-wrap\s*\{([^}]+)\}/)?.[1] ?? "";

  assert.match(tableWrap, /min-width:\s*0/);
  assert.match(tableWrap, /max-width:\s*100%/);
  assert.match(tableWrap, /overflow-x:\s*auto/);
  assert.match(tableWrap, /-webkit-overflow-scrolling:\s*touch/);
});

test("dashboard lead tables do not clip their content", () => {
  assert.doesNotMatch(css, /\.recent-leads-wrap\s*\{[^}]*overflow-x:\s*hidden/);
});
