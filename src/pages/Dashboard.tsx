import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { Plus, User, Settings, AlertTriangle, ChevronRight } from "lucide-react";

const Dashboard = () => {
  const { settings, resumesIndex, personalMeta, firstRunSeen, setFirstRunSeen } = useStore();

  const hasApiKey = !!settings.openAIApiKey;
  const hasPersonalDetails = !!personalMeta;
  const resumeCount = resumesIndex.length;
  const statusCounts = resumesIndex.reduce<Record<string, number>>((acc, r) => {
    const s = (r.applicationStatus || 'not_applied');
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const fitBuckets = [
    { label: '0–49', min: 0, max: 49 },
    { label: '50–59', min: 50, max: 59 },
    { label: '60–69', min: 60, max: 69 },
    { label: '70–79', min: 70, max: 79 },
    { label: '80–100', min: 80, max: 100 },
  ].map(b => ({
    ...b,
    count: resumesIndex.filter(r => typeof r.fitScore === 'number' && (r.fitScore as number) >= b.min && (r.fitScore as number) <= b.max).length,
  }));

  // Compute first-run steps and which remain
  const steps = [
    { key: 'api', title: 'Add API Key', done: !!settings.openAIApiKey, href: '/app/settings', description: 'Enable AI generation' },
    { key: 'personal', title: 'Add Personal Details', done: !!personalMeta, href: '/app/personal', description: 'Create your canonical resume' },
    { key: 'first', title: 'Generate Your First Resume', done: resumesIndex.length > 0, href: '/app/new', description: 'Paste a JD and go' },
  ];
  const remaining = steps.filter(s => !s.done);
  const showQuickStart = !firstRunSeen && remaining.length > 0;

  return (
  <div className="p-6 w-full">
      {/* First-run Guide */}
      {showQuickStart && (
        <div className="mb-6 rounded-lg border shadow-medium bg-background">
          <div className="p-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Quick Start</h2>
              <p className="text-sm text-muted-foreground">{remaining.length} step{remaining.length>1?'s':''} to finish setup.</p>
            </div>
            <button className="text-sm text-muted-foreground hover:underline" onClick={() => setFirstRunSeen(true)}>Dismiss</button>
          </div>
          <div className="px-4 pb-4 grid gap-3 md:grid-cols-3">
            {steps.map((s) => (
              <GuideStep key={s.key} title={s.title} description={s.description} href={s.href} done={s.done} />
            ))}
          </div>
        </div>
      )}
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-muted-foreground">
          Ready to create your next tailored résumé? Here's what you can do.
        </p>
      </div>

      {/* Analytics */}
      {resumeCount > 0 && (
        <div className="mb-8 mt-8 grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Applications by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {['not_applied','applied','unsuccessful','successful'].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className="w-28 capitalize text-muted-foreground">{s.replace('_',' ')}</div>
                    <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${((statusCounts[s]||0)/Math.max(1,resumeCount))*100}%` }} />
                    </div>
                    <div className="w-8 text-right tabular-nums">{statusCounts[s]||0}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Fit Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {fitBuckets.map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <div className="w-16 text-muted-foreground">{b.label}</div>
                    <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${((b.count)/Math.max(1,resumeCount))*100}%` }} />
                    </div>
                    <div className="w-8 text-right tabular-nums">{b.count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Setup Status Cards */}
      {(!hasApiKey || !hasPersonalDetails) && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 text-warning mr-2" />
            Complete Your Setup
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {!hasApiKey && (
              <Card className="border-warning/20 bg-warning/5">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2" />
                    Add OpenAI API Key
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    You'll need an OpenAI API key to generate tailored résumés.
                  </p>
                  <Button asChild>
                    <Link to="/app/settings">
                      Go to Settings
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {!hasPersonalDetails && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Add Personal Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your master résumé with all your experience and skills.
                  </p>
                  <Button asChild>
                    <Link to="/app/personal">
                      Add Details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create New Resume */}
        <Card className={cn(
          "bg-gradient-card hover:shadow-large transition-smooth cursor-pointer",
          hasApiKey && hasPersonalDetails 
            ? "border-primary/20 hover:border-primary/40"
            : "opacity-50"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="h-5 w-5 mr-2 text-primary" />
              Create New Resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Paste a job description and generate a tailored résumé in seconds.
            </p>
            <Button 
              asChild 
              className="w-full"
              disabled={!hasApiKey || !hasPersonalDetails}
            >
              <Link to="/app/new">
                Start Creating
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Resume Library */}
        <Card className="bg-gradient-card hover:shadow-large transition-smooth">
          <CardHeader>
            <CardTitle>Resume Library</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary mb-2">
              {resumeCount}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {resumeCount === 1 ? "Resume saved" : "Resumes saved"}
            </p>
            <Button variant="outline" asChild className="w-full">
              <Link to="/app/library">
                View Library
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Personal Details */}
        <Card className="bg-gradient-card hover:shadow-large transition-smooth">
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              {hasPersonalDetails 
                ? `Last updated ${new Date(personalMeta.updatedAt).toLocaleDateString()}`
                : "Not set up yet"
              }
            </div>
            <Button variant="outline" asChild className="w-full">
              <Link to="/app/personal">
                {hasPersonalDetails ? "Edit Details" : "Add Details"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Resumes */}
      {resumeCount > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Recent Resumes</h2>
          <div className="grid gap-4">
            {resumesIndex.slice(0, 3).map((resume) => (
              <Card key={resume.id} className="hover:shadow-medium transition-smooth">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{resume.title}</h3>
                      {(resume.company || resume.location) && (
                        <div className="text-xs text-muted-foreground">
                          {[resume.company, resume.location].filter(Boolean).join(' • ')}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(resume.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/app/resume/${resume.id}`}>
                        Edit
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Import cn function
import { cn } from "@/lib/utils";

export default Dashboard;

function GuideStep({ title, description, href, done, onClick }: { title: string; description: string; href: string; done?: boolean; onClick?: () => void }) {
  return (
    <Link to={href} onClick={onClick} className={`flex items-center justify-between rounded-md border p-3 hover:bg-accent transition-smooth ${done ? 'opacity-20 cursor-not-allowed' : ''}`}>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
