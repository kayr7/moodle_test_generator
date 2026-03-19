import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/index";
import { getAllCourses, createCourse } from "@/lib/db/queries";

export async function GET() {
  const db = getDatabase();
  const courses = getAllCourses(db);
  return NextResponse.json(courses);
}

export async function POST(request: NextRequest) {
  const db = getDatabase();
  const body = await request.json();

  try {
    const course = createCourse(db, body);
    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create course" },
      { status: 400 }
    );
  }
}
