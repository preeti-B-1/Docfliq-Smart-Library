"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Bookmark } from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ArticleCard from "@/components/content/ArticleCard";
import { Spinner } from "@/components/ui";
import { apiClient } from "@/lib/api-client";
import type { ContentListItem } from "@/types";

function BookmarksContent() {
  const { data: session } = useSession();
  const token = session?.backendToken ?? null;

  const [bookmarks, setBookmarks] = useState<ContentListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiClient.setToken(token);
    apiClient
      .getBookmarks()
      .then(setBookmarks)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load bookmarks")
      )
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleBookmarkToggle = useCallback((id: number) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {!isLoading && bookmarks.length > 0 && (
        <p className="text-sm text-zinc-400">{bookmarks.length} saved article{bookmarks.length !== 1 ? "s" : ""}</p>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!isLoading && !error && bookmarks.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
            <Bookmark className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="text-base font-semibold text-zinc-700">No bookmarks yet</p>
          <p className="text-sm text-zinc-400">
            Browse the library and bookmark articles to find them here.
          </p>
        </div>
      )}

      {!isLoading && !error && bookmarks.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {bookmarks.map((item) => (
            <ArticleCard
              key={item.id}
              content={item}
              token={token}
              onBookmarkToggle={handleBookmarkToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookmarksPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <BookmarksContent />
      </DashboardLayout>
    </AuthGuard>
  );
}
