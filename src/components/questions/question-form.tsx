"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, GripVertical, Save, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import type { QuestionType, Answer, MatchingPair } from "@/lib/types";
import { validateMultichoiceFractions } from "@/lib/validation";
import { useQuestionNav } from "@/hooks/use-question-nav";
import Link from "next/link";

interface Category {
  id: number;
  name: string;
}

interface QuestionFormProps {
  questionId?: number;
}

const questionTypes: { value: QuestionType; label: string }[] = [
  { value: "multichoice", label: "Multiple Choice" },
  { value: "truefalse", label: "True/False" },
  { value: "shortanswer", label: "Short Answer" },
  { value: "matching", label: "Matching" },
  { value: "numerical", label: "Numerical" },
  { value: "essay", label: "Essay" },
];

export function QuestionForm({ questionId }: QuestionFormProps) {
  const router = useRouter();
  const isEditing = !!questionId;
  const { prevId, nextId, currentIndex, total, hasNav } = useQuestionNav(questionId);

  const [type, setType] = useState<QuestionType>("multichoice");
  const [name, setName] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [generalFeedback, setGeneralFeedback] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [singleAnswer, setSingleAnswer] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  // Answers for MC, TF, SA, Numerical
  const [answers, setAnswers] = useState<Answer[]>([
    { answerText: "", fraction: 100, feedback: "", sortOrder: 0 },
    { answerText: "", fraction: 0, feedback: "", sortOrder: 1 },
  ]);

  // Matching pairs
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>([
    { subText: "", answerText: "", sortOrder: 0 },
    { subText: "", answerText: "", sortOrder: 1 },
    { subText: "", answerText: "", sortOrder: 2 },
  ]);

  // Numerical tolerance
  const [tolerance, setTolerance] = useState("0");

  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImages, setExistingImages] = useState<{ id: number; filePath: string; originalName: string }[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (questionId) {
      fetch(`/api/questions/${questionId}`)
        .then((r) => r.json())
        .then((data) => {
          setType(data.type);
          setName(data.name);
          setQuestionText(data.questionText);
          setGeneralFeedback(data.generalFeedback || "");
          setCategoryId(data.categoryId ? String(data.categoryId) : "");
          setSingleAnswer(data.singleAnswer);

          if (data.answers?.length > 0) {
            setAnswers(data.answers);
          }
          if (data.matchingPairs?.length > 0) {
            setMatchingPairs(data.matchingPairs);
          }
          if (data.numericalOptions?.length > 0) {
            setTolerance(String(data.numericalOptions[0].tolerance));
          }
          if (data.images?.length > 0) {
            setExistingImages(data.images);
          }
        })
        .catch(() => {});
    }
  }, [questionId]);

  // When type changes, reset answers to defaults
  const handleTypeChange = (newType: QuestionType) => {
    setType(newType);
    if (newType === "truefalse") {
      setAnswers([
        { answerText: "true", fraction: 100, feedback: "", sortOrder: 0 },
        { answerText: "false", fraction: 0, feedback: "", sortOrder: 1 },
      ]);
    } else if (newType === "essay") {
      setAnswers([]);
    } else if (newType === "multichoice" || newType === "shortanswer") {
      if (!isEditing) {
        setAnswers([
          { answerText: "", fraction: 100, feedback: "", sortOrder: 0 },
          { answerText: "", fraction: 0, feedback: "", sortOrder: 1 },
        ]);
      }
    } else if (newType === "numerical") {
      if (!isEditing) {
        setAnswers([{ answerText: "", fraction: 100, feedback: "", sortOrder: 0 }]);
        setTolerance("0");
      }
    }
  };

  const addAnswer = () => {
    setAnswers([
      ...answers,
      { answerText: "", fraction: 0, feedback: "", sortOrder: answers.length },
    ]);
  };

  const removeAnswer = (index: number) => {
    setAnswers(answers.filter((_, i) => i !== index));
  };

  const updateAnswer = (index: number, field: keyof Answer, value: string | number) => {
    const updated = [...answers];
    updated[index] = { ...updated[index], [field]: value };
    setAnswers(updated);
  };

  const addMatchingPair = () => {
    setMatchingPairs([
      ...matchingPairs,
      { subText: "", answerText: "", sortOrder: matchingPairs.length },
    ]);
  };

  const removeMatchingPair = (index: number) => {
    setMatchingPairs(matchingPairs.filter((_, i) => i !== index));
  };

  const updateMatchingPair = (
    index: number,
    field: keyof MatchingPair,
    value: string
  ) => {
    const updated = [...matchingPairs];
    updated[index] = { ...updated[index], [field]: value };
    setMatchingPairs(updated);
  };

  const saveQuestion = useCallback(async (): Promise<boolean> => {
    // Validate multichoice fractions before submitting
    if (type === "multichoice") {
      const nonEmptyAnswers = answers.filter((a) => a.answerText.trim() !== "");
      const error = validateMultichoiceFractions(nonEmptyAnswers);
      if (error) {
        alert(error);
        return false;
      }
    }

    setSaving(true);

    const payload: Record<string, unknown> = {
      type,
      name: name || questionText.substring(0, 80),
      questionText,
      generalFeedback,
      categoryId: categoryId ? Number(categoryId) : null,
      singleAnswer: type === "multichoice" ? singleAnswer : true,
    };

    if (type === "matching") {
      payload.matchingPairs = matchingPairs.filter(
        (p) => p.subText.trim() && p.answerText.trim()
      );
    } else if (type !== "essay") {
      payload.answers = answers.filter((a) => a.answerText.trim());
    }

    if (type === "numerical") {
      payload.numericalOptions = { tolerance: parseFloat(tolerance) || 0 };
    }

    try {
      const url = isEditing ? `/api/questions/${questionId}` : "/api/questions";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");

      const saved = await res.json();

      // Upload image if selected
      if (imageFile && saved.id) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("questionId", String(saved.id));
        await fetch("/api/upload", { method: "POST", body: formData });
      }

      return true;
    } catch {
      alert("Failed to save question");
      return false;
    } finally {
      setSaving(false);
    }
  }, [type, name, questionText, generalFeedback, categoryId, singleAnswer, answers, matchingPairs, tolerance, isEditing, questionId, imageFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await saveQuestion();
    if (ok) router.push("/questions");
  };

  const handleSaveAndNext = async () => {
    if (nextId === null) return;
    const ok = await saveQuestion();
    if (ok) router.push(`/questions/${nextId}/edit`);
  };

  // Keyboard shortcuts for prev/next navigation
  useEffect(() => {
    if (!hasNav || !isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.altKey && e.key === "ArrowLeft" && prevId !== null) {
        e.preventDefault();
        router.push(`/questions/${prevId}/edit`);
      } else if (e.altKey && e.key === "ArrowRight" && nextId !== null) {
        e.preventDefault();
        router.push(`/questions/${nextId}/edit`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasNav, isEditing, prevId, nextId, router]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/questions">
            <Button variant="ghost" size="icon" type="button">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Edit Question" : "New Question"}
          </h1>
        </div>

        {hasNav && isEditing && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              type="button"
              disabled={prevId === null}
              onClick={() => prevId !== null && router.push(`/questions/${prevId}/edit`)}
              title="Previous question (Alt+←)"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums min-w-[60px] text-center">
              {currentIndex + 1} / {total}
            </span>
            <Button
              variant="outline"
              size="icon"
              type="button"
              disabled={nextId === null}
              onClick={() => nextId !== null && router.push(`/questions/${nextId}/edit`)}
              title="Next question (Alt+→)"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Question Type */}
      <Card>
        <CardHeader>
          <CardTitle>Question Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {questionTypes.map((qt) => (
              <Button
                key={qt.value}
                type="button"
                variant={type === qt.value ? "default" : "outline"}
                className="justify-start"
                onClick={() => handleTypeChange(qt.value)}
              >
                {qt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Question Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Question Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="A short name for this question"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="questionText">Question Text *</Label>
            <Textarea
              id="questionText"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter the question text (HTML supported)"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="No category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Attach Image</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          {existingImages.length > 0 && (
            <div className="space-y-2">
              <Label>Existing Images</Label>
              <div className="flex gap-2 flex-wrap">
                {existingImages.map((img) => (
                  <div key={img.id} className="text-sm text-muted-foreground border rounded p-2">
                    {img.originalName}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="generalFeedback">General Feedback</Label>
            <Textarea
              id="generalFeedback"
              value={generalFeedback}
              onChange={(e) => setGeneralFeedback(e.target.value)}
              placeholder="Feedback shown after answering"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Type-specific answers */}
      {type === "multichoice" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Answer Options</CardTitle>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!singleAnswer}
                    onChange={(e) => setSingleAnswer(!e.target.checked)}
                    className="rounded"
                  />
                  Allow multiple answers
                </label>
                <Button type="button" variant="outline" size="sm" onClick={addAnswer}>
                  <Plus className="h-4 w-4 mr-1" /> Add Option
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {answers.map((answer, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="mt-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={answer.answerText}
                      onChange={(e) => updateAnswer(i, "answerText", e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={answer.fraction}
                      onChange={(e) =>
                        updateAnswer(i, "fraction", parseFloat(e.target.value) || 0)
                      }
                      className="w-24"
                      placeholder="Grade %"
                      min={-100}
                      max={100}
                    />
                  </div>
                  <Input
                    value={answer.feedback || ""}
                    onChange={(e) => updateAnswer(i, "feedback", e.target.value)}
                    placeholder="Feedback for this option"
                    className="text-sm"
                  />
                </div>
                {answers.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAnswer(i)}
                    className="mt-1"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {(() => {
              const nonEmptyAnswers = answers.filter((a) => a.answerText.trim() !== "");
              const positiveSum = nonEmptyAnswers
                .filter((a) => a.fraction > 0)
                .reduce((sum, a) => sum + a.fraction, 0);
              const negativeSum = nonEmptyAnswers
                .filter((a) => a.fraction < 0)
                .reduce((sum, a) => sum + a.fraction, 0);
              const isValid = Math.abs(positiveSum - 100) <= 0.01;

              return (
                <div className="space-y-1.5">
                  <div className={`flex items-center gap-2 text-sm font-medium rounded-md px-3 py-2 ${
                    isValid
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                      : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"
                  }`}>
                    <span>{isValid ? "✓" : "!"}</span>
                    <span>
                      Positive grades sum: {positiveSum}%
                      {!isValid && " (must be 100%)"}
                    </span>
                    {negativeSum < 0 && (
                      <span className="ml-auto text-xs opacity-75">
                        Penalties: {negativeSum}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Correct answer grades must sum to exactly 100%. Use partial
                    grades (e.g. 50 + 50) for multiple correct answers. Negative
                    values are penalties for wrong answers and don&apos;t count toward the 100%.
                  </p>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {type === "truefalse" && (
        <Card>
          <CardHeader>
            <CardTitle>Correct Answer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                type="button"
                variant={answers[0]?.fraction === 100 ? "default" : "outline"}
                className="flex-1"
                onClick={() =>
                  setAnswers([
                    { answerText: "true", fraction: 100, feedback: answers[0]?.feedback || "", sortOrder: 0 },
                    { answerText: "false", fraction: 0, feedback: answers[1]?.feedback || "", sortOrder: 1 },
                  ])
                }
              >
                True
              </Button>
              <Button
                type="button"
                variant={answers[1]?.fraction === 100 ? "default" : "outline"}
                className="flex-1"
                onClick={() =>
                  setAnswers([
                    { answerText: "true", fraction: 0, feedback: answers[0]?.feedback || "", sortOrder: 0 },
                    { answerText: "false", fraction: 100, feedback: answers[1]?.feedback || "", sortOrder: 1 },
                  ])
                }
              >
                False
              </Button>
            </div>
            <div className="space-y-2">
              <Input
                value={answers[0]?.feedback || ""}
                onChange={(e) => updateAnswer(0, "feedback", e.target.value)}
                placeholder="Feedback for True"
              />
              <Input
                value={answers[1]?.feedback || ""}
                onChange={(e) => updateAnswer(1, "feedback", e.target.value)}
                placeholder="Feedback for False"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {type === "shortanswer" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Acceptable Answers</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addAnswer}>
                <Plus className="h-4 w-4 mr-1" /> Add Answer
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {answers.map((answer, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={answer.answerText}
                  onChange={(e) => updateAnswer(i, "answerText", e.target.value)}
                  placeholder="Accepted answer"
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={answer.fraction}
                  onChange={(e) =>
                    updateAnswer(i, "fraction", parseFloat(e.target.value) || 0)
                  }
                  className="w-24"
                  placeholder="Grade %"
                  min={0}
                  max={100}
                />
                {answers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAnswer(i)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Add multiple accepted answers with different grade percentages.
            </p>
          </CardContent>
        </Card>
      )}

      {type === "matching" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Matching Pairs</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMatchingPair}
              >
                <Plus className="h-4 w-4 mr-1" /> Add Pair
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {matchingPairs.map((pair, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input
                  value={pair.subText}
                  onChange={(e) => updateMatchingPair(i, "subText", e.target.value)}
                  placeholder="Question item"
                  className="flex-1"
                />
                <span className="text-muted-foreground font-medium px-2">→</span>
                <Input
                  value={pair.answerText}
                  onChange={(e) =>
                    updateMatchingPair(i, "answerText", e.target.value)
                  }
                  placeholder="Matching answer"
                  className="flex-1"
                />
                {matchingPairs.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMatchingPair(i)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {type === "numerical" && (
        <Card>
          <CardHeader>
            <CardTitle>Numerical Answer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Input
                  type="text"
                  value={answers[0]?.answerText || ""}
                  onChange={(e) => updateAnswer(0, "answerText", e.target.value)}
                  placeholder="e.g. 3.14"
                />
              </div>
              <div className="space-y-2">
                <Label>Tolerance (±)</Label>
                <Input
                  type="text"
                  value={tolerance}
                  onChange={(e) => setTolerance(e.target.value)}
                  placeholder="e.g. 0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Feedback</Label>
              <Input
                value={answers[0]?.feedback || ""}
                onChange={(e) => updateAnswer(0, "feedback", e.target.value)}
                placeholder="Feedback for this answer"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {type === "essay" && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">
              Essay questions have no predefined answers. Students will provide
              a free-text response that needs to be graded manually.
            </p>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex justify-end gap-3">
        <Link href="/questions">
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </Link>
        {hasNav && isEditing && nextId !== null && (
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={handleSaveAndNext}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save & Next"}
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : isEditing ? "Update Question" : "Create Question"}
        </Button>
      </div>
    </form>
  );
}
