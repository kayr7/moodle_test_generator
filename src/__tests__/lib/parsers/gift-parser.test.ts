import { describe, it, expect } from "vitest";
import { parseGift } from "@/lib/parsers/gift-parser";

describe("GIFT Parser", () => {
  describe("Multiple Choice (single answer)", () => {
    it("should parse a basic multiple choice question", () => {
      const input = `::Capital of France:: What is the capital of France? {
=Paris
~London
~Berlin
~Madrid
}`;
      const result = parseGift(input);
      expect(result.questions).toHaveLength(1);
      const q = result.questions[0];
      expect(q.name).toBe("Capital of France");
      expect(q.type).toBe("multichoice");
      expect(q.questionText).toBe("What is the capital of France?");
      expect(q.singleAnswer).toBe(true);
      expect(q.answers).toHaveLength(4);
      expect(q.answers![0].answerText).toBe("Paris");
      expect(q.answers![0].fraction).toBe(100);
      expect(q.answers![1].answerText).toBe("London");
      expect(q.answers![1].fraction).toBe(0);
    });

    it("should parse question with feedback", () => {
      const input = `What is 2+2? {
=4 #Correct!
~3 #Nope, try again
~5 #Too high
}`;
      const result = parseGift(input);
      const q = result.questions[0];
      expect(q.answers![0].feedback).toBe("Correct!");
      expect(q.answers![1].feedback).toBe("Nope, try again");
    });

    it("should parse question without title", () => {
      const input = `What is 2+2? {=4 ~3 ~5}`;
      const result = parseGift(input);
      expect(result.questions[0].name).toBe("What is 2+2?");
    });
  });

  describe("Multiple Choice (multiple answers)", () => {
    it("should parse with percentage weights", () => {
      const input = `::Colors:: Which are primary colors? {
~%33.33333%Red
~%33.33333%Blue
~%33.33334%Yellow
~%-100%Green
~%-100%Orange
}`;
      const result = parseGift(input);
      const q = result.questions[0];
      expect(q.type).toBe("multichoice");
      expect(q.singleAnswer).toBe(false);
      expect(q.answers).toHaveLength(5);
      expect(q.answers![0].fraction).toBeCloseTo(33.33333);
      expect(q.answers![3].fraction).toBe(-100);
    });
  });

  describe("True/False", () => {
    it("should parse TRUE answer", () => {
      const input = `::Earth Round:: The Earth is round. {TRUE}`;
      const result = parseGift(input);
      const q = result.questions[0];
      expect(q.type).toBe("truefalse");
      expect(q.answers).toHaveLength(2);
      expect(q.answers![0].answerText).toBe("true");
      expect(q.answers![0].fraction).toBe(100);
      expect(q.answers![1].answerText).toBe("false");
      expect(q.answers![1].fraction).toBe(0);
    });

    it("should parse FALSE answer", () => {
      const input = `The sun revolves around the Earth. {FALSE}`;
      const result = parseGift(input);
      const q = result.questions[0];
      expect(q.type).toBe("truefalse");
      expect(q.answers![0].answerText).toBe("true");
      expect(q.answers![0].fraction).toBe(0);
      expect(q.answers![1].answerText).toBe("false");
      expect(q.answers![1].fraction).toBe(100);
    });

    it("should parse T/F shorthand", () => {
      const input = `1+1\\=2 {T}`;
      const result = parseGift(input);
      expect(result.questions[0].type).toBe("truefalse");
    });

    it("should parse true/false with feedback", () => {
      const input = `The Earth is round. {TRUE #Correct! #The Earth is indeed round.}`;
      const result = parseGift(input);
      const q = result.questions[0];
      expect(q.type).toBe("truefalse");
    });
  });

  describe("Short Answer", () => {
    it("should parse basic short answer", () => {
      const input = `::Capital:: What is the capital of France? {=Paris}`;
      const result = parseGift(input);
      const q = result.questions[0];
      expect(q.type).toBe("shortanswer");
      expect(q.answers).toHaveLength(1);
      expect(q.answers![0].answerText).toBe("Paris");
      expect(q.answers![0].fraction).toBe(100);
    });

    it("should parse multiple acceptable answers", () => {
      const input = `What is the capital of France? {=Paris =paris}`;
      const result = parseGift(input);
      const q = result.questions[0];
      expect(q.type).toBe("shortanswer");
      expect(q.answers).toHaveLength(2);
    });

    it("should parse short answer with weights", () => {
      const input = `Name a primary color. {=%100%Red =%50%red}`;
      const result = parseGift(input);
      const q = result.questions[0];
      expect(q.answers![0].fraction).toBe(100);
      expect(q.answers![1].fraction).toBe(50);
    });
  });

  describe("Matching", () => {
    it("should parse matching question", () => {
      const input = `::Match Capitals:: Match the country with its capital. {
=France -> Paris
=Germany -> Berlin
=Italy -> Rome
}`;
      const result = parseGift(input);
      const q = result.questions[0];
      expect(q.type).toBe("matching");
      expect(q.matchingPairs).toHaveLength(3);
      expect(q.matchingPairs![0].subText).toBe("France");
      expect(q.matchingPairs![0].answerText).toBe("Paris");
      expect(q.matchingPairs![2].subText).toBe("Italy");
      expect(q.matchingPairs![2].answerText).toBe("Rome");
    });
  });

  describe("Numerical", () => {
    it("should parse numerical with tolerance", () => {
      const input = `::Pi:: What is pi (to 2 decimal places)? {#3.14:0.01}`;
      const result = parseGift(input);
      const q = result.questions[0];
      expect(q.type).toBe("numerical");
      expect(q.answers).toHaveLength(1);
      expect(q.answers![0].answerText).toBe("3.14");
      expect(q.numericalOptions?.tolerance).toBe(0.01);
    });

    it("should parse numerical without tolerance", () => {
      const input = `What is 2+2? {#4}`;
      const result = parseGift(input);
      const q = result.questions[0];
      expect(q.type).toBe("numerical");
      expect(q.answers![0].answerText).toBe("4");
      expect(q.numericalOptions?.tolerance).toBe(0);
    });

    it("should parse numerical range", () => {
      const input = `What is a number from 1 to 5? {#1..5}`;
      const result = parseGift(input);
      const q = result.questions[0];
      expect(q.type).toBe("numerical");
      expect(q.answers![0].answerText).toBe("3");
      expect(q.numericalOptions?.tolerance).toBe(2);
    });
  });

  describe("Essay", () => {
    it("should parse essay question", () => {
      const input = `::Photosynthesis:: Describe the process of photosynthesis. {}`;
      const result = parseGift(input);
      const q = result.questions[0];
      expect(q.type).toBe("essay");
      expect(q.name).toBe("Photosynthesis");
    });
  });

  describe("Categories", () => {
    it("should parse category lines", () => {
      const input = `$CATEGORY: Science/Biology

::Cell:: What is the basic unit of life? {=cell}`;
      const result = parseGift(input);
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].categoryPath).toBe("Science/Biology");
      expect(result.categories).toContain("Science/Biology");
    });

    it("should handle multiple categories", () => {
      const input = `$CATEGORY: Math

What is 2+2? {#4}

$CATEGORY: Science

The Earth is round. {TRUE}`;
      const result = parseGift(input);
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].categoryPath).toBe("Math");
      expect(result.questions[1].categoryPath).toBe("Science");
    });
  });

  describe("Comments", () => {
    it("should skip comment lines", () => {
      const input = `// This is a comment
::Q1:: What is 2+2? {=4}`;
      const result = parseGift(input);
      expect(result.questions).toHaveLength(1);
    });
  });

  describe("Escaped characters", () => {
    it("should handle escaped special characters in question text", () => {
      const input = `What is 1\\+1\\=? {=2}`;
      const result = parseGift(input);
      expect(result.questions[0].questionText).toContain("1+1=");
    });

    it("should handle escaped braces", () => {
      const input = `What does \\{x\\} mean in set notation? {=a set}`;
      const result = parseGift(input);
      expect(result.questions[0].questionText).toContain("{x}");
    });
  });

  describe("Multiple questions", () => {
    it("should parse multiple questions separated by blank lines", () => {
      const input = `::Q1:: What is 2+2? {=4 ~3}

::Q2:: The Earth is flat. {FALSE}

::Q3:: Name a color. {=Red =Blue}`;
      const result = parseGift(input);
      expect(result.questions).toHaveLength(3);
    });
  });

  describe("Error handling", () => {
    it("should return empty results for empty input", () => {
      const result = parseGift("");
      expect(result.questions).toHaveLength(0);
    });

    it("should handle malformed questions gracefully", () => {
      const input = `This has no answer block`;
      const result = parseGift(input);
      // Should not crash, may have 0 questions or mark it as error
      expect(result).toBeDefined();
    });
  });
});
