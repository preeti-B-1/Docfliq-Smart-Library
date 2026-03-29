"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Bookmark, ChevronDown, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { formatDate, formatViewCount, cn } from "@/lib/utils";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AuthGuard from "@/components/auth/AuthGuard";
import TagEditor from "@/components/admin/TagEditor";
import ContentRenderer from "@/components/content/ContentRenderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ArticleCard from "@/components/content/ArticleCard";
import AskAIPanel from "@/components/content/AskAIPanel";
import type { Content, ContentListItem, TagInput } from "@/types";

/* OLD — blue tag chip colors
function tagChipClass(type: string, name: string): string {
  if (type === "specialty") return "bg-violet-50 text-violet-700 border border-violet-200";
  if (type === "difficulty") { ... }
  return "border border-[#E2E8F0] text-[#475569] bg-transparent";
}
*/

function tagChipClass(type: string, name: string): string {
  if (type === "specialty") return "bg-violet-50 text-violet-700 border border-violet-200";
  if (type === "difficulty") {
    switch (name.toLowerCase()) {
      case "beginner": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "intermediate": return "bg-amber-50 text-amber-700 border border-amber-200";
      case "advanced": return "bg-red-50 text-red-700 border border-red-200";
    }
  }
  return "bg-zinc-100 text-zinc-600 border border-zinc-200";
}

const chipBase = "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium";

/* groupTags — unused, kept for reference
function groupTags(tags: Content["tags"]) {
  return {
    specialty: tags.filter((t) => t.type === "specialty"),
    difficulty: tags.filter((t) => t.type === "difficulty"),
    topic: tags.filter((t) => t.type === "topic"),
    key_term: tags.filter((t) => t.type === "key_term"),
    content_type: tags.filter((t) => t.type === "content_type"),
  };
}
*/

