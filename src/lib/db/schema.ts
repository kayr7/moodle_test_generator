import { sqliteTable, text, integer, real, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  parentId: integer("parent_id").references((): AnySQLiteColumn => categories.id),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").references(() => categories.id),
  type: text("type").notNull(), // multichoice, truefalse, shortanswer, matching, numerical, essay
  name: text("name").notNull(),
  questionText: text("question_text").notNull(),
  questionFormat: text("question_format").notNull().default("html"),
  generalFeedback: text("general_feedback").default(""),
  defaultGrade: real("default_grade").notNull().default(1.0),
  penalty: real("penalty").notNull().default(0.333),
  singleAnswer: integer("single_answer", { mode: "boolean" }).notNull().default(true),
  shuffleAnswers: integer("shuffle_answers", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const answers = sqliteTable("answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: integer("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  answerText: text("answer_text").notNull(),
  fraction: real("fraction").notNull().default(0),
  feedback: text("feedback").default(""),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const matchingPairs = sqliteTable("matching_pairs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: integer("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  subText: text("sub_text").notNull(),
  answerText: text("answer_text").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const numericalOptions = sqliteTable("numerical_options", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: integer("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  tolerance: real("tolerance").notNull().default(0),
});

export const images = sqliteTable("images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  questionId: integer("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  filePath: text("file_path").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
  }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  category: one(categories, {
    fields: [questions.categoryId],
    references: [categories.id],
  }),
  answers: many(answers),
  matchingPairs: many(matchingPairs),
  numericalOptions: many(numericalOptions),
  images: many(images),
}));

export const answersRelations = relations(answers, ({ one }) => ({
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
}));

export const matchingPairsRelations = relations(matchingPairs, ({ one }) => ({
  question: one(questions, {
    fields: [matchingPairs.questionId],
    references: [questions.id],
  }),
}));

export const numericalOptionsRelations = relations(numericalOptions, ({ one }) => ({
  question: one(questions, {
    fields: [numericalOptions.questionId],
    references: [questions.id],
  }),
}));

export const imagesRelations = relations(images, ({ one }) => ({
  question: one(questions, {
    fields: [images.questionId],
    references: [questions.id],
  }),
}));
