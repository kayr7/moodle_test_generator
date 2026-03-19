import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/index";
import {
  getTagsForQuestion,
  setTagsForQuestion,
  getOrCreateTag,
  removeTagFromQuestion,
} from "@/lib/db/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDatabase();
  const { id } = await params;
  const tags = getTagsForQuestion(db, Number(id));
  return NextResponse.json(tags);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDatabase();
  const { id } = await params;
  const body = await request.json();

  // Accept either tagIds or tagNames
  let tagIds: number[] = [];

  if (body.tagIds) {
    tagIds = body.tagIds;
  } else if (body.tagNames) {
    tagIds = (body.tagNames as string[])
      .map((name: string) => getOrCreateTag(db, name))
      .filter(Boolean)
      .map((t) => t!.id);
  }

  setTagsForQuestion(db, Number(id), tagIds);
  const tags = getTagsForQuestion(db, Number(id));
  return NextResponse.json(tags);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const db = getDatabase();
  const { id } = await params;
  const body = await request.json();

  if (!body.tagId) {
    return NextResponse.json({ error: "tagId is required" }, { status: 400 });
  }

  removeTagFromQuestion(db, Number(id), body.tagId);
  return NextResponse.json({ success: true });
}
