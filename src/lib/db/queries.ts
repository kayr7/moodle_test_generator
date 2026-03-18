import { eq, like, and, desc, sql } from "drizzle-orm";
import type { AppDatabase } from "./index";
import * as schema from "./schema";
import type { QuestionType } from "../types";

// ---- Categories ----

export function getAllCategories(db: AppDatabase) {
  return db.select().from(schema.categories).orderBy(schema.categories.name).all();
}

export function getCategoryById(db: AppDatabase, id: number) {
  return db.select().from(schema.categories).where(eq(schema.categories.id, id)).get();
}

export function createCategory(
  db: AppDatabase,
  data: { name: string; parentId?: number | null }
) {
  return db
    .insert(schema.categories)
    .values({
      name: data.name,
      parentId: data.parentId ?? null,
    })
    .returning()
    .get();
}

export function updateCategory(
  db: AppDatabase,
  id: number,
  data: { name?: string; parentId?: number | null }
) {
  return db
    .update(schema.categories)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(schema.categories.id, id))
    .returning()
    .get();
}

export function deleteCategory(db: AppDatabase, id: number) {
  return db.delete(schema.categories).where(eq(schema.categories.id, id)).run();
}

// ---- Questions ----

export function getQuestions(
  db: AppDatabase,
  filters?: {
    categoryId?: number | null;
    type?: QuestionType;
    search?: string;
  }
) {
  const conditions = [];

  if (filters?.categoryId !== undefined) {
    if (filters.categoryId === null) {
      conditions.push(sql`${schema.questions.categoryId} IS NULL`);
    } else {
      conditions.push(eq(schema.questions.categoryId, filters.categoryId));
    }
  }

  if (filters?.type) {
    conditions.push(eq(schema.questions.type, filters.type));
  }

  if (filters?.search) {
    conditions.push(like(schema.questions.name, `%${filters.search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(schema.questions)
    .where(where)
    .orderBy(desc(schema.questions.updatedAt))
    .all();
}

export function getQuestionById(db: AppDatabase, id: number) {
  const question = db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.id, id))
    .get();

  if (!question) return undefined;

  const questionAnswers = db
    .select()
    .from(schema.answers)
    .where(eq(schema.answers.questionId, id))
    .orderBy(schema.answers.sortOrder)
    .all();

  const questionMatchingPairs = db
    .select()
    .from(schema.matchingPairs)
    .where(eq(schema.matchingPairs.questionId, id))
    .orderBy(schema.matchingPairs.sortOrder)
    .all();

  const questionNumericalOptions = db
    .select()
    .from(schema.numericalOptions)
    .where(eq(schema.numericalOptions.questionId, id))
    .all();

  const questionImages = db
    .select()
    .from(schema.images)
    .where(eq(schema.images.questionId, id))
    .all();

  const category = question.categoryId
    ? db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.id, question.categoryId))
        .get()
    : null;

  return {
    ...question,
    answers: questionAnswers,
    matchingPairs: questionMatchingPairs,
    numericalOptions: questionNumericalOptions,
    images: questionImages,
    category: category ?? null,
  };
}

export function createQuestion(
  db: AppDatabase,
  data: {
    categoryId?: number | null;
    type: QuestionType;
    name: string;
    questionText: string;
    questionFormat?: string;
    generalFeedback?: string;
    defaultGrade?: number;
    penalty?: number;
    singleAnswer?: boolean;
    shuffleAnswers?: boolean;
    answers?: {
      answerText: string;
      fraction: number;
      feedback?: string;
      sortOrder?: number;
    }[];
    matchingPairs?: {
      subText: string;
      answerText: string;
      sortOrder?: number;
    }[];
    numericalOptions?: { tolerance: number };
  }
) {
  const question = db
    .insert(schema.questions)
    .values({
      categoryId: data.categoryId ?? null,
      type: data.type,
      name: data.name,
      questionText: data.questionText,
      questionFormat: data.questionFormat || "html",
      generalFeedback: data.generalFeedback || "",
      defaultGrade: data.defaultGrade ?? 1.0,
      penalty: data.penalty ?? 0.333,
      singleAnswer: data.singleAnswer ?? true,
      shuffleAnswers: data.shuffleAnswers ?? true,
    })
    .returning()
    .get();

  if (data.answers && data.answers.length > 0) {
    for (const answer of data.answers) {
      db.insert(schema.answers)
        .values({
          questionId: question.id,
          answerText: answer.answerText,
          fraction: answer.fraction,
          feedback: answer.feedback || "",
          sortOrder: answer.sortOrder ?? 0,
        })
        .run();
    }
  }

  if (data.matchingPairs && data.matchingPairs.length > 0) {
    for (const pair of data.matchingPairs) {
      db.insert(schema.matchingPairs)
        .values({
          questionId: question.id,
          subText: pair.subText,
          answerText: pair.answerText,
          sortOrder: pair.sortOrder ?? 0,
        })
        .run();
    }
  }

  if (data.numericalOptions) {
    db.insert(schema.numericalOptions)
      .values({
        questionId: question.id,
        tolerance: data.numericalOptions.tolerance,
      })
      .run();
  }

  return question;
}

export function updateQuestion(
  db: AppDatabase,
  id: number,
  data: {
    categoryId?: number | null;
    type?: QuestionType;
    name?: string;
    questionText?: string;
    questionFormat?: string;
    generalFeedback?: string;
    defaultGrade?: number;
    penalty?: number;
    singleAnswer?: boolean;
    shuffleAnswers?: boolean;
    answers?: {
      answerText: string;
      fraction: number;
      feedback?: string;
      sortOrder?: number;
    }[];
    matchingPairs?: {
      subText: string;
      answerText: string;
      sortOrder?: number;
    }[];
    numericalOptions?: { tolerance: number } | null;
  }
) {
  const { answers: newAnswers, matchingPairs: newPairs, numericalOptions: newNumerical, ...questionData } = data;

  const question = db
    .update(schema.questions)
    .set({ ...questionData, updatedAt: new Date().toISOString() })
    .where(eq(schema.questions.id, id))
    .returning()
    .get();

  if (newAnswers !== undefined) {
    db.delete(schema.answers).where(eq(schema.answers.questionId, id)).run();
    for (const answer of newAnswers) {
      db.insert(schema.answers)
        .values({
          questionId: id,
          answerText: answer.answerText,
          fraction: answer.fraction,
          feedback: answer.feedback || "",
          sortOrder: answer.sortOrder ?? 0,
        })
        .run();
    }
  }

  if (newPairs !== undefined) {
    db.delete(schema.matchingPairs).where(eq(schema.matchingPairs.questionId, id)).run();
    for (const pair of newPairs) {
      db.insert(schema.matchingPairs)
        .values({
          questionId: id,
          subText: pair.subText,
          answerText: pair.answerText,
          sortOrder: pair.sortOrder ?? 0,
        })
        .run();
    }
  }

  if (newNumerical !== undefined) {
    db.delete(schema.numericalOptions).where(eq(schema.numericalOptions.questionId, id)).run();
    if (newNumerical) {
      db.insert(schema.numericalOptions)
        .values({ questionId: id, tolerance: newNumerical.tolerance })
        .run();
    }
  }

  return question;
}

export function deleteQuestion(db: AppDatabase, id: number) {
  return db.delete(schema.questions).where(eq(schema.questions.id, id)).run();
}

// ---- Stats ----

export function getStats(db: AppDatabase) {
  const questionCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.questions)
    .get();
  const categoryCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.categories)
    .get();

  return {
    questionCount: questionCount?.count ?? 0,
    categoryCount: categoryCount?.count ?? 0,
  };
}
