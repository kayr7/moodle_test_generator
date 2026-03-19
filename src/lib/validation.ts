/**
 * Validates that positive answer fractions for a multichoice question sum to 100%.
 * Negative fractions (penalties for wrong answers) are excluded from the sum.
 *
 * @returns null if valid, or an error message string if invalid.
 */
export function validateMultichoiceFractions(
  answers: { fraction: number; answerText?: string }[]
): string | null {
  // Only consider answers that have text (non-empty answers)
  const nonEmptyAnswers = answers.filter(
    (a) => a.answerText === undefined || a.answerText.trim() !== ""
  );

  const positiveSum = nonEmptyAnswers
    .filter((a) => a.fraction > 0)
    .reduce((sum, a) => sum + a.fraction, 0);

  // Allow a small floating-point tolerance
  if (Math.abs(positiveSum - 100) > 0.01) {
    return `Positive answer grades must sum to 100%. Currently: ${positiveSum}%`;
  }

  return null;
}
