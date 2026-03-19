export type QuestionType =
  | "multichoice"
  | "truefalse"
  | "shortanswer"
  | "matching"
  | "numerical"
  | "essay";

export interface Category {
  id: number;
  name: string;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  id?: number;
  questionId?: number;
  answerText: string;
  fraction: number; // 0-100
  feedback: string;
  sortOrder: number;
}

export interface MatchingPair {
  id?: number;
  questionId?: number;
  subText: string;
  answerText: string;
  sortOrder: number;
}

export interface NumericalOption {
  id?: number;
  questionId?: number;
  tolerance: number;
}

export interface QuestionImage {
  id?: number;
  questionId?: number;
  filename: string;
  originalName: string;
  mimeType: string;
  filePath: string;
  createdAt?: string;
}

export interface Question {
  id?: number;
  categoryId: number | null;
  type: QuestionType;
  name: string;
  questionText: string;
  questionFormat: "html" | "markdown" | "plain";
  generalFeedback: string;
  defaultGrade: number;
  penalty: number;
  singleAnswer: boolean;
  shuffleAnswers: boolean;
  createdAt?: string;
  updatedAt?: string;
  // Relations
  answers?: Answer[];
  matchingPairs?: MatchingPair[];
  numericalOptions?: NumericalOption;
  images?: QuestionImage[];
  category?: Category;
  tags?: Tag[];
}

export interface Course {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  id: number;
  courseId: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: number;
  quizId: number;
  questionId: number;
  sortOrder: number;
}

export interface Tag {
  id: number;
  name: string;
  createdAt: string;
}

export interface QuestionTag {
  id: number;
  questionId: number;
  tagId: number;
}

// Used for parsed import data
export interface ParsedQuestion {
  type: QuestionType;
  name: string;
  questionText: string;
  questionFormat?: "html" | "markdown" | "plain";
  generalFeedback?: string;
  defaultGrade?: number;
  penalty?: number;
  singleAnswer?: boolean;
  shuffleAnswers?: boolean;
  answers?: Answer[];
  matchingPairs?: MatchingPair[];
  numericalOptions?: NumericalOption;
  categoryPath?: string;
  images?: { filename: string; data: string; mimeType: string }[];
}

export interface ImportResult {
  questions: ParsedQuestion[];
  categories: string[];
  errors: string[];
}

export interface ExportOptions {
  format: "gift" | "xml";
  questionIds?: number[];
  categoryId?: number | null;
  includeImages?: boolean;
  quizId?: number;
}
