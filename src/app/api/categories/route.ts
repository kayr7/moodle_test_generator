import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/index";
import { getAllCategories, createCategory } from "@/lib/db/queries";

export async function GET() {
  const db = getDatabase();
  const categories = getAllCategories(db);
  return NextResponse.json(categories);
}

export async function POST(request: NextRequest) {
  const db = getDatabase();
  const body = await request.json();

  try {
    const category = createCategory(db, body);
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create category" },
      { status: 400 }
    );
  }
}
