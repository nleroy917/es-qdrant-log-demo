import { NextRequest, NextResponse } from "next/server";
import { embedQuery } from "@/lib/embeddings";
import { searchLogs as searchElastic } from "@/lib/elasticsearch";
import { searchLogs as searchQdrant } from "@/lib/qdrant";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    query,
    backend,
    filters,
    limit = 20,
  } = body as {
    query: string;
    backend: "elasticsearch" | "qdrant";
    filters?: { level?: string[]; service?: string[] };
    limit?: number;
  };

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const t0 = Date.now();
  const embedding = await embedQuery(query);
  const embeddingMs = Date.now() - t0;

  const t1 = Date.now();
  const searchFn = backend === "qdrant" ? searchQdrant : searchElastic;
  const results = await searchFn(query, embedding, filters, limit);
  const searchMs = Date.now() - t1;

  return NextResponse.json({
    results,
    meta: { backend, embeddingMs, searchMs },
  });
}
