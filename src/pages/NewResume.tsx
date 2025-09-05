import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { generateResume, assessFit } from "@/lib/openai";
import { saveResume } from "@/lib/storage";
import { getPersonalDetails } from "@/lib/storage";
import { nanoid } from "nanoid";
import { FileText, Wand2, Sparkles } from "lucide-react";
import { computeCoverageScore, smartReorder } from "@/lib/analysis";

const SAMPLE_JD = `Job Title: Senior Frontend Developer
Company: TechCorp Inc.

We are seeking a Senior Frontend Developer to join our dynamic team. The ideal candidate will have:

Requirements:
• 5+ years of experience in frontend development
• Expert knowledge of React, TypeScript, and modern JavaScript
• Experience with state management (Redux, Zustand)
• Proficiency in CSS preprocessors and Tailwind CSS
• Experience with testing frameworks (Jest, Cypress)
• Knowledge of build tools (Webpack, Vite)
• Understanding of responsive design and cross-browser compatibility
• Experience with Git version control
• Strong problem-solving skills and attention to detail

Responsibilities:
• Develop and maintain high-quality web applications
• Collaborate with designers and backend developers
• Write clean, maintainable, and well-documented code
• Participate in code reviews and technical discussions
• Optimize applications for maximum speed and scalability
• Stay up-to-date with the latest frontend technologies

Benefits:
• Competitive salary and equity package
• Health, dental, and vision insurance
• Flexible work arrangements
• Professional development opportunities`;

