import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
import type { ComponentType } from 'react';
import { LESSON_FILES } from '../../src/content/curriculum';
import { MDX_COMPONENTS } from '../../src/components/lesson/prose';

const render = async (path: string) => {
  const mod = (await LESSON_FILES[path]()) as { default: ComponentType };
  const C = mod.default;
  return renderToString(<MemoryRouter><MDXProvider components={MDX_COMPONENTS}><C /></MDXProvider></MemoryRouter>);
};

describe('automatic glossary links', () => {
  it('links terms in lesson prose, once each', async () => {
    const html = await render('./m1/positions.mdx');
    const links = [...html.matchAll(/border-dotted border-brass[^>]*>([^<]+)</g)].map((m) => m[1].toLowerCase());
    expect(links.length).toBeGreaterThan(5);
    expect(new Set(links).size).toBe(links.length);
  });
  it('never links inside headings', async () => {
    const html = await render('./m7/wraps.mdx');
    const headings = html.match(/<h2[^>]*>[\s\S]*?<\/h2>/g) ?? [];
    for (const h of headings) expect(h).not.toMatch(/border-dotted/);
  });
});
