import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "@/lib/db/index";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  createQuiz,
  getQuizzesByCourseId,
  getAllQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  addQuestionToQuiz,
  removeQuestionFromQuiz,
  reorderQuizQuestions,
  getQuizQuestionIds,
  createQuestion,
  createCategory,
  getStats,
} from "@/lib/db/queries";
import type { AppDatabase } from "@/lib/db/index";
import type Database from "better-sqlite3";

let db: AppDatabase;
let sqlite: Database.Database;

beforeEach(() => {
  const testDb = createTestDatabase();
  db = testDb.db;
  sqlite = testDb.sqlite;

  sqlite.exec(`
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER REFERENCES categories(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER REFERENCES categories(id),
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      question_text TEXT NOT NULL,
      question_format TEXT NOT NULL DEFAULT 'html',
      general_feedback TEXT DEFAULT '',
      default_grade REAL NOT NULL DEFAULT 1.0,
      penalty REAL NOT NULL DEFAULT 0.333,
      single_answer INTEGER NOT NULL DEFAULT 1,
      shuffle_answers INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      answer_text TEXT NOT NULL,
      fraction REAL NOT NULL DEFAULT 0,
      feedback TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE matching_pairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      sub_text TEXT NOT NULL,
      answer_text TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE numerical_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      tolerance REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      UNIQUE(quiz_id, question_id)
    );
  `);
});

