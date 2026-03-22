"use client";

interface ContentRendererProps {
  html: string;
}

export default function ContentRenderer({ html }: ContentRendererProps) {
  return (
    <div
      className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground prose-p:font-body prose-strong:text-foreground prose-li:text-foreground prose-table:text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
