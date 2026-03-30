"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import RoleGuard from "@/components/auth/RoleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import ViewsChart from "@/components/admin/ViewsChart";
import TagsChart from "@/components/admin/TagsChart";
import SearchTermsTable from "@/components/admin/SearchTermsTable";
import SignupsChart from "@/components/admin/SignupsChart";
import ZeroResultsTable from "@/components/admin/ZeroResultsTable";
import PublishingChart from "@/components/admin/PublishingChart";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type {
  AIProviderStats,
  AnalyticsDateRange,
  PublishingAnalytics,
  SearchesAnalytics,
  TagsAnalytics,
  UsersAnalytics,
  ViewsAnalytics,
} from "@/types";

const DATE_RANGES: { label: string; value: AnalyticsDateRange }[] = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "All time", value: "all" },
];

interface DashboardData {
  users: UsersAnalytics;
  views: ViewsAnalytics;
  tags: TagsAnalytics;
  searches: SearchesAnalytics;
  aiProviders: AIProviderStats;
  publishing: PublishingAnalytics;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-3xl font-semibold text-gray-900">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">{title}</h2>
        <div className="flex-1 border-t border-gray-100" />
      </div>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="mt-3 h-8 w-20 animate-pulse rounded bg-gray-200" />
      </CardContent>
    </Card>
  );
}

function FallbackEventRow({ event }: { event: AIProviderStats["recent_fallbacks"][number] }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-red-50/60 px-3 py-2 text-sm">
      <span className="shrink-0 font-mono text-xs text-gray-400">#{event.content_id}</span>
      {event.error_message && (
        <span className="flex-1 truncate text-xs text-red-500">{event.error_message}</span>
      )}
      <span className="ml-auto shrink-0 tabular-nums text-xs text-gray-400">{event.duration_ms}ms</span>
    </div>
  );
}

function AIProviderStatsPanel({ stats }: { stats: AIProviderStats }) {
  const claudePct = stats.total_calls > 0 ? (stats.claude_calls / stats.total_calls) * 100 : 0;
  const fallbackPct = stats.total_calls > 0 ? (stats.fallback_calls / stats.total_calls) * 100 : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Tagging card */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Tagging</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total_calls.toLocaleString()}</p>
              <p className="text-xs text-gray-400">uploads processed</p>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-gray-500">{(stats.claude_success_rate * 100).toFixed(0)}% success</span>
            </div>
          </div>

          {/* Provider split bar */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 flex">
              <div className="bg-indigo-500 transition-all" style={{ width: `${claudePct}%` }} />
              {fallbackPct > 0 && (
                <div className="bg-amber-400 transition-all" style={{ width: `${fallbackPct}%` }} />
              )}
            </div>
            <div className="mt-2 flex gap-4">
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Claude {claudePct.toFixed(0)}%
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                GPT fallback {fallbackPct.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="px-5 py-4">
              <p className="text-[11px] text-gray-400">Claude</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{stats.claude_calls.toLocaleString()}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] text-gray-400">GPT fallbacks</p>
              <p className={cn("mt-1 text-lg font-semibold", stats.fallback_calls > 0 ? "text-amber-600" : "text-gray-900")}>
                {stats.fallback_calls.toLocaleString()}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] text-gray-400">Fallback rate</p>
              <p className={cn("mt-1 text-lg font-semibold", stats.fallback_rate > 0.1 ? "text-amber-600" : "text-gray-900")}>
                {(stats.fallback_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {stats.recent_fallbacks.length > 0 && (
            <div className="border-t border-gray-100 px-5 py-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Recent failures</p>
              <div className="flex flex-col gap-1">
                {stats.recent_fallbacks.map((e) => (
                  <FallbackEventRow key={`${e.content_id}-${e.created_at}`} event={e} />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ask AI card */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Ask AI</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.ask_ai_claude_failures.toLocaleString()}</p>
              <p className="text-xs text-gray-400">Claude failures</p>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {stats.ask_ai_claude_failures === 0 ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs text-gray-500">All clear</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span className="text-xs text-red-500">Failures detected</span>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="px-5 py-4">
              <p className="text-[11px] text-gray-400">Claude failures</p>
              <p className={cn("mt-1 text-lg font-semibold", stats.ask_ai_claude_failures > 0 ? "text-red-600" : "text-gray-900")}>
                {stats.ask_ai_claude_failures.toLocaleString()}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] text-gray-400">GPT-4o fallbacks</p>
              <p className={cn("mt-1 text-lg font-semibold", stats.ask_ai_gpt_fallbacks > 0 ? "text-amber-600" : "text-gray-900")}>
                {stats.ask_ai_gpt_fallbacks.toLocaleString()}
              </p>
            </div>
          </div>

          {stats.recent_ask_ai_fallbacks.length > 0 ? (
            <div className="border-t border-gray-100 px-5 py-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Recent failures</p>
              <div className="flex flex-col gap-1">
                {stats.recent_ask_ai_fallbacks.map((e) => (
                  <FallbackEventRow key={`${e.content_id}-${e.created_at}`} event={e} />
                ))}
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-100 px-5 py-5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-gray-400">No failures in this period</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>("30d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.backendToken) {
      setLoading(false);
      return;
    }
    apiClient.setToken(session.backendToken);

    setLoading(true);
    setError(null);

    Promise.all([
      apiClient.getUsersAnalytics(dateRange),
      apiClient.getViewsAnalytics(dateRange),
      apiClient.getTagsAnalytics(),
      apiClient.getSearchesAnalytics(dateRange),
      apiClient.getAIProviderStats(dateRange),
      apiClient.getPublishingAnalytics(dateRange),
    ])
      .then(([users, views, tags, searches, aiProviders, publishing]) =>
        setData({ users, views, tags, searches, aiProviders, publishing })
      )
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [dateRange, session]);

  return (
    <RoleGuard requiredRole="admin">
      <DashboardLayout>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-bold text-zinc-900 font-display">Analytics</h1>
            <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 self-start sm:self-auto">
              {DATE_RANGES.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setDateRange(value)}
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                    dateRange === value
                      ? "bg-violet-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : data ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total Users" value={data.users.total_users} />
                <StatCard label="Published Articles" value={data.users.total_articles} />
                <StatCard label="Total Views" value={data.users.total_views} />
              </div>

              <Section title="Content Performance">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  <div className="lg:col-span-3">
                    <ViewsChart articles={data.views.top_articles} />
                  </div>
                  <div className="lg:col-span-2">
                    <TagsChart specialties={data.tags.specialties} />
                  </div>
                </div>
              </Section>

              <Section title="Growth">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SignupsChart signups={data.users.daily_signups} />
                  <PublishingChart publishes={data.publishing.weekly_publishes} />
                </div>
              </Section>

              <Section title="Search">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SearchTermsTable searches={data.searches.top_searches} />
                  <ZeroResultsTable searches={data.searches.zero_result_searches} />
                </div>
              </Section>

              <Section title="AI System">
                <AIProviderStatsPanel stats={data.aiProviders} />
              </Section>
            </>
          ) : (
            <p className="text-sm text-gray-500">No analytics data available.</p>
          )}
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
