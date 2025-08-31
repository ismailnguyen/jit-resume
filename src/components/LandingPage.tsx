import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Zap, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";

const LandingPage = () => {
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      document.documentElement.style.setProperty("--scrollY", `${y}`);
    };
    const onMouseMove = (e: MouseEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const nx = (e.clientX / w - 0.5) * 2; // -1..1
      const ny = (e.clientY / h - 0.5) * 2; // -1..1
      document.documentElement.style.setProperty("--mx", `${nx}`);
      document.documentElement.style.setProperty("--my", `${ny}`);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/60">
      {/* Animated full-screen hero */}
      <section className="relative h-[100svh] w-screen overflow-hidden">
        {/* Background animated SVG */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5b8def" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <radialGradient id="rg" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.12" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Soft radial glow */}
          <rect x="0" y="0" width="1440" height="900" fill="url(#rg)" />
          {/* Animated strokes */}
          <g stroke="url(#lg)" strokeWidth="2" fill="none" filter="url(#glow)">
            <path d="M0 700 C 300 600, 600 800, 900 700 S 1440 600, 1440 600" strokeDasharray="6 10">
              <animate attributeName="stroke-dashoffset" from="0" to="-200" dur="8s" repeatCount="indefinite" />
            </path>
            <path d="M0 500 C 300 400, 600 600, 900 500 S 1440 400, 1440 400" strokeDasharray="8 12" opacity="0.6">
              <animate attributeName="stroke-dashoffset" from="0" to="200" dur="10s" repeatCount="indefinite" />
            </path>
            <path d="M0 300 C 300 200, 600 400, 900 300 S 1440 200, 1440 200" strokeDasharray="10 14" opacity="0.4">
              <animate attributeName="stroke-dashoffset" from="0" to="-300" dur="12s" repeatCount="indefinite" />
            </path>
          </g>
        </svg>

        {/* Parallax foreground elements */}
        <img src="/logo.svg" alt="JIT Résumé" className="absolute left-1/2 top-12 w-16 h-16 opacity-90" style={{ transform: "translate(calc(-50% + (var(--mx,0) * 10px)), calc((var(--scrollY,0)*-0.05) + (var(--my,0) * 6px)))", willChange: "transform" }} />

        <div className="relative h-full flex items-center">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight" style={{ transform: "translate3d(calc(var(--mx,0)*8px), calc((var(--scrollY,0)*-0.08) + (var(--my,0)*4px)), 0)", willChange: "transform" }}>
                Just‑in‑Time Résumé
              </h1>
              <p className="text-lg lg:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed" style={{ transform: "translate3d(calc(var(--mx,0)*6px), calc((var(--scrollY,0)*-0.06) + (var(--my,0)*3px)), 0)", willChange: "transform" }}>
                Paste a job post and get a focused, job‑ready résumé in seconds. We highlight the right keywords, explain the fit, and suggest honest tweaks — all right in your browser.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center" style={{ transform: "translate3d(calc(var(--mx,0)*4px), calc((var(--scrollY,0)*-0.04) + (var(--my,0)*2px)), 0)", willChange: "transform" }}>
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-hero hover:opacity-90 transition-smooth text-white border-0 shadow-glow text-lg px-8 py-6"
                >
                  <Link to="/app">
                    Get my job‑ready résumé
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating parallax shapes */}
        <div className="pointer-events-none" aria-hidden>
          <div className="absolute -right-12 top-24 w-40 h-40 rounded-full bg-primary/10 blur-2xl" style={{ transform: "translate3d(calc(var(--mx,0)*-12px), calc(var(--scrollY,0)*-0.07), 0)", willChange: "transform" }} />
          <div className="absolute -left-12 bottom-20 w-56 h-56 rounded-full bg-purple-500/10 blur-3xl" style={{ transform: "translate3d(calc(var(--mx,0)*8px), calc(var(--scrollY,0)*-0.03), 0)", willChange: "transform" }} />
        </div>

        {/* Subtle scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
          <span className="inline-block animate-bounce">Scroll</span>
        </div>
      </section>

      {/* Content below hero */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
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
              <h3 className="text-xl font-semibold mb-4">AI‑Powered Tailoring</h3>
              <p className="text-muted-foreground leading-relaxed">
                Paste any job description and get a perfectly tailored, ATS‑optimized résumé in seconds.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-card border-0 shadow-medium hover:shadow-large transition-smooth">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Privacy‑First Design</h3>
              <p className="text-muted-foreground leading-relaxed">
                Everything stays in your browser. No servers, no accounts, no data collection. Just you and your résumés.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-muted-foreground">
            <p>Made with AI — Your data stays in your browser.</p>
            <p className="mt-2">Open source • Privacy‑first • No tracking</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
