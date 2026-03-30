"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Eye, SlidersHorizontal } from "lucide-react";

import AuthGuard from "@/components/auth/AuthGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SearchBar from "@/components/content/SearchBar";
import SidebarFilters from "@/components/content/SidebarFilters";
import ActiveFilters from "@/components/content/ActiveFilters";
import ArticleCard from "@/components/content/ArticleCard";
import { Spinner } from "@/components/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useContent } from "@/hooks/useContent";
import { useDebounce } from "@/hooks/useDebounce";
import { PAGINATION_CONFIG } from "@/config/constants";
import { apiClient } from "@/lib/api-client";
import { formatRelativeDate, formatViewCount } from "@/lib/utils";
import type { ContentFilters, ContentListItem } from "@/types";

interface SidebarItemProps {
  item: ContentListItem;
  right: React.ReactNode;
}

function SidebarItem({ item, right }: SidebarItemProps) {
  return (
    <li className="py-3 border-b border-zinc-100 last:border-0 flex flex-col gap-1.5">
      <Link
        href={`/article/${item.id}`}
        className="text-sm font-medium text-zinc-800 leading-snug hover:text-violet-700 transition-colors"
      >
        {item.title}
      </Link>
      <div className="flex items-center justify-between gap-2">
        {item.specialty_tags[0] && (
          <span className="text-xs text-zinc-400">{item.specialty_tags[0]}</span>
        )}
        <span className="text-xs text-muted-foreground whitespace-nowrap ml-auto">{right}</span>
      </div>
    </li>
  );
}

function TrendingSidebar({ token }: { token: string | null }) {
  const { data: recentData, isLoading: recentLoading } = useContent(
    { per_page: 4, sort: "recent" },
    token
  );
  const { data: popularData, isLoading: popularLoading } = useContent(
    { per_page: 4, sort: "popular" },
    token
  );

  return (
    <div
      className="w-[280px] shrink-0 border-l border-zinc-200 pl-6 sticky top-6 overflow-y-auto"
      style={{ maxHeight: "calc(100vh - 5rem)" }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
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

      <div className="my-5 border-t border-zinc-200" />

      <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
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
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(() => searchParams.get("q") ?? "");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 300);
  const logDebounced = useDebounce(searchInput, 1000);
  const lastLogged = useRef("");
  const pendingResultCount = useRef<number | null>(null);

  const mainFilters: ContentFilters = {
    search: debouncedSearch || undefined,
    specialties: selectedSpecialties.length ? selectedSpecialties : undefined,
    difficulties: selectedDifficulties.length ? selectedDifficulties : undefined,
    page,
    per_page: PAGINATION_CONFIG.defaultPageSize,
  };

  const { data: mainData, isLoading: mainLoading, error: mainError } = useContent(mainFilters, token);

  useEffect(() => {
    if (!mainLoading) {
      pendingResultCount.current = mainData?.total ?? null;
    }
  }, [mainLoading, mainData]);

  useEffect(() => {
    if (logDebounced.length < 2 || logDebounced === lastLogged.current || !token) return;
    lastLogged.current = logDebounced;
    apiClient.setToken(token);
    apiClient.logSearch(logDebounced, pendingResultCount.current).catch(() => {});
  }, [logDebounced, token]);

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

  const totalActiveFilters = selectedSpecialties.length + selectedDifficulties.length;

  return (
    <div className="flex flex-col gap-5">
      {/* Mobile filter dialog */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <SidebarFilters
            selectedSpecialties={selectedSpecialties}
            selectedDifficulties={selectedDifficulties}
            onSpecialtyChange={toggleSpecialty}
            onDifficultyChange={toggleDifficulty}
            className="w-full border-0 shadow-none p-0 rounded-none"
          />
        </DialogContent>
      </Dialog>

      <div className="flex gap-6 items-start">
        {/* Desktop sidebar */}
        <div className="hidden lg:block sticky top-6 shrink-0" style={{ maxHeight: "calc(100vh - 5rem)" }}>
          <SidebarFilters
            selectedSpecialties={selectedSpecialties}
            selectedDifficulties={selectedDifficulties}
            onSpecialtyChange={toggleSpecialty}
            onDifficultyChange={toggleDifficulty}
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchBar value={searchInput} onChange={handleSearchChange} />
            </div>
            {/* Mobile filter button */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden shrink-0 gap-1.5"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {totalActiveFilters > 0 && (
                <span className="ml-0.5 text-xs font-semibold text-white bg-violet-600 rounded-full px-1.5 py-0.5 leading-none">
                  {totalActiveFilters}
                </span>
              )}
            </Button>
          </div>

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
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                  </div>
                  <p className="text-zinc-500 font-medium">No articles match your search</p>
                  <p className="text-sm text-zinc-400 mt-1">Try adjusting your filters or search terms</p>
                </div>
              ) : (
                <>
                  {debouncedSearch && (
                    <p className="text-sm text-zinc-400 font-medium">
                      {mainData.total} result{mainData.total !== 1 ? "s" : ""}
                    </p>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    {mainData.items.map((item) => (
                      <ArticleCard key={item.id} content={item} token={token} />
                    ))}
                  </div>

                  {mainData.total_pages > 1 && (
                    <div className="flex items-center justify-end mt-4 pt-4 border-t border-gray-100">
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

        <div className="hidden lg:block">
          <TrendingSidebar token={token} />
        </div>
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
