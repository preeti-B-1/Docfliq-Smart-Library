"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import RoleGuard from "@/components/auth/RoleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProcessingStatus from "@/components/admin/ProcessingStatus";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ContentDraft } from "@/types";

/* OLD — blue draft chip colors
function tagChipClass(type: string, name: string): string {
  if (type === "specialty") return "bg-[#DBEAFE] text-[#1E40AF]";
  if (type === "difficulty") { ... }
  return "bg-[#F1F5F9] text-[#334155]";
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

const chipBase = "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium";

function DraftCard({
  draft,
  onPublish,
  onDelete,
  actionLoading,
}: {
  draft: ContentDraft;
  onPublish: (id: number) => void;
  onDelete: (id: number) => void;
  actionLoading: number | null;
}) {
  const specialtyTags = draft.tags.filter((t) => t.type === "specialty");
  const difficultyTag = draft.tags.find((t) => t.type === "difficulty");
  const topicTags = draft.tags.filter((t) => t.type === "topic");

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col gap-3 shadow-card hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <Link
            href={`/article/${draft.id}`}
            className="text-base font-semibold text-foreground hover:text-primary line-clamp-2"
          >
            {draft.title}
          </Link>
          <p className="text-xs text-muted-foreground">Created {formatDate(draft.created_at)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ProcessingStatus status={draft.processing_status} />
        </div>
      </div>

      {draft.ai_summary && (
        <p className="text-sm text-muted-foreground line-clamp-3">{draft.ai_summary}</p>
      )}

      {draft.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {specialtyTags.map((t) => (
            <span key={t.id} className={`${chipBase} ${tagChipClass("specialty", t.name)}`}>
              {t.name}
            </span>
          ))}
          {difficultyTag && (
            <span className={`${chipBase} ${tagChipClass("difficulty", difficultyTag.name)}`}>
              {difficultyTag.name}
            </span>
          )}
          {topicTags.slice(0, 3).map((t) => (
            <span key={t.id} className={`${chipBase} ${tagChipClass("topic", t.name)}`}>
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Link href={`/article/${draft.id}`}>
          <Button variant="outline" size="sm">Review</Button>
        </Link>
        <Button
          size="sm"
          onClick={() => onPublish(draft.id)}
          loading={actionLoading === draft.id}
          disabled={draft.processing_status !== "completed" || actionLoading !== null}
        >
          Publish
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(draft.id)}
          disabled={actionLoading !== null}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

function DraftsContent() {
  const { backendToken } = useAuth();
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  useEffect(() => {
    if (backendToken) {
      apiClient.setToken(backendToken);
    }
  }, [backendToken]);

  useEffect(() => {
    if (!backendToken) return;

    apiClient
      .getDrafts()
      .then((data) => {
        setDrafts(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load drafts.");
        setLoading(false);
      });
  }, [backendToken]);

  const handlePublish = async (id: number) => {
    setActionLoading(id);
    try {
      await apiClient.publishContent(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError("Failed to publish.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget === null) return;
    setActionLoading(deleteTarget);
    setDeleteTarget(null);
    try {
      await apiClient.deleteContent(deleteTarget);
      setDrafts((prev) => prev.filter((d) => d.id !== deleteTarget));
    } catch {
      setError("Failed to delete.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete draft?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the draft and all its data. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={actionLoading !== null}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} loading={actionLoading !== null}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 font-display">Drafts</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {drafts.length} {drafts.length === 1 ? "draft" : "drafts"} waiting for review
          </p>
        </div>
        <Link href="/upload">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white">Upload new</Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-zinc-50 border border-zinc-200 rounded-xl gap-3">
          <p className="text-muted-foreground">No drafts. Upload content to get started.</p>
          <Link href="/upload">
            <Button variant="outline">Upload content</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onPublish={handlePublish}
              onDelete={(id) => setDeleteTarget(id)}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DraftsPage() {
  return (
    <RoleGuard requiredRole="admin">
      <DashboardLayout>
        <DraftsContent />
      </DashboardLayout>
    </RoleGuard>
  );
}
