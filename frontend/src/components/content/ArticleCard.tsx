import Link from "next/link";
import { Eye, Bookmark } from "lucide-react";

import { formatDate, formatViewCount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ContentListItem } from "@/types";

interface ArticleCardProps {
  content: ContentListItem;
  showBookmark?: boolean;
  onBookmarkToggle?: (id: number) => void;
}

export default function ArticleCard({ content, showBookmark = true, onBookmarkToggle }: ArticleCardProps) {
  const specialtyTags = content.specialty_tags.slice(0, 2);

  return (
    <div className="group relative flex flex-col gap-4 bg-white border border-[#E2E8F0] rounded-lg p-6 hover:shadow-md hover:border-[#CBD5E1] transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/article/${content.id}`} className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground font-display leading-snug hover:text-primary transition-colors line-clamp-2">
            {content.title}
          </h3>
        </Link>
        {showBookmark && (
          <button
            onClick={() => onBookmarkToggle?.(content.id)}
            className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0 mt-0.5"
            aria-label={content.is_bookmarked ? "Remove bookmark" : "Bookmark"}
          >
            <Bookmark
              className={cn(
                "h-4 w-4",
                content.is_bookmarked ? "fill-primary text-primary" : ""
              )}
            />
          </button>
        )}
      </div>

      {(content.ai_summary || content.description) && (
        <p className="text-sm text-[#475569] leading-relaxed line-clamp-2">
          {content.ai_summary || content.description}
        </p>
      )}

      {specialtyTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {specialtyTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border border-[#BFDBFE] text-[#1E40AF] bg-transparent"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-1 border-t border-[#F1F5F9]">
        {content.content_type && (
          <span className="text-[#64748B]">{content.content_type}</span>
        )}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" />
            {formatViewCount(content.view_count)}
          </span>
          {content.published_at && (
            <span>{formatDate(content.published_at)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
