import { describe, it, expect } from "vitest";
import { serializeGift } from "@/lib/parsers/gift-serializer";
import { parseGift } from "@/lib/parsers/gift-parser";
import type { ParsedQuestion } from "@/lib/types";

describe("GIFT Serializer", () => {
  it("should serialize a multiple choice question", () => {
    const q: ParsedQuestion = {
      type: "multichoice",
      name: "Capital of France",
      questionText: "What is the capital of France?",
      singleAnswer: true,
      answers: [
        { answerText: "Paris", fraction: 100, feedback: "Correct!", sortOrder: 0 },
        { answerText: "London", fraction: 0, feedback: "Wrong", sortOrder: 1 },
        { answerText: "Berlin", fraction: 0, feedback: "", sortOrder: 2 },
      ],
    };

    const output = serializeGift([q]);
    expect(output).toContain("::Capital of France::");
    expect(output).toContain("=Paris #Correct!");
    expect(output).toContain("~London #Wrong");
    expect(output).toContain("~Berlin");
  });

  it("should serialize a multiple answer question with percentages", () => {
    const q: ParsedQuestion = {
      type: "multichoice",
      name: "Colors",
      questionText: "Which are primary colors?",
      singleAnswer: false,
      answers: [
        { answerText: "Red", fraction: 33.33, feedback: "", sortOrder: 0 },
        { answerText: "Green", fraction: -100, feedback: "", sortOrder: 1 },
      ],
    };

    const output = serializeGift([q]);
    expect(output).toContain("~%33.33%Red");
    expect(output).toContain("~%-100%Green");
  });

  it("should serialize a true/false question", () => {
    const q: ParsedQuestion = {
      type: "truefalse",
      name: "Earth Round",
      questionText: "The Earth is round.",
      answers: [
        { answerText: "true", fraction: 100, feedback: "", sortOrder: 0 },
        { answerText: "false", fraction: 0, feedback: "", sortOrder: 1 },
      ],
    };

    const output = serializeGift([q]);
    expect(output).toContain("::Earth Round::");
    expect(output).toContain("{TRUE}");
  });

  it("should serialize a false answer TF question", () => {
    const q: ParsedQuestion = {
      type: "truefalse",
      name: "Flat Earth",
      questionText: "The Earth is flat.",
      answers: [
        { answerText: "true", fraction: 0, feedback: "", sortOrder: 0 },
        { answerText: "false", fraction: 100, feedback: "", sortOrder: 1 },
      ],
    };

    const output = serializeGift([q]);
    expect(output).toContain("{FALSE}");
  });

  it("should serialize a short answer question", () => {
    const q: ParsedQuestion = {
      type: "shortanswer",
      name: "Capital",
      questionText: "What is the capital of France?",
      answers: [
        { answerText: "Paris", fraction: 100, feedback: "", sortOrder: 0 },
        { answerText: "paris", fraction: 100, feedback: "", sortOrder: 1 },
      ],
    };

    const output = serializeGift([q]);
    expect(output).toContain("=Paris");
    expect(output).toContain("=paris");
  });

  it("should serialize a matching question", () => {
    const q: ParsedQuestion = {
      type: "matching",
      name: "Match Capitals",
      questionText: "Match the country with its capital.",
      matchingPairs: [
        { subText: "France", answerText: "Paris", sortOrder: 0 },
        { subText: "Germany", answerText: "Berlin", sortOrder: 1 },
      ],
    };

    const output = serializeGift([q]);
    expect(output).toContain("=France -> Paris");
    expect(output).toContain("=Germany -> Berlin");
  });

  it("should serialize a numerical question", () => {
    const q: ParsedQuestion = {
      type: "numerical",
      name: "Pi",
      questionText: "What is pi (to 2 decimal places)?",
      answers: [{ answerText: "3.14", fraction: 100, feedback: "", sortOrder: 0 }],
      numericalOptions: { tolerance: 0.01 },
    };

    const output = serializeGift([q]);
    expect(output).toContain("{#3.14:0.01}");
  });

  it("should serialize a numerical question without tolerance", () => {
    const q: ParsedQuestion = {
      type: "numerical",
      name: "Sum",
      questionText: "What is 2+2?",
      answers: [{ answerText: "4", fraction: 100, feedback: "", sortOrder: 0 }],
      numericalOptions: { tolerance: 0 },
    };

    const output = serializeGift([q]);
    expect(output).toContain("{#4}");
  });

  it("should serialize an essay question", () => {
    const q: ParsedQuestion = {
      type: "essay",
      name: "Photosynthesis",
      questionText: "Describe the process of photosynthesis.",
    };

    const output = serializeGift([q]);
    expect(output).toContain("::Photosynthesis::");
    expect(output).toContain("{}");
  });

  it("should serialize questions with categories", () => {
    const questions: ParsedQuestion[] = [
      {
        type: "essay",
        name: "Q1",
        questionText: "Question 1",
        categoryPath: "Science/Biology",
      },
      {
        type: "essay",
        name: "Q2",
        questionText: "Question 2",
        categoryPath: "Math",
      },
    ];

    const output = serializeGift(questions);
    expect(output).toContain("$CATEGORY: Science/Biology");
    expect(output).toContain("$CATEGORY: Math");
  });

  it("should escape special characters", () => {
    const q: ParsedQuestion = {
      type: "shortanswer",
      name: "Braces",
      questionText: "What does {x} mean?",
      answers: [{ answerText: "a set", fraction: 100, feedback: "", sortOrder: 0 }],
    };

    const output = serializeGift([q]);
    expect(output).toContain("\\{x\\}");
  });

  describe("Round-trip", () => {
    it("should round-trip a multiple choice question", () => {
      const original = `::Capital:: What is the capital of France? {
=Paris #Correct!
~London #Wrong
~Berlin
}`;
      const parsed = parseGift(original);
      const serialized = serializeGift(parsed.questions);
      const reparsed = parseGift(serialized);

      expect(reparsed.questions).toHaveLength(1);
      expect(reparsed.questions[0].name).toBe("Capital");
      expect(reparsed.questions[0].answers).toHaveLength(3);
      expect(reparsed.questions[0].answers![0].answerText).toBe("Paris");
      expect(reparsed.questions[0].answers![0].fraction).toBe(100);
    });

    it("should round-trip a matching question", () => {
      const original = `::Capitals:: Match countries. {
=France -> Paris
=Germany -> Berlin
}`;
      const parsed = parseGift(original);
      const serialized = serializeGift(parsed.questions);
      const reparsed = parseGift(serialized);

      expect(reparsed.questions[0].matchingPairs).toHaveLength(2);
    });
  });
});
