import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  User, 
  Library, 
  Plus, 
  Menu,
  X,
  LayoutDashboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import AnimatedBackground from "@/components/AnimatedBackground";
import { useStore } from "@/lib/store";

const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { settings, personalMeta } = useStore();
  const hasApiKey = !!settings.openAIApiKey;
  const hasPersonal = !!personalMeta && ((personalMeta.lengthBytes ?? 0) > 0);
  const canUseNewResume = hasApiKey && hasPersonal;
  const canUseLibrary = hasApiKey;
  
  // Keyboard shortcuts: Cmd/Ctrl+N (new), Cmd/Ctrl+L (library)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        if (canUseNewResume) window.location.assign('/app/new');
      } else if (key === 'l') {
        e.preventDefault();
        if (canUseLibrary) window.location.assign('/app/library');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canUseNewResume, canUseLibrary]);

  const navigation = [
    { name: "New Resume", href: "/app/new", icon: Plus, requiresSetup: true },
    { name: "Dashboard", href: "/app", icon: LayoutDashboard },
    { name: "Resume Library", href: "/app/library", icon: Library, requiresSetup: true },
    { name: "Personal Details", href: "/app/personal", icon: User },
    { name: "Settings", href: "/app/settings", icon: Settings },
  ] as const;

  return (
  <div className="relative min-h-screen bg-gradient-subtle">
      {/* Animated background layer */}
      <AnimatedBackground className="z-0" />

      {/* Foreground app layout */}
      <div className="relative z-10 lg:flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "w-72 flex-shrink-0 border-none transition-transform lg:sticky lg:top-0 lg:h-screen lg:z-0 lg:translate-x-0 lg:inset-0",
        sidebarOpen ? "fixed inset-y-0 left-0 z-50 translate-x-0" : "fixed inset-y-0 left-0 z-50 -translate-x-full lg:translate-x-0 lg:sticky lg:top-0"
      )}>
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b">
            <Link to="/app" className="flex items-center space-x-2">
              <img src="/logo.svg" alt="JIT Résumé" className="w-8 h-8 rounded-lg" />
              <span className="text-lg font-semibold">Just-in-Time Resumé</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              const disabled = item.href === '/app/new'
                ? !canUseNewResume
                : item.href === '/app/library'
                  ? !canUseLibrary
                  : false;
              
              return (
                disabled ? (
                  <div
                    key={item.name}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-50 cursor-not-allowed",
                      isActive
                        ? "border-2 border-muted text-muted-foreground"
                        : "text-muted-foreground"
                    )}
                    aria-disabled
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth motion-reduce:transition-none motion-reduce:transform-none",
                      isActive
                        ? "border-2 border-primary text-muted-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t text-xs text-muted-foreground">
            <p>Everything stays in your browser</p>
            <p className="mt-1">Private • Secure • No tracking</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 bg-card md:ml-2 md:mr-2 md:mt-2 md:rounded-tl-[16px] md:rounded-tr-[16px] md:shadow-xl">
        <Outlet />
      </div>
      </div>
    </div>
  );
};

export default AppShell;
