import { describe, it, expect } from "vitest";
import { validateMultichoiceFractions } from "@/lib/validation";

describe("validateMultichoiceFractions", () => {
  it("should pass when a single correct answer has 100%", () => {
    const result = validateMultichoiceFractions([
      { answerText: "Correct", fraction: 100 },
      { answerText: "Wrong", fraction: 0 },
      { answerText: "Wrong", fraction: 0 },
    ]);
    expect(result).toBeNull();
  });

  it("should pass when multiple correct answers sum to 100%", () => {
    const result = validateMultichoiceFractions([
      { answerText: "A", fraction: 50 },
      { answerText: "B", fraction: 50 },
      { answerText: "C", fraction: 0 },
    ]);
    expect(result).toBeNull();
  });

  it("should pass with three partial correct answers summing to 100%", () => {
    const result = validateMultichoiceFractions([
      { answerText: "A", fraction: 33.33333 },
      { answerText: "B", fraction: 33.33333 },
      { answerText: "C", fraction: 33.33334 },
    ]);
    expect(result).toBeNull();
  });

  it("should fail when positive fractions sum to less than 100%", () => {
    const result = validateMultichoiceFractions([
      { answerText: "A", fraction: 50 },
      { answerText: "B", fraction: 0 },
    ]);
    expect(result).not.toBeNull();
    expect(result).toContain("50%");
  });

  it("should fail when positive fractions sum to more than 100%", () => {
    const result = validateMultichoiceFractions([
      { answerText: "A", fraction: 100 },
      { answerText: "B", fraction: 50 },
    ]);
    expect(result).not.toBeNull();
    expect(result).toContain("150%");
  });

  it("should fail when no correct answers exist", () => {
    const result = validateMultichoiceFractions([
      { answerText: "A", fraction: 0 },
      { answerText: "B", fraction: 0 },
    ]);
    expect(result).not.toBeNull();
    expect(result).toContain("0%");
  });

  it("should exclude negative fractions from the sum", () => {
    const result = validateMultichoiceFractions([
      { answerText: "Correct", fraction: 100 },
      { answerText: "Wrong", fraction: -50 },
      { answerText: "Wrong", fraction: -25 },
    ]);
    expect(result).toBeNull();
  });

  it("should not count negative fractions toward the 100%", () => {
    // 50% positive is not enough, even with -50% penalty
    const result = validateMultichoiceFractions([
      { answerText: "A", fraction: 50 },
      { answerText: "B", fraction: -50 },
    ]);
    expect(result).not.toBeNull();
  });

  it("should ignore empty answer texts", () => {
    const result = validateMultichoiceFractions([
      { answerText: "Correct", fraction: 100 },
      { answerText: "", fraction: 50 },
      { answerText: "Wrong", fraction: 0 },
    ]);
    expect(result).toBeNull();
  });

  it("should ignore whitespace-only answer texts", () => {
    const result = validateMultichoiceFractions([
      { answerText: "Correct", fraction: 100 },
      { answerText: "   ", fraction: 50 },
    ]);
    expect(result).toBeNull();
  });

  it("should work when answerText is undefined (e.g. from API)", () => {
    const result = validateMultichoiceFractions([
      { fraction: 100 },
      { fraction: 0 },
    ]);
    expect(result).toBeNull();
  });

  it("should handle floating point edge cases", () => {
    // 33.33 + 33.33 + 33.34 = 100.00
    const result = validateMultichoiceFractions([
      { answerText: "A", fraction: 33.33 },
      { answerText: "B", fraction: 33.33 },
      { answerText: "C", fraction: 33.34 },
    ]);
    expect(result).toBeNull();
  });
});
