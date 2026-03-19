import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/index";
import { getAllQuizzes, getQuizzesByCourseId, createQuiz } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const db = getDatabase();
  const courseId = request.nextUrl.searchParams.get("courseId");

  if (courseId) {
    const quizzes = getQuizzesByCourseId(db, Number(courseId));
    return NextResponse.json(quizzes);
  }

  const quizzes = getAllQuizzes(db);
  return NextResponse.json(quizzes);
}

export async function POST(request: NextRequest) {
  const db = getDatabase();
  const body = await request.json();

  try {
    const quiz = createQuiz(db, body);
    return NextResponse.json(quiz, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create quiz" },
      { status: 400 }
    );
  }
}
