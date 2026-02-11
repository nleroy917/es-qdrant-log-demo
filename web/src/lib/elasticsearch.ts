import { Client } from "@elastic/elasticsearch";

export interface SearchFilters {
  level?: string[];
  service?: string[];
}

export interface LogResult {
  id: string;
  timestamp: string;
  service: string;
  level: string;
  message: string;
  score: number;
}

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
  auth: {
    username: process.env.ELASTICSEARCH_USER || "elastic",
    password: process.env.ELASTICSEARCH_PASSWORD || "changeme",
  },
});

export async function searchLogs(
  query: string,
  embedding: number[],
  filters: SearchFilters = {},
  limit = 20
): Promise<LogResult[]> {
  const filter: Record<string, unknown>[] = [];
  if (filters.level?.length) {
    filter.push({ terms: { level: filters.level } });
  }
  if (filters.service?.length) {
    filter.push({ terms: { service: filters.service } });
  }

  const res = await client.search({
    index: "logs",
    size: limit,
    query: {
      bool: {
        must: [
          {
            knn: {
              field: "dense",
              query_vector: embedding,
              num_candidates: 100,
              k: limit,
            },
          },
          { match: { message: query } },
        ],
        ...(filter.length > 0 ? { filter } : {}),
      },
    },
  });

  return res.hits.hits.map((hit) => {
    const src = hit._source as Record<string, unknown>;
    return {
      id: hit._id!,
      timestamp: src.timestamp as string,
      service: src.service as string,
      level: src.level as string,
      message: src.message as string,
      score: hit._score ?? 0,
    };
  });
}

export async function getFilters(): Promise<{
  services: string[];
  levels: string[];
}> {
  const res = await client.search({
    index: "logs",
    size: 0,
    aggs: {
      services: { terms: { field: "service", size: 50 } },
      levels: { terms: { field: "level", size: 10 } },
    },
  });

  const aggs = res.aggregations as Record<
    string,
    { buckets: Array<{ key: string }> }
  >;
  return {
    services: aggs.services.buckets.map((b) => b.key),
    levels: aggs.levels.buckets.map((b) => b.key),
  };
}
