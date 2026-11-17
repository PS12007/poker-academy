import { GLOSSARY } from '../content/glossary';

/**
 * Remark plugin: in each lesson, wraps the FIRST occurrence of every glossary
 * term (or alias) in prose with <Term k="..."> so readers get a definition on
 * hover or tap. Runs at build time, so it costs nothing in the browser.
 *
 * Skips headings, links, code, formulas and existing Term elements. Very common
 * words that are also glossary entries are excluded to avoid noise.
 */
const EXCLUDE = new Set(['out', 'outs', 'set', 'ladder', 'call', 'check', 'fold', 'raise', 'turn', 'river', 'board', 'position', 'draw', 'bluff', 'flop', 'preflop', 'range', 'equity', 'jam', 'shove', 'open', 'combos', 'combo', 'combination', 'kicker', 'nuts', 'the nuts', 'bounty']);
const SKIP = new Set(['heading', 'link', 'linkReference', 'inlineCode', 'code', 'mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression']);
const SKIP_JSX = new Set(['Formula', 'Term', 'Working', 'DataTable', 'Live', 'Scene', 'Cards', 'C']);

interface Node {
  type: string;
  name?: string;
  value?: string;
  children?: Node[];
  attributes?: unknown[];
}

const lookup = new Map<string, string>();
for (const g of GLOSSARY) {
  for (const name of [g.term, ...(g.aka ?? [])]) {
    const k = name.toLowerCase();
    if (!EXCLUDE.has(k) && k.length > 2) lookup.set(k, g.term);
  }
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATTERN = new RegExp(`\\b(${[...lookup.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')})\\b`, 'gi');

export function remarkGlossary() {
  return (tree: Node) => {
    const used = new Set<string>();
    const walk = (node: Node) => {
      if (!node.children) return;
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (SKIP.has(child.type)) continue;
        if ((child.type === 'mdxJsxFlowElement' || child.type === 'mdxJsxTextElement') && child.name && SKIP_JSX.has(child.name)) continue;
        if (child.type !== 'text' || !child.value) {
          walk(child);
          continue;
        }
        const text = child.value;
        const parts: Node[] = [];
        let last = 0;
        PATTERN.lastIndex = 0;
        for (let m = PATTERN.exec(text); m; m = PATTERN.exec(text)) {
          const term = lookup.get(m[1].toLowerCase());
          if (!term || used.has(term)) continue;
          used.add(term);
          if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
          parts.push({
            type: 'mdxJsxTextElement',
            name: 'Term',
            attributes: [{ type: 'mdxJsxAttribute', name: 'k', value: term }],
            children: [{ type: 'text', value: m[1] }],
          });
          last = m.index + m[1].length;
        }
        if (!parts.length) continue;
        if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });
        node.children.splice(i, 1, ...parts);
        i += parts.length - 1;
      }
    };
    walk(tree);
  };
}
