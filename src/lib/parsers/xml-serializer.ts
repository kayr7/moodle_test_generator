import type { ParsedQuestion } from "../types";

/**
 * Serialize an array of parsed questions into Moodle XML format.
 */
export function serializeMoodleXml(questions: ParsedQuestion[]): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push("<quiz>");

  let currentCategory: string | undefined;

  for (const q of questions) {
    // Add category if changed
    if (q.categoryPath && q.categoryPath !== currentCategory) {
      currentCategory = q.categoryPath;
      lines.push('  <question type="category">');
      lines.push("    <category>");
      lines.push(`      <text>$course$/${escapeXml(currentCategory)}</text>`);
      lines.push("    </category>");
      lines.push("  </question>");
    }

    lines.push(`  <question type="${q.type}">`);
    lines.push("    <name>");
    lines.push(`      <text>${escapeXml(q.name)}</text>`);
    lines.push("    </name>");

    const format = q.questionFormat || "html";
    lines.push(`    <questiontext format="${format}">`);
    lines.push(`      <text>${wrapContent(q.questionText, format)}</text>`);
    lines.push("    </questiontext>");

    if (q.generalFeedback) {
      lines.push('    <generalfeedback format="html">');
      lines.push(`      <text>${wrapContent(q.generalFeedback, "html")}</text>`);
      lines.push("    </generalfeedback>");
    }

    if (q.defaultGrade !== undefined) {
      lines.push(`    <defaultgrade>${q.defaultGrade}</defaultgrade>`);
    }
    if (q.penalty !== undefined) {
      lines.push(`    <penalty>${q.penalty}</penalty>`);
    }

    switch (q.type) {
      case "multichoice":
        lines.push(`    <single>${q.singleAnswer ?? true}</single>`);
        lines.push(`    <shuffleanswers>${q.shuffleAnswers ?? true}</shuffleanswers>`);
        lines.push("    <answernumbering>abc</answernumbering>");
        for (const a of q.answers || []) {
          lines.push(`    <answer fraction="${a.fraction}" format="html">`);
          lines.push(`      <text>${escapeXml(a.answerText)}</text>`);
          if (a.feedback) {
            lines.push('      <feedback format="html">');
            lines.push(`        <text>${escapeXml(a.feedback)}</text>`);
            lines.push("      </feedback>");
          }
          lines.push("    </answer>");
        }
        break;

      case "truefalse":
        for (const a of q.answers || []) {
          lines.push(`    <answer fraction="${a.fraction}" format="html">`);
          lines.push(`      <text>${a.answerText}</text>`);
          if (a.feedback) {
            lines.push('      <feedback format="html">');
            lines.push(`        <text>${escapeXml(a.feedback)}</text>`);
            lines.push("      </feedback>");
          }
          lines.push("    </answer>");
        }
        break;

      case "shortanswer":
        lines.push("    <usecase>0</usecase>");
        for (const a of q.answers || []) {
          lines.push(`    <answer fraction="${a.fraction}" format="html">`);
          lines.push(`      <text>${escapeXml(a.answerText)}</text>`);
          if (a.feedback) {
            lines.push('      <feedback format="html">');
            lines.push(`        <text>${escapeXml(a.feedback)}</text>`);
            lines.push("      </feedback>");
          }
          lines.push("    </answer>");
        }
        break;

      case "matching":
        lines.push(`    <shuffleanswers>${q.shuffleAnswers ?? true}</shuffleanswers>`);
        for (const pair of q.matchingPairs || []) {
          lines.push('    <subquestion format="html">');
          lines.push(`      <text>${escapeXml(pair.subText)}</text>`);
          lines.push("      <answer>");
          lines.push(`        <text>${escapeXml(pair.answerText)}</text>`);
          lines.push("      </answer>");
          lines.push("    </subquestion>");
        }
        break;

      case "numerical":
        for (const a of q.answers || []) {
          lines.push(`    <answer fraction="${a.fraction}">`);
          lines.push(`      <text>${a.answerText}</text>`);
          if (q.numericalOptions) {
            lines.push(`      <tolerance>${q.numericalOptions.tolerance}</tolerance>`);
          }
          if (a.feedback) {
            lines.push('      <feedback format="html">');
            lines.push(`        <text>${escapeXml(a.feedback)}</text>`);
            lines.push("      </feedback>");
          }
          lines.push("    </answer>");
        }
        break;

      case "essay":
        lines.push('    <answer fraction="0">');
        lines.push("      <text></text>");
        lines.push("    </answer>");
        break;
    }

    lines.push("  </question>");
  }

  lines.push("</quiz>");
  return lines.join("\n");
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapContent(text: string, format: string): string {
  if (format === "html" && (text.includes("<") || text.includes(">"))) {
    return `<![CDATA[${text}]]>`;
  }
  return escapeXml(text);
}
