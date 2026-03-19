import { describe, it, expect } from "vitest";
import { parseMoodleXml } from "@/lib/parsers/xml-parser";

describe("Moodle XML Parser", () => {
  describe("Multiple Choice", () => {
    it("should parse a single-answer multiple choice question", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="multichoice">
    <name><text>Capital of France</text></name>
    <questiontext format="html"><text><![CDATA[<p>What is the capital of France?</p>]]></text></questiontext>
    <generalfeedback format="html"><text>Paris is the capital.</text></generalfeedback>
    <defaultgrade>1</defaultgrade>
    <penalty>0.3333333</penalty>
    <single>true</single>
    <shuffleanswers>true</shuffleanswers>
    <answernumbering>abc</answernumbering>
    <answer fraction="100" format="html">
      <text>Paris</text>
      <feedback format="html"><text>Correct!</text></feedback>
    </answer>
    <answer fraction="0" format="html">
      <text>London</text>
      <feedback format="html"><text>Wrong</text></feedback>
    </answer>
    <answer fraction="0" format="html">
      <text>Berlin</text>
      <feedback format="html"><text>Wrong</text></feedback>
    </answer>
  </question>
</quiz>`;

      const result = parseMoodleXml(xml);
      expect(result.questions).toHaveLength(1);
      const q = result.questions[0];
      expect(q.type).toBe("multichoice");
      expect(q.name).toBe("Capital of France");
      expect(q.questionText).toContain("What is the capital of France?");
      expect(q.singleAnswer).toBe(true);
      expect(q.answers).toHaveLength(3);
      expect(q.answers![0].answerText).toBe("Paris");
      expect(q.answers![0].fraction).toBe(100);
      expect(q.answers![0].feedback).toBe("Correct!");
      expect(q.answers![1].fraction).toBe(0);
    });

    it("should parse a multi-answer multiple choice question", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="multichoice">
    <name><text>Primary Colors</text></name>
    <questiontext format="html"><text>Which are primary colors?</text></questiontext>
    <single>false</single>
    <answer fraction="33.33" format="html"><text>Red</text></answer>
    <answer fraction="33.33" format="html"><text>Blue</text></answer>
    <answer fraction="33.34" format="html"><text>Yellow</text></answer>
    <answer fraction="-100" format="html"><text>Green</text></answer>
  </question>
</quiz>`;

      const result = parseMoodleXml(xml);
      const q = result.questions[0];
      expect(q.singleAnswer).toBe(false);
      expect(q.answers).toHaveLength(4);
    });
  });

  describe("True/False", () => {
    it("should parse a true/false question", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="truefalse">
    <name><text>Earth Shape</text></name>
    <questiontext format="html"><text>The Earth is round.</text></questiontext>
    <answer fraction="100" format="html"><text>true</text></answer>
    <answer fraction="0" format="html"><text>false</text></answer>
  </question>
</quiz>`;

      const result = parseMoodleXml(xml);
      const q = result.questions[0];
      expect(q.type).toBe("truefalse");
      expect(q.answers).toHaveLength(2);
      expect(q.answers![0].answerText).toBe("true");
      expect(q.answers![0].fraction).toBe(100);
    });
  });

  describe("Short Answer", () => {
    it("should parse a short answer question", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="shortanswer">
    <name><text>Capital</text></name>
    <questiontext format="html"><text>What is the capital of France?</text></questiontext>
    <answer fraction="100" format="html">
      <text>Paris</text>
      <feedback format="html"><text>Correct!</text></feedback>
    </answer>
    <answer fraction="50" format="html">
      <text>paris</text>
    </answer>
  </question>
</quiz>`;

      const result = parseMoodleXml(xml);
      const q = result.questions[0];
      expect(q.type).toBe("shortanswer");
      expect(q.answers).toHaveLength(2);
      expect(q.answers![0].fraction).toBe(100);
      expect(q.answers![1].fraction).toBe(50);
    });
  });

  describe("Matching", () => {
    it("should parse a matching question", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="matching">
    <name><text>Match Capitals</text></name>
    <questiontext format="html"><text>Match the country with its capital.</text></questiontext>
    <subquestion format="html">
      <text>France</text>
      <answer><text>Paris</text></answer>
    </subquestion>
    <subquestion format="html">
      <text>Germany</text>
      <answer><text>Berlin</text></answer>
    </subquestion>
    <subquestion format="html">
      <text>Italy</text>
      <answer><text>Rome</text></answer>
    </subquestion>
  </question>
</quiz>`;

      const result = parseMoodleXml(xml);
      const q = result.questions[0];
      expect(q.type).toBe("matching");
      expect(q.matchingPairs).toHaveLength(3);
      expect(q.matchingPairs![0].subText).toBe("France");
      expect(q.matchingPairs![0].answerText).toBe("Paris");
    });
  });

  describe("Numerical", () => {
    it("should parse a numerical question with tolerance", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="numerical">
    <name><text>Pi</text></name>
    <questiontext format="html"><text>What is pi?</text></questiontext>
    <answer fraction="100">
      <text>3.14159</text>
      <tolerance>0.001</tolerance>
    </answer>
  </question>
</quiz>`;

      const result = parseMoodleXml(xml);
      const q = result.questions[0];
      expect(q.type).toBe("numerical");
      expect(q.answers![0].answerText).toBe("3.14159");
      expect(q.numericalOptions?.tolerance).toBe(0.001);
    });
  });

  describe("Essay", () => {
    it("should parse an essay question", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="essay">
    <name><text>Photosynthesis</text></name>
    <questiontext format="html"><text>Describe photosynthesis.</text></questiontext>
    <generalfeedback format="html"><text>Good answer mentions light.</text></generalfeedback>
  </question>
</quiz>`;

      const result = parseMoodleXml(xml);
      const q = result.questions[0];
      expect(q.type).toBe("essay");
      expect(q.name).toBe("Photosynthesis");
      expect(q.generalFeedback).toBe("Good answer mentions light.");
    });
  });

  describe("Categories", () => {
    it("should parse category questions", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="category">
    <category><text>$course$/Science/Biology</text></category>
  </question>
  <question type="shortanswer">
    <name><text>Cell</text></name>
    <questiontext format="html"><text>Basic unit of life?</text></questiontext>
    <answer fraction="100"><text>cell</text></answer>
  </question>
</quiz>`;

      const result = parseMoodleXml(xml);
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].categoryPath).toBe("Science/Biology");
      expect(result.categories).toContain("Science/Biology");
    });
  });

  describe("Multiple questions", () => {
    it("should parse multiple questions", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="truefalse">
    <name><text>Q1</text></name>
    <questiontext format="html"><text>T1</text></questiontext>
    <answer fraction="100"><text>true</text></answer>
    <answer fraction="0"><text>false</text></answer>
  </question>
  <question type="essay">
    <name><text>Q2</text></name>
    <questiontext format="html"><text>T2</text></questiontext>
  </question>
</quiz>`;

      const result = parseMoodleXml(xml);
      expect(result.questions).toHaveLength(2);
    });
  });

  describe("Error handling", () => {
    it("should handle empty input", () => {
      const result = parseMoodleXml("");
      expect(result.questions).toHaveLength(0);
    });

    it("should handle invalid XML gracefully", () => {
      const result = parseMoodleXml("<not valid xml");
      expect(result).toBeDefined();
    });
  });
});
