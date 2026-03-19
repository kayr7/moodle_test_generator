"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Eye, FileText } from "lucide-react";

interface QuizWithCourse {
  id: number;
  name: string;
  courseId: number;
  courseName: string;
}

export default function ExportPage() {
  const [quizzes, setQuizzes] = useState<QuizWithCourse[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>("");
  const [format, setFormat] = useState<"gift" | "xml">("gift");
  const [previewText, setPreviewText] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/quizzes")
      .then((r) => r.json())
      .then(setQuizzes);
  }, []);

  // Group quizzes by course
  const courseGroups = quizzes.reduce<Record<string, QuizWithCourse[]>>((acc, quiz) => {
    const key = quiz.courseName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(quiz);
    return acc;
  }, {});

  const selectedQuiz = quizzes.find((q) => String(q.id) === selectedQuizId);

  const handlePreview = async () => {
    if (!selectedQuizId) return;

    const res = await fetch("/api/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, quizId: Number(selectedQuizId) }),
    });
    const text = await res.text();
    setPreviewText(text);
  };

  const handleExport = async () => {
    if (!selectedQuizId) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, quizId: Number(selectedQuizId) }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const name = selectedQuiz?.name.replace(/[^a-zA-Z0-9_-]/g, "_") || "quiz";
      a.download = format === "xml" ? `${name}.xml` : `${name}.gift.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Export Quiz</h1>
        <p className="text-muted-foreground mt-1">
          Export a quiz to GIFT or Moodle XML format
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quiz</label>
              <Select value={selectedQuizId} onValueChange={setSelectedQuizId}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select a quiz to export" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(courseGroups).length === 0 ? (
                    <SelectItem value="none" disabled>
                      No quizzes available
                    </SelectItem>
                  ) : (
                    Object.entries(courseGroups).map(([courseName, courseQuizzes]) => (
                      <SelectGroup key={courseName}>
                        <SelectLabel>{courseName}</SelectLabel>
                        {courseQuizzes.map((quiz) => (
                          <SelectItem key={quiz.id} value={String(quiz.id)}>
                            {quiz.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Format</label>
              <Select value={format} onValueChange={(v) => setFormat(v as "gift" | "xml")}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gift">GIFT Format (.txt)</SelectItem>
                  <SelectItem value="xml">Moodle XML (.xml)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePreview} disabled={!selectedQuizId}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button onClick={handleExport} disabled={exporting || !selectedQuizId}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "Exporting..." : "Export Quiz"}
        </Button>
      </div>

      {/* Preview */}
      {previewText && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Preview ({format.toUpperCase()})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono whitespace-pre-wrap">
              {previewText}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
