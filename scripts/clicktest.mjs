// Visits every nav tab and every lesson, tool and drill page, and reports any page that renders empty or logs errors.
// usage: node scripts/clicktest.mjs <baseUrl>
import { chromium } from '@playwright/test';

const base = process.argv[2] ?? 'http://localhost:4173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()}: ${r.url()}`));

const mainText = async () => (await page.locator('main').innerText()).trim().length;
let problems = 0;
const report = (what, len) => {
  if (len < 200 || errors.length) {
    problems++;
    console.log('PROBLEM', what, len, errors.join(' | '));
  }
};

await page.goto(base);
await page.waitForTimeout(1500);
for (const t of ['Course', 'Instruments', 'Drills', 'Review', 'Reference', 'Course', 'Drills']) {
  errors.length = 0;
  await page.locator('header nav[aria-label="Primary"] a', { hasText: t }).first().click();
  await page.waitForTimeout(900);
  report(`tab ${t}`, await mainText());
}

const hrefs = new Set();
for (const route of ['#/course', '#/tools', '#/drills', '#/reference/cheatsheets', '#/reference/formulas', '#/reference/engine', '#/placement', '#/settings']) {
  errors.length = 0;
  await page.goto(base + route);
  await page.waitForTimeout(1000);
  report(route, await mainText());
  for (const a of await page.locator('main a').all()) {
    const h = await a.getAttribute('href');
    if (h && /#\/(learn|tools|drills)\//.test(h)) hrefs.add(h);
  }
}
for (const h of hrefs) {
  errors.length = 0;
  await page.goto(base + h);
  await page.waitForTimeout(1100);
  report(h, await mainText());
}
console.log(`checked ${hrefs.size} pages plus tabs, ${problems} problems`);
await browser.close();
