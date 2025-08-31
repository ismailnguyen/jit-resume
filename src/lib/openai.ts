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
  const userPrompt = `# Job Description
${args.jobDescription}

# Candidate Canonical Resume (Markdown)
${args.personalDetails}

# Additional Guidance
Target language: ${args.language || 'en'}
Theme: ${args.pdfTheme || 'modern'}
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
