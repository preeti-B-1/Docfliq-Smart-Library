"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Bookmark } from "lucide-react";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { formatDate, formatViewCount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ContentListItem } from "@/types";

/* OLD — stacked card (2-column grid style) */

interface ArticleCardProps {
  content: ContentListItem;
  showBookmark?: boolean;
  token?: string | null;
  onBookmarkToggle?: (id: number) => void;
  lastReadAt?: string;
}

function difficultyChipClass(name: string): string {
  switch (name.toLowerCase()) {
    case "beginner":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "intermediate":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "advanced":
      return "bg-red-50 text-red-700 border border-red-200";
    default:
      return "bg-zinc-100 text-zinc-600 border border-zinc-200";
  }
}

export default function ArticleCard({
  content,
  showBookmark = true,
  token,
  onBookmarkToggle,
  lastReadAt,
}: ArticleCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(content.is_bookmarked);
  const [isToggling, setIsToggling] = useState(false);

  const specialtyChips = content.specialty_tags.slice(0, 2);
  const difficultyChip = content.difficulty_tag;

  async function handleBookmarkClick() {
    if (!token || isToggling) return;
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    setIsToggling(true);
    try {
      apiClient.setToken(token);
      const result = await apiClient.toggleBookmark(content.id);
      setIsBookmarked(result.bookmarked);
      toast(result.bookmarked ? "Article bookmarked" : "Bookmark removed");
      onBookmarkToggle?.(content.id);
    } catch {
      setIsBookmarked(prev);
      toast.error("Failed to update bookmark");
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <div className="group bg-white border-b border-zinc-200 py-6 px-1 hover:bg-zinc-50/50 transition-colors duration-150">
      <div className="flex items-start justify-between gap-6">

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <Link href={`/article/${content.id}`}>
            <h3 className="text-lg font-bold text-zinc-900 font-display leading-snug hover:text-violet-700 transition-colors line-clamp-2">
              {content.title}
            </h3>
          </Link>

          {(content.ai_summary || content.description) && (
            <p className="text-[0.9375rem] text-zinc-500 leading-relaxed line-clamp-2">
              {content.ai_summary || content.description}
            </p>
          )}

          {/* Row 1: specialty + difficulty tags */}
          {(specialtyChips.length > 0 || difficultyChip) && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {specialtyChips.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200"
                >
                  {tag}
                </span>
              ))}
              {difficultyChip && (
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", difficultyChipClass(difficultyChip))}>
                  {difficultyChip}
                </span>
              )}
            </div>
          )}

          {/* Row 2: views + date */}
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {formatViewCount(content.view_count)}
            </span>
            {lastReadAt && <span>Last read: {lastReadAt}</span>}
            {content.published_at && <span>{formatDate(content.published_at)}</span>}
          </div>
        </div>

        {/* Bookmark */}
        {showBookmark && (
          <button
            onClick={handleBookmarkClick}
            disabled={!token || isToggling}
            className="text-zinc-300 hover:text-violet-600 transition-colors flex-shrink-0 mt-1 disabled:opacity-40"
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            <Bookmark
              className={cn(
                "h-5 w-5",
                isBookmarked ? "fill-violet-600 text-violet-600" : ""
              )}
            />
          </button>
        )}

      </div>
    </div>
  );
}
