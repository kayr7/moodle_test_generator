"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Download, GripVertical } from "lucide-react";
import { SortableQuestion } from "@/components/quiz/sortable-question";
import { QuestionBankItem } from "@/components/quiz/question-bank-item";

interface QuestionRow {
  id: number;
  type: string;
  name: string;
  categoryId: number | null;
}

interface Category {
  id: number;
  name: string;
}

interface QuizInfo {
  id: number;
  name: string;
  description: string;
  courseId: number;
  course: { id: number; name: string } | null;
  questions: QuestionRow[];
}

const typeLabels: Record<string, string> = {
  multichoice: "Multiple Choice",
  truefalse: "True/False",
  shortanswer: "Short Answer",
  matching: "Matching",
  numerical: "Numerical",
  essay: "Essay",
};

function QuizDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "quiz-drop-zone" });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] space-y-2 rounded-lg border-2 border-dashed p-3 transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-muted"
      }`}
    >
      {children}
    </div>
  );
}

export default function QuizBuilderPage() {
  const params = useParams<{ id: string; quizId: string }>();
  const courseId = Number(params.id);
  const quizId = Number(params.quizId);

  const [quiz, setQuiz] = useState<QuizInfo | null>(null);
  const [allQuestions, setAllQuestions] = useState<QuestionRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [quizQuestionIds, setQuizQuestionIds] = useState<number[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [quizRes, questionsRes, categoriesRes, idsRes] = await Promise.all([
      fetch(`/api/quizzes/${quizId}`),
      fetch("/api/questions"),
      fetch("/api/categories"),
      fetch(`/api/quizzes/${quizId}/questions`),
    ]);

    if (quizRes.ok) {
      setQuiz(await quizRes.json());
    }
    setAllQuestions(await questionsRes.json());
    setCategories(await categoriesRes.json());
    setQuizQuestionIds(await idsRes.json());
    setLoading(false);
  }, [quizId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const quizQuestionSet = new Set(quizQuestionIds);

  const filteredBankQuestions = allQuestions.filter((q) => {
    if (search && !q.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && String(q.categoryId) !== categoryFilter) return false;
    if (typeFilter !== "all" && q.type !== typeFilter) return false;
    return true;
  });

  // Get quiz questions in order (from quizQuestionIds, which is sorted by sort_order)
  const quizQuestions = quizQuestionIds
    .map((id) => allQuestions.find((q) => q.id === id))
    .filter(Boolean) as QuestionRow[];

  const handleAddToQuiz = async (questionId: number) => {
    if (quizQuestionSet.has(questionId)) return;

    await fetch(`/api/quizzes/${quizId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId }),
    });

    // Optimistic update
    setQuizQuestionIds((prev) => [...prev, questionId]);
  };

  const handleRemoveFromQuiz = async (questionId: number) => {
    await fetch(`/api/quizzes/${quizId}/questions`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId }),
    });

    setQuizQuestionIds((prev) => prev.filter((id) => id !== questionId));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const activeIdStr = String(active.id);

    // Dragging from bank to quiz
    if (activeIdStr.startsWith("bank-")) {
      const questionId = active.data?.current?.questionId as number;
      if (questionId && !quizQuestionSet.has(questionId)) {
        await handleAddToQuiz(questionId);
      }
      return;
    }

    // Reordering within quiz
    const activeIndex = quizQuestionIds.indexOf(Number(active.id));
    const overIndex = quizQuestionIds.indexOf(Number(over.id));

    if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
      const newOrder = arrayMove(quizQuestionIds, activeIndex, overIndex);
      setQuizQuestionIds(newOrder);

      await fetch(`/api/quizzes/${quizId}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedQuestionIds: newOrder }),
      });
    }
  };

  const handleExport = async (format: "gift" | "xml") => {
    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, quizId }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "xml" ? `${quiz?.name || "quiz"}.xml` : `${quiz?.name || "quiz"}.gift.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get the active drag item info for overlay
  const activeDragItem = activeId?.startsWith("bank-")
    ? (() => {
        const qId = Number(activeId.replace("bank-", ""));
        return allQuestions.find((q) => q.id === qId);
      })()
    : (() => {
        const qId = Number(activeId);
        return allQuestions.find((q) => q.id === qId);
      })();

  if (loading) {
    return <p className="text-muted-foreground py-8">Loading quiz builder...</p>;
  }

  if (!quiz) {
    return <p className="text-muted-foreground py-8">Quiz not found.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/courses/${courseId}`}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to {quiz.course?.name || "Course"}
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{quiz.name}</h1>
          {quiz.description && (
            <p className="text-muted-foreground text-sm mt-0.5">{quiz.description}</p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("gift")}
            disabled={quizQuestionIds.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> GIFT
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("xml")}
            disabled={quizQuestionIds.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1" /> XML
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Panel: Question Bank */}
          <Card className="max-h-[calc(100vh-200px)] flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Question Bank ({allQuestions.length})
              </CardTitle>
              <div className="space-y-2 pt-2">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search questions..."
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(typeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-0 space-y-1.5">
              {filteredBankQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No questions match filters.
                </p>
              ) : (
                filteredBankQuestions.map((q) => (
                  <QuestionBankItem
                    key={q.id}
                    id={q.id}
                    name={q.name}
                    type={q.type}
                    isInQuiz={quizQuestionSet.has(q.id)}
                    onAdd={handleAddToQuiz}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Right Panel: Quiz Questions */}
          <Card className="max-h-[calc(100vh-200px)] flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Quiz Questions ({quizQuestions.length})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Drag questions here or use the + button. Reorder by dragging.
              </p>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-0">
              <QuizDropZone>
                {quizQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <GripVertical className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">Drag questions here or click + to add</p>
                  </div>
                ) : (
                  <SortableContext
                    items={quizQuestionIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {quizQuestions.map((q) => (
                      <SortableQuestion
                        key={q.id}
                        id={q.id}
                        name={q.name}
                        type={q.type}
                        onRemove={handleRemoveFromQuiz}
                      />
                    ))}
                  </SortableContext>
                )}
              </QuizDropZone>
            </CardContent>
          </Card>
        </div>

        <DragOverlay>
          {activeDragItem ? (
            <div className="flex items-center gap-2 rounded-lg border bg-card p-3 shadow-lg">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">{activeDragItem.name}</p>
              <Badge variant="outline" className="text-xs">
                {typeLabels[activeDragItem.type] || activeDragItem.type}
              </Badge>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
