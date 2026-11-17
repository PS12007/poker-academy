// Accessibility scan of representative pages with axe. usage: node scripts/a11y.mjs [baseUrl]
import { chromium } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
const base = process.argv[2] ?? 'http://localhost:4173/';
const routes = ['', '#/course', '#/learn/m2/pot-odds', '#/tools/equity', '#/tools/range', '#/drills/outs', '#/reference/glossary', '#/review', '#/settings'];
const browser = await chromium.launch();
const seen = new Map();
for (const theme of ['dark', 'light']) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((t) => localStorage.setItem('poker-academy', JSON.stringify({ state: { settings: { theme: t, fourColor: false } }, version: 1 })), theme);
  const page = await ctx.newPage();
  for (const r of routes) {
    await page.goto(base + r);
    await page.waitForTimeout(1200);
    const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    for (const v of res.violations) {
      const key = `${theme} ${v.id}`;
      const prev = seen.get(key) ?? { impact: v.impact, help: v.help, count: 0, pages: new Set(), sample: v.nodes[0]?.target.join(' ') + ' :: ' + (v.nodes[0]?.failureSummary ?? '').split('\n').slice(0, 2).join(' ') };
      prev.count += v.nodes.length;
      prev.pages.add(r || 'home');
      seen.set(key, prev);
    }
  }
  await ctx.close();
}
for (const [k, v] of seen) console.log(`${k} [${v.impact}] x${v.count} on ${[...v.pages].join(', ')}\n   ${v.help}\n   e.g. ${v.sample.slice(0, 220)}`);
if (!seen.size) console.log('no violations');
await browser.close();
