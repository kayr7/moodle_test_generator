import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db/index";
import { getStats } from "@/lib/db/queries";

export async function GET() {
  const db = getDatabase();
  const stats = getStats(db);
  return NextResponse.json(stats);
}
