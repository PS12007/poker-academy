// Visits every page at phone width and reports any that scroll sideways. usage: node scripts/mobile-check.mjs [baseUrl]
import { chromium } from '@playwright/test';
const base = process.argv[2] ?? 'http://localhost:4173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const routes = new Set(['', '#/course', '#/tools', '#/drills', '#/review', '#/reference/glossary', '#/reference/cheatsheets', '#/reference/formulas', '#/reference/engine', '#/placement', '#/settings']);
for (const r of ['#/course', '#/tools', '#/drills']) {
  await page.goto(base + r);
  await page.waitForTimeout(700);
  for (const a of await page.locator('main a').all()) {
    const h = await a.getAttribute('href');
    if (h && /#\/(learn|tools|drills)\//.test(h)) routes.add(h.replace(/^.*?#/, '#'));
  }
}
let bad = 0;
for (const r of routes) {
  await page.goto(base + r);
  await page.waitForTimeout(900);
  const over = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= w + 1) return null;
    const culprits = [...document.querySelectorAll('main *')].filter((el) => el.getBoundingClientRect().right > w + 1 && getComputedStyle(el).position !== 'fixed');
    const deepest = culprits.filter((el) => !culprits.some((o) => o !== el && el.contains(o))).slice(0, 3);
    return { width: document.documentElement.scrollWidth, els: deepest.map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}`) };
  });
  if (over) {
    bad++;
    console.log('OVERFLOW', r || 'home', over.width, over.els.join(' | '));
  }
}
console.log(`checked ${routes.size} pages at 390px, ${bad} overflow`);
await browser.close();
