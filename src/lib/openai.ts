interface GenerateResumeArgs {
  apiKey: string;
  model: string;
  personalDetails: string;
  jobDescription: string;
  language?: string;
  pdfTheme?: string;
  includeContactLinks?: boolean;
  anonymizeLocation?: boolean;
}

const SYSTEM_PROMPT = `You are an expert résumé writer and ATS optimization specialist.

TASK: Transform the user's canonical Markdown résumé into a tailored, ATS-friendly résumé for the given job description.

OUTPUT RULES
- Output MUST be valid GitHub-flavored Markdown. Do not wrap the whole résumé in code fences.
- Sections in order: Header (Name, Contact, Links), Summary, Skills, Experience, Education, Certifications (if any), Projects/Volunteer (if relevant).
- Style: concise bullet points, ATS-safe formatting only (no tables/images/text boxes); bold employer/title lines; en dash for date ranges.
- Language: use the target language specified by the user.

FIDELITY AND FACT POLICY (STRICT)
- USE ONLY facts explicitly present in the Candidate Canonical Résumé. Do not invent or estimate any numbers, dates, titles, employers, degrees, certifications, technologies, locations, or scopes.
- Metrics and numbers: include numeric metrics ONLY if they are verbatim present in the canonical résumé. If no metric exists, DO NOT add one; prefer qualitative impact phrasing instead.
- Do NOT borrow numbers from the Job Description, and never repurpose JD numbers as candidate achievements or scopes.
- You may mirror JD terminology (synonyms ok) and reorder skills/experience emphasis, but do not alter factual content.
- If a section has no data in the canonical résumé, omit it entirely.

LENGTH
- Aim for 1 page; maximum 2 pages.

CONTACT
- If anonymizeLocation=true, include only City and Country for location.

SELF-CHECK BEFORE RETURNING (DO NOT OUTPUT THIS STEP)
- Scan your draft for any numeric tokens (digits, %, $, k, million, etc.). If a number is not present in the canonical résumé text, remove it or replace with qualitative wording.

Return ONLY the final Markdown résumé (no explanations).`;

