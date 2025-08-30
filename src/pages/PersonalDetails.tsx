import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { savePersonalDetails, getPersonalDetails } from "@/lib/storage";
import { Save, Download, FileText } from "lucide-react";
import MDEditor from '@uiw/react-md-editor';

const TEMPLATE_CONTENT = `# Personal Details
- **Full Name:** Your Full Name
- **Email:** your.email@example.com
- **Phone:** +1 (555) 123-4567
- **Location:** City, State, Country
- **LinkedIn:** linkedin.com/in/yourprofile
- **GitHub:** github.com/yourusername
- **Website:** yourwebsite.com

# Summary
A results-driven professional with X years of experience in [your field]. Passionate about [key areas] and committed to delivering exceptional results through [key skills/approaches].

# Skills

## Technical Skills
- **Programming:** JavaScript, Python, React, Node.js
- **Tools:** Git, Docker, AWS, MongoDB
- **Design:** Figma, Adobe Creative Suite

## Soft Skills  
- Project Management, Team Leadership, Problem Solving, Communication

# Experience

## Company Name — Senior Position Title (2022 - Present)
- Led a team of 5 engineers to deliver a critical product feature, resulting in 40% increase in user engagement
- Implemented automated testing framework, reducing deployment time by 60%
- **Tech:** React, TypeScript, AWS, PostgreSQL

## Previous Company — Position Title (2020 - 2022)
- Developed and launched 3 major features serving 100K+ users
- Collaborated with cross-functional teams to improve product performance by 25%
- **Tech:** Python, Django, Redis, Docker

# Education
- **Master of Science in Computer Science** — University Name (2020)
- **Bachelor of Science in Computer Science** — University Name (2018)

# Certifications
- AWS Certified Solutions Architect (2023)
- Certified Scrum Master (2022)

# Awards & Recognition
- Employee of the Year (2023)
- Outstanding Performance Award (2021)

# Volunteer & Open Source
- **Open Source Contributor** — Contributed to popular JavaScript libraries (2020-Present)
- **Volunteer Coding Instructor** — Local coding bootcamp (2019-Present)

# Languages
- **English:** Native
- **Spanish:** Conversational
- **French:** Basic

# Interests
Photography, Hiking, Technology Blogging, Chess`;

const PersonalDetails = () => {
  const { personalMeta, setPersonalMeta } = useStore();
  const { toast } = useToast();
  const [markdown, setMarkdown] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPersonalDetails();
  }, []);

  const loadPersonalDetails = async () => {
    try {
      const data = await getPersonalDetails();
      if (data) {
        setMarkdown(data);
      } else {
        setMarkdown(TEMPLATE_CONTENT);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load personal details. Starting with template.",
        variant: "destructive",
      });
      setMarkdown(TEMPLATE_CONTENT);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePersonalDetails(markdown);
      
      const meta = {
        updatedAt: new Date().toISOString(),
        lengthBytes: new TextEncoder().encode(markdown).length,
      };
      
      setPersonalMeta(meta);
      
      toast({
        title: "Saved!",
        description: "Your personal details have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save personal details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const insertTemplate = () => {
    setMarkdown(TEMPLATE_CONTENT);
    toast({
      title: "Template Inserted",
      description: "You can now customize the template with your information.",
    });
  };

  const exportAsText = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'personal-details.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Personal Details</h1>
          <p className="text-muted-foreground">
            Your master résumé with all your experience, skills, and achievements.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportAsText}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {personalMeta && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Last updated: {new Date(personalMeta.updatedAt).toLocaleString()}</span>
              <span>{(personalMeta.lengthBytes / 1024).toFixed(1)}KB</span>
            </div>
          </CardContent>
        </Card>
      )}

      {!personalMeta && markdown === TEMPLATE_CONTENT && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Getting Started
            </CardTitle>
            <CardDescription>
              Replace the template below with your actual information. This will be used to generate
              tailored résumés for specific job applications.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Markdown Editor</h2>
          {markdown === TEMPLATE_CONTENT && (
            <Button variant="outline" size="sm" onClick={insertTemplate}>
              <FileText className="h-4 w-4 mr-1" />
              Reset Template
            </Button>
          )}
        </div>
        
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
        
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">💡 Pro Tips:</p>
          <ul className="space-y-1">
            <li>• Use bullet points with metrics and achievements</li>
            <li>• Include specific technologies and tools you've used</li>
            <li>• Keep job descriptions focused on impact and results</li>
            <li>• Use action verbs: "Led", "Implemented", "Delivered", "Optimized"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PersonalDetails;