const NewResume = () => {
  const navigate = useNavigate();
  const { settings, addResume } = useStore();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [language, setLanguage] = useState<'auto' | 'default' | 'en' | 'fr' | 'de' | 'es'>('auto');
  const [generating, setGenerating] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);

  const insertSample = () => {
    setJobDescription(SAMPLE_JD);
    if (!title) {
      setTitle("Senior Frontend Developer at TechCorp");
    }
    toast({
      title: "Sample inserted",
      description: "You can now customize or generate directly with this example.",
    });
  };

  const importFromUrl = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      // Attempt direct fetch (requires CORS on source)
      const directRes = await fetch(importUrl, { mode: 'cors' as RequestMode });
      if (!directRes.ok) throw new Error(`HTTP ${directRes.status}`);
      const html = await directRes.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      doc.querySelectorAll('script, style, noscript').forEach(el => el.remove());
      const text = doc.body?.innerText || doc.body?.textContent || '';
      if (!text.trim()) throw new Error('No text content extracted');
      setJobDescription(text.trim());
      toast({ title: 'Imported', description: 'Job description imported from URL.' });
    } catch (e) {
      // Transparent fallback: try CORS-friendly text extraction proxy
      try {
        toast({ title: 'Extracting…', description: 'This may take a bit longer. Please wait…' });
        const proxyUrl = 'https://r.jina.ai/http://' + importUrl.replace(/^https?:\/\//, '');
        const proxied = await fetch(proxyUrl, { method: 'GET' });
        if (!proxied.ok) throw new Error(`HTTP ${proxied.status}`);
        const content = await proxied.text();
        const cleaned = content.replace(/\s+$/, '').trim();
        if (!cleaned) throw new Error('No text content extracted');
        setJobDescription(cleaned);
        toast({ title: 'Imported', description: 'We extracted the job description. Please review and clean it if needed.' });
      } catch (err) {
        toast({
          title: 'Import Failed',
          description: 'Could not import from URL. Try copy/paste or upload PDF/Text.',
          variant: 'destructive',
        });
      }
    } finally {
      setImporting(false);
    }
  };

  const handleGenerate = async () => {
    if (!settings.openAIApiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your OpenAI API key in Settings first.",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your resume.",
        variant: "destructive",
      });
      return;
    }

    if (!jobDescription.trim()) {
      toast({
        title: "Job Description Required",
        description: "Please paste the job description.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    
    try {
      // Get personal details
      const personalDetails = await getPersonalDetails();
      if (!personalDetails) {
        toast({
          title: "Personal Details Missing",
          description: "Please add your personal details first.",
          variant: "destructive",
        });
        navigate("/app/personal");
        return;
      }

      // Optional cost estimate and guard
      const approxTokens = (str: string) => Math.ceil((str.length || 0) / 4);
      const inTokens = approxTokens(jobDescription) + approxTokens(personalDetails);
      const outTokens = Math.max(600, Math.min(2000, Math.round(approxTokens(personalDetails) * 0.5 + approxTokens(jobDescription) * 0.2)));
      const estCost = ((inTokens / 1000) * (settings.priceInPer1k || 0)) + ((outTokens / 1000) * (settings.priceOutPer1k || 0));
      if (settings.costControlsEnabled) {
        const cap = settings.maxGenerationCost || 0;
        if (cap > 0 && estCost > cap) {
          const proceed = settings.showEstimateBeforeGenerate
            ? window.confirm(`Estimated cost $${estCost.toFixed(2)} exceeds your cap ($${cap.toFixed(2)}). Proceed?`)
            : false;
          if (!proceed) {
            toast({ title: 'Generation cancelled', description: `Estimate $${estCost.toFixed(2)} is above your cap. Adjust in Settings.` });
            return;
          }
        } else if (settings.showEstimateBeforeGenerate) {
          const proceed = window.confirm(`Estimated cost: ~$${estCost.toFixed(2)} (input ~${inTokens} tok, output ~${outTokens} tok). Proceed?`);
          if (!proceed) { setGenerating(false); return; }
        }
      }

      // Resolve target language
      const nameMap: Record<'en'|'fr'|'de'|'es', string> = { en: 'English', fr: 'French', de: 'German', es: 'Spanish' };
      const detectLanguage = (text: string): 'en' | 'fr' | 'de' | 'es' => {
        const t = ` ${text.toLowerCase()} `;
        const scores: Record<'en'|'fr'|'de'|'es', number> = { en:0, fr:0, de:0, es:0 };
        // English markers
        [' the ',' and ',' with ',' for ',' years ',' experience ',' development ',' skills ',' team '].forEach(m=>{ if(t.includes(m)) scores.en++; });
        // French markers
        [' le ',' la ',' les ',' des ',' un ',' une ',' et ',' pour ',' avec ',' ans ',' expérience ',' développe',' ingénieur '].forEach(m=>{ if(t.includes(m)) scores.fr++; });
        // German markers
        [' der ',' die ',' das ',' und ',' mit ',' für ',' erfahrung ',' jahre ',' entwicklung ',' kenntnisse '].forEach(m=>{ if(t.includes(m)) scores.de++; });
        // Spanish markers
        [' el ',' la ',' los ',' las ',' y ',' con ',' para ',' años ',' experiencia ',' desarrollo '].forEach(m=>{ if(t.includes(m)) scores.es++; });
        let best: 'en'|'fr'|'de'|'es' = settings.defaultLanguage;
        let bestScore = -1;
        (['en','fr','de','es'] as const).forEach(lang => { if (scores[lang] > bestScore) { best = lang; bestScore = scores[lang]; } });
        return best;
      };
      const resolvedLang: 'en'|'fr'|'de'|'es' = language === 'auto' 
        ? detectLanguage(jobDescription)
        : (language === 'default' ? settings.defaultLanguage : language);

      // Generate resume
      const generatedMarkdown = await generateResume({
        apiKey: settings.openAIApiKey,
        model: settings.model,
        personalDetails,
        jobDescription,
        language: resolvedLang,
        pdfTheme: settings.pdfTheme,
        includeContactLinks: settings.includeContactLinks,
        anonymizeLocation: settings.anonymizeLocation,
      });

      // Compute JD keywords, then smartly reorder bullets by relevance
      const initialCoverage = computeCoverageScore(jobDescription, generatedMarkdown, { weights: settings.atsWeights });
      const reorderedMarkdown = smartReorder(generatedMarkdown, initialCoverage.jdKeywords);
      // Recompute coverage on the final (reordered) markdown
      const { score, jdKeywords, resumeSkills } = computeCoverageScore(jobDescription, reorderedMarkdown, { weights: settings.atsWeights });

      // Assess HR-style fit via LLM (best-effort; non-blocking on failure)
      let fit: { score: number; summary?: string; strengths?: string[]; gaps?: string[]; seniority?: 'under' | 'exact' | 'over' } | undefined = undefined;
      try {
        const fitAnalysis = await assessFit({
          apiKey: settings.openAIApiKey,
          model: settings.model,
          jobDescription,
          personalDetails,
          generatedResume: reorderedMarkdown,
        });
        fit = fitAnalysis;
      } catch (e) {
        console.warn('Fit assessment failed:', e);
      }

      // Create resume record
      const resumeId = nanoid();
      const now = new Date().toISOString();
      
      const resumeMeta = {
        id: resumeId,
        title: title.trim(),
        createdAt: now,
        updatedAt: now,
        language: resolvedLang,
        score,
        fitScore: fit?.score,
      };

      // Save to storage
      await saveResume(resumeId, {
        markdown: reorderedMarkdown,
        jdRaw: jobDescription,
        derived: { skills: resumeSkills, keywords: jdKeywords },
        fit,
      });

      // Add to store
      addResume(resumeMeta);

      toast({
        title: "Resume Generated!",
        description: "Your tailored resume is ready for review and editing.",
      });

      // Navigate to the resume detail page
      navigate(`/app/resume/${resumeId}`);
      
    } catch (error) {
      console.error('Resume generation error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">New Just-in-Time Resume</h1>
          <p className="text-muted-foreground">
            Create a tailored, ATS-friendly resume for any job in seconds.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Resume Details
            </CardTitle>
            <CardDescription>
              Give your resume a descriptive title and target language.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Resume Title</Label>
              <Input
                id="title"
                placeholder="e.g., Senior Frontend Developer at TechCorp"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Target Language</Label>
              <Select value={language} onValueChange={(value: any) => setLanguage(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (detect from job description)</SelectItem>
                  <SelectItem value="default">Default ({({ en:'English', fr:'French', de:'German', es:'Spanish' } as any)[settings.defaultLanguage]})</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
            <CardDescription>
              Paste the full job description below. The more detail, the better the tailoring.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3 items-end">
              <div className="sm:col-span-2">
                <Label htmlFor="importUrl">Import from URL</Label>
                <Input id="importUrl" placeholder="https://example.com/job-posting" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="w-full" onClick={importFromUrl} disabled={importing || !importUrl}>
                  {importing ? 'Importing…' : 'Import URL'}
                </Button>
                <Button variant="outline" size="sm" className="w-full" onClick={insertSample}>
                  Insert Sample
                </Button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 items-end">
              <div className="sm:col-span-2">
                <Label htmlFor="importFile">Import from PDF/Text</Label>
                <Input id="importFile" type="file" accept=".pdf,.txt" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.type === 'text/plain') {
                      const text = await file.text();
                      setJobDescription(text);
                      toast({ title: 'Imported', description: 'Text file imported.' });
                    } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                      // Best-effort: try to read as text; for complex PDFs you may need PDF.js
                      const text = await file.text().catch(() => '');
                      if (text && /\w{20}/.test(text)) {
                        setJobDescription(text);
                        toast({ title: 'Imported (raw)', description: 'PDF imported as raw text. Review formatting.' });
                      } else {
                        toast({ title: 'PDF Parsing Not Available', description: 'Browser could not extract text from this PDF. Please copy/paste the JD text or use a URL.', variant: 'destructive' });
                      }
                    } else {
                      toast({ title: 'Unsupported file type', description: 'Please upload a .pdf or .txt file.', variant: 'destructive' });
                    }
                  } catch (err) {
                    toast({ title: 'Import failed', description: err instanceof Error ? err.message : 'Could not import file.', variant: 'destructive' });
                  } finally {
                    e.currentTarget.value = '';
                  }
                }} />
              </div>
              <div className="text-xs text-muted-foreground">
                PDFs may require manual copy/paste if text extraction is blocked.
              </div>
            </div>
            
            <Textarea
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate("/app")}>
            Cancel
          </Button>
          
          <Button 
            onClick={handleGenerate}
            disabled={generating || !settings.openAIApiKey}
            size="lg"
          >
            <Wand2 className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            {generating ? "Generating..." : "Generate Resume"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewResume;
