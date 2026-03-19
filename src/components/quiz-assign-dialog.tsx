"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ListPlus } from "lucide-react";

interface QuizInfo {
  id: number;
  name: string;
  courseName: string;
  courseId: number;
}

interface QuizAssignDialogProps {
  questionId: number;
  currentQuizIds: number[];
  onChanged: () => void;
  trigger?: React.ReactNode;
}

export function QuizAssignDialog({
  questionId,
  currentQuizIds,
  onChanged,
  trigger,
}: QuizAssignDialogProps) {
  const [open, setOpen] = useState(false);
  const [quizzes, setQuizzes] = useState<QuizInfo[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<number>>(new Set(currentQuizIds));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setAssignedIds(new Set(currentQuizIds));
      fetch("/api/quizzes")
        .then((r) => r.json())
        .then(setQuizzes);
    }
  }, [open, currentQuizIds]);

  const toggleQuiz = async (quizId: number, checked: boolean) => {
    setLoading(true);
    try {
      if (checked) {
        await fetch(`/api/quizzes/${quizId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId }),
        });
        setAssignedIds((prev) => new Set([...prev, quizId]));
      } else {
        await fetch(`/api/quizzes/${quizId}/questions`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId }),
        });
        setAssignedIds((prev) => {
          const next = new Set(prev);
          next.delete(quizId);
          return next;
        });
      }
      onChanged();
    } finally {
      setLoading(false);
    }
  };

  // Group quizzes by course
  const grouped = quizzes.reduce(
    (acc, q) => {
      const key = q.courseName;
      if (!acc[key]) acc[key] = [];
      acc[key].push(q);
      return acc;
    },
    {} as Record<string, QuizInfo[]>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <ListPlus className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign to Quizzes</DialogTitle>
        </DialogHeader>
        {quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No quizzes available. Create a quiz in a course first.
          </p>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {Object.entries(grouped).map(([courseName, courseQuizzes]) => (
              <div key={courseName}>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {courseName}
                </p>
                <div className="space-y-2 pl-2">
                  {courseQuizzes.map((quiz) => (
                    <label
                      key={quiz.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={assignedIds.has(quiz.id)}
                        disabled={loading}
                        onCheckedChange={(checked) =>
                          toggleQuiz(quiz.id, checked === true)
                        }
                      />
                      <span className="text-sm">{quiz.name}</span>
                      {assignedIds.has(quiz.id) && (
                        <Badge variant="secondary" className="text-xs">
                          assigned
                        </Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
