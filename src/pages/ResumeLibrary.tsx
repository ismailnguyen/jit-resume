import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";

const ResumeLibrary = () => {
  const resumes = useStore((state) => state.resumesIndex);
  const deleteResume = useStore((state) => state.deleteResume);
  const navigate = useNavigate();

  // No need to fetch resumes, store is reactive

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
      {resumes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-xl font-semibold mb-2">No resumes found</h2>
            <p className="text-muted-foreground mb-4">Create a new resume to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {resumes.map(resume => (
            <Card key={resume.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{resume.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    {typeof resume.score === 'number' && (
                      <Badge variant="secondary">{resume.score}% ATS</Badge>
                    )}
                    {typeof resume.fitScore === 'number' && (
                      <Badge variant="secondary">{resume.fitScore}% Fit</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <div className="text-xs">Created: {new Date(resume.createdAt).toLocaleDateString()}</div>
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
