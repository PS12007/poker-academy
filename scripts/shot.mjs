// Dev helper: screenshots of routes for visual review.
// usage: node scripts/shot.mjs <outDir> <route[@mobile][@light][@full]> ...
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const [outDir, ...routes] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const base = process.env.BASE ?? 'http://localhost:4173';
const browser = await chromium.launch();
for (const spec of routes) {
  const [route, ...flags] = spec.split('@');
  const mobile = flags.includes('mobile');
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: mobile ? 2 : 1,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  if (flags.includes('light')) {
    await page.addInitScript(() => localStorage.setItem('poker-academy', JSON.stringify({ state: { settings: { theme: 'light', fourColor: true } }, version: 1 })));
  }
  await page.goto(`${base}/#${route === 'home' ? '/' : '/' + route}`);
  await page.waitForTimeout(1800);
  const click = flags.find((f) => f.startsWith('click='));
  if (click) {
    await page.getByRole('button', { name: click.slice(6) }).first().click();
    await page.waitForTimeout(2500);
  }
  const name = (route.replace(/\//g, '_') || '_home') + (flags.length ? '-' + flags.join('-').replace(/[^a-z0-9-]/gi, '') : '');
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: flags.includes('full') });
  console.log(name, errors.length ? `ERRORS: ${errors.join(' | ')}` : 'ok');
  await ctx.close();
}
await browser.close();
