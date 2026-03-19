import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/index";
import { v4 as uuidv4 } from "uuid";
import * as schema from "@/lib/db/schema";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const questionId = formData.get("questionId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/gif", "image/svg+xml", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: PNG, JPEG, GIF, SVG, WebP" },
      { status: 400 }
    );
  }

  // Ensure upload directory exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // Generate unique filename
  const ext = path.extname(file.name);
  const filename = `${uuidv4()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, filename);

  // Write file
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  // Save to database if questionId provided
  if (questionId) {
    const db = getDatabase();
    const image = db
      .insert(schema.images)
      .values({
        questionId: Number(questionId),
        filename,
        originalName: file.name,
        mimeType: file.type,
        filePath: `/uploads/${filename}`,
      })
      .returning()
      .get();

    return NextResponse.json(image, { status: 201 });
  }

  return NextResponse.json(
    {
      filename,
      originalName: file.name,
      mimeType: file.type,
      filePath: `/uploads/${filename}`,
    },
    { status: 201 }
  );
}
