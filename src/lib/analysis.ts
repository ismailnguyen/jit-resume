// Lightweight text analysis helpers for keyword/skill extraction and scoring

const STOPWORDS = new Set(
  [
    'the','and','for','with','that','this','from','into','over','under','above','below','to','of','in','on','at','by','a','an','as','is','are','be','or','it','its','their','our','your','you','we','they','i','will','can','must','should','have','has','had','was','were','been','but','not','no','yes','more','less','than','then','so','such','these','those','there','here','about','across','after','before','between','during','without','within','while','per','via','using','use','used','experience','years','plus','including','knowledge','skills','strong','ability','familiarity','proficiency','understanding','team','work','developer','engineer','senior','junior','mid','level','company','role','requirements','responsibilities','benefits'
  ] as const
);

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.\-\s]/g, ' ');

// Canonicalize common synonyms/variants to improve matching
const VARIANT_MAP: Record<string, string> = {
  // languages & runtimes
  js: 'javascript', javascript: 'javascript',
  react: 'react', 'reactjs': 'react', 'react.js': 'react',
  ts: 'typescript', typescript: 'typescript',
  node: 'nodejs', 'node.js': 'nodejs', nodejs: 'nodejs',
  'next.js': 'nextjs', nextjs: 'nextjs',
  'vue.js': 'vue', vue: 'vue',
  html: 'html', html5: 'html', css: 'css', css3: 'css', scss: 'sass', sass: 'sass',
  tailwindcss: 'tailwind', tailwind: 'tailwind',
  // platforms & tools
  aws: 'aws', 'amazon web services': 'aws',
  gcp: 'gcp', 'google cloud': 'gcp', azure: 'azure',
  docker: 'docker', 'docker-compose': 'docker', kubernetes: 'kubernetes', k8s: 'kubernetes',
  'ci/cd': 'cicd', cicd: 'cicd',
  // frameworks & libs
  redux: 'redux', zustand: 'zustand', webpack: 'webpack', vite: 'vite', jest: 'jest', cypress: 'cypress',
  // roles/areas
  'front-end': 'frontend', frontend: 'frontend', 'back-end': 'backend', backend: 'backend',
};

function canonicalizeToken(token: string): string {
  const t = token.trim().toLowerCase();
  if (!t) return t;
  const cleaned = t.replace(/^[^a-z0-9+#.\-]+|[^a-z0-9+#.\-]+$/g, '');
  return VARIANT_MAP[cleaned] || cleaned;
}

export function extractKeywords(text: string, limit = 20): string[] {
  const freq = new Map<string, number>();
  normalize(text)
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOPWORDS.has(t))
    .map(canonicalizeToken)
    .forEach(t => freq.set(t, (freq.get(t) || 0) + 1));
  const sorted = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  return Array.from(new Set(sorted)).slice(0, limit);
}

export function extractSkillsFromMarkdown(md: string): string[] {
  const lines = md.split(/\r?\n/);
  let i = lines.findIndex(l => /^#{1,6}\s*skills\b/i.test(l.trim()));
  if (i === -1) i = lines.findIndex(l => /\bskills\b/i.test(l));
  if (i === -1) return [];
  const items: string[] = [];
  for (let j = i + 1; j < lines.length; j++) {
    const line = lines[j];
    if (/^#{1,6}\s+/.test(line)) break; // next heading
    const bulletMatch = line.match(/^\s*(?:[-*•]\s+)(.+)$/);
    if (bulletMatch) {
      bulletMatch[1]
        .split(/[,•|]/)
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(s => items.push(s));
    }
  }
  const clean = items
    .map(s => s.replace(/^[-*•]\s*/, '').trim())
    .filter(s => s.length > 1)
    .map(canonicalizeToken);
  return Array.from(new Set(clean));
}

export function computeCoverageScore(
  jdText: string,
  resumeMd: string,
  opts?: { jdLimit?: number; resumeLimit?: number; weights?: { skills?: number; experience?: number; summary?: number; other?: number } }
) {
  const jdKeywords = extractKeywords(jdText, opts?.jdLimit ?? 25);
  const resumeSkills = extractSkillsFromMarkdown(resumeMd);

  // Extract sections (basic heading-based split)
  const getSection = (title: RegExp) => {
    const lines = resumeMd.split(/\r?\n/);
    let start = lines.findIndex(l => title.test(l.trim()));
    if (start === -1) return '';
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^#{1,6}\s+/.test(lines[i])) { end = i; break; }
    }
    return lines.slice(start + 1, end).join('\n');
  };

  const summaryText = getSection(/^#{1,6}\s*summary\b/i);
  const experienceText = getSection(/^#{1,6}\s*experience\b/i);

  const weights = {
    skills: opts?.weights?.skills ?? 3,
    experience: opts?.weights?.experience ?? 2,
    summary: opts?.weights?.summary ?? 1.5,
    other: opts?.weights?.other ?? 1,
  } as const;
  const maxWeight = Math.max(weights.skills, weights.experience, weights.summary, weights.other);

  // Weighted term map
  const resumeTermWeights = new Map<string, number>();
  const addTerms = (terms: string[], w: number) => {
    for (const t of terms) {
      const key = canonicalizeToken(t);
      if (!key || STOPWORDS.has(key)) continue;
      resumeTermWeights.set(key, Math.max(resumeTermWeights.get(key) || 0, w));
    }
  };

  addTerms(resumeSkills, weights.skills);
  addTerms(extractKeywords(experienceText, opts?.resumeLimit ?? 40), weights.experience);
  addTerms(extractKeywords(summaryText, Math.floor((opts?.resumeLimit ?? 40) / 2)), weights.summary);
  addTerms(extractKeywords(resumeMd, opts?.resumeLimit ?? 40), weights.other);

  // Weighted coverage score
  let covered = 0;
  for (const k of jdKeywords) {
    const key = canonicalizeToken(k);
    const w = resumeTermWeights.get(key) || 0;
    covered += Math.min(w, maxWeight);
  }
  const denom = jdKeywords.length * maxWeight;
  const score = denom ? Math.round((covered / denom) * 100) : 0;

  return { score, jdKeywords, resumeSkills };
}