function TagsSection({ tags }: { tags: Content["tags"] }) {
  const [showAllKeyTerms, setShowAllKeyTerms] = useState(false);

  const topics = tags.filter((t) => t.type === "topic");
  const keyTerms = tags.filter((t) => t.type === "key_term");

  const INITIAL_KEY_TERMS = 3;
  const visibleKeyTerms = showAllKeyTerms ? keyTerms : keyTerms.slice(0, INITIAL_KEY_TERMS);
  const hiddenCount = keyTerms.length - INITIAL_KEY_TERMS;

  if (topics.length === 0 && keyTerms.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 pt-6 border-t border-zinc-200">
      {topics.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground w-20 shrink-0">Topics:</span>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((tag) => (
              <Link
                key={tag.id}
                href={`/library?q=${encodeURIComponent(tag.name)}`}
                className={cn(chipBase, "bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 hover:underline transition-colors")}
              >
                {tag.name}
              </Link>
            ))}
          </div>
        </div>
      )}
      {keyTerms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground w-20 shrink-0">Key Terms:</span>
          <div className="flex flex-wrap gap-1.5 items-center">
            {visibleKeyTerms.map((tag) => (
              <span key={tag.id} className={cn(chipBase, tagChipClass("key_term", tag.name))}>
                {tag.name}
              </span>
            ))}
            {!showAllKeyTerms && hiddenCount > 0 && (
              <button
                onClick={() => setShowAllKeyTerms(true)}
                className="text-xs text-primary hover:underline"
              >
                +{hiddenCount} more
              </button>
            )}
            {showAllKeyTerms && keyTerms.length > INITIAL_KEY_TERMS && (
              <button
                onClick={() => setShowAllKeyTerms(false)}
                className="text-xs text-primary hover:underline"
              >
                show less
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { backendToken, isAdmin, isLoading: authLoading } = useAuth();
  const contentId = Number(params.id);

  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTags, setEditTags] = useState<TagInput[]>([]);
  const [saving, setSaving] = useState(false);

  const [relatedContent, setRelatedContent] = useState<ContentListItem[]>([]);

  const [publishing, setPublishing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [askAIOpen, setAskAIOpen] = useState(false);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);

  useEffect(() => {
    if (backendToken) {
      apiClient.setToken(backendToken);
    }
  }, [backendToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!backendToken) return;

    apiClient
      .getContentById(contentId)
      .then((data) => {
        setContent(data);
        setIsBookmarked(data.is_bookmarked);
        setLoading(false);
      })
      .catch(() => {
        setError("Content not found.");
        setLoading(false);
      });
  }, [contentId, backendToken, authLoading]);

  useEffect(() => {
    if (!content) return;
    apiClient.getRelatedContent(content.id).then(setRelatedContent).catch(() => {});
  }, [content?.id]);

  const enterEditMode = () => {
    if (!content) return;
    setEditTitle(content.title);
    setEditDescription(content.description);
    setEditSummary(content.ai_summary ?? "");
    if (!isPdf) setEditBody(content.body_text);
    setEditTags(content.tags.map((t) => ({ id: t.id, name: t.name, type: t.type })));
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!content) return;
    setSaving(true);
    try {
      const updated = await apiClient.updateContent(content.id, {
        title: editTitle,
        description: editDescription,
        ...(!isPdf && { body_text: editBody }),
        ai_summary: editSummary,
        tags: editTags,
      });
      setContent(updated);
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async () => {
    if (!content) return;
    setPublishing(true);
    try {
      const updated =
        content.status === "published"
          ? await apiClient.unpublishContent(content.id)
          : await apiClient.publishContent(content.id);
      setContent(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setPublishing(false);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!backendToken || isTogglingBookmark || !content) return;
    const prev = isBookmarked;
    setIsBookmarked(!prev);
    setIsTogglingBookmark(true);
    try {
      const result = await apiClient.toggleBookmark(content.id);
      setIsBookmarked(result.bookmarked);
      toast(result.bookmarked ? "Article bookmarked" : "Bookmark removed");
    } catch {
      setIsBookmarked(prev);
      toast.error("Failed to update bookmark");
    } finally {
      setIsTogglingBookmark(false);
    }
  };

  const confirmDelete = async () => {
    if (!content) return;
    setDeleting(true);
    try {
      await apiClient.deleteContent(content.id);
      router.push(isAdmin ? "/drafts" : "/library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !content) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">{error ?? "Content not found."}</p>
        </div>
      </DashboardLayout>
    );
  }

  /* OLD status chip colors
  const statusChipClass =
    content.status === "published"
      ? "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]"
      : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]";
  */
  const statusChipClass =
    content.status === "published"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  const isPdf = content.body_text.trimStart().startsWith("<!DOCTYPE") || content.body_text.trimStart().startsWith("<html");

  const contentTypeTag = content.tags.find((t) => t.type === "content_type");
  const specialtyTags = content.tags.filter((t) => t.type === "specialty");
  const difficultyTag = content.tags.find((t) => t.type === "difficulty");
  const metaParts: string[] = [];
  if (contentTypeTag) metaParts.push(contentTypeTag.name);
  metaParts.push(`${formatViewCount(content.view_count)} view${content.view_count !== 1 ? "s" : ""}`);
  if (content.published_at) metaParts.push(formatDate(content.published_at));

  return (
    <AuthGuard>
      <DashboardLayout>
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete content?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will permanently delete the article and all associated data. This cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} loading={deleting}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className={cn("mx-auto flex gap-6 items-start", askAIOpen ? "max-w-6xl" : "max-w-3xl")}>
          <div className="flex-1 min-w-0 flex flex-col gap-6">
          {isAdmin && (
            <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    statusChipClass
                  )}
                >
                  {content.status === "published" ? "Published" : "Draft"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Processing: {content.processing_status}
                </span>
              </div>
              <div className="flex gap-2">
                {!editMode && (
                  <Button variant="outline" size="sm" onClick={enterEditMode}>
                    Edit
                  </Button>
                )}
                <Button
                  variant={content.status === "published" ? "outline" : "default"}
                  size="sm"
                  onClick={togglePublish}
                  loading={publishing}
                  disabled={content.processing_status !== "completed"}
                >
                  {content.status === "published" ? "Unpublish" : "Publish"}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteModal(true)}>
                  Delete
                </Button>
              </div>
            </div>
          )}

          {editMode ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-foreground">Title</p>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold text-foreground leading-tight">{content.title}</h1>
                {content.status === "published" && (
                  <div className="flex items-center gap-2 shrink-0 mt-1">
                    <button
                      onClick={handleBookmarkToggle}
                      disabled={isTogglingBookmark}
                      className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                      aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
                    >
                      <Bookmark
                        className={cn(
                          "h-5 w-5",
                          isBookmarked ? "fill-primary text-primary" : ""
                        )}
                      />
                    </button>
                    <Button
                      variant={askAIOpen ? "outline" : "default"}
                      size="sm"
                      onClick={() => setAskAIOpen((v) => !v)}
                      className={cn(!askAIOpen && "gap-1.5")}
                    >
                      {askAIOpen ? (
                        <>
                          <X className="h-3.5 w-3.5 mr-1" />
                          Close AI
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          Ask AI
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-sm text-[#64748B]">{metaParts.join(" · ")}</p>
              {(specialtyTags.length > 0 || difficultyTag) && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {specialtyTags.map((tag) => (
                    <span key={tag.id} className={cn(chipBase, tagChipClass("specialty", tag.name))}>
                      {tag.name}
                    </span>
                  ))}
                  {difficultyTag && (
                    <span className={cn(chipBase, tagChipClass("difficulty", difficultyTag.name))}>
                      {difficultyTag.name}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {editMode && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-foreground">Description</p>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {editMode ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-foreground">AI Summary</p>
              <Textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={4}
              />
            </div>
          ) : content.ai_summary ? (
            <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 border border-zinc-200 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors text-left">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  AI Summary
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-[#94A3B8] transition-transform duration-200",
                    summaryOpen && "rotate-180"
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-0.5 border-l-4 border-l-violet-500 border border-violet-100 rounded-xl px-5 py-4 bg-violet-50/50">
                  <p className="text-foreground leading-relaxed">{content.ai_summary}</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : null}

          {editMode && isPdf ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Body</p>
              <p className="text-xs text-muted-foreground">
                PDF content cannot be edited directly. Re-upload a corrected file to replace it.
              </p>
              <div className="py-2 opacity-60 pointer-events-none">
                <ContentRenderer html={content.body_text} />
              </div>
            </div>
          ) : editMode ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-foreground">Body</p>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={24}
                className="font-mono text-sm"
              />
            </div>
          ) : (
            <div className="py-2">
              <ContentRenderer html={content.body_text} />
            </div>
          )}

          {!editMode && (
            <TagsSection tags={content.tags} />
          )}

          {editMode && (
            <>
              <div className="flex flex-col gap-1.5">
                <p className="text-sm font-medium text-foreground">Tags</p>
                <TagEditor tags={editTags} onChange={setEditTags} />
              </div>
              <div className="flex justify-end gap-3 pb-4">
                <Button variant="outline" onClick={() => setEditMode(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={saveEdit} loading={saving}>
                  Save changes
                </Button>
              </div>
            </>
          )}

          {!editMode && relatedContent.length > 0 && (
            <div className="flex flex-col gap-4 pt-2">
              <p className="text-sm font-semibold text-foreground">You might also like</p>
              <div className="grid grid-cols-2 gap-4">
                {relatedContent.map((item) => (
                  <ArticleCard key={item.id} content={item} showBookmark={false} />
                ))}
              </div>
            </div>
          )}
          </div>

          {askAIOpen && content.status === "published" && !editMode && (
            <div className="w-96 shrink-0 sticky top-4" style={{ height: "calc(100vh - 6rem)" }}>
              <AskAIPanel contentId={content.id} onClose={() => setAskAIOpen(false)} />
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
