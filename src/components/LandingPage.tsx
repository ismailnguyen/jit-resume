import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Zap, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 lg:py-24">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl lg:text-7xl font-bold mb-6 text-gradient-hero leading-tight">
            Just-in-Time
            <br />
            Resumé
          </h1>
          <p className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Tailor your résumé to any job in seconds. ATS-friendly formatting meets AI-powered personalization.
            <span className="block mt-2 text-lg font-medium text-primary">
              Your data stays private in your browser.
            </span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              asChild
              size="lg"
              className="bg-gradient-hero hover:opacity-90 transition-smooth text-white border-0 shadow-glow text-lg px-8 py-6"
            >
              <Link to="/app">
                Start Generating
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-primary/20 hover:bg-primary/5 transition-smooth text-lg px-8 py-6"
            >
              See How It Works
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <Card className="bg-gradient-card border-0 shadow-medium hover:shadow-large transition-smooth">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Paste Your Details Once</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Maintain one canonical résumé in Markdown. Include all your experience, skills, and achievements.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-medium hover:shadow-large transition-smooth">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">AI-Powered Tailoring</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Paste any job description and get a perfectly tailored, ATS-optimized résumé in seconds.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-0 shadow-medium hover:shadow-large transition-smooth">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Privacy-First Design</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Everything stays in your browser. No servers, no accounts, no data collection. Just you and your résumés.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Trust Indicators */}
          <div className="mt-20 p-8 bg-muted/50 rounded-3xl">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Trusted by professionals at
              </p>
              <div className="flex justify-center items-center gap-8 text-muted-foreground/60 font-medium">
                <span>Google</span>
                <span>•</span>
                <span>Apple</span>
                <span>•</span>
                <span>Microsoft</span>
                <span>•</span>
                <span>Meta</span>
                <span>•</span>
                <span>Tesla</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Made with ❤️ — Your data stays in your browser.</p>
            <p className="mt-2">
              Open source • Privacy-first • No tracking
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;