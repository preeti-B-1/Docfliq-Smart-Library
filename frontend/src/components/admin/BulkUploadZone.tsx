"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { cn, formatFileSize, isValidFileType } from "@/lib/utils";
import { UPLOAD_CONFIG } from "@/config/constants";
import type { ProcessingStatus } from "@/types";

const MAX_FILES = UPLOAD_CONFIG.maxBulkFiles;

type BulkStatus = "queued" | "processing" | "completed" | "failed" | "invalid";

interface BulkEntry {
  file: File;
  contentId?: number;
  status: BulkStatus;
  errorMsg?: string;
}

const STATUS_LABEL: Record<BulkStatus, string> = {
  queued: "Ready",
  processing: "Processing",
  completed: "Done",
  failed: "Failed",
  invalid: "Invalid",
};

const STATUS_CLASS: Record<BulkStatus, string> = {
  queued: "bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]",
  processing: "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE] animate-pulse",
  completed: "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]",
  failed: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]",
  invalid: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]",
};

export default function BulkUploadZone() {
  const { backendToken } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<BulkEntry[]>([]);
  const [phase, setPhase] = useState<"staging" | "uploading" | "polling" | "done">("staging");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const entriesRef = useRef<BulkEntry[]>([]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    setEntries((prev) => {
      const combined = [...prev];
      for (const f of files) {
        if (combined.length >= MAX_FILES) break;
        if (combined.some((e) => e.file.name === f.name && e.file.size === f.size)) continue;
        let errorMsg: string | undefined;
        if (!isValidFileType(f)) errorMsg = "Only .pdf and .docx files are accepted.";
        else if (f.size > UPLOAD_CONFIG.maxFileSizeBytes) errorMsg = "Exceeds the 25MB limit.";
        combined.push({ file: f, status: errorMsg ? "invalid" : "queued", errorMsg });
      }
      return combined;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const startPolling = useCallback(() => {
    intervalRef.current = setInterval(async () => {
      const current = entriesRef.current;
      const processing = current.filter((e) => e.status === "processing" && e.contentId);

      if (processing.length === 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPhase("done");
        return;
      }

      const updates: Record<number, ProcessingStatus> = {};
      await Promise.all(
        processing.map(async (entry) => {
          if (!entry.contentId) return;
          try {
            const res = await apiClient.getContentStatus(entry.contentId);
            if (res.processing_status === "completed" || res.processing_status === "failed") {
              updates[entry.contentId] = res.processing_status;
            }
          } catch {
            // ignore transient poll errors
          }
        })
      );

      if (Object.keys(updates).length > 0) {
        setEntries((prev) => {
          const updated = prev.map((e) =>
            e.contentId && updates[e.contentId]
              ? { ...e, status: updates[e.contentId] as BulkStatus }
              : e
          );
          entriesRef.current = updated;
          return updated;
        });
      }

      const stillProcessing = entriesRef.current.filter((e) => e.status === "processing");
      if (stillProcessing.length === 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPhase("done");
      }
    }, 2000);
  }, []);

  const handleUpload = async () => {
    if (!backendToken) { toast.error("Not authenticated."); return; }
    const validFiles = entries.filter((e) => e.status === "queued");
    if (validFiles.length === 0) { toast.error("No valid files selected."); return; }

    setPhase("uploading");
    apiClient.setToken(backendToken);

    try {
      const results = await apiClient.bulkUpload(validFiles.map((e) => e.file));

      let resultIdx = 0;
      const updated = entries.map((entry) => {
        if (entry.status !== "queued") return entry;
        const result = results[resultIdx++];
        if (!result) return entry;
        const newStatus: BulkStatus =
          result.processing_status === "completed" ? "completed" :
          result.processing_status === "failed" ? "failed" : "processing";
        return { ...entry, contentId: result.id, status: newStatus };
      });

      setEntries(updated);
      entriesRef.current = updated;

      if (updated.some((e) => e.status === "processing")) {
        setPhase("polling");
        startPolling();
      } else {
        setPhase("done");
      }
    } catch (err) {
      setPhase("staging");
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  const queuedCount = entries.filter((e) => e.status === "queued").length;
  const submittedCount = entries.filter((e) => e.contentId !== undefined).length;
  const processedCount = entries.filter(
    (e) => e.status === "completed" || e.status === "failed"
  ).length;
  const progress = submittedCount > 0 ? Math.round((processedCount / submittedCount) * 100) : 0;
  const isActive = phase === "uploading" || phase === "polling";
  const showDropZone = phase !== "done" && entries.length < MAX_FILES;

  return (
    <div className="flex flex-col gap-4">
      {showDropZone && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isActive && fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            isActive ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            isDragOver ? "border-primary bg-accent" : "border-border hover:border-primary"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
            disabled={isActive}
          />
          <svg className="mx-auto w-8 h-8 text-muted-foreground mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm text-muted-foreground">
            Drop files here or <span className="text-primary font-medium">browse</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF or DOCX, max 25MB each —{" "}
            {MAX_FILES - entries.length} of {MAX_FILES} slots remaining
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <div
              key={`${entry.file.name}-${index}`}
              className="flex items-center gap-3 p-3 border border-[#E2E8F0] rounded-lg bg-white"
            >
              <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{entry.file.name}</p>
                {entry.errorMsg ? (
                  <p className="text-xs text-destructive">{entry.errorMsg}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{formatFileSize(entry.file.size)}</p>
                )}
              </div>
              <span className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0",
                STATUS_CLASS[entry.status]
              )}>
                {STATUS_LABEL[entry.status]}
              </span>
              {phase === "staging" && (
                <button
                  onClick={() => removeEntry(index)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  aria-label="Remove file"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {(isActive || phase === "done") && submittedCount > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {processedCount} of {submittedCount} file{submittedCount !== 1 ? "s" : ""} processed
            </span>
            <span className="font-medium text-muted-foreground">
              {phase === "done" ? 100 : progress}%
            </span>
          </div>
          <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${phase === "done" ? 100 : progress}%` }}
            />
          </div>
        </div>
      )}

      {phase === "staging" && queuedCount > 0 && (
        <div className="flex items-center gap-3">
          <Button onClick={handleUpload}>
            Upload {queuedCount} file{queuedCount !== 1 ? "s" : ""}
          </Button>
          {entries.length >= MAX_FILES && (
            <p className="text-xs text-muted-foreground">Maximum {MAX_FILES} files reached.</p>
          )}
        </div>
      )}

      {phase === "uploading" && (
        <Button loading disabled>Uploading...</Button>
      )}

      {phase === "done" && (
        <div className="flex items-center gap-3">
          <Button onClick={() => router.push("/drafts")}>Go to Drafts</Button>
          <Button variant="outline" onClick={() => { setEntries([]); setPhase("staging"); }}>
            Upload more
          </Button>
        </div>
      )}
    </div>
  );
}
