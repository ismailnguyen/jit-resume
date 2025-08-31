import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { getResume, saveResume } from "@/lib/storage";
import { ArrowLeft, Download, Save, Copy, FileText } from "lucide-react";
import MDEditor from '@uiw/react-md-editor';
import { marked } from 'marked';

const ResumeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { resumesIndex, updateResume } = useStore();
  const { toast } = useToast();
  
  const [markdown, setMarkdown] = useState("");
  const [originalMarkdown, setOriginalMarkdown] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

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
        await saveResume(id, {
          ...resumeData,
          markdown,
        });
        
        updateResume(id, {
          updatedAt: new Date().toISOString(),
        });
        
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
            <h1 className="text-2xl font-bold">{resumeMeta.title}</h1>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {resumeMeta.companyGuess && (
                <Badge variant="secondary">{resumeMeta.companyGuess}</Badge>
              )}
              {resumeMeta.jobTitleGuess && (
                <Badge variant="outline">{resumeMeta.jobTitleGuess}</Badge>
              )}
              <span>•</span>
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
            <CardTitle>Resume Editor</CardTitle>
            <CardDescription>
              Edit your tailored resume. Changes are saved locally on your device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-h-96">
              <MDEditor
                value={markdown}
                onChange={(val) => setMarkdown(val || "")}
                preview="edit"
                hideToolbar={false}
                data-color-mode="light"
                height={600}
              />
            </div>
          </CardContent>
        </Card>

        {jobDescription && (
          <Card>
            <CardHeader>
              <CardTitle>Original Job Description</CardTitle>
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