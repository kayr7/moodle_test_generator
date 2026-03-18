import type { ParsedQuestion, ImportResult, Answer, MatchingPair } from "../types";

/**
 * Parse a GIFT format string into an array of parsed questions.
 */
export function parseGift(input: string): ImportResult {
  const questions: ParsedQuestion[] = [];
  const categories = new Set<string>();
  const errors: string[] = [];

  if (!input.trim()) {
    return { questions, categories: [], errors };
  }

  let currentCategory: string | undefined;

  // Split into blocks separated by blank lines
  const blocks = splitIntoBlocks(input);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Skip comment-only blocks
    if (isCommentOnly(trimmed)) continue;

    // Check for category
    const categoryMatch = trimmed.match(/^\$CATEGORY:\s*(.+)$/m);
    if (categoryMatch) {
      currentCategory = categoryMatch[1].trim();
      categories.add(currentCategory);
      continue;
    }

    try {
      const question = parseQuestionBlock(trimmed);
      if (question) {
        if (currentCategory) {
          question.categoryPath = currentCategory;
        }
        questions.push(question);
      }
    } catch (e) {
      errors.push(`Error parsing block: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { questions, categories: Array.from(categories), errors };
}

function splitIntoBlocks(input: string): string[] {
  // Remove comment lines first, then split by blank lines
  const lines = input.split("\n");
  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if it's a comment line
    if (trimmed.startsWith("//")) continue;

    if (trimmed === "") {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n"));
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n"));
  }

  return blocks;
}

function isCommentOnly(block: string): boolean {
  return block
    .split("\n")
    .every((line) => line.trim().startsWith("//") || line.trim() === "");
}

function parseQuestionBlock(block: string): ParsedQuestion | null {
  // Find the answer block (content within outermost { })
  const answerStart = findUnescapedChar(block, "{");
  if (answerStart === -1) {
    // No answer block - not a valid question
    return null;
  }

  const answerEnd = findMatchingBrace(block, answerStart);
  if (answerEnd === -1) return null;

  const beforeAnswer = block.substring(0, answerStart).trim();
  const answerContent = block.substring(answerStart + 1, answerEnd).trim();

  // Extract title if present
  let name: string;
  let questionText: string;

  const titleMatch = beforeAnswer.match(/^::(.+?)::\s*([\s\S]*)$/);
  if (titleMatch) {
    name = titleMatch[1].trim();
    questionText = unescapeGift(titleMatch[2].trim());
  } else {
    questionText = unescapeGift(beforeAnswer);
    name = questionText.substring(0, 80);
  }

  // Determine question type from answer content
  if (answerContent === "") {
    // Essay
    return {
      type: "essay",
      name,
      questionText,
    };
  }

  // True/False
  const tfMatch = answerContent.match(
    /^(TRUE|FALSE|T|F)\s*(?:#([^#]*))?(?:#(.*))?$/i
  );
  if (tfMatch) {
    return parseTrueFalse(name, questionText, tfMatch);
  }

  // Check for matching (contains ->)
  if (answerContent.includes("->")) {
    return parseMatching(name, questionText, answerContent);
  }

  // Check for numerical (starts with #)
  if (answerContent.startsWith("#")) {
    return parseNumerical(name, questionText, answerContent);
  }

  // Multiple choice or short answer
  return parseChoiceOrShortAnswer(name, questionText, answerContent);
}

function parseTrueFalse(
  name: string,
  questionText: string,
  match: RegExpMatchArray
): ParsedQuestion {
  const isTrue = match[1].toUpperCase() === "TRUE" || match[1].toUpperCase() === "T";
  const answers: Answer[] = [
    {
      answerText: "true",
      fraction: isTrue ? 100 : 0,
      feedback: isTrue ? (match[2]?.trim() || "") : (match[3]?.trim() || ""),
      sortOrder: 0,
    },
    {
      answerText: "false",
      fraction: isTrue ? 0 : 100,
      feedback: isTrue ? (match[3]?.trim() || "") : (match[2]?.trim() || ""),
      sortOrder: 1,
    },
  ];

  return {
    type: "truefalse",
    name,
    questionText,
    answers,
  };
}

function parseMatching(
  name: string,
  questionText: string,
  answerContent: string
): ParsedQuestion {
  const pairs: MatchingPair[] = [];
  // Match lines like: =SubText -> AnswerText
  const pairRegex = /=\s*(.+?)\s*->\s*(.+)/g;
  let match;
  let order = 0;

  while ((match = pairRegex.exec(answerContent)) !== null) {
    pairs.push({
      subText: unescapeGift(match[1].trim()),
      answerText: unescapeGift(match[2].trim()),
      sortOrder: order++,
    });
  }

  return {
    type: "matching",
    name,
    questionText,
    matchingPairs: pairs,
  };
}

function parseNumerical(
  name: string,
  questionText: string,
  answerContent: string
): ParsedQuestion {
  // Remove leading #
  const content = answerContent.substring(1).trim();

  // Check for range format: min..max
  const rangeMatch = content.match(/^(-?[\d.]+)\.\.(-?[\d.]+)$/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    const midpoint = (min + max) / 2;
    const tolerance = (max - min) / 2;

    return {
      type: "numerical",
      name,
      questionText,
      answers: [{ answerText: String(midpoint), fraction: 100, feedback: "", sortOrder: 0 }],
      numericalOptions: { tolerance },
    };
  }

  // Check for value:tolerance format
  const toleranceMatch = content.match(/^(-?[\d.]+):(-?[\d.]+)$/);
  if (toleranceMatch) {
    return {
      type: "numerical",
      name,
      questionText,
      answers: [
        { answerText: toleranceMatch[1], fraction: 100, feedback: "", sortOrder: 0 },
      ],
      numericalOptions: { tolerance: parseFloat(toleranceMatch[2]) },
    };
  }

  // Simple numerical answer (possibly with feedback)
  const simpleMatch = content.match(/^(-?[\d.]+)(?:\s*#(.*))?$/);
  if (simpleMatch) {
    return {
      type: "numerical",
      name,
      questionText,
      answers: [
        {
          answerText: simpleMatch[1],
          fraction: 100,
          feedback: simpleMatch[2]?.trim() || "",
          sortOrder: 0,
        },
      ],
      numericalOptions: { tolerance: 0 },
    };
  }

  // Multiple numerical answers with = prefix
  const answers: Answer[] = [];
  let tolerance = 0;
  const multiNumRegex = /=?(%?\d+%?)?\s*(-?[\d.]+)(?::(-?[\d.]+))?(?:\s*#([^=]*))?/g;
  let m;
  let order = 0;
  while ((m = multiNumRegex.exec(content)) !== null) {
    const fraction = m[1] ? parseFloat(m[1].replace(/%/g, "")) : 100;
    answers.push({
      answerText: m[2],
      fraction,
      feedback: m[4]?.trim() || "",
      sortOrder: order++,
    });
    if (m[3]) tolerance = parseFloat(m[3]);
  }

  if (answers.length === 0) {
    answers.push({ answerText: content, fraction: 100, feedback: "", sortOrder: 0 });
  }

  return {
    type: "numerical",
    name,
    questionText,
    answers,
    numericalOptions: { tolerance },
  };
}

function parseChoiceOrShortAnswer(
  name: string,
  questionText: string,
  answerContent: string
): ParsedQuestion {
  const answers: Answer[] = [];
  let hasWrongAnswers = false;
  let hasPercentageWeights = false;

  // Parse answers - split by = or ~ at the start of lines or after whitespace
  const answerTokens = tokenizeAnswers(answerContent);

  let order = 0;
  for (const token of answerTokens) {
    const { prefix, text: rawText } = token;

    // Extract feedback
    let answerText: string;
    let feedback = "";
    const feedbackIdx = findUnescapedChar(rawText, "#");
    if (feedbackIdx !== -1) {
      answerText = rawText.substring(0, feedbackIdx).trim();
      feedback = rawText.substring(feedbackIdx + 1).trim();
    } else {
      answerText = rawText.trim();
    }

    // Check for percentage weight
    let fraction: number;
    const percentMatch = answerText.match(/^%(-?[\d.]+)%([\s\S]+)$/);
    if (percentMatch) {
      fraction = parseFloat(percentMatch[1]);
      answerText = percentMatch[2].trim();
      hasPercentageWeights = true;
      if (fraction < 0) hasWrongAnswers = true;
    } else if (prefix === "=") {
      fraction = 100;
    } else {
      fraction = 0;
      hasWrongAnswers = true;
    }

    answers.push({
      answerText: unescapeGift(answerText),
      fraction,
      feedback: unescapeGift(feedback),
      sortOrder: order++,
    });
  }

  // Determine if it's short answer (only = answers, no ~ answers)
  const isShortAnswer = !hasWrongAnswers && !hasPercentageWeights;
  const isSingleAnswer = !hasPercentageWeights;

  return {
    type: isShortAnswer ? "shortanswer" : "multichoice",
    name,
    questionText,
    singleAnswer: isSingleAnswer,
    answers,
  };
}

function tokenizeAnswers(content: string): { prefix: string; text: string }[] {
  const tokens: { prefix: string; text: string }[] = [];
  let i = 0;
  let currentPrefix = "";
  let currentText = "";

  while (i < content.length) {
    const ch = content[i];

    if (ch === "\\" && i + 1 < content.length) {
      currentText += ch + content[i + 1];
      i += 2;
      continue;
    }

    if (ch === "=" || ch === "~") {
      if (currentPrefix) {
        tokens.push({ prefix: currentPrefix, text: currentText.trim() });
      }
      currentPrefix = ch;
      currentText = "";
      i++;
      continue;
    }

    currentText += ch;
    i++;
  }

  if (currentPrefix) {
    tokens.push({ prefix: currentPrefix, text: currentText.trim() });
  }

  return tokens;
}

function findUnescapedChar(str: string, char: string): number {
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\\" && i + 1 < str.length) {
      i++; // skip escaped char
      continue;
    }
    if (str[i] === char) return i;
  }
  return -1;
}

function findMatchingBrace(str: string, openPos: number): number {
  let depth = 0;
  for (let i = openPos; i < str.length; i++) {
    if (str[i] === "\\" && i + 1 < str.length) {
      i++; // skip escaped char
      continue;
    }
    if (str[i] === "{") depth++;
    if (str[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function unescapeGift(text: string): string {
  return text
    .replace(/\\~/g, "~")
    .replace(/\\=/g, "=")
    .replace(/\\#/g, "#")
    .replace(/\\{/g, "{")
    .replace(/\\}/g, "}")
    .replace(/\\:/g, ":")
    .replace(/\\\+/g, "+")
    .replace(/\\\\/g, "\\");
}
