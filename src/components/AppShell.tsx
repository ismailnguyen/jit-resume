import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  User, 
  Library, 
  Plus, 
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: "New Resume", href: "/app/new", icon: Plus },
    { name: "Resume Library", href: "/app/library", icon: Library },
    { name: "Personal Details", href: "/app/personal", icon: User },
    { name: "Settings", href: "/app/settings", icon: Settings },
  ];

  return (
  <div className="min-h-screen bg-gradient-subtle lg:flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "w-72 flex-shrink-0 bg-card border-r shadow-large transition-transform lg:relative lg:z-0 lg:translate-x-0 lg:inset-0",
        sidebarOpen ? "fixed inset-y-0 left-0 z-50 translate-x-0" : "fixed inset-y-0 left-0 z-50 -translate-x-full lg:translate-x-0 lg:static"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b">
            <Link to="/app" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">JR</span>
              </div>
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
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
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
  <div className="flex-1">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b">
          <div className="flex h-16 items-center justify-between px-6">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 lg:flex-none">
              <h1 className="text-lg font-semibold truncate">
                {navigation.find(item => item.href === location.pathname)?.name || "Dashboard"}
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/app/new">
                  <Plus className="h-4 w-4 mr-1" />
                  New Resume
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;