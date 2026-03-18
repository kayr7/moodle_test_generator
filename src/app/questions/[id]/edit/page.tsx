"use client";

import { use } from "react";
import { QuestionForm } from "@/components/questions/question-form";

export default function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <QuestionForm questionId={Number(id)} />;
}
