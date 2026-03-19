"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Trash2, Pencil, Tag, X } from "lucide-react";
import { TagInput } from "@/components/tag-input";
import { QuizAssignDialog } from "@/components/quiz-assign-dialog";

interface TagInfo {
  id: number;
  name: string;
}

interface QuizInfo {
  id: number;
  name: string;
  courseName: string;
}

interface QuestionRow {
  id: number;
  type: string;
  name: string;
  questionText: string;
  questionTextPreview: string;
  categoryId: number | null;
  categoryName: string | null;
  tags: TagInfo[];
  quizzes: QuizInfo[];
  createdAt: string;
  updatedAt: string;
}

interface CategoryOption {
  id: number;
  name: string;
}

const typeLabels: Record<string, string> = {
  multichoice: "Multiple Choice",
  truefalse: "True/False",
  shortanswer: "Short Answer",
  matching: "Matching",
  numerical: "Numerical",
  essay: "Essay",
};

const typeColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  multichoice: "default",
  truefalse: "secondary",
  shortanswer: "outline",
  matching: "default",
  numerical: "secondary",
  essay: "outline",
};

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [allTags, setAllTags] = useState<TagInfo[]>([]);

  // Tag editing state
  const [editingTagsFor, setEditingTagsFor] = useState<number | null>(null);
  const [editTagNames, setEditTagNames] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
    fetch("/api/tags")
      .then((r) => r.json())
      .then(setAllTags);
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("enriched", "true");
    if (search) params.set("search", search);
    if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
    if (categoryFilter && categoryFilter !== "all") {
      params.set("categoryId", categoryFilter === "uncategorized" ? "null" : categoryFilter);
    }
    if (tagFilter && tagFilter !== "all") {
      params.set("tagIds", tagFilter);
    }

    const res = await fetch(`/api/questions?${params}`);
    const data = await res.json();
    setQuestions(data);
    setLoading(false);
  }, [search, typeFilter, categoryFilter, tagFilter]);

  useEffect(() => {
    fetchQuestions();
  }, [typeFilter, categoryFilter, tagFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    fetchQuestions();
  };

  const handleCategoryChange = async (questionId: number, newValue: string) => {
    const categoryId = newValue === "none" ? null : Number(newValue);
    await fetch(`/api/questions/${questionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    });
    fetchQuestions();
  };

  const startEditingTags = (q: QuestionRow) => {
    setEditingTagsFor(q.id);
    setEditTagNames(q.tags.map((t) => t.name));
  };

  const saveTagsForQuestion = async (questionId: number) => {
    await fetch(`/api/questions/${questionId}/tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagNames: editTagNames }),
    });
    setEditingTagsFor(null);
    // Refresh tags list too
    const tagsRes = await fetch("/api/tags");
    setAllTags(await tagsRes.json());
    fetchQuestions();
  };

  const removeTagFromQuestion = async (questionId: number, tagId: number) => {
    await fetch(`/api/questions/${questionId}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagId }),
    });
    fetchQuestions();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Questions</h1>
          <p className="text-muted-foreground mt-1">
            Manage your quiz questions
          </p>
        </div>
        <Link href="/questions/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Question
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="multichoice">Multiple Choice</SelectItem>
              <SelectItem value="truefalse">True/False</SelectItem>
              <SelectItem value="shortanswer">Short Answer</SelectItem>
              <SelectItem value="matching">Matching</SelectItem>
              <SelectItem value="numerical">Numerical</SelectItem>
              <SelectItem value="essay">Essay</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="uncategorized">Uncategorized</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="All Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Questions table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">#</TableHead>
              <TableHead className="min-w-[250px]">Question</TableHead>
              <TableHead className="w-[160px]">Category</TableHead>
              <TableHead className="w-[180px]">Tags</TableHead>
              <TableHead className="w-[130px]">Type</TableHead>
              <TableHead className="w-[180px]">Quizzes</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No questions found.{" "}
                  <Link href="/questions/new" className="text-primary hover:underline">
                    Create one
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              questions.map((q, i) => (
                <TableRow key={q.id}>
                  <TableCell className="text-muted-foreground align-top pt-3">
                    {i + 1}
                  </TableCell>

                  {/* Name + Preview */}
                  <TableCell className="align-top">
                    <Link
                      href={`/questions/${q.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {q.name}
                    </Link>
                    {q.questionTextPreview && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {q.questionTextPreview}
                      </p>
                    )}
                  </TableCell>

                  {/* Category (inline select) */}
                  <TableCell className="align-top" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={q.categoryId ? String(q.categoryId) : "none"}
                      onValueChange={(val) => handleCategoryChange(q.id, val)}
                    >
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-muted-foreground">No category</span>
                        </SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Tags */}
                  <TableCell className="align-top">
                    {editingTagsFor === q.id ? (
                      <div className="space-y-1">
                        <TagInput
                          value={editTagNames}
                          onChange={setEditTagNames}
                          suggestions={allTags.map((t) => t.name)}
                          placeholder="Add tag..."
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-6 text-xs"
                            onClick={() => saveTagsForQuestion(q.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs"
                            onClick={() => setEditingTagsFor(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 items-center">
                        {q.tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="text-xs gap-0.5 pr-1"
                          >
                            {tag.name}
                            <button
                              type="button"
                              onClick={() => removeTagFromQuestion(q.id, tag.id)}
                              className="ml-0.5 hover:bg-muted rounded-full"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => startEditingTags(q)}
                        >
                          <Tag className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </TableCell>

                  {/* Type */}
                  <TableCell className="align-top">
                    <Badge variant={typeColors[q.type] || "default"}>
                      {typeLabels[q.type] || q.type}
                    </Badge>
                  </TableCell>

                  {/* Quizzes */}
                  <TableCell className="align-top">
                    <div className="flex flex-wrap gap-1 items-center">
                      {q.quizzes.map((quiz) => (
                        <Badge
                          key={quiz.id}
                          variant="secondary"
                          className="text-xs"
                          title={quiz.courseName}
                        >
                          {quiz.name}
                        </Badge>
                      ))}
                      <QuizAssignDialog
                        questionId={q.id}
                        currentQuizIds={q.quizzes.map((qz) => qz.id)}
                        onChanged={fetchQuestions}
                      />
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="align-top">
                    <div className="flex gap-1">
                      <Link href={`/questions/${q.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(q.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
