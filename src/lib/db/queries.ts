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

// ---- Courses ----

export function getAllCourses(db: AppDatabase) {
  return db.select().from(schema.courses).orderBy(schema.courses.name).all();
}

export function getCourseById(db: AppDatabase, id: number) {
  return db.select().from(schema.courses).where(eq(schema.courses.id, id)).get();
}

export function createCourse(
  db: AppDatabase,
  data: { name: string; description?: string }
) {
  return db
    .insert(schema.courses)
    .values({
      name: data.name,
      description: data.description ?? "",
    })
    .returning()
    .get();
}

export function updateCourse(
  db: AppDatabase,
  id: number,
  data: { name?: string; description?: string }
) {
  return db
    .update(schema.courses)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(schema.courses.id, id))
    .returning()
    .get();
}

export function deleteCourse(db: AppDatabase, id: number) {
  return db.delete(schema.courses).where(eq(schema.courses.id, id)).run();
}

// ---- Quizzes ----

export function getQuizzesByCourseId(db: AppDatabase, courseId: number) {
  return db
    .select()
    .from(schema.quizzes)
    .where(eq(schema.quizzes.courseId, courseId))
    .orderBy(schema.quizzes.name)
    .all();
}

export function getAllQuizzes(db: AppDatabase) {
  return db
    .select({
      id: schema.quizzes.id,
      courseId: schema.quizzes.courseId,
      name: schema.quizzes.name,
      description: schema.quizzes.description,
      createdAt: schema.quizzes.createdAt,
      updatedAt: schema.quizzes.updatedAt,
      courseName: schema.courses.name,
    })
    .from(schema.quizzes)
    .innerJoin(schema.courses, eq(schema.quizzes.courseId, schema.courses.id))
    .orderBy(schema.courses.name, schema.quizzes.name)
    .all();
}

export function getQuizById(db: AppDatabase, id: number) {
  const quiz = db
    .select()
    .from(schema.quizzes)
    .where(eq(schema.quizzes.id, id))
    .get();

  if (!quiz) return undefined;

  const course = db
    .select()
    .from(schema.courses)
    .where(eq(schema.courses.id, quiz.courseId))
    .get();

  const qqs = db
    .select()
    .from(schema.quizQuestions)
    .where(eq(schema.quizQuestions.quizId, id))
    .orderBy(schema.quizQuestions.sortOrder)
    .all();

  const questionsList = qqs
    .map((qq) => getQuestionById(db, qq.questionId))
    .filter(Boolean);

  return {
    ...quiz,
    course: course ?? null,
    questions: questionsList,
  };
}

export function createQuiz(
  db: AppDatabase,
  data: { courseId: number; name: string; description?: string }
) {
  return db
    .insert(schema.quizzes)
    .values({
      courseId: data.courseId,
      name: data.name,
      description: data.description ?? "",
    })
    .returning()
    .get();
}

export function updateQuiz(
  db: AppDatabase,
  id: number,
  data: { name?: string; description?: string }
) {
  return db
    .update(schema.quizzes)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(schema.quizzes.id, id))
    .returning()
    .get();
}

export function deleteQuiz(db: AppDatabase, id: number) {
  return db.delete(schema.quizzes).where(eq(schema.quizzes.id, id)).run();
}

// ---- Quiz Questions ----

export function addQuestionToQuiz(
  db: AppDatabase,
  data: { quizId: number; questionId: number; sortOrder?: number }
) {
  const sortOrder =
    data.sortOrder ??
    (db
      .select({ maxOrder: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(schema.quizQuestions)
      .where(eq(schema.quizQuestions.quizId, data.quizId))
      .get()?.maxOrder ?? -1) + 1;

  return db
    .insert(schema.quizQuestions)
    .values({
      quizId: data.quizId,
      questionId: data.questionId,
      sortOrder,
    })
    .returning()
    .get();
}

export function removeQuestionFromQuiz(
  db: AppDatabase,
  quizId: number,
  questionId: number
) {
  return db
    .delete(schema.quizQuestions)
    .where(
      and(
        eq(schema.quizQuestions.quizId, quizId),
        eq(schema.quizQuestions.questionId, questionId)
      )
    )
    .run();
}

export function reorderQuizQuestions(
  db: AppDatabase,
  quizId: number,
  orderedQuestionIds: number[]
) {
  // Delete all existing entries for this quiz
  db.delete(schema.quizQuestions)
    .where(eq(schema.quizQuestions.quizId, quizId))
    .run();

  // Re-insert in new order
  for (let i = 0; i < orderedQuestionIds.length; i++) {
    db.insert(schema.quizQuestions)
      .values({
        quizId,
        questionId: orderedQuestionIds[i],
        sortOrder: i,
      })
      .run();
  }
}

export function getQuizQuestionIds(db: AppDatabase, quizId: number) {
  return db
    .select({ questionId: schema.quizQuestions.questionId })
    .from(schema.quizQuestions)
    .where(eq(schema.quizQuestions.quizId, quizId))
    .orderBy(schema.quizQuestions.sortOrder)
    .all()
    .map((row) => row.questionId);
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
  const courseCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.courses)
    .get();
  const quizCount = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.quizzes)
    .get();

  return {
    questionCount: questionCount?.count ?? 0,
    categoryCount: categoryCount?.count ?? 0,
    courseCount: courseCount?.count ?? 0,
    quizCount: quizCount?.count ?? 0,
  };
}
