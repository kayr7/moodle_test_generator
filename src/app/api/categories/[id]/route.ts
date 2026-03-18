import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/index";
import { updateCategory, deleteCategory } from "@/lib/db/queries";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDatabase();
  const { id } = await params;
  const body = await request.json();

  try {
    const category = updateCategory(db, Number(id), body);
    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update category" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDatabase();
  const { id } = await params;

  try {
    deleteCategory(db, Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete category" },
      { status: 400 }
    );
  }
}
