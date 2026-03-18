import type { ParsedQuestion } from "../types";

/**
 * Serialize an array of parsed questions into GIFT format text.
 */
export function serializeGift(questions: ParsedQuestion[]): string {
  const lines: string[] = [];
  let currentCategory: string | undefined;

  for (const q of questions) {
    // Output category if changed
    if (q.categoryPath && q.categoryPath !== currentCategory) {
      currentCategory = q.categoryPath;
      if (lines.length > 0) lines.push("");
      lines.push(`$CATEGORY: ${currentCategory}`);
      lines.push("");
    } else if (lines.length > 0) {
      lines.push("");
    }

    const title = `::${q.name}:: `;
    const questionText = escapeGift(q.questionText);

    switch (q.type) {
      case "truefalse":
        lines.push(`${title}${questionText} {${serializeTrueFalse(q)}}`);
        break;

      case "essay":
        lines.push(`${title}${questionText} {}`);
        break;

      case "numerical":
        lines.push(`${title}${questionText} {${serializeNumerical(q)}}`);
        break;

      case "matching":
        lines.push(`${title}${questionText} {`);
        for (const pair of q.matchingPairs || []) {
          lines.push(`=${escapeGift(pair.subText)} -> ${escapeGift(pair.answerText)}`);
        }
        lines.push("}");
        break;

      case "shortanswer":
        lines.push(`${title}${questionText} {`);
        for (const a of q.answers || []) {
          let line = "=";
          if (a.fraction !== 100) {
            line += `%${a.fraction}%`;
          }
          line += escapeGift(a.answerText);
          if (a.feedback) line += ` #${escapeGift(a.feedback)}`;
          lines.push(line);
        }
        lines.push("}");
        break;

      case "multichoice":
        lines.push(`${title}${questionText} {`);
        if (q.singleAnswer) {
          for (const a of q.answers || []) {
            const prefix = a.fraction > 0 ? "=" : "~";
            let line = prefix + escapeGift(a.answerText);
            if (a.feedback) line += ` #${escapeGift(a.feedback)}`;
            lines.push(line);
          }
        } else {
          // Multiple answer - use percentage weights
          for (const a of q.answers || []) {
            let line = `~%${a.fraction}%${escapeGift(a.answerText)}`;
            if (a.feedback) line += ` #${escapeGift(a.feedback)}`;
            lines.push(line);
          }
        }
        lines.push("}");
        break;
    }
  }

  return lines.join("\n") + "\n";
}

function serializeTrueFalse(q: ParsedQuestion): string {
  const trueAnswer = q.answers?.find((a) => a.answerText === "true");
  return trueAnswer && trueAnswer.fraction > 0 ? "TRUE" : "FALSE";
}

function serializeNumerical(q: ParsedQuestion): string {
  const answer = q.answers?.[0];
  if (!answer) return "#0";

  const tolerance = q.numericalOptions?.tolerance ?? 0;
  if (tolerance > 0) {
    return `#${answer.answerText}:${tolerance}`;
  }
  return `#${answer.answerText}`;
}

function escapeGift(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/~/g, "\\~")
    .replace(/=/g, "\\=")
    .replace(/#/g, "\\#")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/:/g, "\\:");
}
