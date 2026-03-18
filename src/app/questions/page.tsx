"use client";

import { useEffect, useState } from "react";
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
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import type { QuestionType } from "@/lib/types";

interface QuestionRow {
  id: number;
  type: string;
  name: string;
  questionText: string;
  categoryId: number | null;
  createdAt: string;
  updatedAt: string;
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
  const [loading, setLoading] = useState(true);

  const fetchQuestions = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);

    const res = await fetch(`/api/questions?${params}`);
    const data = await res.json();
    setQuestions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, [typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuestions();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
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
            <SelectTrigger className="w-[180px]">
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
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[150px]">Type</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No questions found.{" "}
                  <Link href="/questions/new" className="text-primary hover:underline">
                    Create one
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              questions.map((q, i) => (
                <TableRow key={q.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <Link
                      href={`/questions/${q.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {q.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeColors[q.type] || "default"}>
                      {typeLabels[q.type] || q.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
