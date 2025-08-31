import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { getResume, saveResume, getPersonalDetails } from "@/lib/storage";
import { ArrowLeft, Download, Save, Copy, FileText } from "lucide-react";
import MDEditor from '@uiw/react-md-editor';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { marked } from 'marked';
import { computeCoverageScore } from "@/lib/analysis";
import { assessFit } from "@/lib/openai";

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
  const [fitLoading, setFitLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  // Default to preview mode so users see the rendered résumé first
  const [editorMode, setEditorMode] = useState<'preview' | 'edit'>('preview');

  const resumeMeta = resumesIndex.find(r => r.id === id);

  useEffect(() => {
    if (id) {
      loadResume(id);
    }
  }, [id]);

  useEffect(() => {
    setHasChanges(markdown !== originalMarkdown);
  }, [markdown, originalMarkdown]);

  const loadResume = async (resumeId: string) => {
    try {
      const data = await getResume(resumeId);
      if (data) {
        setMarkdown(data.markdown);
        setOriginalMarkdown(data.markdown);
        setJobDescription(data.jdRaw);
        if (data.derived) {
          setDerivedSkills(data.derived.skills || []);
          setDerivedKeywords(data.derived.keywords || []);
        }
        if (data.fit) {
          setFitScore(typeof data.fit.score === 'number' ? data.fit.score : null);
          setFitSummary(data.fit.summary || "");
          setFitStrengths(Array.isArray(data.fit.strengths) ? data.fit.strengths : []);
          setFitGaps(Array.isArray(data.fit.gaps) ? data.fit.gaps : []);
          setFitSeniority((data.fit.seniority as any) ?? null);
        }
        // Compute on the fly for display (and to refresh on edits)
        const { score, jdKeywords, resumeSkills } = computeCoverageScore(data.jdRaw, data.markdown);
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
        const { score, jdKeywords, resumeSkills } = computeCoverageScore(jobDescription, markdown);
        await saveResume(id, {
          markdown,
          jdRaw: jobDescription,
          derived: { skills: resumeSkills, keywords: jdKeywords },
          fit: (resumeData as any).fit,
        });

        updateResume(id, {
          updatedAt: new Date().toISOString(),
          score,
        });

        setDerivedSkills(resumeSkills);
        setDerivedKeywords(jdKeywords);
        setComputedScore(score);
        setOriginalMarkdown(markdown);

        toast({
          title: "Saved!",
          description: "Your resume has been saved successfully.",
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

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdown).then(() => {
      toast({
        title: "Copied!",
        description: "Resume markdown copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    });
  };

  const handlePrint = () => {
    // Open only the rendered markdown resume in a new tab, then print
    const htmlContent = marked.parse(markdown);
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Resume PDF</title>
          <style>
            body { font-family: sans-serif; margin: 40px; }
            h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; }
            ul, ol { margin-left: 1.5em; }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
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
  <div className="p-6 max-w-6xl mx-auto space-y-6" id="resume-content">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/library")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {resumeMeta.title}
              {typeof (resumeMeta.score ?? computedScore) === 'number' && (
                <Badge variant="secondary">{(resumeMeta.score ?? computedScore)}% ATS</Badge>
              )}
              {typeof (resumeMeta.fitScore ?? fitScore) === 'number' && (
                <Badge variant="secondary">{(resumeMeta.fitScore ?? fitScore)}% Fit</Badge>
              )}
            </h1>
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
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleCopyMarkdown}>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Fit Analysis</CardTitle>
                <CardDescription>Assessment of candidate fit.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!settings.openAIApiKey) {
                    toast({ title: 'API Key Required', description: 'Set your OpenAI API key in Settings first.', variant: 'destructive' });
                    return;
                  }
                  if (!id) return;
                  setFitLoading(true);
                  try {
                    const canonical = await getPersonalDetails();
                    const result = await assessFit({
                      apiKey: settings.openAIApiKey,
                      model: settings.model,
                      jobDescription,
                      personalDetails: canonical || '',
                      generatedResume: markdown,
                    });
                    setFitScore(result.score ?? 0);
                    setFitSummary(result.summary || '');
                    setFitStrengths(result.strengths || []);
                    setFitGaps(result.gaps || []);
                    setFitSeniority((result.seniority as any) ?? null);

                    const current = await getResume(id);
                    if (current) {
                      await saveResume(id, {
                        markdown,
                        jdRaw: jobDescription,
                        derived: current.derived || { skills: [], keywords: [] },
                        fit: {
                          score: result.score ?? 0,
                          summary: result.summary || '',
                          strengths: result.strengths || [],
                          gaps: result.gaps || [],
                          seniority: (result.seniority as any) ?? undefined,
                        },
                      });
                      updateResume(id, { updatedAt: new Date().toISOString(), fitScore: result.score ?? 0 });
                    }
                  } catch (e) {
                    toast({ title: 'Fit Scoring Failed', description: e instanceof Error ? e.message : 'Could not compute fit.', variant: 'destructive' });
                  } finally {
                    setFitLoading(false);
                  }
                }}
                disabled={fitLoading}
              >
                {fitLoading ? 'Scoring...' : 'Re-score Fit'}
              </Button>
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Resume Editor</CardTitle>
                <CardDescription>
                  Edit your tailored resume. Changes are saved locally on your device.
                </CardDescription>
              </div>
              <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as 'preview' | 'edit')}>
                <TabsList>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-96">
              <MDEditor
                value={markdown}
                onChange={(val) => setMarkdown(val || "")}
                preview={editorMode}
                hideToolbar={false}
                data-color-mode="light"
                height={600}
              />
            </div>
          </CardContent>
        </Card>

        {(derivedSkills.length > 0 || derivedKeywords.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Keyword Analysis</CardTitle>
              <CardDescription>
                Extracted skills and top keywords used for matching.
              </CardDescription>
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

        {jobDescription && (
          <Card>
            <CardHeader>
              <CardTitle>Job Description</CardTitle>
              <CardDescription>
                The job description used to generate this resume.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {jobDescription}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
};

export default ResumeDetail;