export async function generateResume(args: GenerateResumeArgs): Promise<string> {
  const themeGuidance = (() => {
    switch ((args.pdfTheme as string) || 'modern') {
      case 'classic':
        return `Theme details (classic):
- Traditional serif feel; clear section demarcation;
- Normal spacing; moderate verbosity in bullets;
- Conservative styling, no emojis or icons.`;
      case 'compact':
        return `Theme details (compact):
- Highly condensed; tighter spacing and shorter bullets;
- Prefer merging related points; avoid redundant phrasing;
- Keep to one page if feasible.`;
      case 'latex':
        return `Theme details (LaTeX):
- Serif typography; small-caps section headers;
- Clean typographic hierarchy; understated rules and spacing;
- Strictly formal tone; no icons/emojis.`;
      case 'minimal':
        return `Theme details (Minimal):
- Clean sans-serif; grayscale accents only;
- Thin rules and ample whitespace;
- Keep headings simple; no decorative elements.`;
      case 'executive':
        return `Theme details (Executive):
- Serif typography; small-caps section heads;
- Conservative spacing and classic rules;
- Formal voice, suited to leadership roles.`;
      case 'mono':
        return `Theme details (Monospace Tech):
- Monospace typography; code-like, no color;
- Uppercase section headers; compact spacing;
- Avoid decorative elements.`;
      case 'corporate':
        return `Theme details (Corporate Blue):
- Sans-serif with blue accents; thin rules;
- Professional tone; consistent terminology;
- Use blue (#1d4ed8) for emphasis links/headers.`;
      case 'ats':
        return `Theme details (ATS B&W):
- No color; bold only for headings;
- Absolute clarity and simplicity; no icons/emojis;
- Avoid uncommon symbols.`;
      case 'accent':
        return `Theme details (Modern Accent):
- Sans-serif with purple accent (#7c3aed);
- Crisp hierarchy; concise impact bullets;
- Light, modern feel.`;
      case 'a4':
        return `Theme details (A4 European):
- Sans-serif tuned for A4 page and margins;
- Slightly smaller body; conservative spacing;
- Keep sections succinct.`;
      case 'timeline':
        return `Theme details (Timeline):
- Emphasize chronology with distinct section separators;
- Crisp sans-serif; consistent tense and date styling;
- Keep bullets terse and outcome-focused.`;
      case 'modern':
      default:
        return `Theme details (modern):
- Clean sans-serif; balanced white space;
- Concise bullets with clear impact phrasing;
- Two pages acceptable if justified.`;
    }
  })();

  const userPrompt = `# Job Description
${args.jobDescription}

# Candidate Canonical Resume (Markdown)
${args.personalDetails}

# Additional Guidance
Target language: ${args.language || 'en'}
Theme: ${args.pdfTheme || 'modern'}
${themeGuidance}
Include contact links: ${args.includeContactLinks ?? true}
Anonymize location: ${args.anonymizeLocation ?? false}

# Constraints
- Use only facts present in the canonical resume.
- Do not invent or estimate numbers, dates, titles, employers, or degrees.
- Do not borrow numbers from the job description.
- If a metric is missing in the resume, avoid adding a number; use qualitative phrasing instead.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`OpenAI API error: ${error.error?.message || 'Failed to generate resume'}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function testApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

// --- Fit assessment (HR/Talent Acquisition style) ---
export interface AssessFitArgs {
  apiKey: string;
  model: string;
  jobDescription: string;
  personalDetails: string; // canonical résumé
  generatedResume?: string; // tailored résumé (optional)
}

export interface FitAnalysis {
  score: number; // 0-100 probability-like fit score
  summary?: string;
  strengths?: string[];
  gaps?: string[];
  seniority?: 'under' | 'exact' | 'over';
}

const FIT_SYSTEM_PROMPT = `You are a senior Talent Acquisition Partner. Assess candidate-job fit fairly and conservatively.

Rules:
- Base your judgment ONLY on the provided candidate resume(s) and job description.
- Penalize missing must-haves, required years, certifications, domain/regulatory requirements, location/clearance constraints.
- Consider seniority alignment (underqualified, exact, overqualified) and practical skill breadth-depth.
- Use qualitative judgment; do not hallucinate facts. If info is missing, treat it as a gap.
- Output JSON only, no narration.

JSON schema:
{
  "score": number (0-100, probability the candidate gets a recruiter screen for this JD),
  "summary": string (2-3 sentences on overall fit),
  "strengths": string[],
  "gaps": string[],
  "seniority": "under" | "exact" | "over"
}`;

export async function assessFit(args: AssessFitArgs): Promise<FitAnalysis> {
  const userPrompt = `# Job Description\n${args.jobDescription}\n\n# Candidate Canonical Resume (Markdown)\n${args.personalDetails}\n\n# Tailored Resume (Markdown)\n${args.generatedResume || '(not provided)'}\n\n# Task\nReturn a JSON object with fields: score, summary, strengths, gaps, seniority.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        { role: "system", content: FIT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`OpenAI API error: ${error.error?.message || 'Failed to assess fit'}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  try {
    const parsed = JSON.parse(content);
    const score = Math.max(0, Math.min(100, Math.round(parsed.score ?? 0)));
    return {
      score,
      summary: parsed.summary || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
      seniority: parsed.seniority === 'under' || parsed.seniority === 'exact' || parsed.seniority === 'over' ? parsed.seniority : undefined,
    };
  } catch {
    // Fallback: try to extract a number, else default
    const fallback: FitAnalysis = { score: 0, summary: content?.slice(0, 240) };
    return fallback;
  }
}

// Gap coaching: suggest truthful bullet improvements to address JD gaps
export interface GapCoachingArgs {
  apiKey: string;
  model: string;
  jobDescription: string;
  personalDetails: string;
  generatedResume?: string;
}

export interface GapCoachingResult {
  suggestions: string[]; // bullet-ready lines
  guidance?: string; // short guidance paragraph
}

const GAP_SYSTEM_PROMPT = `You are a senior technical recruiter. Suggest practical, truthful resume bullet improvements that address gaps vs. the job description.

Rules:
- Do not fabricate facts. Only rephrase or refocus content plausibly supported by the provided resume(s).
- Prefer action‑impact phrasing, technologies and domain terms from the JD.
- Keep each suggestion a single bullet line, 12–25 words.
- Output JSON only, no extra text.

Schema:
{ "suggestions": string[], "guidance": string }`;

export async function coachGaps(args: GapCoachingArgs): Promise<GapCoachingResult> {
  const userPrompt = `# Job Description\n${args.jobDescription}\n\n# Candidate Canonical Resume (Markdown)\n${args.personalDetails}\n\n# Tailored Resume (Markdown)\n${args.generatedResume || '(not provided)'}\n\n# Task\nPropose bullet-level improvements to strengthen alignment without inventing facts. Return JSON.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        { role: "system", content: GAP_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`OpenAI API error: ${error.error?.message || 'Failed to generate coaching'}`);
  }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  try {
    const parsed = JSON.parse(content);
    return {
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      guidance: parsed.guidance || '',
    };
  } catch {
    return { suggestions: [], guidance: content?.slice(0, 240) };
  }
}

// Interview preparation guidance
export interface InterviewPrepArgs {
  apiKey: string;
  model: string;
  jobDescription: string;
  personalDetails: string;
  generatedResume: string;
}

export interface InterviewPrepGuide {
  summary?: string;
  focusAreas?: string[];
  practiceQuestions?: string[];
  actionItems?: string[];
}

const INTERVIEW_PREP_SYSTEM_PROMPT = `You are a seasoned interview coach preparing a candidate for an upcoming interview.

Rules:
- Base your advice strictly on the provided resume(s) and job description; do not invent new achievements.
- Keep guidance actionable and specific.
- Provide concise bullet lists.
- Output JSON only, no narration.

Schema:
{
  "summary": string,
  "focusAreas": string[],
  "practiceQuestions": string[],
  "actionItems": string[]
}`;

export async function generateInterviewPrepGuide(args: InterviewPrepArgs): Promise<InterviewPrepGuide> {
  const userPrompt = `# Job Description\n${args.jobDescription}\n\n# Candidate Canonical Resume (Markdown)\n${args.personalDetails}\n\n# Tailored Resume (Markdown)\n${args.generatedResume}\n\n# Task\nReturn a JSON object matching the schema with concrete interview preparation advice.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        { role: "system", content: INTERVIEW_PREP_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(`OpenAI API error: ${error.error?.message || 'Failed to generate interview preparation'}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(content);
    const normalize = (value: unknown) => Array.isArray(value) ? value.filter((v) => typeof v === 'string') as string[] : [];
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      focusAreas: normalize(parsed.focusAreas),
      practiceQuestions: normalize(parsed.practiceQuestions),
      actionItems: normalize(parsed.actionItems),
    };
  } catch {
    return { summary: content ? content.slice(0, 280) : '', focusAreas: [], practiceQuestions: [], actionItems: [] };
  }
}
