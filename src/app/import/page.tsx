"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { Upload, FileText, Check, AlertCircle } from "lucide-react";
import { TagInput } from "@/components/tag-input";
import type { ParsedQuestion } from "@/lib/types";

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

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    format: string;
    questions: ParsedQuestion[];
    categories: string[];
    errors: string[];
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // New: category override and tags
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryOverride, setCategoryOverride] = useState<string>("file");
  const [importTags, setImportTags] = useState<string[]>([]);
  const [allTagNames, setAllTagNames] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
    fetch("/api/tags")
      .then((r) => r.json())
      .then((tags: { name: string }[]) => setAllTagNames(tags.map((t) => t.name)));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      previewFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      previewFile(selected);
    }
  };

  const previewFile = async (f: File) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", f);
    formData.append("action", "preview");

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      setPreview(data);
      setSelectedIds(new Set(data.questions.map((_: ParsedQuestion, i: number) => i)));
    } catch {
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = () => {
    if (!preview) return;
    if (selectedIds.size === preview.questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(preview.questions.map((_, i) => i)));
    }
  };

  const toggleOne = (idx: number) => {
    const next = new Set(selectedIds);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedIds(next);
  };

  const handleImport = async () => {
    if (!file || !preview) return;
    setImporting(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("action", "import");
    formData.append("selectedIndices", JSON.stringify(Array.from(selectedIds)));

    if (categoryOverride !== "file") {
      formData.append("categoryOverrideId", categoryOverride);
    }

    if (importTags.length > 0) {
      formData.append("tags", JSON.stringify(importTags));
    }

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();

      if (data.imported > 0) {
        router.push("/questions");
      }
    } catch {
      alert("Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Questions</h1>
        <p className="text-muted-foreground mt-1">
          Import questions from GIFT or Moodle XML format
        </p>
      </div>

      {/* Drop zone */}
      <Card>
        <CardContent className="p-8">
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              Drag & drop a file here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Supports .gift, .txt (GIFT format) and .xml (Moodle XML format)
            </p>
            <input
              type="file"
              accept=".gift,.txt,.xml"
              onChange={handleFileSelect}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input">
              <Button variant="outline" asChild>
                <span>Choose File</span>
              </Button>
            </label>
            {file && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
                <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Parsing file...
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {preview?.errors && preview.errors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Parse Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {preview.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {preview && preview.questions.length > 0 && (
        <>
          {/* Import settings */}
          <Card>
            <CardHeader>
              <CardTitle>Import Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assign Category</Label>
                  <Select
                    value={categoryOverride}
                    onValueChange={setCategoryOverride}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Use file categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="file">Use file categories</SelectItem>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Override the category from the file for all imported questions
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <TagInput
                    value={importTags}
                    onChange={setImportTags}
                    suggestions={allTagNames}
                    placeholder="Add tags for imported questions..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Tags will be applied to all imported questions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Preview ({preview.questions.length} questions found)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Format: {preview.format?.toUpperCase()}
                  </Badge>
                  {preview.categories.length > 0 && (
                    <Badge variant="secondary">
                      {preview.categories.length} categories
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={selectedIds.size === preview.questions.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[140px]">Type</TableHead>
                    <TableHead className="w-[140px]">Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.questions.map((q, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(i)}
                          onCheckedChange={() => toggleOne(i)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {q.name || q.questionText?.substring(0, 60)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {typeLabels[q.type] || q.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {categoryOverride !== "file"
                          ? categoryOverride === "none"
                            ? "-"
                            : categories.find((c) => String(c.id) === categoryOverride)?.name || "-"
                          : q.categoryPath || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setFile(null);
                setPreview(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importing || selectedIds.size === 0}
            >
              <Check className="h-4 w-4 mr-2" />
              {importing
                ? "Importing..."
                : `Import ${selectedIds.size} Questions`}
            </Button>
          </div>
        </>
      )}

      {preview && preview.questions.length === 0 && !loading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No questions found in the file.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
