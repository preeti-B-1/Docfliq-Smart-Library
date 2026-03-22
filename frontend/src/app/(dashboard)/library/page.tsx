"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Eye } from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SearchBar from "@/components/content/SearchBar";
import SidebarFilters from "@/components/content/SidebarFilters";
import ActiveFilters from "@/components/content/ActiveFilters";
import ArticleCard from "@/components/content/ArticleCard";
import { Spinner } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { useContent } from "@/hooks/useContent";
import { useDebounce } from "@/hooks/useDebounce";
import { PAGINATION_CONFIG } from "@/config/constants";
import { formatRelativeDate, formatViewCount } from "@/lib/utils";
import type { ContentFilters, ContentListItem } from "@/types";

interface SidebarItemProps {
  item: ContentListItem;
  right: React.ReactNode;
}

function SidebarItem({ item, right }: SidebarItemProps) {
  return (
    <li className="flex items-start justify-between gap-2 py-2.5 border-b border-[#F1F5F9] last:border-0">
      <div className="flex flex-col gap-1 min-w-0">
        <Link
          href={`/article/${item.id}`}
          className="text-sm font-semibold text-foreground leading-snug hover:text-primary transition-colors"
        >
          {item.title}
        </Link>
        {item.specialty_tags[0] && (
          <span className="text-xs text-[#64748B]">{item.specialty_tags[0]}</span>
        )}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">{right}</span>
    </li>
  );
}

function TrendingSidebar({ token }: { token: string | null }) {
  const { data: recentData, isLoading: recentLoading } = useContent(
    { per_page: 4, sort: "recent" },
    token
  );
  const { data: popularData, isLoading: popularLoading } = useContent(
    { per_page: 3, sort: "popular" },
    token
  );

  return (
    <div
      className="w-[280px] shrink-0 border-l border-[#E2E8F0] pl-6 sticky top-6 overflow-y-auto"
      style={{ maxHeight: "calc(100vh - 5rem)" }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Recently Added
      </h3>
      {recentLoading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : (
        <ul>
          {recentData?.items.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              right={item.published_at ? formatRelativeDate(item.published_at) : ""}
            />
          ))}
        </ul>
      )}

      <div className="my-5 border-t border-[#E2E8F0]" />

      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        Popular
      </h3>
      {popularLoading ? (
        <div className="flex justify-center py-4"><Spinner /></div>
      ) : (
        <ul>
          {popularData?.items.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              right={
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatViewCount(item.view_count)}
                </span>
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LibraryContent() {
  const { data: session } = useSession();
  const token = session?.backendToken ?? null;

  const [searchInput, setSearchInput] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebounce(searchInput, 300);

  const mainFilters: ContentFilters = {
    search: debouncedSearch || undefined,
    specialties: selectedSpecialties.length ? selectedSpecialties : undefined,
    difficulties: selectedDifficulties.length ? selectedDifficulties : undefined,
    page,
    per_page: PAGINATION_CONFIG.defaultPageSize,
  };

  const { data: mainData, isLoading: mainLoading, error: mainError } = useContent(mainFilters, token);

  const toggleSpecialty = useCallback((specialty: string) => {
    setPage(1);
    setSelectedSpecialties((prev) =>
      prev.includes(specialty) ? prev.filter((s) => s !== specialty) : [...prev, specialty]
    );
  }, []);

  const toggleDifficulty = useCallback((difficulty: string) => {
    setPage(1);
    setSelectedDifficulties((prev) =>
      prev.includes(difficulty) ? prev.filter((d) => d !== difficulty) : [...prev, difficulty]
    );
  }, []);

  const clearAll = useCallback(() => {
    setPage(1);
    setSelectedSpecialties([]);
    setSelectedDifficulties([]);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-6 items-start">
        <SidebarFilters
          selectedSpecialties={selectedSpecialties}
          selectedDifficulties={selectedDifficulties}
          onSpecialtyChange={toggleSpecialty}
          onDifficultyChange={toggleDifficulty}
        />

        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <SearchBar value={searchInput} onChange={handleSearchChange} />

          <ActiveFilters
            specialties={selectedSpecialties}
            difficulties={selectedDifficulties}
            onRemoveSpecialty={toggleSpecialty}
            onRemoveDifficulty={toggleDifficulty}
            onClearAll={clearAll}
          />

          {mainLoading && (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          )}

          {mainError && <p className="text-sm text-red-500">{mainError}</p>}

          {!mainLoading && !mainError && mainData && (
            <>
              {mainData.items.length === 0 ? (
                <p className="text-sm text-gray-400 py-12 text-center">No articles match your search.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-5">
                    {mainData.items.map((item) => (
                      <ArticleCard key={item.id} content={item} />
                    ))}
                  </div>

                  {mainData.total_pages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        {mainData.total} article{mainData.total !== 1 ? "s" : ""}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(Math.max(1, page - 1))}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        {Array.from({ length: mainData.total_pages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === mainData.total_pages || Math.abs(p - page) <= 1)
                          .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                            if (idx > 0 && typeof arr[idx - 1] === "number" && (p as number) - (arr[idx - 1] as number) > 1) {
                              acc.push("...");
                            }
                            acc.push(p);
                            return acc;
                          }, [])
                          .map((p, idx) =>
                            p === "..." ? (
                              <span key={`ellipsis-${idx}`} className="text-sm text-muted-foreground px-1">…</span>
                            ) : (
                              <Button
                                key={p}
                                variant={p === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(p as number)}
                                className="w-8 px-0"
                              >
                                {p}
                              </Button>
                            )
                          )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(Math.min(mainData.total_pages, page + 1))}
                          disabled={page === mainData.total_pages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <TrendingSidebar token={token} />
      </div>
    </div>
  );
}

export default function LibraryPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <LibraryContent />
      </DashboardLayout>
    </AuthGuard>
  );
}
