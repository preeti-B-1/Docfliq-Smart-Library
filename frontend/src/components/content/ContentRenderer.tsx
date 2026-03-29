"use client";

interface ContentRendererProps {
  html: string;
}

export default function ContentRenderer({ html }: ContentRendererProps) {
  const isFullDocument =
    html.trimStart().startsWith("<!DOCTYPE") ||
    html.trimStart().startsWith("<html");

  if (isFullDocument) {
    return (
      <iframe
        srcDoc={html}
        className="w-full border-0"
        style={{ height: "80vh" }}
        sandbox="allow-scripts allow-same-origin"
        title="Article content"
      />
    );
  }

  return (
    <div
      className="prose prose-slate max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground prose-p:font-body prose-strong:text-foreground prose-li:text-foreground prose-table:text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
