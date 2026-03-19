import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/index";
import { getQuestions, getQuestionById, getAllCategories, getQuizById } from "@/lib/db/queries";
import { serializeGift } from "@/lib/parsers/gift-serializer";
import { serializeMoodleXml } from "@/lib/parsers/xml-serializer";
import type { ParsedQuestion, QuestionType } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { format, questionIds, categoryId, quizId } = body as {
    format: "gift" | "xml";
    questionIds?: number[];
    categoryId?: number | null;
    quizId?: number;
  };

  if (!format || !["gift", "xml"].includes(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const db = getDatabase();

  let questionList;
  let quizName = "questions";
  if (quizId) {
    const quiz = getQuizById(db, quizId);
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    quizName = quiz.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    questionList = quiz.questions;
  } else if (questionIds && questionIds.length > 0) {
    questionList = questionIds
      .map((id) => getQuestionById(db, id))
      .filter(Boolean);
  } else {
    questionList = getQuestions(db, {
      categoryId: categoryId !== undefined ? categoryId : undefined,
    });
    // Fetch full details for each
    questionList = questionList
      .map((q) => getQuestionById(db, q.id))
      .filter(Boolean);
  }

  // Get category map
  const categories = getAllCategories(db);
  const categoryMap = new Map<number, string>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat.name);
  }

  // Convert to ParsedQuestion format
  const parsedQuestions: ParsedQuestion[] = questionList.map((q) => ({
    type: q!.type as QuestionType,
    name: q!.name,
    questionText: q!.questionText,
    questionFormat: q!.questionFormat as "html" | "markdown" | "plain",
    generalFeedback: q!.generalFeedback || undefined,
    defaultGrade: q!.defaultGrade,
    penalty: q!.penalty,
    singleAnswer: q!.singleAnswer,
    shuffleAnswers: q!.shuffleAnswers,
    answers: q!.answers?.map((a) => ({
      answerText: a.answerText,
      fraction: a.fraction,
      feedback: a.feedback || "",
      sortOrder: a.sortOrder,
    })),
    matchingPairs: q!.matchingPairs?.map((p) => ({
      subText: p.subText,
      answerText: p.answerText,
      sortOrder: p.sortOrder,
    })),
    numericalOptions:
      q!.numericalOptions && q!.numericalOptions.length > 0
        ? { tolerance: q!.numericalOptions[0].tolerance }
        : undefined,
    categoryPath: q!.categoryId ? categoryMap.get(q!.categoryId) : undefined,
  }));

  const output =
    format === "xml"
      ? serializeMoodleXml(parsedQuestions)
      : serializeGift(parsedQuestions);

  const filename =
    format === "xml" ? `${quizName}.xml` : `${quizName}.gift.txt`;
  const contentType =
    format === "xml" ? "application/xml" : "text/plain";

  return new NextResponse(output, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
