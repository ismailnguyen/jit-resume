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
import { generateResume } from "@/lib/openai";
import { saveResume } from "@/lib/storage";
import { getPersonalDetails } from "@/lib/storage";
import { nanoid } from "nanoid";
import { FileText, Wand2, Sparkles } from "lucide-react";

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
  const [language, setLanguage] = useState<'auto' | 'en' | 'fr' | 'de' | 'es'>('auto');
  const [generating, setGenerating] = useState(false);

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

      // Generate resume
      const generatedMarkdown = await generateResume({
        apiKey: settings.openAIApiKey,
        model: settings.model,
        personalDetails,
        jobDescription,
        language: language === 'auto' ? settings.defaultLanguage : language,
        pdfTheme: settings.pdfTheme,
        includeContactLinks: settings.includeContactLinks,
        anonymizeLocation: settings.anonymizeLocation,
      });

      // Create resume record
      const resumeId = nanoid();
      const now = new Date().toISOString();
      
      const resumeMeta = {
        id: resumeId,
        title: title.trim(),
        createdAt: now,
        updatedAt: now,
        language,
      };

      // Save to storage
      await saveResume(resumeId, {
        markdown: generatedMarkdown,
        jdRaw: jobDescription,
        derived: { skills: [], keywords: [] }, // TODO: implement scoring
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
                  <SelectItem value="auto">Auto (from settings)</SelectItem>
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
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={insertSample}>
                Insert Sample
              </Button>
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