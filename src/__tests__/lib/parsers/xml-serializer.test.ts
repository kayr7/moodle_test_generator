import { describe, it, expect } from "vitest";
import { serializeMoodleXml } from "@/lib/parsers/xml-serializer";
import { parseMoodleXml } from "@/lib/parsers/xml-parser";
import type { ParsedQuestion } from "@/lib/types";

describe("Moodle XML Serializer", () => {
  it("should serialize a multiple choice question", () => {
    const q: ParsedQuestion = {
      type: "multichoice",
      name: "Capital",
      questionText: "What is the capital of France?",
      singleAnswer: true,
      shuffleAnswers: true,
      answers: [
        { answerText: "Paris", fraction: 100, feedback: "Correct!", sortOrder: 0 },
        { answerText: "London", fraction: 0, feedback: "Wrong", sortOrder: 1 },
      ],
    };

    const xml = serializeMoodleXml([q]);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<question type="multichoice">');
    expect(xml).toContain("<text>Capital</text>");
    expect(xml).toContain('fraction="100"');
    expect(xml).toContain("<text>Paris</text>");
    expect(xml).toContain("<single>true</single>");
  });

  it("should serialize a true/false question", () => {
    const q: ParsedQuestion = {
      type: "truefalse",
      name: "Earth",
      questionText: "The Earth is round.",
      answers: [
        { answerText: "true", fraction: 100, feedback: "", sortOrder: 0 },
        { answerText: "false", fraction: 0, feedback: "", sortOrder: 1 },
      ],
    };

    const xml = serializeMoodleXml([q]);
    expect(xml).toContain('<question type="truefalse">');
    expect(xml).toContain("<text>true</text>");
  });

  it("should serialize a matching question", () => {
    const q: ParsedQuestion = {
      type: "matching",
      name: "Capitals",
      questionText: "Match countries.",
      matchingPairs: [
        { subText: "France", answerText: "Paris", sortOrder: 0 },
        { subText: "Germany", answerText: "Berlin", sortOrder: 1 },
      ],
    };

    const xml = serializeMoodleXml([q]);
    expect(xml).toContain('<question type="matching">');
    expect(xml).toContain("<subquestion");
    expect(xml).toContain("<text>France</text>");
    expect(xml).toContain("<text>Paris</text>");
  });

  it("should serialize a numerical question", () => {
    const q: ParsedQuestion = {
      type: "numerical",
      name: "Pi",
      questionText: "What is pi?",
      answers: [{ answerText: "3.14", fraction: 100, feedback: "", sortOrder: 0 }],
      numericalOptions: { tolerance: 0.01 },
    };

    const xml = serializeMoodleXml([q]);
    expect(xml).toContain('<question type="numerical">');
    expect(xml).toContain("<tolerance>0.01</tolerance>");
  });

  it("should serialize an essay question", () => {
    const q: ParsedQuestion = {
      type: "essay",
      name: "Essay",
      questionText: "Describe it.",
      generalFeedback: "Good feedback.",
    };

    const xml = serializeMoodleXml([q]);
    expect(xml).toContain('<question type="essay">');
    expect(xml).toContain("Good feedback.");
  });

  it("should serialize categories", () => {
    const questions: ParsedQuestion[] = [
      {
        type: "essay",
        name: "Q1",
        questionText: "T1",
        categoryPath: "Science/Biology",
      },
    ];

    const xml = serializeMoodleXml(questions);
    expect(xml).toContain('<question type="category">');
    expect(xml).toContain("$course$/Science/Biology");
  });

  it("should wrap HTML content in CDATA", () => {
    const q: ParsedQuestion = {
      type: "essay",
      name: "HTML Q",
      questionText: "<p>Describe <strong>photosynthesis</strong>.</p>",
      questionFormat: "html",
    };

    const xml = serializeMoodleXml([q]);
    expect(xml).toContain("<![CDATA[");
    expect(xml).toContain("<strong>photosynthesis</strong>");
  });

  describe("Round-trip", () => {
    it("should round-trip a multiple choice question", () => {
      const original: ParsedQuestion = {
        type: "multichoice",
        name: "MC Q",
        questionText: "Pick one.",
        singleAnswer: true,
        answers: [
          { answerText: "A", fraction: 100, feedback: "Yes", sortOrder: 0 },
          { answerText: "B", fraction: 0, feedback: "No", sortOrder: 1 },
        ],
      };

      const xml = serializeMoodleXml([original]);
      const reparsed = parseMoodleXml(xml);

      expect(reparsed.questions).toHaveLength(1);
      const q = reparsed.questions[0];
      expect(q.name).toBe("MC Q");
      expect(q.type).toBe("multichoice");
      expect(q.answers).toHaveLength(2);
      expect(q.answers![0].answerText).toBe("A");
      expect(q.answers![0].fraction).toBe(100);
    });

    it("should round-trip a matching question", () => {
      const original: ParsedQuestion = {
        type: "matching",
        name: "Match",
        questionText: "Match these.",
        matchingPairs: [
          { subText: "A", answerText: "1", sortOrder: 0 },
          { subText: "B", answerText: "2", sortOrder: 1 },
        ],
      };

      const xml = serializeMoodleXml([original]);
      const reparsed = parseMoodleXml(xml);

      expect(reparsed.questions[0].matchingPairs).toHaveLength(2);
      expect(reparsed.questions[0].matchingPairs![0].subText).toBe("A");
    });
  });
});
