import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ResumeLibrary = () => {
  const resumes = useStore((state) => state.resumesIndex);
  const deleteResume = useStore((state) => state.deleteResume);
  const updateResume = useStore((state) => state.updateResume);
  const navigate = useNavigate();

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

  const handleView = (id: string) => {
    navigate(`/app/resume/${id}`);
  };

  const handleDelete = (id: string) => {
    deleteResume(id);
  };

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
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No resumes found</h2>
            <p className="text-muted-foreground mb-4">Create a new resume to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map(resume => (
            <Card key={resume.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{resume.title}</CardTitle>
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
                  <Button size="sm" onClick={() => handleView(resume.id)}>View</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(resume.id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResumeLibrary;
