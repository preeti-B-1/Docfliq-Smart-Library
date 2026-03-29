"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import DocumentUploadZone from "@/components/admin/DocumentUploadZone";
import WriteArticleForm from "@/components/admin/WriteArticleForm";

type Path = "upload" | "write";

interface PathCardProps {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
}

function PathCard({ selected, onClick, title, description, icon }: PathCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-start gap-3 p-5 rounded-lg border-2 text-left transition-colors",
        selected
          ? "border-primary bg-accent"
          : "border-border hover:border-primary/50 bg-card"
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-md flex items-center justify-center",
        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        {icon}
      </div>
      <div>
        <p className={cn("text-sm font-semibold", selected ? "text-primary" : "text-foreground")}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}

export default function UploadForm() {
  const [activePath, setActivePath] = useState<Path>("upload");

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div className="flex gap-3">
        <PathCard
          selected={activePath === "upload"}
          onClick={() => setActivePath("upload")}
          title="Upload Documents"
          description="PDF or DOCX files — AI extracts title, tags, and summary"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          }
        />
        <PathCard
          selected={activePath === "write"}
          onClick={() => setActivePath("write")}
          title="Write Article"
          description="Compose original content with the rich text editor"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
        />
      </div>

      <div>
        {activePath === "upload" ? <DocumentUploadZone /> : <WriteArticleForm />}
      </div>
    </div>
  );
}
