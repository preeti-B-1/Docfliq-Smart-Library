"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/useAuth";

type Phase = "idle" | "uploading" | "polling" | "done";

const MAX_POLLS = 30;
const POLL_INTERVAL_MS = 2000;

export default function WriteArticleForm() {
  const { backendToken } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [draftId, setDraftId] = useState<number | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollCountRef = useRef(0);

  const pollStatus = (contentId: number, token: string) => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) { toast.error("Title is required."); return; }
    if (!htmlContent.replace(/<[^>]*>/g, "").trim()) { toast.error("Content is required."); return; }
    if (!backendToken) { toast.error("Not authenticated."); return; }

    const formData = new FormData();
    formData.append("title", title.trim());
    if (description.trim()) formData.append("description", description.trim());
    formData.append("html_content", htmlContent);

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
      <div className="bg-card rounded-lg border border-[#DBEAFE] p-8 text-center">
        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Saved as draft</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Review the AI-generated tags before publishing.
        </p>
        <Button onClick={() => router.push("/drafts")}>Go to Drafts</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="write-title" className="text-sm font-medium text-foreground">Title</label>
        <Input
          id="write-title"
          placeholder="Enter article title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="write-description" className="text-sm font-medium text-foreground">
          Subtitle <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          id="write-description"
          placeholder="One-line summary or subtitle"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
          rows={2}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Content</label>
        <RichTextEditor onChange={setHtmlContent} disabled={isSubmitting} token={backendToken} />
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" loading={isSubmitting}>
          {phase === "uploading" ? "Saving..." : phase === "polling" ? "Processing..." : "Save as Draft"}
        </Button>
        {phase === "polling" && (
          <p className="text-sm text-muted-foreground">This may take a few minutes...</p>
        )}
      </div>
    </form>
  );
}
