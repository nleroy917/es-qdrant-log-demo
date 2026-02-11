import { QdrantClient } from "@qdrant/js-client-rest";

import type { SearchFilters, LogResult } from "./elasticsearch";

const client = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
});

export async function searchLogs(
  query: string,
  embedding: number[],
  filters: SearchFilters = {},
  limit = 20
): Promise<LogResult[]> {
  const mustConditions: Array<Record<string, unknown>> = [];
  if (filters.level?.length) {
    mustConditions.push({
      key: "level",
      match: { any: filters.level },
    });
  }
  if (filters.service?.length) {
    mustConditions.push({
      key: "service",
      match: { any: filters.service },
    });
  }
  const filter =
    mustConditions.length > 0 ? { must: mustConditions } : undefined;

  const res = await client.query("logs", {
    prefetch: [
      {
        query: embedding,
        using: "dense",
        limit: limit * 2,
        ...(filter ? { filter } : {}),
      },
      {
        query: {
          indices: [],
          values: [],
          document: query,
          model: "qdrant/bm25",
        },
        using: "bm25",
        limit: limit * 2,
        ...(filter ? { filter } : {}),
      },
    ],
    query: { fusion: "rrf" },
    limit,
    with_payload: true,
  });

  return res.points.map((pt) => {
    const p = pt.payload as Record<string, unknown>;
    return {
      id: String(pt.id),
      timestamp: p.timestamp as string,
      service: p.service as string,
      level: p.level as string,
      message: p.message as string,
      score: pt.score ?? 0,
    };
  });
}
