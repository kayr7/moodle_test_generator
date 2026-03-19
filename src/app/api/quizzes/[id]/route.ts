import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/index";
import { getQuizById, updateQuiz, deleteQuiz } from "@/lib/db/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDatabase();
  const { id } = await params;
  const quiz = getQuizById(db, Number(id));

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  return NextResponse.json(quiz);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDatabase();
  const { id } = await params;
  const body = await request.json();

  try {
    const quiz = updateQuiz(db, Number(id), body);
    return NextResponse.json(quiz);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update quiz" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDatabase();
  const { id } = await params;

  try {
    deleteQuiz(db, Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete quiz" },
      { status: 400 }
    );
  }
}
