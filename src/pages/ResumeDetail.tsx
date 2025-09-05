import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { getResume, saveResume, getPersonalDetails } from "@/lib/storage";
import { ArrowLeft, Download, Save, FileText, AlertTriangle } from "lucide-react";
import MDEditor from '@uiw/react-md-editor';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { marked } from 'marked';
import { computeCoverageScore } from "@/lib/analysis";
import { assessFit, coachGaps } from "@/lib/openai";
import { useIsMobile } from "@/hooks/use-mobile";

type ApplicationStatus = 'applied' | 'not_applied' | 'unsuccessful' | 'successful';

const ResumeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { resumesIndex, updateResume, settings } = useStore();
  const { toast } = useToast();
  
  const [markdown, setMarkdown] = useState("");
  const [originalMarkdown, setOriginalMarkdown] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [derivedSkills, setDerivedSkills] = useState<string[]>([]);
  const [derivedKeywords, setDerivedKeywords] = useState<string[]>([]);
  const [computedScore, setComputedScore] = useState<number | null>(null);
  const [fitScore, setFitScore] = useState<number | null>(null);
  const [fitSummary, setFitSummary] = useState<string>("");
  const [fitStrengths, setFitStrengths] = useState<string[]>([]);
  const [fitGaps, setFitGaps] = useState<string[]>([]);
  const [fitSeniority, setFitSeniority] = useState<'under' | 'exact' | 'over' | null>(null);
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const [coaching, setCoaching] = useState<{ suggestions: string[]; guidance?: string } | null>(null);
  const [showJobDescription, setShowJobDescription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  // Default to preview mode so users see the rendered résumé first
  const [editorMode, setEditorMode] = useState<'preview' | 'edit'>('preview');
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>('not_applied');
  const [company, setCompany] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState<string | undefined>(undefined);
  const [canonicalDetails, setCanonicalDetails] = useState<string>("");

  const resumeMeta = resumesIndex.find(r => r.id === id);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (id) {
      loadResume(id);
    }
  }, [id]);

  useEffect(() => {
    setHasChanges(markdown !== originalMarkdown);
  }, [markdown, originalMarkdown]);

  // Load canonical details for claim checking
  useEffect(() => {
    (async () => {
      const canonical = await getPersonalDetails();
      setCanonicalDetails(canonical || '');
    })();
  }, []);

  // Keyboard shortcuts within detail: Save (Cmd/Ctrl+S), Toggle editor (Cmd/Ctrl+E)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!saving && hasChanges) void handleSave();
      } else if (e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setEditorMode((m) => (m === 'preview' ? 'edit' : 'preview'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, hasChanges]);

  const loadResume = async (resumeId: string) => {
    try {
      const data = await getResume(resumeId);
      if (data) {
        setMarkdown(data.markdown);
        setOriginalMarkdown(data.markdown);
        setJobDescription(data.jdRaw);
        const rawStatus = data.meta?.applicationStatus;
        const allowed: ApplicationStatus[] = ['applied', 'not_applied', 'unsuccessful', 'successful'];
        setApplicationStatus(allowed.includes(rawStatus as any) ? (rawStatus as ApplicationStatus) : 'not_applied');
        setCompany(data.meta?.company || resumeMeta?.company);
        setLocation(data.meta?.location || resumeMeta?.location);
        if (data.derived) {
          setDerivedSkills(data.derived.skills || []);
          setDerivedKeywords(data.derived.keywords || []);
        }
        if (data.coaching) {
          setCoaching({ suggestions: data.coaching.suggestions || [], guidance: data.coaching.guidance || '' });
        }
        if (data.fit) {
          setFitScore(typeof data.fit.score === 'number' ? data.fit.score : null);
          setFitSummary(data.fit.summary || "");
          setFitStrengths(Array.isArray(data.fit.strengths) ? data.fit.strengths : []);
          setFitGaps(Array.isArray(data.fit.gaps) ? data.fit.gaps : []);
          setFitSeniority((data.fit.seniority as any) ?? null);
        }
        // Compute on the fly for display (and to refresh on edits)
        const { score, jdKeywords, resumeSkills } = computeCoverageScore(data.jdRaw, data.markdown, { weights: settings.atsWeights });
        setComputedScore(score);
        if (!data.derived) {
          setDerivedSkills(resumeSkills);
          setDerivedKeywords(jdKeywords);
        }
      } else {
        toast({
          title: "Resume Not Found",
          description: "The requested resume could not be loaded.",
          variant: "destructive",
        });
        navigate("/app/library");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load resume data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    
    setSaving(true);
    try {
      const resumeData = await getResume(id);
      if (resumeData) {
        const { score, jdKeywords, resumeSkills } = computeCoverageScore(jobDescription, markdown, { weights: settings.atsWeights });
        // Auto re-score Fit if API key available (non-blocking on failure)
        let newFit = (resumeData as any).fit as any;
        try {
          if (settings.openAIApiKey) {
            const canonical = await getPersonalDetails();
            const result = await assessFit({
              apiKey: settings.openAIApiKey,
              model: settings.model,
              jobDescription,
              personalDetails: canonical || '',
              generatedResume: markdown,
            });
            newFit = {
              score: result.score ?? 0,
              summary: result.summary || '',
              strengths: result.strengths || [],
              gaps: result.gaps || [],
              seniority: (result.seniority as any) ?? undefined,
            };
          }
        } catch (e) {
          // Fit re-score failed; keep previous fit and continue
        }

        await saveResume(id, {
          markdown,
          jdRaw: jobDescription,
          derived: { skills: resumeSkills, keywords: jdKeywords },
          fit: newFit,
          coaching: (resumeData as any).coaching,
          meta: { ...((resumeData as any).meta || {}), applicationStatus },
        });

        updateResume(id, {
          updatedAt: new Date().toISOString(),
          score,
          fitScore: typeof newFit?.score === 'number' ? newFit.score : (resumeData as any).fit?.score,
        });

        setDerivedSkills(resumeSkills);
        setDerivedKeywords(jdKeywords);
        setComputedScore(score);
        setOriginalMarkdown(markdown);
        // Auto re-generate coaching on save if content changed and API key available
        if (settings.openAIApiKey && markdown !== originalMarkdown) {
          try {
            const canonical = await getPersonalDetails();
            const coachingResult = await coachGaps({
              apiKey: settings.openAIApiKey,
              model: settings.model,
              jobDescription,
              personalDetails: canonical || '',
              generatedResume: markdown,
            });
            setCoaching({ suggestions: coachingResult.suggestions || [], guidance: coachingResult.guidance || '' });
            await saveResume(id, {
              markdown,
              jdRaw: jobDescription,
              derived: { skills: resumeSkills, keywords: jdKeywords },
              fit: newFit,
              coaching: coachingResult,
              meta: { ...((resumeData as any).meta || {}), applicationStatus },
            });
          } catch (e) {
            // Ignore coaching failure on save
          }
        }
        if (typeof newFit?.score === 'number') {
          setFitScore(newFit.score);
          setFitSummary(newFit.summary || '');
          setFitStrengths(newFit.strengths || []);
          setFitGaps(newFit.gaps || []);
          setFitSeniority((newFit.seniority as any) ?? null);
        }

        toast({
          title: "Saved!",
          description: settings.openAIApiKey ? "Resume saved and Fit re-scored." : "Resume saved (Fit not re-scored: no API key).",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status: ApplicationStatus) => {
    setApplicationStatus(status);
    if (!id) return;
    try {
      const current = await getResume(id);
      if (current) {
        await saveResume(id, {
          markdown: current.markdown,
          jdRaw: current.jdRaw,
          derived: current.derived || { skills: [], keywords: [] },
          fit: current.fit,
          coaching: current.coaching,
          meta: { ...(current.meta || {}), applicationStatus: status },
        });
        updateResume(id, { updatedAt: new Date().toISOString(), applicationStatus: status });
        toast({ title: 'Status updated', description: 'Application status saved.' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status. Please try again.', variant: 'destructive' });
    }
  };

  const handlePrint = () => {
    // Open only the rendered markdown resume in a new tab, then print
    const htmlContent = marked.parse(markdown);
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    const themeCSS = (() => {
      const base = `
        @page { margin: 1in; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { color: #0f172a; }
        a { color: inherit; text-decoration: none; }
        ul, ol { padding-left: 1.25rem; break-inside: avoid; page-break-inside: avoid; }
        h1, h2, h3, h4, h5, h6 { page-break-after: avoid; break-after: avoid; }
        p, li { page-break-inside: avoid; break-inside: avoid; }
        h2 + ul, h3 + ul { page-break-inside: avoid; break-inside: avoid; }
        .section { margin-top: 0.75rem; }
      `;
      switch (settings.pdfTheme) {
        case 'classic':
          return `
            ${base}
            body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.35; }
            h1 { font-size: 24px; letter-spacing: 0.2px; margin-bottom: 0.25rem; }
            h2 { font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-top: 1rem; }
            h3 { font-size: 14px; font-weight: 600; }
            p, li { font-size: 11.5px; }
            ul { margin-top: 0.25rem; }
          `;
        case 'compact':
          return `
            ${base}
            @page { margin: 0.6in; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.25; }
            h1 { font-size: 20px; margin-bottom: 0.1rem; }
            h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.6px; margin-top: 0.6rem; }
            h3 { font-size: 12px; font-weight: 600; }
            p, li { font-size: 11px; margin: 0.15rem 0; }
            ul { margin-top: 0.1rem; }
          `;
        case 'latex':
          return `
            ${base}
            body { font-family: 'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif; line-height: 1.35; }
            h1 { font-size: 24px; font-weight: 700; letter-spacing: 0.2px; margin-bottom: 0.25rem; }
            h2 { font-size: 16px; font-variant: small-caps; letter-spacing: 0.6px; margin-top: 0.8rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; }
            h3 { font-size: 13px; font-weight: 600; }
            p, li { font-size: 12px; }
            ul { margin-top: 0.2rem; padding-left: 1.2rem; }
          `;
        case 'minimal':
          return `
            ${base}
            body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.45; }
            h1 { font-size: 22px; letter-spacing: -0.02em; margin-bottom: 0.25rem; }
            h2 { font-size: 14px; color: #475569; margin-top: 0.8rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; }
            h3 { font-size: 12px; font-weight: 600; }
            p, li { font-size: 12px; }
          `;
        case 'executive':
          return `
            ${base}
            body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.4; }
            h1 { font-size: 22px; font-weight: 700; letter-spacing: 0.2px; margin-bottom: 0.25rem; }
            h2 { font-size: 15px; font-variant: small-caps; letter-spacing: 0.6px; margin-top: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
            h3 { font-size: 12.5px; font-weight: 600; }
            p, li { font-size: 12px; }
          `;
        case 'mono':
          return `
            ${base}
            body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; line-height: 1.5; }
            h1 { font-size: 18px; margin-bottom: 0.15rem; }
            h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 0.6rem; }
            h3 { font-size: 11.5px; font-weight: 700; }
            p, li { font-size: 11.5px; }
          `;
        case 'corporate':
          return `
            ${base}
            body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.45; }
            h1 { font-size: 22px; letter-spacing: -0.01em; margin-bottom: 0.25rem; }
            h2 { font-size: 14px; color: #1d4ed8; margin-top: 0.9rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 2px; }
            h3 { font-size: 12px; font-weight: 600; }
            p, li { font-size: 12px; }
            a { color: #1d4ed8; text-decoration: none; }
          `;
        case 'ats':
          return `
            ${base}
            body { font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; line-height: 1.4; }
            h1 { font-size: 22px; margin-bottom: 0.25rem; }
            h2 { font-size: 14px; margin-top: 0.9rem; }
            h3 { font-size: 12px; font-weight: 600; }
            p, li { font-size: 12px; }
          `;
        case 'accent':
          return `
            ${base}
            body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.5; }
            h1 { font-size: 22px; margin-bottom: 0.25rem; letter-spacing: -0.02em; }
            h2 { font-size: 14px; color: #7c3aed; margin-top: 0.9rem; font-weight: 600; }
            h3 { font-size: 12px; font-weight: 600; }
            p, li { font-size: 12px; }
            a { color: #7c3aed; text-decoration: none; }
          `;
        case 'a4':
          return `
            ${base}
            @page { size: A4; margin: 1.8cm; }
            body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.4; }
            h1 { font-size: 21px; margin-bottom: 0.2rem; }
            h2 { font-size: 13.5px; color: #334155; margin-top: 0.8rem; }
            h3 { font-size: 12px; font-weight: 600; }
            p, li { font-size: 11.5px; }
          `;
        case 'timeline':
          return `
            ${base}
            body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.5; }
            h1 { font-size: 22px; margin-bottom: 0.25rem; letter-spacing: -0.02em; }
            h2 { font-size: 14px; color: #334155; margin-top: 1rem; border-left: 3px solid #e5e7eb; padding-left: 10px; }
            h3 { font-size: 12px; font-weight: 600; }
            p, li { font-size: 12px; }
          `;
        case 'modern':
        default:
          return `
            ${base}
            body { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.5; }
            h1 { font-size: 26px; margin-bottom: 0.25rem; }
            h2 { font-size: 16px; color: #334155; margin-top: 1rem; }
            h3 { font-size: 13px; font-weight: 600; }
            p, li { font-size: 12px; }
            strong { color: #0f172a; }
          `;
      }
    })();

    printWindow.document.write(`
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Resume PDF</title>
          <style>${themeCSS}${settings.additionalPrintCss ? `\n/* Custom */\n${settings.additionalPrintCss}` : ''}</style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const applySuggestionToExperience = (s: string) => {
    setMarkdown((prev) => insertIntoExperience(prev, s));
    toast({ title: 'Applied', description: 'Suggestion added to Experience section.' });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-2/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!resumeMeta) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Resume Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested resume could not be found.
            </p>
            <Button onClick={() => navigate("/app/library")}>
              Back to Library
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
  <div className="px-3 py-4 sm:p-6 max-w-6xl mx-auto space-y-6" id="resume-content">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/library")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {resumeMeta.title}
            </h1>
            {(company || location) && (
              <div className="text-sm text-muted-foreground">
                {[company, location].filter(Boolean).join(' • ')}
              </div>
            )}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Created {new Date(resumeMeta.createdAt).toLocaleDateString()}</span>
              {resumeMeta.updatedAt !== resumeMeta.createdAt && (
                <>
                  <span>•</span>
                  <span>Updated {new Date(resumeMeta.updatedAt).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Button variant="outline" onClick={handlePrint}>
            <Download className="h-4 w-4 mr-1" />
            Download (PDF)
          </Button>
          {/* Smart reorder is now applied during initial generation */}
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges}
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm">
            You have unsaved changes. Don't forget to save your work!
          </p>
        </div>
      )}

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>Track the status of this application.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">Status</div>
              <Select value={applicationStatus} onValueChange={(v) => handleStatusChange(v as ApplicationStatus)}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="not_applied">Not Applied</SelectItem>
                  <SelectItem value="unsuccessful">Unsuccessful</SelectItem>
                  <SelectItem value="successful">Successful</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Fit Analysis</CardTitle>
                <CardDescription>Assessment of candidate fit.</CardDescription>
              </div>
              {/* Fit re-scoring now runs automatically on Save */}
              {/* Coaching is generated during resume creation and displayed below */}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {typeof (resumeMeta.fitScore ?? fitScore) === 'number' && (
              <div className="text-sm">
                <span className="font-medium">Fit Score:</span> {(resumeMeta.fitScore ?? fitScore)}%
                {fitSeniority && <span className="ml-2 text-muted-foreground">(Seniority: {fitSeniority})</span>}
              </div>
            )}
            {fitSummary && (
              <div className="text-sm text-muted-foreground">{fitSummary}</div>
            )}
            {fitStrengths.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-1">Strengths</div>
                <ul className="list-disc pl-6 text-sm space-y-1">
                  {fitStrengths.map((s, i) => (<li key={i}>{s}</li>))}
                </ul>
              </div>
            )}
            {fitGaps.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-1">Gaps</div>
                <ul className="list-disc pl-6 text-sm space-y-1">
                  {fitGaps.map((g, i) => (<li key={i}>{g}</li>))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {coaching && (
          <Card>
            <CardHeader>
              <CardTitle>Coaching Suggestions</CardTitle>
              <CardDescription>Bullet-level improvements to address gaps truthfully.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {coaching.guidance && (
                <div className="text-sm text-muted-foreground">{coaching.guidance}</div>
              )}
              {coaching.suggestions.length > 0 ? (
                <ul className="list-disc pl-6 space-y-2 text-sm">
                  {coaching.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="flex-1">
                        {s}
                        {canonicalDetails && !isSuggestionSupported(s, canonicalDetails) && (
                          <span className="inline-flex items-center ml-2 text-amber-600" title="May not be supported by your personal details">
                            <AlertTriangle className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </span>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          navigator.clipboard.writeText(s).then(() => {
                            toast({ title: 'Copied!', description: 'Suggestion copied to clipboard.' });
                          }).catch(() => {
                            toast({ title: 'Copy failed', description: 'Could not copy to clipboard.', variant: 'destructive' });
                          });
                        }}
                      >
                        Copy
                      </Button>
                      <Button
                        variant="default"
                        size="xs"
                        onClick={() => applySuggestionToExperience(s)}
                      >
                        Apply
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">No suggestions available.</div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Resume Editor</CardTitle>
                <CardDescription>
                  Edit your tailored resume. Changes are saved locally on your device.
                </CardDescription>
              </div>
              {/* Show preview/edit toggles only on mobile/tablet */}
              <div className="lg:hidden">
                <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as 'preview' | 'edit')}>
                  <TabsList>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                    <TabsTrigger value="edit">Edit</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Mobile/tablet: toggle between preview and edit */}
            <div className="lg:hidden">
              <div className="min-h-96">
                <MDEditor
                  value={markdown}
                  onChange={(val) => setMarkdown(val || "")}
                  preview={editorMode}
                  hideToolbar={false}
                  data-color-mode="light"
                  height={isMobile ? 560 : 520}
                  style={{ fontSize: isMobile ? 16 : 14 }}
                />
              </div>
            </div>

            {/* Desktop: side-by-side */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-4">
              <div>
                <MDEditor
                  value={markdown}
                  onChange={(val) => setMarkdown(val || "")}
                  preview={'edit'}
                  hideToolbar={false}
                  data-color-mode="light"
                  height={600}
                  style={{ fontSize: 14 }}
                />
              </div>
              <div>
                <MDEditor
                  value={markdown}
                  onChange={() => {}}
                  preview={'preview'}
                  hideToolbar={true}
                  data-color-mode="light"
                  height={600}
                  style={{ fontSize: 14 }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {(derivedSkills.length > 0 || derivedKeywords.length > 0) && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Keyword Analysis</CardTitle>
                  <CardDescription>
                    Extracted skills and top keywords used for matching.
                  </CardDescription>
                </div>
                {typeof (resumeMeta.score ?? computedScore) === 'number' && (
                  <Badge variant="secondary">{(resumeMeta.score ?? computedScore)}% ATS</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {derivedSkills.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {derivedSkills.map((s) => (
                      <Badge key={s} variant="outline">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {derivedKeywords.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">JD Keywords</div>
                  <div className="flex flex-wrap gap-2">
                    {derivedKeywords.map((k) => (
                      <Badge key={k} variant="secondary">{k}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Score Explanations</CardTitle>
                <CardDescription>What ATS and Fit scores mean.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowScoreInfo(!showScoreInfo)}>
                {showScoreInfo ? 'Hide' : 'Learn more'}
              </Button>
            </div>
          </CardHeader>
          {showScoreInfo && (
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <div>
                <span className="font-medium text-foreground">ATS score:</span> Weighted keyword coverage. Rewards terms found in Skills, Experience, Summary, then anywhere else. Synonym-aware (e.g., JS → JavaScript). It’s a proxy for keyword alignment, not candidate quality.
              </div>
              <div>
                <span className="font-medium text-foreground">Fit score:</span> HR-style judgment of recruiter-screen likelihood given the JD and your résumé. Penalizes missing must‑haves and seniority mismatch. Uses qualitative signals; keep facts truthful.
              </div>
            </CardContent>
          )}
        </Card>

        {jobDescription && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Job Description</CardTitle>
                  <CardDescription>
                    The job description used to generate this resume.
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowJobDescription(!showJobDescription)}>
                  {showJobDescription ? 'Hide' : 'Show'}
                </Button>
              </div>
            </CardHeader>
            {showJobDescription && (
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {jobDescription}
                  </pre>
                </div>
              </CardContent>
            )}
          </Card>
        )}

      </div>
    </div>
  );
};

export default ResumeDetail;

// Heuristic claim checking: ensure enough tokens are present in canonical details
function isSuggestionSupported(s: string, canonical: string): boolean {
  const tokenize = (t: string) => t
    .toLowerCase()
    .replace(/[^a-z0-9+.#\-\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  const sTokens = new Set(tokenize(s));
  if (sTokens.size === 0) return true;
  const canonTokens = new Set(tokenize(canonical));
  let present = 0;
  for (const t of sTokens) if (canonTokens.has(t)) present++;
  const ratio = present / sTokens.size;
  return ratio >= 0.4; // require at least 40% term overlap
}

// Insert suggestion as a bullet at the top of the Experience section (best-effort)
function insertIntoExperience(md: string, suggestion: string): string {
  const lines = md.split(/\r?\n/);
  const headingIdx = lines.findIndex((l) => /^#{1,6}\s*experience\b/i.test(l.trim()));
  const bullet = `- ${suggestion}`;
  if (headingIdx === -1) {
    return md + `\n\n## Experience\n${bullet}\n`;
  }
  let end = lines.length;
  for (let i = headingIdx + 1; i < lines.length; i++) {
    if (/^#{1,6}\s+/.test(lines[i])) { end = i; break; }
  }
  // Insert after headingIdx, before first bullet block
  const before = lines.slice(0, headingIdx + 1);
  const section = lines.slice(headingIdx + 1, end);
  const after = lines.slice(end);
  return [...before, bullet, ...section, ...after].join('\n');
}

// no-op placeholder removed; applySuggestionToExperience is defined inside component
