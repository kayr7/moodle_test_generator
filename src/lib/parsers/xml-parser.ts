import { XMLParser } from "fast-xml-parser";
import type {
  ParsedQuestion,
  ImportResult,
  Answer,
  MatchingPair,
  QuestionType,
} from "../types";

function createParser() {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    cdataPropName: "__cdata",
    trimValues: true,
    parseAttributeValue: false,
    parseTagValue: false,
    isArray: (name) => {
      return ["question", "answer", "subquestion", "file", "unit"].includes(name);
    },
  });
}

/**
 * Parse Moodle XML format into an array of parsed questions.
 */
export function parseMoodleXml(input: string): ImportResult {
  const questions: ParsedQuestion[] = [];
  const categories = new Set<string>();
  const errors: string[] = [];

  if (!input.trim()) {
    return { questions, categories: [], errors };
  }

  let parsed;
  try {
    parsed = createParser().parse(input);
  } catch (e) {
    return {
      questions: [],
      categories: [],
      errors: [`XML parse error: ${e instanceof Error ? e.message : String(e)}`],
    };
  }

  const quiz = parsed?.quiz;
  if (!quiz) return { questions, categories: [], errors };

  const questionElements = quiz.question || [];
  let currentCategory: string | undefined;

  for (const qEl of questionElements) {
    const type = qEl["@_type"] as string;

    if (type === "category") {
      const catText = extractText(qEl?.category);
      if (catText) {
        // Remove $course$/ prefix if present
        currentCategory = catText.replace(/^\$course\$\//, "");
        categories.add(currentCategory);
      }
      continue;
    }

    try {
      const question = parseQuestionElement(qEl, type as QuestionType);
      if (question) {
        if (currentCategory) {
          question.categoryPath = currentCategory;
        }
        questions.push(question);
      }
    } catch (e) {
      errors.push(`Error parsing question: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { questions, categories: Array.from(categories), errors };
}

function parseQuestionElement(
  el: Record<string, unknown>,
  type: QuestionType
): ParsedQuestion | null {
  const name = extractText(el.name) || "Untitled";
  const questionText = extractQuestionText(el.questiontext);
  const questionFormat = extractFormat(el.questiontext) || "html";
  const generalFeedback = extractQuestionText(el.generalfeedback) || "";
  const defaultGrade = el.defaultgrade ? Number(el.defaultgrade) : 1;
  const penalty = el.penalty ? Number(el.penalty) : 0.333;

  const base: ParsedQuestion = {
    type,
    name,
    questionText,
    questionFormat: questionFormat as "html" | "markdown" | "plain",
    generalFeedback,
    defaultGrade,
    penalty,
  };

  switch (type) {
    case "multichoice": {
      const single = String(el.single) === "true";
      base.singleAnswer = single;
      base.shuffleAnswers =
        String(el.shuffleanswers) === "true" || String(el.shuffleanswers) === "1";
      base.answers = parseAnswers(el.answer as Record<string, unknown>[]);
      break;
    }

    case "truefalse": {
      base.answers = parseAnswers(el.answer as Record<string, unknown>[]);
      break;
    }

    case "shortanswer": {
      base.answers = parseAnswers(el.answer as Record<string, unknown>[]);
      break;
    }

    case "matching": {
      base.matchingPairs = parseSubquestions(
        el.subquestion as Record<string, unknown>[]
      );
      base.shuffleAnswers =
        String(el.shuffleanswers) === "true" || String(el.shuffleanswers) === "1";
      break;
    }

    case "numerical": {
      const answers = el.answer
        ? (Array.isArray(el.answer) ? el.answer : [el.answer]) as Record<string, unknown>[]
        : [];
      base.answers = [];
      let tolerance = 0;

      for (let i = 0; i < answers.length; i++) {
        const a = answers[i];
        base.answers.push({
          answerText: extractText(a) || String(a.text || ""),
          fraction: Number(a["@_fraction"] ?? 0),
          feedback: extractQuestionText(a.feedback) || "",
          sortOrder: i,
        });
        if (a.tolerance !== undefined) {
          tolerance = Number(a.tolerance);
        }
      }

      base.numericalOptions = { tolerance };
      break;
    }

    case "essay": {
      // Essay has no answers
      break;
    }

    default:
      return null;
  }

  return base;
}

function parseAnswers(answerElements: Record<string, unknown>[] | undefined): Answer[] {
  if (!answerElements) return [];
  const elements = Array.isArray(answerElements) ? answerElements : [answerElements];

  return elements.map((a, i) => ({
    answerText: extractText(a) || "",
    fraction: Number(a["@_fraction"] ?? 0),
    feedback: extractQuestionText(a.feedback) || "",
    sortOrder: i,
  }));
}

function parseSubquestions(
  subquestionElements: Record<string, unknown>[] | undefined
): MatchingPair[] {
  if (!subquestionElements) return [];
  const elements = Array.isArray(subquestionElements)
    ? subquestionElements
    : [subquestionElements];

  return elements.map((sq, i) => {
    // answer may be an array due to isArray config
    const answerEl = Array.isArray(sq.answer)
      ? (sq.answer as Record<string, unknown>[])[0]
      : sq.answer;
    return {
      subText: extractText(sq) || "",
      answerText: extractText(answerEl) || "",
      sortOrder: i,
    };
  });
}

function extractText(el: unknown): string {
  if (!el) return "";
  if (typeof el === "string") return el;
  if (typeof el === "number") return String(el);

  const obj = el as Record<string, unknown>;

  // Handle nested text element
  if (obj.text !== undefined) {
    const text = obj.text;
    if (typeof text === "string") return text;
    if (typeof text === "number") return String(text);
    if (text && typeof text === "object") {
      const textObj = text as Record<string, unknown>;
      if (textObj.__cdata) return String(textObj.__cdata);
      if (textObj["#text"]) return String(textObj["#text"]);
    }
  }

  if (obj.__cdata) return String(obj.__cdata);
  if (obj["#text"]) return String(obj["#text"]);

  return "";
}

function extractQuestionText(el: unknown): string {
  if (!el) return "";
  if (typeof el === "string") return el;
  if (typeof el === "number") return String(el);

  const obj = el as Record<string, unknown>;
  const text = obj.text;

  if (text !== undefined) {
    if (typeof text === "string") return text;
    if (typeof text === "number") return String(text);
    if (text && typeof text === "object") {
      const textObj = text as Record<string, unknown>;
      if (textObj.__cdata) return String(textObj.__cdata);
      if (textObj["#text"]) return String(textObj["#text"]);
    }
  }

  if (obj.__cdata) return String(obj.__cdata);
  if (obj["#text"]) return String(obj["#text"]);

  return "";
}

function extractFormat(el: unknown): string | undefined {
  if (!el || typeof el !== "object") return undefined;
  const obj = el as Record<string, unknown>;
  const format = obj["@_format"];
  if (typeof format === "string") return format;
  return undefined;
}
