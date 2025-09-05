// Lightweight unit tests without a test runner
import fs from 'node:fs';

function canonicalizeToken(token) {
  const VARIANT_MAP = {
    js: 'javascript', javascript: 'javascript',
    react: 'react', 'reactjs': 'react', 'react.js': 'react',
    ts: 'typescript', typescript: 'typescript',
    node: 'nodejs', 'node.js': 'nodejs', nodejs: 'nodejs',
  };
  const t = token.trim().toLowerCase();
  if (!t) return t;
  const cleaned = t.replace(/^[^a-z0-9+#.\-]+|[^a-z0-9+#.\-]+$/g, '');
  return VARIANT_MAP[cleaned] || cleaned;
}

function extractKeywords(text, limit = 20) {
  const STOP = new Set(['the','and','for','with','that','this','from','to','of','in','on','at','by','a','an','as','is','are','be']);
  const freq = new Map();
  text.toLowerCase().replace(/[^a-z0-9+#.\-\s]/g,' ').split(/\s+/).map(t=>t.trim()).filter(t=>t.length>1 && !STOP.has(t)).map(canonicalizeToken).forEach(t=>freq.set(t,(freq.get(t)||0)+1));
  return Array.from(freq.entries()).sort((a,b)=>b[1]-a[1]).map(([k])=>k).slice(0,limit);
}

function computeCoverageScore(jdText, resumeMd) {
  const jdKeywords = extractKeywords(jdText, 10);
  const resumeTokens = new Set(extractKeywords(resumeMd, 200));
  let covered = 0;
  for (const k of jdKeywords) if (resumeTokens.has(canonicalizeToken(k))) covered++;
  const score = jdKeywords.length ? Math.round((covered / jdKeywords.length) * 100) : 0;
  return { score, jdKeywords };
}

function smartReorder(md, jdKeywords) {
  const keywords = new Set(jdKeywords.map(canonicalizeToken));
  const lines = md.split(/\r?\n/);
  const out = [];
  let i = 0;
  const isBullet = (s) => /^\s*[-*•]\s+/.test(s||'');
  const scoreLine = (s) => s.toLowerCase().replace(/[^a-z0-9+#.\-\s]/g,' ').split(/\s+/).map(canonicalizeToken).reduce((n,t)=>n+(keywords.has(t)?1:0),0);
  while (i < lines.length) {
    out.push(lines[i]);
    if (isBullet(lines[i+1])) {
      const block = [];
      let j = i+1;
      while (j < lines.length && isBullet(lines[j])) { block.push(lines[j]); j++; }
      out.push(...[...block].sort((a,b)=>scoreLine(b)-scoreLine(a)));
      i = j;
      continue;
    }
    i++;
  }
  return out.join('\n');
}

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); }
  catch (e) { console.error(`✗ ${name}`); console.error(e); process.exitCode = 1; }
}

// Tests
test('computeCoverageScore increases when adding keywords', () => {
  const jd = 'React TypeScript GraphQL';
  const a = computeCoverageScore(jd, 'Worked with React.');
  const b = computeCoverageScore(jd, 'Worked with React and TypeScript on GraphQL APIs.');
  if (!(b.score > a.score)) throw new Error(`Expected higher score, got ${a.score} vs ${b.score}`);
});

test('smartReorder sorts bullets by relevance', () => {
  const jdKeywords = ['react','typescript'];
  const md = `\n- Vanilla JS\n- React components\n- TypeScript tooling`;
  const out = smartReorder(md, jdKeywords);
  const idxReact = out.indexOf('React components');
  const idxTs = out.indexOf('TypeScript tooling');
  const idxJs = out.indexOf('Vanilla JS');
  if (!(idxReact < idxTs && idxTs < idxJs)) throw new Error('Bullets not reordered as expected');
});

console.log('Done.');

