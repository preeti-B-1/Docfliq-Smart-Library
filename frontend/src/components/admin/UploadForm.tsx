"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { formatFileSize, isValidFileType } from "@/lib/utils";
import { UPLOAD_CONFIG } from "@/config/constants";

type UploadPhase = "idle" | "uploading" | "polling" | "done";

const MAX_POLLS = 30;
const POLL_INTERVAL_MS = 2000;

export default function UploadForm() {
  const { backendToken } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [draftId, setDraftId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  const validateFile = useCallback((f: File): string | null => {
    if (!isValidFileType(f)) return "Only .pdf and .docx files are accepted.";
    if (f.size > UPLOAD_CONFIG.maxFileSizeBytes) return "File exceeds the 25MB limit.";
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (f: File) => {
      const error = validateFile(f);
      if (error) {
        setFileError(error);
        setFile(null);
      } else {
        setFileError(null);
        setFile(f);
      }
    },
    [validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFileSelect(dropped);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setFile(null);
    setHtmlContent("");
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const pollStatus = useCallback(
    (contentId: number, token: string) => {
      const poll = async () => {
        if (pollCountRef.current >= MAX_POLLS) {
          setPhase("done");
          toast("Still processing — check Drafts in a moment.");
          return;
        }

        pollCountRef.current += 1;

        try {
          apiClient.setToken(token);
          const statusRes = await apiClient.getContentStatus(contentId);

          if (statusRes.processing_status === "completed") {
            setPhase("done");
            toast.success("Content processed. Review it in Drafts.");
          } else if (statusRes.processing_status === "failed") {
            setPhase("done");
            toast.error("AI processing failed. You can edit the draft manually.");
          } else {
            pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
          }
        } catch {
          setPhase("done");
          toast.error("Could not check processing status.");
        }
      };

      pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) { toast.error("Title is required."); return; }
    if (activeTab === "file" && !file) { toast.error("Please select a file."); return; }
    if (activeTab === "text" && !htmlContent.replace(/<[^>]*>/g, "").trim()) { toast.error("Text content is required."); return; }
    if (!backendToken) { toast.error("Not authenticated."); return; }

    const formData = new FormData();
    formData.append("title", title.trim());
    if (description.trim()) formData.append("description", description.trim());

    if (activeTab === "file" && file) {
      formData.append("file", file);
    } else {
      formData.append("html_content", htmlContent);
    }

    setPhase("uploading");

    try {
      apiClient.setToken(backendToken);
      const result = await apiClient.uploadContent(formData);
      setDraftId(result.id);

      if (result.processing_status === "completed") {
        setPhase("done");
        toast.success("Content processed. Review it in Drafts.");
      } else if (result.processing_status === "failed") {
        setPhase("done");
        toast.error("AI processing failed. You can edit the draft manually.");
      } else {
        setPhase("polling");
        pollCountRef.current = 0;
        pollStatus(result.id, backendToken);
      }
    } catch (err) {
      setPhase("idle");
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  const isSubmitting = phase === "uploading" || phase === "polling";

  if (phase === "done" && draftId !== null) {
    return (
      <div className="max-w-2xl bg-card rounded-lg border border-[#DBEAFE] p-8 text-center">
        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Upload complete</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your content has been saved as a draft. Review the AI-generated tags before publishing.
        </p>
        <Button onClick={() => router.push("/drafts")}>Go to Drafts</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm font-medium text-foreground">Title</label>
        <Input
          id="title"
          placeholder="Enter article title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm font-medium text-foreground">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
        <Textarea
          id="description"
          placeholder="Brief description of the content"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="file">Upload File</TabsTrigger>
          <TabsTrigger value="text">Paste Text</TabsTrigger>
        </TabsList>

        <TabsContent value="file">
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !isSubmitting && fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                isSubmitting ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                isDragOver ? "border-primary bg-accent" : "border-border hover:border-primary",
                fileError && "border-destructive"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={handleFileInputChange}
                disabled={isSubmitting}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              ) : (
                <>
                  <svg className="mx-auto w-8 h-8 text-muted-foreground mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-muted-foreground">
                    Drop a file here or{" "}
                    <span className="text-primary font-medium">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PDF or DOCX, max 25MB</p>
                </>
              )}
            </div>
            {fileError && <p className="text-xs text-destructive mt-1">{fileError}</p>}
          </div>
        </TabsContent>

        <TabsContent value="text">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Article Content</label>
            <RichTextEditor onChange={setHtmlContent} disabled={isSubmitting} />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-4">
        <Button type="submit" loading={isSubmitting} disabled={!!fileError}>
          {phase === "uploading" ? "Uploading..." : phase === "polling" ? "Processing..." : "Upload"}
        </Button>
        {phase === "polling" && (
          <p className="text-sm text-muted-foreground">This may take a few minutes...</p>
        )}
      </div>
    </form>
  );
}
