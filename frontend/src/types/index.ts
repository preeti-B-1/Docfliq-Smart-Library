import "next-auth";

// ─── Auth ───────────────────────────────────────────────────────────────────

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    backendToken: string;
  }
  interface Session {
    backendToken: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    role: string;
    backendToken: string;
  }
}

// ─── Domain ──────────────────────────────────────────────────────────────────

export type Role = "admin" | "reader";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Tag {
  id: number;
  name: string;
  type: "specialty" | "topic" | "difficulty" | "key_term" | "content_type";
  is_fixed: boolean;
}

export type ProcessingStatus = "pending" | "processing" | "completed" | "failed";
export type ContentStatus = "draft" | "published";

export interface Content {
  id: number;
  title: string;
  description: string;
  body_text: string;
  status: ContentStatus;
  processing_status: ProcessingStatus;
  ai_summary: string | null;
  view_count: number;
  is_bookmarked: boolean;
  tags: Tag[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface ContentCard {
  id: number;
  title: string;
  ai_summary: string | null;
  view_count: number;
  status: ContentStatus;
  processing_status: ProcessingStatus;
  tags: Tag[];
  created_at: string;
  published_at: string | null;
}

export interface ContentListItem {
  id: number;
  title: string;
  description: string;
  body_text: string;
  ai_summary: string | null;
  specialty_tags: string[];
  topic_tags: string[];
  difficulty_tag: string | null;
  content_type: string | null;
  view_count: number;
  published_at: string | null;
  is_bookmarked: boolean;
}

export interface ContentFilters {
  search?: string;
  specialties?: string[];
  difficulties?: string[];
  page?: number;
  per_page?: number;
  sort?: "recent" | "popular";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TagInput {
  id?: number;
  name: string;
  type: string;
}

export interface ContentUpdateRequest {
  title?: string;
  description?: string;
  body_text?: string;
  ai_summary?: string;
  tags?: TagInput[];
}

export interface ContentDraft {
  id: number;
  title: string;
  description: string;
  ai_summary: string | null;
  view_count: number;
  status: ContentStatus;
  processing_status: ProcessingStatus;
  tags: Tag[];
  created_at: string;
  published_at: string | null;
}

export interface TagWithCount extends Tag {
  content_count: number;
}

export interface AuthResponse {
  token: string;
  user: AppUser;
}

export interface ApiError {
  detail: string;
}

export interface UploadResponse {
  id: number;
  processing_status: ProcessingStatus;
}

export interface ContentStatusResponse {
  id: number;
  processing_status: ProcessingStatus;
}

export interface AIFallbackEvent {
  content_id: number;
  error_message: string | null;
  duration_ms: number;
  created_at: string;
}

export interface AIProviderStats {
  total_calls: number;
  claude_calls: number;
  fallback_calls: number;
  fallback_rate: number;
  claude_success_rate: number;
  gpt_success_rate: number;
  recent_fallbacks: AIFallbackEvent[];
  ask_ai_claude_failures: number;
  ask_ai_gpt_fallbacks: number;
  recent_ask_ai_fallbacks: AIFallbackEvent[];
}

export type AnalyticsDateRange = "7d" | "30d" | "all";

export interface TopArticleView {
  id: number;
  title: string;
  view_count: number;
}

export interface TagPopularity {
  name: string;
  article_count: number;
}

export interface SearchTermFrequency {
  query: string;
  count: number;
}

export interface ZeroResultSearch {
  query: string;
  count: number;
}

export interface WeeklyPublish {
  week: string;
  count: number;
}

export interface PublishingAnalytics {
  weekly_publishes: WeeklyPublish[];
}

export interface DailySignup {
  date: string;
  count: number;
}

export interface ViewsAnalytics {
  top_articles: TopArticleView[];
}

export interface TagsAnalytics {
  specialties: TagPopularity[];
}

export interface SearchesAnalytics {
  top_searches: SearchTermFrequency[];
  zero_result_searches: ZeroResultSearch[];
}

export interface UsersAnalytics {
  total_users: number;
  total_articles: number;
  total_views: number;
  daily_signups: DailySignup[];
}

export interface BookmarkToggleResponse {
  bookmarked: boolean;
}

export interface ReadingHistoryItem extends ContentListItem {
  last_read_at: string;
}

export interface AskAIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskAIResponse {
  answer: string;
}
