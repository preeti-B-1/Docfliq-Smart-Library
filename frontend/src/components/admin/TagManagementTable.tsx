"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TagWithCount } from "@/types";

interface TagManagementTableProps {
  tags: TagWithCount[];
  onRenamed: (id: number, newName: string) => Promise<void>;
  onMerged: (sourceId: number, targetId: number) => Promise<void>;
  onDeleted: (id: number) => Promise<void>;
}

export default function TagManagementTable({ tags, onRenamed, onMerged, onDeleted }: TagManagementTableProps) {
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  const [mergingTag, setMergingTag] = useState<TagWithCount | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [mergeLoading, setMergeLoading] = useState(false);

  const [deletingTag, setDeletingTag] = useState<TagWithCount | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const startRename = (tag: TagWithCount) => {
    setRenamingId(tag.id);
    setRenameValue(tag.name);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue("");
  };

  const saveRename = async (id: number) => {
    if (!renameValue.trim()) return;
    setRenameLoading(true);
    try {
      await onRenamed(id, renameValue.trim());
      setRenamingId(null);
    } finally {
      setRenameLoading(false);
    }
  };

  const startMerge = (tag: TagWithCount) => {
    setMergingTag(tag);
    setMergeTargetId("");
  };

  const confirmMerge = async () => {
    if (!mergingTag || !mergeTargetId) return;
    setMergeLoading(true);
    try {
      await onMerged(mergingTag.id, Number(mergeTargetId));
      setMergingTag(null);
    } finally {
      setMergeLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingTag) return;
    setDeleteLoading(true);
    try {
      await onDeleted(deletingTag.id);
      setDeletingTag(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (tags.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No tags found.
      </div>
    );
  }

  const mergeTargets = tags.filter((t) => t.id !== mergingTag?.id);

  return (
    <>
      <Dialog open={!!mergingTag} onOpenChange={(open) => !open && setMergingTag(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Merge tag</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Merging <span className="font-medium text-foreground">{mergingTag?.name}</span> will re-tag{" "}
            {mergingTag?.content_count}{" "}
            {mergingTag?.content_count === 1 ? "article" : "articles"} and remove this tag.
          </p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Merge into</label>
            <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select target tag..." />
              </SelectTrigger>
              <SelectContent>
                {mergeTargets.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.name} ({t.content_count} {t.content_count === 1 ? "article" : "articles"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergingTag(null)} disabled={mergeLoading}>
              Cancel
            </Button>
            <Button onClick={confirmMerge} loading={mergeLoading} disabled={!mergeTargetId}>
              Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingTag} onOpenChange={(open) => !open && setDeletingTag(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete tag?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{deletingTag?.name}</span> will be removed from{" "}
            {deletingTag?.content_count}{" "}
            {deletingTag?.content_count === 1 ? "article" : "articles"}. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTag(null)} disabled={deleteLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} loading={deleteLoading}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted border-b border-border">
              <th className="text-left px-4 py-3 font-medium text-foreground">Tag name</th>
              <th className="text-left px-4 py-3 font-medium text-foreground w-28">Articles</th>
              <th className="text-right px-4 py-3 font-medium text-foreground w-52">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {tags.map((tag) => (
              <tr key={tag.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  {renamingId === tag.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(tag.id);
                          if (e.key === "Escape") cancelRename();
                        }}
                        className="w-48 h-8 text-sm"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => saveRename(tag.id)} loading={renameLoading}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelRename} disabled={renameLoading}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <span className="text-foreground">{tag.name}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{tag.content_count}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startRename(tag)}
                      disabled={renamingId !== null}
                    >
                      Rename
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startMerge(tag)}
                      disabled={renamingId !== null || tags.length < 2}
                    >
                      Merge
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeletingTag(tag)}
                      disabled={renamingId !== null}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
