import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/index";
import {
  getQuizQuestionIds,
  addQuestionToQuiz,
  removeQuestionFromQuiz,
  reorderQuizQuestions,
} from "@/lib/db/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDatabase();
  const { id } = await params;
  const questionIds = getQuizQuestionIds(db, Number(id));
  return NextResponse.json(questionIds);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDatabase();
  const { id } = await params;
  const body = await request.json();

  try {
    const qq = addQuestionToQuiz(db, {
      quizId: Number(id),
      questionId: body.questionId,
    });
    return NextResponse.json(qq, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add question to quiz" },
      { status: 400 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDatabase();
  const { id } = await params;
  const body = await request.json();

  try {
    reorderQuizQuestions(db, Number(id), body.orderedQuestionIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reorder questions" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDatabase();
  const { id } = await params;
  const body = await request.json();

  try {
    removeQuestionFromQuiz(db, Number(id), body.questionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to remove question from quiz" },
      { status: 400 }
    );
  }
}
