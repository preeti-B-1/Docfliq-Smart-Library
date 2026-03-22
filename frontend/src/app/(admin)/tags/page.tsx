"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/api-client";
import RoleGuard from "@/components/auth/RoleGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";
import TagManagementTable from "@/components/admin/TagManagementTable";
import { Spinner } from "@/components/ui";
import type { TagWithCount } from "@/types";

function TagManagementContent() {
  const { backendToken } = useAuth();
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (backendToken) {
      apiClient.setToken(backendToken);
    }
  }, [backendToken]);

  const loadTags = useCallback(async () => {
    try {
      const data = await apiClient.getTags();
      setTags(data);
    } catch {
      setError("Failed to load tags.");
    }
  }, []);

  useEffect(() => {
    if (!backendToken) return;
    setLoading(true);
    loadTags().finally(() => setLoading(false));
  }, [backendToken, loadTags]);

  const handleRename = async (id: number, newName: string) => {
    try {
      await apiClient.renameTag(id, newName);
      setTags((prev) => prev.map((t) => (t.id === id ? { ...t, name: newName } : t)));
      toast.success("Tag renamed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rename tag.");
      throw err;
    }
  };

  const handleMerge = async (sourceId: number, targetId: number) => {
    try {
      await apiClient.mergeTags([sourceId], targetId);
      await loadTags();
      toast.success("Tags merged.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to merge tags.");
      throw err;
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.deleteTag(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
      toast.success("Tag deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete tag.");
      throw err;
    }
  };

  const topicTags = tags.filter((t) => t.type === "topic");
  const keyTermTags = tags.filter((t) => t.type === "key_term");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
<p className="text-sm text-muted-foreground mt-0.5">
          Manage freeform topic and key term tags. Specialty and difficulty tags are fixed and cannot be edited.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Topics</h2>
          <p className="text-xs text-muted-foreground">{topicTags.length} {topicTags.length === 1 ? "tag" : "tags"}</p>
        </div>
        <TagManagementTable
          tags={topicTags}
          onRenamed={handleRename}
          onMerged={handleMerge}
          onDeleted={handleDelete}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Key Terms</h2>
          <p className="text-xs text-muted-foreground">{keyTermTags.length} {keyTermTags.length === 1 ? "tag" : "tags"}</p>
        </div>
        <TagManagementTable
          tags={keyTermTags}
          onRenamed={handleRename}
          onMerged={handleMerge}
          onDeleted={handleDelete}
        />
      </section>
    </div>
  );
}

export default function TagsPage() {
  return (
    <RoleGuard requiredRole="admin">
      <DashboardLayout>
        <TagManagementContent />
      </DashboardLayout>
    </RoleGuard>
  );
}
