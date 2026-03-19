"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronRight,
  ArrowLeft,
  ClipboardList,
} from "lucide-react";

interface Course {
  id: number;
  name: string;
  description: string;
}

interface Quiz {
  id: number;
  courseId: number;
  name: string;
  description: string;
}

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizQuestionCounts, setQuizQuestionCounts] = useState<Record<number, number>>({});
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCourse = async () => {
    const res = await fetch(`/api/courses/${courseId}`);
    if (res.ok) setCourse(await res.json());
  };

  const fetchQuizzes = async () => {
    setLoading(true);
    const res = await fetch(`/api/quizzes?courseId=${courseId}`);
    const data: Quiz[] = await res.json();
    setQuizzes(data);

    // Fetch question counts for each quiz
    const counts: Record<number, number> = {};
    await Promise.all(
      data.map(async (quiz) => {
        const r = await fetch(`/api/quizzes/${quiz.id}/questions`);
        const ids = await r.json();
        counts[quiz.id] = ids.length;
      })
    );
    setQuizQuestionCounts(counts);
    setLoading(false);
  };

  useEffect(() => {
    fetchCourse();
    fetchQuizzes();
  }, [courseId]);

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await fetch("/api/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        name: newName.trim(),
        description: newDescription.trim(),
      }),
    });

    setNewName("");
    setNewDescription("");
    fetchQuizzes();
  };

  const handleUpdateQuiz = async (id: number) => {
    if (!editName.trim()) return;

    await fetch(`/api/quizzes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), description: editDescription.trim() }),
    });

    setEditingId(null);
    fetchQuizzes();
  };

  const handleDeleteQuiz = async (id: number) => {
    if (!confirm("Delete this quiz and all its question assignments?")) return;
    await fetch(`/api/quizzes/${id}`, { method: "DELETE" });
    fetchQuizzes();
  };

  if (!course) {
    return <p className="text-muted-foreground py-8">Loading course...</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/courses"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Courses
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{course.name}</h1>
        {course.description && (
          <p className="text-muted-foreground mt-1">{course.description}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateQuiz} className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Quiz name"
                className="flex-1"
              />
              <Button type="submit">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
            />
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-muted-foreground py-8">Loading...</p>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No quizzes yet. Create one above to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <Card key={quiz.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {editingId === quiz.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateQuiz(quiz.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Description (optional)"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateQuiz(quiz.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleUpdateQuiz(quiz.id)}>
                        <Check className="h-4 w-4 text-green-600 mr-1" /> Save
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/courses/${courseId}/quizzes/${quiz.id}`}
                          className="text-lg font-semibold hover:underline"
                        >
                          {quiz.name}
                        </Link>
                        <Badge variant="secondary" className="text-xs">
                          {quizQuestionCounts[quiz.id] ?? 0} questions
                        </Badge>
                      </div>
                      {quiz.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                          {quiz.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(quiz.id);
                          setEditName(quiz.name);
                          setEditDescription(quiz.description);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteQuiz(quiz.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <Link href={`/courses/${courseId}/quizzes/${quiz.id}`}>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
