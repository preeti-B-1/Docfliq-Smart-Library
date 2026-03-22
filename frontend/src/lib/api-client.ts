import { API_CONFIG } from "@/config/constants";
import type {
  AuthResponse,
  Content,
  ContentDraft,
  ContentFilters,
  ContentListItem,
  ContentUpdateRequest,
  PaginatedResponse,
  Tag,
  TagWithCount,
  UploadResponse,
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

  // ─── Tags ──────────────────────────────────────────────────────────────────

  async getTags(): Promise<TagWithCount[]> {
    return this.request<TagWithCount[]>("/api/tags");
  }

  async getSpecialties(): Promise<Tag[]> {
    return this.request<Tag[]>("/api/tags/specialties");
  }

  async renameTag(id: number, name: string): Promise<Tag> {
    return this.request<Tag>(`/api/tags/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
  }

  async mergeTags(sourceIds: number[], targetId: number): Promise<Tag> {
    return this.request<Tag>("/api/tags/merge", {
      method: "POST",
      body: JSON.stringify({ source_ids: sourceIds, target_id: targetId }),
    });
  }

  async deleteTag(id: number): Promise<void> {
    return this.request<void>(`/api/tags/${id}`, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient(API_CONFIG.baseUrl);
