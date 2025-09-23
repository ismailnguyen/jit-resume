import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Trash2 } from "lucide-react";

const ResumeLibrary = () => {
  const resumes = useStore((state) => state.resumesIndex);
  const settings = useStore((state) => state.settings);
  const personalMeta = useStore((state) => state.personalMeta);
  const deleteResume = useStore((state) => state.deleteResume);
  const updateResume = useStore((state) => state.updateResume);
  const navigate = useNavigate();
  const canUseResumes = !!settings.openAIApiKey; // access to library only depends on API key
  const canUseNewResume = !!settings.openAIApiKey && !!personalMeta && ((personalMeta.lengthBytes ?? 0) > 0);

  // No need to fetch resumes, store is reactive

  const [query, setQuery] = useState("");
  const allTags = Array.from(new Set(resumes.flatMap(r => r.tags || []))).sort();
  const [activeTags, setActiveTags] = useState<string[]>([]);

  type ApplicationStatus = 'applied' | 'not_applied' | 'unsuccessful' | 'successful';
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');

  const statusLabel = (s: ApplicationStatus) => {
    switch (s) {
      case 'applied': return 'Applied';
      case 'not_applied': return 'Not Applied';
      case 'unsuccessful': return 'Unsuccessful';
      case 'successful': return 'Successful';
      default: return 'Not Applied';
    }
  };

  const getEffectiveStatus = (s?: string | null): ApplicationStatus => {
    const allowed: ApplicationStatus[] = ['applied', 'not_applied', 'unsuccessful', 'successful'];
    return allowed.includes(s as any) ? (s as ApplicationStatus) : 'not_applied';
  };

  const filtered = resumes.filter(r => {
    const matchesQuery = !query.trim() || r.title.toLowerCase().includes(query.toLowerCase());
    const matchesTags = activeTags.length === 0 || (r.tags || []).some(t => activeTags.includes(t));
    const effectiveStatus: ApplicationStatus = getEffectiveStatus(r.applicationStatus);
    const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
    return matchesQuery && matchesTags && matchesStatus;
  });

  // Lightweight virtualization: incrementally render more on scroll
  const [visibleCount, setVisibleCount] = useState(30);
  useEffect(() => {
    setVisibleCount(30); // reset when filter changes
  }, [query, JSON.stringify(activeTags), statusFilter]);
  useEffect(() => {
    const onScroll = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
      if (nearBottom) setVisibleCount((c) => Math.min(c + 30, filtered.length));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll as any);
  }, [filtered.length]);

  const handleView = (id: string) => {
    navigate(`/app/resume/${id}`);
  };

  const handleDelete = (id: string) => {
    deleteResume(id);
  };

  // Route guard: block access until setup complete
  useEffect(() => {
    if (!canUseResumes) {
      navigate('/app');
    }
  }, [canUseResumes, navigate]);

  // No loading state needed

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold mb-4">Resume Library</h1>
      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-4 items-end">
        <div className="sm:col-span-2">
          <Label htmlFor="search">Search</Label>
          <Input id="search" placeholder="Search by title" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-1">Filter by tag</div>
          <div className="flex flex-wrap gap-2">
            {allTags.length === 0 ? (
              <span className="text-xs text-muted-foreground">No tags yet</span>
            ) : allTags.map(tag => (
              <button key={tag} className={`text-xs px-2 py-1 rounded border ${activeTags.includes(tag) ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`} onClick={() => setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}>{tag}</button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="status">Application Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ApplicationStatus | 'all')}>
            <SelectTrigger id="status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="not_applied">Not Applied</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
              <SelectItem value="unsuccessful">Unsuccessful</SelectItem>
              <SelectItem value="successful">Successful</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">No resumes found</h2>
              <p className="text-muted-foreground">Create a new resume to get started.</p>
            </div>
            <div>
              <Button asChild disabled={!canUseNewResume}>
                <Link to="/app/new">
                  <Plus className="h-4 w-4" />
                  New Resume
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.slice(0, visibleCount).map(resume => (
            <Card key={resume.id} className="transition-colors hover:border-[#7c3aed]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{resume.title}</CardTitle>
                    {(resume.company || resume.location) && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {[resume.company, resume.location].filter(Boolean).join(' • ')}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{statusLabel(getEffectiveStatus(resume.applicationStatus))}</Badge>
                    {typeof resume.fitScore === 'number' && (
                      <Badge variant="secondary">{resume.fitScore}% Fit</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-xs">Created: {new Date(resume.createdAt).toLocaleDateString()}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(resume.tags || []).map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 border rounded-full">
                        {t}
                        <button className="ml-1 text-muted-foreground hover:text-foreground" onClick={() => updateResume(resume.id, { tags: (resume.tags || []).filter(x => x !== t) })}>×</button>
                      </span>
                    ))}
                    <button
                      className="text-xs px-2 py-0.5 border rounded hover:bg-accent"
                      onClick={() => {
                        const tag = prompt('Add tag');
                        if (tag && tag.trim()) {
                          const next = Array.from(new Set([...(resume.tags || []), tag.trim()]));
                          updateResume(resume.id, { tags: next });
                        }
                      }}
                    >
                      + Add tag
                    </button>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" onClick={() => handleView(resume.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(resume.id)}
                    aria-label={`Delete resume ${resume.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  </div>
              </CardContent>
            </Card>
          ))}
          {visibleCount < filtered.length && (
            <div className="text-center text-xs text-muted-foreground py-2">Scroll to load more…</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeLibrary;
