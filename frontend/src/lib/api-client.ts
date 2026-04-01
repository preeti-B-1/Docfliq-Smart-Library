import { API_CONFIG } from "@/config/constants";
import type {
  AIProviderStats,
  AnalyticsDateRange,
  AskAIMessage,
  AuthResponse,
  BookmarkToggleResponse,
  Content,
  ContentDraft,
  ContentFilters,
  ContentListItem,
  ContentUpdateRequest,
  PaginatedResponse,
  PublishingAnalytics,
  ReadingHistoryItem,
  SearchesAnalytics,
  TagsAnalytics,
  UploadResponse,
  UsersAnalytics,
  ViewsAnalytics,
  ContentStatusResponse,
} from "@/types";

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null): void {
    this.token = token;
  }
// generic JSON request method; throws a descriptive error on non-2xx responses
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail ?? "Request failed");
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return res.json() as Promise<T>;
  }
//for file uploads; does NOT set Content-Type: application/json (lets browser set the multipart boundary)
  private async requestMultipart<T>(path: string, body: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${this.baseUrl}${path}`, { method: "POST", headers, body });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail ?? "Request failed");
    }

    return res.json() as Promise<T>;
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async oauthLogin(email: string, name: string, oauthProvider: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/oauth", {
      method: "POST",
      body: JSON.stringify({ email, name, oauth_provider: oauthProvider }),
    });
  }

  // ─── Content ───────────────────────────────────────────────────────────────

  async getContent(filters: ContentFilters = {}): Promise<PaginatedResponse<ContentListItem>> {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.specialties?.length) params.set("specialties", filters.specialties.join(","));
    if (filters.difficulties?.length) params.set("difficulties", filters.difficulties.join(","));
    if (filters.page) params.set("page", filters.page.toString());
    if (filters.per_page) params.set("per_page", filters.per_page.toString());
    if (filters.sort) params.set("sort", filters.sort);
    const query = params.toString();
    return this.request<PaginatedResponse<ContentListItem>>(`/api/content${query ? `?${query}` : ""}`);
  }

  async getContentById(id: number): Promise<Content> {
    return this.request<Content>(`/api/content/${id}`);
  }

  async getDrafts(): Promise<ContentDraft[]> {
    return this.request<ContentDraft[]>("/api/content/drafts");
  }

  async updateContent(id: number, data: ContentUpdateRequest): Promise<Content> {
    return this.request<Content>(`/api/content/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async publishContent(id: number): Promise<Content> {
    return this.request<Content>(`/api/content/${id}/publish`, { method: "PUT" });
  }

  async unpublishContent(id: number): Promise<Content> {
    return this.request<Content>(`/api/content/${id}/unpublish`, { method: "PUT" });
  }

  async deleteContent(id: number): Promise<void> {
    return this.request<void>(`/api/content/${id}`, { method: "DELETE" });
  }

  async uploadContent(formData: FormData): Promise<UploadResponse> {
    return this.requestMultipart<UploadResponse>("/api/content/upload", formData);
  }

  async getContentStatus(id: number): Promise<ContentStatusResponse> {
    return this.request<ContentStatusResponse>(`/api/content/${id}/status`);
  }

  async getRelatedContent(id: number): Promise<ContentListItem[]> {
    return this.request<ContentListItem[]>(`/api/content/${id}/related`);
  }

  async bulkUpload(files: File[]): Promise<UploadResponse[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    return this.requestMultipart<UploadResponse[]>("/api/content/bulk-upload", formData);
  }

  // ─── Bookmarks ─────────────────────────────────────────────────────────────

  async toggleBookmark(contentId: number): Promise<BookmarkToggleResponse> {
    return this.request<BookmarkToggleResponse>(`/api/bookmarks/${contentId}`, { method: "POST" });
  }

  async getBookmarks(): Promise<ContentListItem[]> {
    return this.request<ContentListItem[]>("/api/bookmarks");
  }

  // ─── History ───────────────────────────────────────────────────────────────

  async getHistory(): Promise<ReadingHistoryItem[]> {
    return this.request<ReadingHistoryItem[]>("/api/history");
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  async getAIProviderStats(dateRange: AnalyticsDateRange = "30d"): Promise<AIProviderStats> {
    return this.request<AIProviderStats>(`/api/analytics/ai-providers?date_range=${dateRange}`);
  }

  async getViewsAnalytics(dateRange: AnalyticsDateRange = "30d"): Promise<ViewsAnalytics> {
    return this.request<ViewsAnalytics>(`/api/analytics/views?date_range=${dateRange}`);
  }

  async getTagsAnalytics(): Promise<TagsAnalytics> {
    return this.request<TagsAnalytics>("/api/analytics/tags");
  }

  async getSearchesAnalytics(dateRange: AnalyticsDateRange = "30d"): Promise<SearchesAnalytics> {
    return this.request<SearchesAnalytics>(`/api/analytics/searches?date_range=${dateRange}`);
  }

  async getUsersAnalytics(dateRange: AnalyticsDateRange = "30d"): Promise<UsersAnalytics> {
    return this.request<UsersAnalytics>(`/api/analytics/users?date_range=${dateRange}`);
  }

  async logSearch(query: string, resultCount: number | null = null): Promise<void> {
    return this.request<void>("/api/analytics/log-search", {
      method: "POST",
      body: JSON.stringify({ query, result_count: resultCount }),
    });
  }

  async getPublishingAnalytics(dateRange: AnalyticsDateRange = "30d"): Promise<PublishingAnalytics> {
    return this.request<PublishingAnalytics>(`/api/analytics/publishing?date_range=${dateRange}`);
  }

  // ─── Ask AI ────────────────────────────────────────────────────────────────
//reads a Server-Sent Events (SSE) stream manually using ReadableStream, parsing data: {...} lines and calling onChunk() for each text piece
  async streamAskAI(
    contentId: number,
    question: string,
    conversationHistory: AskAIMessage[],
    onChunk: (text: string) => void,
  ): Promise<void> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    const res = await fetch(`${this.baseUrl}/api/content/${contentId}/ask`, {
      method: "POST",
      headers,
      body: JSON.stringify({ question, conversation_history: conversationHistory }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail ?? "Request failed");
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data) as { text: string };
          if (parsed.text) onChunk(parsed.text);
        } catch {
          // ignore malformed chunks
        }
      }
    }
  }
}

export const apiClient = new ApiClient(API_CONFIG.baseUrl);
