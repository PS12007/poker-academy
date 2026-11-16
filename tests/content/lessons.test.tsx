import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
import type { ComponentType } from 'react';
import { ALL_LESSONS, LESSON_FILES } from '../../src/content/curriculum';
import { MDX_COMPONENTS } from '../../src/components/lesson/prose';
import { isNumeric, type Question } from '../../src/components/quiz/Quiz';
import { GLOSSARY } from '../../src/content/glossary';

const available = ALL_LESSONS.filter((l) => l.available);

describe('lesson content', () => {
  it('has lessons to check', () => {
    expect(available.length).toBeGreaterThan(0);
  });

  it('every MDX file is listed in the curriculum', () => {
    const known = new Set(ALL_LESSONS.map((l) => `./${l.module.id}/${l.id}.mdx`));
    for (const file of Object.keys(LESSON_FILES)) expect(known.has(file), file).toBe(true);
  });

  for (const lesson of available) {
    describe(lesson.key, () => {
      const path = `src/content/${lesson.module.id}/${lesson.id}.mdx`;
      const source = readFileSync(path, 'utf8');

      it('has objectives, a Remember box, common mistakes and a live component', () => {
        expect(source).toMatch(/<Objectives>/);
        expect(source).toMatch(/<Remember>/);
        expect(source).toMatch(/<Mistakes>/);
        expect(source).toMatch(/<Live[ >]/);
        expect(source).toMatch(/export const quiz/);
      });

      it('follows the writing rules', () => {
        expect(source.includes('—'), 'em dash found').toBe(false);
        expect(source.includes('–'), 'en dash found').toBe(false);
        expect(/\b(simply|basically|obviously|game-changer|unlock|supercharge)\b/i.test(source.replace(/simplified/gi, '')), 'filler word found').toBe(false);
      });

      it('renders and has a valid quiz', async () => {
        const mod = (await LESSON_FILES[`./${lesson.module.id}/${lesson.id}.mdx`]()) as { default: ComponentType; quiz?: Question[] };
        const Content = mod.default;
        const html = renderToString(
          <MemoryRouter>
            <MDXProvider components={MDX_COMPONENTS}>
              <Content />
            </MDXProvider>
          </MemoryRouter>,
        );
        expect(html.length).toBeGreaterThan(2500);
        expect(html).not.toMatch(/NaN|undefined|\[object Object\]/);
        const remember = source.match(/<Remember>([\s\S]*?)<\/Remember>/)?.[1].match(/^- /gm)?.length ?? 0;
        expect(remember).toBeGreaterThanOrEqual(3);
        expect(remember).toBeLessThanOrEqual(6);

        const quiz = mod.quiz ?? [];
        expect(quiz.length).toBeGreaterThanOrEqual(5);
        expect(quiz.length).toBeLessThanOrEqual(10);
        for (const q of quiz) {
          expect(q.q).toBeTruthy();
          expect(String(q.why).length).toBeGreaterThan(20);
          expect(String(q.why)).not.toMatch(/NaN|undefined/);
          if (isNumeric(q)) expect(Number.isFinite(q.numeric)).toBe(true);
          else {
            expect(q.choices.length).toBeGreaterThanOrEqual(2);
            expect(q.answer).toBeGreaterThanOrEqual(0);
            expect(q.answer).toBeLessThan(q.choices.length);
          }
        }
      });
    });
  }
});

describe('glossary', () => {
  it('has unique terms that point at real lessons', () => {
    const terms = GLOSSARY.map((g) => g.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
    const keys = new Set(ALL_LESSONS.map((l) => l.key));
    for (const g of GLOSSARY) if (g.lesson) expect(keys.has(g.lesson), `${g.term} -> ${g.lesson}`).toBe(true);
  });
});
