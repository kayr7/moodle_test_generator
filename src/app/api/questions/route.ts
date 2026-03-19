import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/index";
import { getQuestions, createQuestion } from "@/lib/db/queries";
import { validateMultichoiceFractions } from "@/lib/validation";
import type { QuestionType } from "@/lib/types";

export async function GET(request: NextRequest) {
  const db = getDatabase();
  const { searchParams } = new URL(request.url);

  const categoryId = searchParams.get("categoryId");
  const type = searchParams.get("type") as QuestionType | null;
  const search = searchParams.get("search");

  const questions = getQuestions(db, {
    categoryId: categoryId ? (categoryId === "null" ? null : Number(categoryId)) : undefined,
    type: type || undefined,
    search: search || undefined,
  });

  return NextResponse.json(questions);
}

export async function POST(request: NextRequest) {
  const db = getDatabase();
  const body = await request.json();

  // Validate multichoice fraction sums
  if (body.type === "multichoice" && body.answers) {
    const error = validateMultichoiceFractions(body.answers);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
  }

  try {
    const question = createQuestion(db, body);
    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create question" },
      { status: 400 }
    );
  }
}
