import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/index";
import { getAllTags, getOrCreateTag, deleteTag } from "@/lib/db/queries";

export async function GET() {
  const db = getDatabase();
  const tags = getAllTags(db);
  return NextResponse.json(tags);
}

export async function POST(request: NextRequest) {
  const db = getDatabase();
  const body = await request.json();

  if (!body.name || !body.name.trim()) {
    return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
  }

  const tag = getOrCreateTag(db, body.name);
  if (!tag) {
    return NextResponse.json({ error: "Failed to create tag" }, { status: 400 });
  }

  return NextResponse.json(tag, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const db = getDatabase();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Tag id is required" }, { status: 400 });
  }

  deleteTag(db, Number(id));
  return NextResponse.json({ success: true });
}
