import { NextRequest, NextResponse } from "next/server";
import { parseGift } from "@/lib/parsers/gift-parser";
import { parseMoodleXml } from "@/lib/parsers/xml-parser";
import { getDatabase } from "@/lib/db/index";
import {
  createQuestion,
  createCategory,
  getAllCategories,
  getOrCreateTag,
  addTagsToQuestion,
} from "@/lib/db/queries";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const format = formData.get("format") as string | null;
  const action = formData.get("action") as string | null; // "preview" or "import"

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const text = await file.text();

  // Auto-detect format if not specified
  let detectedFormat = format;
  if (!detectedFormat) {
    if (file.name.endsWith(".xml")) {
      detectedFormat = "xml";
    } else if (file.name.endsWith(".gift") || file.name.endsWith(".txt")) {
      detectedFormat = "gift";
    } else {
      // Try to detect from content
      detectedFormat = text.trim().startsWith("<?xml") || text.trim().startsWith("<quiz")
        ? "xml"
        : "gift";
    }
  }

  const result =
    detectedFormat === "xml" ? parseMoodleXml(text) : parseGift(text);

  if (action === "import") {
    // Actually import into database
    const db = getDatabase();

    // Read import options
    const selectedIndicesRaw = formData.get("selectedIndices") as string | null;
    const categoryOverrideId = formData.get("categoryOverrideId") as string | null;
    const tagsRaw = formData.get("tags") as string | null;

    // Filter to only selected questions
    let questionsToImport = result.questions;
    if (selectedIndicesRaw) {
      const selectedIndices: number[] = JSON.parse(selectedIndicesRaw);
      const selectedSet = new Set(selectedIndices);
      questionsToImport = result.questions.filter((_, i) => selectedSet.has(i));
    }

    // Resolve category override
    let overrideCategoryId: number | null | undefined;
    if (categoryOverrideId === "none") {
      overrideCategoryId = null;
    } else if (categoryOverrideId) {
      overrideCategoryId = Number(categoryOverrideId);
    }

    // Get or create categories (only needed if not overriding)
    const categoryMap = new Map<string, number>();
    if (overrideCategoryId === undefined) {
      const existingCategories = getAllCategories(db);
      for (const cat of existingCategories) {
        categoryMap.set(cat.name, cat.id);
      }
      for (const catName of result.categories) {
        if (!categoryMap.has(catName)) {
          const newCat = createCategory(db, { name: catName });
          categoryMap.set(catName, newCat.id);
        }
      }
    }

    // Resolve tags
    const tagIds: number[] = [];
    if (tagsRaw) {
      const tagNames: string[] = JSON.parse(tagsRaw);
      for (const name of tagNames) {
        const tag = getOrCreateTag(db, name);
        if (tag) tagIds.push(tag.id);
      }
    }

    // Import questions
    const imported: number[] = [];
    for (const q of questionsToImport) {
      let categoryId: number | null;
      if (overrideCategoryId !== undefined) {
        categoryId = overrideCategoryId;
      } else {
        categoryId = q.categoryPath
          ? categoryMap.get(q.categoryPath) ?? null
          : null;
      }

      const created = createQuestion(db, {
        ...q,
        categoryId,
        questionFormat: q.questionFormat || "html",
        generalFeedback: q.generalFeedback || "",
      });
      imported.push(created.id);

      // Apply tags
      if (tagIds.length > 0) {
        addTagsToQuestion(db, created.id, tagIds);
      }
    }

    return NextResponse.json({
      imported: imported.length,
      ids: imported,
      errors: result.errors,
    });
  }

  // Preview mode - just return parsed data
  return NextResponse.json({
    format: detectedFormat,
    questions: result.questions,
    categories: result.categories,
    errors: result.errors,
  });
}
