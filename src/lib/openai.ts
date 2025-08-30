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
TASK: Transform the user's canonical Markdown résumé into a tailored, ATS-friendly résumé
for the given job description. Use concise bullet points with measurable impact, incorporate
keywords from the JD naturally, and keep to 1–2 pages.

RULES:
- Output MUST be valid GitHub-flavored Markdown.
- Sections in order: Header (Name, Contact, Links), Summary, Skills, Experience, Education, Certifications (if any), Projects/Volunteer (if relevant).
- Emphasize outcomes with numbers (% improvements, time saved, revenue impact, scale).
- Mirror JD terminology where appropriate (synonyms ok).
- Avoid tables, images, text boxes. No fancy formatting—ATS-safe.
- Use simple typographic conventions: bold for employers/titles, dashes for dates.
- Do NOT invent roles or degrees. If data is missing, omit the section.
- Keep length to ideally 1 page; hard cap: 2 pages.
- Contact: if anonymizeLocation=true, include only City and Country.

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
Anonymize location: ${args.anonymizeLocation ?? false}`;

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
      temperature: 0.2,
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