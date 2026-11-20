import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const leadCard = readFileSync(resolve(process.cwd(), "components/leads/LeadCard.tsx"), "utf8");
const recentLeads = readFileSync(resolve(process.cwd(), "components/RecentLeadsTable.tsx"), "utf8");

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

test("mobile lead cards keep the customer name readable beside status", () => {
  assert.match(leadCard, /grid-cols-1[^"]*md:grid-cols-\[minmax\(0,1fr\)_9\.5rem_auto\]/);
  assert.match(leadCard, /className="min-w-0 flex-1 truncate/);
  assert.match(leadCard, /className="flex justify-end md:hidden"/);
});

test("recent lead rows give the mobile content cell available width", () => {
  assert.match(recentLeads, /<td className="min-w-0">/);
  assert.doesNotMatch(recentLeads, /<td className="max-w-0">/);
});
