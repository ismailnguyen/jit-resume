// Lightweight text analysis helpers for keyword/skill extraction and scoring

const STOPWORDS = new Set(
  [
    'the','and','for','with','that','this','from','into','over','under','above','below','to','of','in','on','at','by','a','an','as','is','are','be','or','it','its','their','our','your','you','we','they','i','will','can','must','should','have','has','had','was','were','been','but','not','no','yes','more','less','than','then','so','such','these','those','there','here','about','across','after','before','between','during','without','within','while','per','via','using','use','used','experience','years','plus','including','knowledge','skills','strong','ability','familiarity','proficiency','understanding','team','work','developer','engineer','senior','junior','mid','level','company','role','requirements','responsibilities','benefits'
  ] as const
);

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.\-\s]/g, ' ');

export function extractKeywords(text: string, limit = 20): string[] {
  const freq = new Map<string, number>();
  normalize(text)
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOPWORDS.has(t))
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
    .filter(s => s.length > 1);
  return Array.from(new Set(clean));
}

export function computeCoverageScore(jdText: string, resumeMd: string, opts?: { jdLimit?: number; resumeLimit?: number }) {
  const jdKeywords = extractKeywords(jdText, opts?.jdLimit ?? 25);
  const resumeSkills = extractSkillsFromMarkdown(resumeMd);
  const resumeTerms = new Set([
    ...resumeSkills.map(s => s.toLowerCase()),
    ...extractKeywords(resumeMd, opts?.resumeLimit ?? 40),
  ]);
  const intersection = jdKeywords.filter(k => resumeTerms.has(k.toLowerCase()));
  const score = jdKeywords.length ? Math.round((intersection.length / jdKeywords.length) * 100) : 0;
  return { score, jdKeywords, resumeSkills };
}

