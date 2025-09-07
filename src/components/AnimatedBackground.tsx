import { useEffect } from "react";
import { cn } from "@/lib/utils";

type AnimatedBackgroundProps = {
  className?: string;
};

/**
 * Animated SVG + soft glows matching the LandingPage background.
 * Renders as a non-interactive layer. Sets CSS vars --mx, --my, --scrollY
 * so parallax/animation responds to mouse and scroll across the app.
 */
const AnimatedBackground = ({ className }: AnimatedBackgroundProps) => {
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
    // initialize and bind listeners
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
      aria-hidden
    >
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

      {/* Floating parallax shapes */}
      <div className="pointer-events-none" aria-hidden>
        <div
          className="absolute -right-12 top-24 w-40 h-40 rounded-full bg-primary/10 blur-2xl"
          style={{
            transform:
              "translate3d(calc(var(--mx,0)*-12px), calc(var(--scrollY,0)*-0.07), 0)",
            willChange: "transform",
          }}
        />
        <div
          className="absolute -left-12 bottom-20 w-56 h-56 rounded-full bg-purple-500/10 blur-3xl"
          style={{
            transform:
              "translate3d(calc(var(--mx,0)*8px), calc(var(--scrollY,0)*-0.03), 0)",
            willChange: "transform",
          }}
        />
      </div>
    </div>
  );
};

export default AnimatedBackground;

