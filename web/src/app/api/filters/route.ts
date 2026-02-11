import { NextResponse } from "next/server";
import { getFilters } from "@/lib/elasticsearch";

export async function GET() {
  const filters = await getFilters();
  return NextResponse.json(filters);
}
