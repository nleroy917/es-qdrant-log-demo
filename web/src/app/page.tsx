"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type Backend = "elasticsearch" | "qdrant";

interface LogResult {
  id: string;
  timestamp: string;
  service: string;
  level: string;
  message: string;
  score: number;
}

interface SearchMeta {
  backend: Backend;
  embeddingMs: number;
  searchMs: number;
}

const LEVEL_COLORS: Record<string, string> = {
  Debug: "bg-gray-100 text-gray-700",
  Info: "bg-blue-100 text-blue-700",
  Warn: "bg-amber-100 text-amber-700",
  Error: "bg-red-100 text-red-700",
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [backend, setBackend] = useState<Backend>("qdrant");
  const [results, setResults] = useState<LogResult[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(false);

  // filters
  const [services, setServices] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/filters")
      .then((r) => r.json())
      .then((data) => {
        setServices(data.services ?? []);
        setLevels(data.levels ?? []);
      })
      .catch(() => {});
  }, []);

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          backend,
          filters: {
            ...(selectedLevels.length > 0 ? { level: selectedLevels } : {}),
            ...(selectedServices.length > 0
              ? { service: selectedServices }
              : {}),
          },
        }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
      setMeta(data.meta ?? null);
    } finally {
      setLoading(false);
    }
  }, [query, backend, selectedLevels, selectedServices]);

  const toggleFilter = (
    value: string,
    selected: string[],
    setSelected: (v: string[]) => void
  ) => {
    setSelected(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Log Search</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Hybrid vector search across Elasticsearch and Qdrant
      </p>

      {/* search bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
        className="mb-4 flex gap-2"
      >
        <Input
          placeholder="Search logs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </form>

      {/* backend toggle + filters */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Backend:</span>
          {(["qdrant", "elasticsearch"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBackend(b)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                backend === b
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground"
              }`}
            >
              {b === "elasticsearch" ? "Elasticsearch" : "Qdrant"}
            </button>
          ))}
        </div>

        {levels.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Level:</span>
            {levels.map((l) => (
              <button
                key={l}
                onClick={() =>
                  toggleFilter(l, selectedLevels, setSelectedLevels)
                }
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  selectedLevels.includes(l)
                    ? LEVEL_COLORS[l] || "bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {services.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Service:</span>
            {services.map((s) => (
              <button
                key={s}
                onClick={() =>
                  toggleFilter(s, selectedServices, setSelectedServices)
                }
                className={`rounded-full border px-3 py-1 text-sm font-mono transition-colors ${
                  selectedServices.includes(s)
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* timing meta */}
      {meta && (
        <p className="mb-4 text-xs text-muted-foreground">
          {results.length} results from{" "}
          {meta.backend === "elasticsearch" ? "Elasticsearch" : "Qdrant"}{" "}
          &mdash; embedding {meta.embeddingMs}ms, search {meta.searchMs}ms
        </p>
      )}

      {/* results */}
      <div className="space-y-2">
        {results.map((log) => (
          <Card key={log.id} className="px-4 py-3">
            <div className="mb-1 flex items-center gap-2">
              <Badge
                className={LEVEL_COLORS[log.level] || ""}
                variant="secondary"
              >
                {log.level}
              </Badge>
              <Badge variant="outline" className="font-mono">
                {log.service}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(log.timestamp).toLocaleString()}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {log.score.toFixed(3)}
              </span>
            </div>
            <p className="text-sm">{log.message}</p>
          </Card>
        ))}
      </div>

      {results.length === 0 && meta && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          No results found.
        </p>
      )}
    </main>
  );
}
