"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Clock } from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ArticleCard from "@/components/content/ArticleCard";
import { Spinner } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import { formatRelativeDate } from "@/lib/utils";
import type { ReadingHistoryItem } from "@/types";

function HistoryContent() {
  const { data: session } = useSession();
  const token = session?.backendToken ?? null;

  const [history, setHistory] = useState<ReadingHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiClient.setToken(token);
    apiClient
      .getHistory()
      .then(setHistory)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load history")
      )
      .finally(() => setIsLoading(false));
  }, [token]);

  return (
    <div className="flex flex-col gap-6">
      {!isLoading && history.length > 0 && (
        <p className="text-sm text-zinc-400">{history.length} article{history.length !== 1 ? "s" : ""} read</p>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!isLoading && !error && history.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
            <Clock className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="text-base font-semibold text-zinc-700">No reading history yet</p>
          <p className="text-sm text-zinc-400">
            Articles you read will appear here automatically.
          </p>
        </div>
      )}

      {!isLoading && !error && history.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {history.map((item) => (
            <ArticleCard
              key={item.id}
              content={item}
              token={token}
              lastReadAt={formatRelativeDate(item.last_read_at)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <HistoryContent />
      </DashboardLayout>
    </AuthGuard>
  );
}
