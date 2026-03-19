import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseGift } from "@/lib/parsers/gift-parser";
import { parseMoodleXml } from "@/lib/parsers/xml-parser";
import { serializeGift } from "@/lib/parsers/gift-serializer";
import { serializeMoodleXml } from "@/lib/parsers/xml-serializer";

describe("Import/Export Integration", () => {
  it("should parse a complete GIFT file with multiple question types", () => {
    const giftInput = `$CATEGORY: General Knowledge

::Capital:: What is the capital of France? {
=Paris #Correct!
~London #Wrong
~Berlin #Wrong
}

::Round Earth:: The Earth is round. {TRUE}

::Math:: What is 2+2? {#4:0}

::Colors:: Name a primary color. {=Red =Blue =Yellow}

::Match:: Match countries. {
=France -> Paris
=Germany -> Berlin
}

::Essay:: Describe photosynthesis. {}`;

    const result = parseGift(giftInput);
    expect(result.questions).toHaveLength(6);
    expect(result.categories).toContain("General Knowledge");
    expect(result.questions[0].type).toBe("multichoice");
    expect(result.questions[1].type).toBe("truefalse");
    expect(result.questions[2].type).toBe("numerical");
    expect(result.questions[3].type).toBe("shortanswer");
    expect(result.questions[4].type).toBe("matching");
    expect(result.questions[5].type).toBe("essay");
  });

  it("should parse a complete Moodle XML file with multiple question types", () => {
    const xmlInput = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="category">
    <category><text>$course$/Science</text></category>
  </question>
  <question type="multichoice">
    <name><text>MC Q</text></name>
    <questiontext format="html"><text>Pick one.</text></questiontext>
    <single>true</single>
    <answer fraction="100"><text>A</text></answer>
    <answer fraction="0"><text>B</text></answer>
  </question>
  <question type="truefalse">
    <name><text>TF Q</text></name>
    <questiontext format="html"><text>True?</text></questiontext>
    <answer fraction="100"><text>true</text></answer>
    <answer fraction="0"><text>false</text></answer>
  </question>
  <question type="essay">
    <name><text>Essay Q</text></name>
    <questiontext format="html"><text>Write something.</text></questiontext>
  </question>
</quiz>`;

    const result = parseMoodleXml(xmlInput);
    expect(result.questions).toHaveLength(3);
    expect(result.categories).toContain("Science");
    expect(result.questions[0].categoryPath).toBe("Science");
  });

  it("should round-trip GIFT -> serialize -> parse", () => {
    const original = `::Q1:: What is 2+2? {
=4 #Correct!
~3 #Wrong
~5 #Wrong
}

::Q2:: The Earth is round. {TRUE}

::Q3:: Capital of France? {=Paris =paris}`;

    const parsed = parseGift(original);
    expect(parsed.questions).toHaveLength(3);

    const serialized = serializeGift(parsed.questions);
    const reparsed = parseGift(serialized);

    expect(reparsed.questions).toHaveLength(3);
    expect(reparsed.questions[0].type).toBe("multichoice");
    expect(reparsed.questions[1].type).toBe("truefalse");
    expect(reparsed.questions[2].type).toBe("shortanswer");
  });

  it("should round-trip XML -> serialize -> parse", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<quiz>
  <question type="multichoice">
    <name><text>Q1</text></name>
    <questiontext format="html"><text>Pick one.</text></questiontext>
    <single>true</single>
    <answer fraction="100"><text>A</text></answer>
    <answer fraction="0"><text>B</text></answer>
  </question>
  <question type="matching">
    <name><text>Q2</text></name>
    <questiontext format="html"><text>Match.</text></questiontext>
    <subquestion format="html"><text>X</text><answer><text>1</text></answer></subquestion>
    <subquestion format="html"><text>Y</text><answer><text>2</text></answer></subquestion>
  </question>
</quiz>`;

    const parsed = parseMoodleXml(xml);
    expect(parsed.questions).toHaveLength(2);

    const serialized = serializeMoodleXml(parsed.questions);
    const reparsed = parseMoodleXml(serialized);

    expect(reparsed.questions).toHaveLength(2);
    expect(reparsed.questions[0].type).toBe("multichoice");
    expect(reparsed.questions[0].answers).toHaveLength(2);
    expect(reparsed.questions[1].type).toBe("matching");
    expect(reparsed.questions[1].matchingPairs).toHaveLength(2);
  });

  it("should cross-format: GIFT -> internal -> XML -> internal", () => {
    const giftInput = `::MC:: Pick one. {=A ~B ~C}`;

    const fromGift = parseGift(giftInput);
    expect(fromGift.questions).toHaveLength(1);

    const xml = serializeMoodleXml(fromGift.questions);
    const fromXml = parseMoodleXml(xml);

    expect(fromXml.questions).toHaveLength(1);
    expect(fromXml.questions[0].name).toBe("MC");
    expect(fromXml.questions[0].type).toBe("multichoice");
  });
});
