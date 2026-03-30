"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import RoleGuard from "@/components/auth/RoleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function FallbackEventList({ events }: { events: AIProviderStats["recent_fallbacks"] }) {
  return (
    <div className="flex flex-col gap-1">
      {events.map((event) => (
        <div
          key={`${event.content_id}-${event.created_at}`}
          className="flex items-center justify-between rounded bg-red-50 px-3 py-2 text-sm"
        >
          <span className="text-gray-700">
            Article #{event.content_id}
            {event.error_message && (
              <span className="ml-2 text-red-600 truncate max-w-xs inline-block align-bottom">
                {event.error_message}
              </span>
            )}
          </span>
          <span className="ml-4 shrink-0 text-gray-400">{event.duration_ms}ms</span>
        </div>
      ))}
    </div>
  );
}

function AIProviderStatsPanel({ stats }: { stats: AIProviderStats }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-900">Tagging — AI Provider Stats</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Uploads Processed</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {stats.total_calls.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Claude Successes</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {stats.claude_calls.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">GPT Fallbacks Used</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {stats.fallback_calls.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Fallback Rate</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {(stats.fallback_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-3">
            <div>
              <p className="text-sm text-gray-500">Claude Success Rate</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {(stats.claude_success_rate * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">GPT Fallback Success Rate</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {(stats.gpt_success_rate * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {stats.recent_fallbacks.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <p className="mb-2 text-sm font-medium text-gray-700">Recent Tagging Failures</p>
              <FallbackEventList events={stats.recent_fallbacks} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-gray-900">Ask AI — Claude Failures</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Claude Failures</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {stats.ask_ai_claude_failures.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">GPT-4o Fallbacks Served</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {stats.ask_ai_gpt_fallbacks.toLocaleString()}
              </p>
            </div>
          </div>

          {stats.recent_ask_ai_fallbacks.length > 0 ? (
            <div className="border-t border-gray-100 pt-3">
              <p className="mb-2 text-sm font-medium text-gray-700">Recent Ask AI Failures</p>
              <FallbackEventList events={stats.recent_ask_ai_fallbacks} />
            </div>
          ) : (
            <p className="text-sm text-gray-400">No Ask AI failures in this period.</p>
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
