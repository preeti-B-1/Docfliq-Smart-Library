"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
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
import type { Content, TagInput } from "@/types";

function tagChipClass(type: string, name: string): string {
  if (type === "specialty") return "border border-[#BFDBFE] text-[#1E40AF] bg-transparent";
  if (type === "difficulty") {
    switch (name.toLowerCase()) {
      case "beginner": return "border border-[#A7F3D0] text-[#065F46] bg-transparent";
      case "intermediate": return "border border-[#FDE68A] text-[#92400E] bg-transparent";
      case "advanced": return "border border-[#FECACA] text-[#991B1B] bg-transparent";
    }
  }
  return "border border-[#E2E8F0] text-[#475569] bg-transparent";
}

const chipBase = "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium";

function groupTags(tags: Content["tags"]) {
  return {
    specialty: tags.filter((t) => t.type === "specialty"),
    difficulty: tags.filter((t) => t.type === "difficulty"),
    topic: tags.filter((t) => t.type === "topic"),
    key_term: tags.filter((t) => t.type === "key_term"),
    content_type: tags.filter((t) => t.type === "content_type"),
  };
}

function TagsSection({ tags }: { tags: Content["tags"] }) {
  const [showAllKeyTerms, setShowAllKeyTerms] = useState(false);

  const topics = tags.filter((t) => t.type === "topic");
  const keyTerms = tags.filter((t) => t.type === "key_term");

  const INITIAL_KEY_TERMS = 3;
  const visibleKeyTerms = showAllKeyTerms ? keyTerms : keyTerms.slice(0, INITIAL_KEY_TERMS);
  const hiddenCount = keyTerms.length - INITIAL_KEY_TERMS;

  if (topics.length === 0 && keyTerms.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 pt-6 border-t border-[#E2E8F0]">
      {topics.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground w-20 shrink-0">Topics:</span>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((tag) => (
              <span key={tag.id} className={cn(chipBase, tagChipClass("topic", tag.name))}>
                {tag.name}
              </span>
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

  const [publishing, setPublishing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        setLoading(false);
      })
      .catch(() => {
        setError("Content not found.");
        setLoading(false);
      });
  }, [contentId, backendToken, authLoading]);

  const enterEditMode = () => {
    if (!content) return;
    setEditTitle(content.title);
    setEditDescription(content.description);
    setEditSummary(content.ai_summary ?? "");
    setEditBody(content.body_text);
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
        body_text: editBody,
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

  const statusChipClass =
    content.status === "published"
      ? "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]"
      : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]";

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

        <div className="max-w-3xl mx-auto flex flex-col gap-6">
          {isAdmin && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
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
              <h1 className="text-3xl font-bold text-foreground leading-tight">{content.title}</h1>
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
              <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors text-left">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
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
                <div className="mt-0.5 border-l-4 border-l-primary border border-[#E2E8F0] rounded-lg px-5 py-4 bg-[#F0F7FF]">
                  <p className="text-foreground leading-relaxed">{content.ai_summary}</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : null}

          {editMode ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-foreground">Body Text</p>
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

          {!editMode && (
            <div className="border border-[#E2E8F0] rounded-lg px-5 py-5">
              <p className="text-sm font-semibold text-foreground mb-2">Related Content</p>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          )}

          {!editMode && (
            <div className="border border-[#E2E8F0] rounded-lg px-5 py-5">
              <p className="text-sm font-semibold text-foreground mb-2">Ask AI</p>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