describe("Courses CRUD", () => {
  it("should create a course", () => {
    const course = createCourse(db, { name: "Mathematics", description: "Math course" });
    expect(course).toBeDefined();
    expect(course.name).toBe("Mathematics");
    expect(course.description).toBe("Math course");
    expect(course.id).toBeGreaterThan(0);
  });

  it("should create a course with default empty description", () => {
    const course = createCourse(db, { name: "Physics" });
    expect(course.description).toBe("");
  });

  it("should list all courses", () => {
    createCourse(db, { name: "B Course" });
    createCourse(db, { name: "A Course" });
    const courses = getAllCourses(db);
    expect(courses).toHaveLength(2);
    // Ordered by name
    expect(courses[0].name).toBe("A Course");
    expect(courses[1].name).toBe("B Course");
  });

  it("should get course by id", () => {
    const course = createCourse(db, { name: "History" });
    const found = getCourseById(db, course.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe("History");
  });

  it("should update a course", () => {
    const course = createCourse(db, { name: "Old Name" });
    const updated = updateCourse(db, course.id, { name: "New Name", description: "Updated" });
    expect(updated!.name).toBe("New Name");
    expect(updated!.description).toBe("Updated");
  });

  it("should delete a course", () => {
    const course = createCourse(db, { name: "ToDelete" });
    deleteCourse(db, course.id);
    const found = getCourseById(db, course.id);
    expect(found).toBeUndefined();
  });

  it("should cascade delete quizzes when course is deleted", () => {
    const course = createCourse(db, { name: "Course" });
    const quiz = createQuiz(db, { courseId: course.id, name: "Quiz" });
    deleteCourse(db, course.id);
    const found = getQuizById(db, quiz.id);
    expect(found).toBeUndefined();
  });
});

describe("Quizzes CRUD", () => {
  it("should create a quiz under a course", () => {
    const course = createCourse(db, { name: "Course" });
    const quiz = createQuiz(db, { courseId: course.id, name: "Midterm", description: "Midterm exam" });
    expect(quiz).toBeDefined();
    expect(quiz.name).toBe("Midterm");
    expect(quiz.courseId).toBe(course.id);
  });

  it("should list quizzes by course id", () => {
    const c1 = createCourse(db, { name: "C1" });
    const c2 = createCourse(db, { name: "C2" });
    createQuiz(db, { courseId: c1.id, name: "Q1" });
    createQuiz(db, { courseId: c1.id, name: "Q2" });
    createQuiz(db, { courseId: c2.id, name: "Q3" });

    const quizzes = getQuizzesByCourseId(db, c1.id);
    expect(quizzes).toHaveLength(2);
  });

  it("should list all quizzes with course names", () => {
    const c1 = createCourse(db, { name: "Alpha" });
    const c2 = createCourse(db, { name: "Beta" });
    createQuiz(db, { courseId: c1.id, name: "Quiz A" });
    createQuiz(db, { courseId: c2.id, name: "Quiz B" });

    const all = getAllQuizzes(db);
    expect(all).toHaveLength(2);
    expect(all[0].courseName).toBe("Alpha");
    expect(all[1].courseName).toBe("Beta");
  });

  it("should get quiz by id with questions", () => {
    const course = createCourse(db, { name: "Course" });
    const quiz = createQuiz(db, { courseId: course.id, name: "Quiz" });
    const q1 = createQuestion(db, { type: "essay", name: "Q1", questionText: "T1" });
    const q2 = createQuestion(db, { type: "essay", name: "Q2", questionText: "T2" });

    addQuestionToQuiz(db, { quizId: quiz.id, questionId: q1.id });
    addQuestionToQuiz(db, { quizId: quiz.id, questionId: q2.id });

    const full = getQuizById(db, quiz.id);
    expect(full).toBeDefined();
    expect(full!.questions).toHaveLength(2);
    expect(full!.course).toBeDefined();
    expect(full!.course!.name).toBe("Course");
  });

  it("should update a quiz", () => {
    const course = createCourse(db, { name: "Course" });
    const quiz = createQuiz(db, { courseId: course.id, name: "Old" });
    const updated = updateQuiz(db, quiz.id, { name: "New" });
    expect(updated!.name).toBe("New");
  });

  it("should delete a quiz", () => {
    const course = createCourse(db, { name: "Course" });
    const quiz = createQuiz(db, { courseId: course.id, name: "Quiz" });
    deleteQuiz(db, quiz.id);
    const found = getQuizById(db, quiz.id);
    expect(found).toBeUndefined();
  });
});

describe("Quiz Questions", () => {
  it("should add a question to a quiz", () => {
    const course = createCourse(db, { name: "Course" });
    const quiz = createQuiz(db, { courseId: course.id, name: "Quiz" });
    const q = createQuestion(db, { type: "essay", name: "Q1", questionText: "T1" });

    const qq = addQuestionToQuiz(db, { quizId: quiz.id, questionId: q.id });
    expect(qq).toBeDefined();
    expect(qq.quizId).toBe(quiz.id);
    expect(qq.questionId).toBe(q.id);
    expect(qq.sortOrder).toBe(0);
  });

  it("should auto-increment sort order when adding questions", () => {
    const course = createCourse(db, { name: "Course" });
    const quiz = createQuiz(db, { courseId: course.id, name: "Quiz" });
    const q1 = createQuestion(db, { type: "essay", name: "Q1", questionText: "T1" });
    const q2 = createQuestion(db, { type: "essay", name: "Q2", questionText: "T2" });

    addQuestionToQuiz(db, { quizId: quiz.id, questionId: q1.id });
    const qq2 = addQuestionToQuiz(db, { quizId: quiz.id, questionId: q2.id });
    expect(qq2.sortOrder).toBe(1);
  });

  it("should reject duplicate question in same quiz", () => {
    const course = createCourse(db, { name: "Course" });
    const quiz = createQuiz(db, { courseId: course.id, name: "Quiz" });
    const q = createQuestion(db, { type: "essay", name: "Q1", questionText: "T1" });

    addQuestionToQuiz(db, { quizId: quiz.id, questionId: q.id });
    expect(() => {
      addQuestionToQuiz(db, { quizId: quiz.id, questionId: q.id });
    }).toThrow();
  });

  it("should remove a question from a quiz", () => {
    const course = createCourse(db, { name: "Course" });
    const quiz = createQuiz(db, { courseId: course.id, name: "Quiz" });
    const q = createQuestion(db, { type: "essay", name: "Q1", questionText: "T1" });

    addQuestionToQuiz(db, { quizId: quiz.id, questionId: q.id });
    removeQuestionFromQuiz(db, quiz.id, q.id);

    const ids = getQuizQuestionIds(db, quiz.id);
    expect(ids).toHaveLength(0);
  });

  it("should reorder questions in a quiz", () => {
    const course = createCourse(db, { name: "Course" });
    const quiz = createQuiz(db, { courseId: course.id, name: "Quiz" });
    const q1 = createQuestion(db, { type: "essay", name: "Q1", questionText: "T1" });
    const q2 = createQuestion(db, { type: "essay", name: "Q2", questionText: "T2" });
    const q3 = createQuestion(db, { type: "essay", name: "Q3", questionText: "T3" });

    addQuestionToQuiz(db, { quizId: quiz.id, questionId: q1.id });
    addQuestionToQuiz(db, { quizId: quiz.id, questionId: q2.id });
    addQuestionToQuiz(db, { quizId: quiz.id, questionId: q3.id });

    // Reorder: q3, q1, q2
    reorderQuizQuestions(db, quiz.id, [q3.id, q1.id, q2.id]);

    const ids = getQuizQuestionIds(db, quiz.id);
    expect(ids).toEqual([q3.id, q1.id, q2.id]);
  });

  it("should return quiz question IDs in order", () => {
    const course = createCourse(db, { name: "Course" });
    const quiz = createQuiz(db, { courseId: course.id, name: "Quiz" });
    const q1 = createQuestion(db, { type: "essay", name: "Q1", questionText: "T1" });
    const q2 = createQuestion(db, { type: "essay", name: "Q2", questionText: "T2" });

    addQuestionToQuiz(db, { quizId: quiz.id, questionId: q1.id });
    addQuestionToQuiz(db, { quizId: quiz.id, questionId: q2.id });

    const ids = getQuizQuestionIds(db, quiz.id);
    expect(ids).toEqual([q1.id, q2.id]);
  });

  it("should allow same question in different quizzes", () => {
    const course = createCourse(db, { name: "Course" });
    const quiz1 = createQuiz(db, { courseId: course.id, name: "Quiz 1" });
    const quiz2 = createQuiz(db, { courseId: course.id, name: "Quiz 2" });
    const q = createQuestion(db, { type: "essay", name: "Q1", questionText: "T1" });

    addQuestionToQuiz(db, { quizId: quiz1.id, questionId: q.id });
    addQuestionToQuiz(db, { quizId: quiz2.id, questionId: q.id });

    expect(getQuizQuestionIds(db, quiz1.id)).toEqual([q.id]);
    expect(getQuizQuestionIds(db, quiz2.id)).toEqual([q.id]);
  });

  it("should cascade delete quiz_questions when quiz is deleted", () => {
    const course = createCourse(db, { name: "Course" });
    const quiz = createQuiz(db, { courseId: course.id, name: "Quiz" });
    const q = createQuestion(db, { type: "essay", name: "Q1", questionText: "T1" });

    addQuestionToQuiz(db, { quizId: quiz.id, questionId: q.id });
    deleteQuiz(db, quiz.id);

    // Quiz questions should be gone
    const ids = getQuizQuestionIds(db, quiz.id);
    expect(ids).toHaveLength(0);
  });
});

describe("Stats with courses/quizzes", () => {
  it("should return courseCount and quizCount in stats", () => {
    const c1 = createCourse(db, { name: "C1" });
    createCourse(db, { name: "C2" });
    createQuiz(db, { courseId: c1.id, name: "Q1" });
    createQuestion(db, { type: "essay", name: "Q", questionText: "T" });
    createCategory(db, { name: "Cat" });

    const stats = getStats(db);
    expect(stats.courseCount).toBe(2);
    expect(stats.quizCount).toBe(1);
    expect(stats.questionCount).toBe(1);
    expect(stats.categoryCount).toBe(1);
  });
});
