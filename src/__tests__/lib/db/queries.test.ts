import { describe, it, expect, beforeEach } from "vitest";
import { createTestDatabase } from "@/lib/db/index";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getStats,
} from "@/lib/db/queries";
import { sql } from "drizzle-orm";
import type { AppDatabase } from "@/lib/db/index";
import type Database from "better-sqlite3";

let db: AppDatabase;
let sqlite: Database.Database;

beforeEach(() => {
  const testDb = createTestDatabase();
  db = testDb.db;
  sqlite = testDb.sqlite;

  // Create tables
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

describe("Categories CRUD", () => {
  it("should create a category", () => {
    const cat = createCategory(db, { name: "Math" });
    expect(cat).toBeDefined();
    expect(cat.name).toBe("Math");
    expect(cat.id).toBeGreaterThan(0);
  });

  it("should create a category with parent", () => {
    const parent = createCategory(db, { name: "Science" });
    const child = createCategory(db, { name: "Physics", parentId: parent.id });
    expect(child.parentId).toBe(parent.id);
  });

  it("should list all categories", () => {
    createCategory(db, { name: "A" });
    createCategory(db, { name: "B" });
    const cats = getAllCategories(db);
    expect(cats).toHaveLength(2);
  });

  it("should get category by id", () => {
    const cat = createCategory(db, { name: "History" });
    const found = getCategoryById(db, cat.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe("History");
  });

  it("should update a category", () => {
    const cat = createCategory(db, { name: "Old Name" });
    const updated = updateCategory(db, cat.id, { name: "New Name" });
    expect(updated!.name).toBe("New Name");
  });

  it("should delete a category", () => {
    const cat = createCategory(db, { name: "ToDelete" });
    deleteCategory(db, cat.id);
    const found = getCategoryById(db, cat.id);
    expect(found).toBeUndefined();
  });
});

describe("Questions CRUD", () => {
  it("should create a multiple choice question with answers", () => {
    const q = createQuestion(db, {
      type: "multichoice",
      name: "What is 2+2?",
      questionText: "<p>What is 2+2?</p>",
      answers: [
        { answerText: "4", fraction: 100, feedback: "Correct!" },
        { answerText: "3", fraction: 0, feedback: "Wrong" },
        { answerText: "5", fraction: 0, feedback: "Wrong" },
      ],
    });

    expect(q.id).toBeGreaterThan(0);
    expect(q.type).toBe("multichoice");

    const full = getQuestionById(db, q.id);
    expect(full).toBeDefined();
    expect(full!.answers).toHaveLength(3);
    expect(full!.answers[0].answerText).toBe("4");
    expect(full!.answers[0].fraction).toBe(100);
  });

  it("should create a true/false question", () => {
    const q = createQuestion(db, {
      type: "truefalse",
      name: "Earth is round",
      questionText: "The Earth is round.",
      answers: [
        { answerText: "true", fraction: 100 },
        { answerText: "false", fraction: 0 },
      ],
    });

    const full = getQuestionById(db, q.id);
    expect(full!.answers).toHaveLength(2);
  });

  it("should create a short answer question", () => {
    const q = createQuestion(db, {
      type: "shortanswer",
      name: "Capital of France",
      questionText: "What is the capital of France?",
      answers: [
        { answerText: "Paris", fraction: 100 },
        { answerText: "paris", fraction: 100 },
      ],
    });

    const full = getQuestionById(db, q.id);
    expect(full!.answers).toHaveLength(2);
  });

  it("should create a matching question", () => {
    const q = createQuestion(db, {
      type: "matching",
      name: "Match capitals",
      questionText: "Match the country with its capital.",
      matchingPairs: [
        { subText: "France", answerText: "Paris" },
        { subText: "Germany", answerText: "Berlin" },
        { subText: "Italy", answerText: "Rome" },
      ],
    });

    const full = getQuestionById(db, q.id);
    expect(full!.matchingPairs).toHaveLength(3);
  });

  it("should create a numerical question", () => {
    const q = createQuestion(db, {
      type: "numerical",
      name: "Pi value",
      questionText: "What is the value of Pi (to 2 decimal places)?",
      answers: [{ answerText: "3.14", fraction: 100 }],
      numericalOptions: { tolerance: 0.01 },
    });

    const full = getQuestionById(db, q.id);
    expect(full!.numericalOptions).toHaveLength(1);
    expect(full!.numericalOptions[0].tolerance).toBe(0.01);
  });

  it("should create an essay question", () => {
    const q = createQuestion(db, {
      type: "essay",
      name: "Describe photosynthesis",
      questionText: "Describe the process of photosynthesis.",
      generalFeedback: "Good answers mention light, CO2, and water.",
    });

    expect(q.type).toBe("essay");
    expect(q.generalFeedback).toBe("Good answers mention light, CO2, and water.");
  });

  it("should filter questions by type", () => {
    createQuestion(db, { type: "essay", name: "Q1", questionText: "T1" });
    createQuestion(db, { type: "multichoice", name: "Q2", questionText: "T2" });

    const essays = getQuestions(db, { type: "essay" });
    expect(essays).toHaveLength(1);
    expect(essays[0].type).toBe("essay");
  });

  it("should filter questions by search", () => {
    createQuestion(db, { type: "essay", name: "Math Question", questionText: "T1" });
    createQuestion(db, { type: "essay", name: "Science Question", questionText: "T2" });

    const results = getQuestions(db, { search: "Math" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Math Question");
  });

  it("should filter questions by category", () => {
    const cat = createCategory(db, { name: "Physics" });
    createQuestion(db, { type: "essay", name: "Q1", questionText: "T1", categoryId: cat.id });
    createQuestion(db, { type: "essay", name: "Q2", questionText: "T2" });

    const results = getQuestions(db, { categoryId: cat.id });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Q1");
  });

  it("should update a question and its answers", () => {
    const q = createQuestion(db, {
      type: "multichoice",
      name: "Old",
      questionText: "Old text",
      answers: [{ answerText: "A", fraction: 100 }],
    });

    updateQuestion(db, q.id, {
      name: "Updated",
      answers: [
        { answerText: "New A", fraction: 100 },
        { answerText: "New B", fraction: 0 },
      ],
    });

    const full = getQuestionById(db, q.id);
    expect(full!.name).toBe("Updated");
    expect(full!.answers).toHaveLength(2);
    expect(full!.answers[0].answerText).toBe("New A");
  });

  it("should delete a question", () => {
    const q = createQuestion(db, { type: "essay", name: "ToDelete", questionText: "T" });
    deleteQuestion(db, q.id);

    const found = getQuestionById(db, q.id);
    expect(found).toBeUndefined();
  });
});

describe("Stats", () => {
  it("should return correct counts", () => {
    createCategory(db, { name: "Cat1" });
    createCategory(db, { name: "Cat2" });
    createQuestion(db, { type: "essay", name: "Q1", questionText: "T1" });

    const stats = getStats(db);
    expect(stats.questionCount).toBe(1);
    expect(stats.categoryCount).toBe(2);
  });
});
