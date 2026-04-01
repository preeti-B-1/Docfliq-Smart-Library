"use client";

import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Bold, Heading2, Heading3, ImageIcon, Italic, List, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_CONFIG } from "@/config/constants";

interface RichTextEditorProps {
  onChange: (html: string) => void;
  initialContent?: string;
  disabled?: boolean;
  token?: string | null;
}

export default function RichTextEditor({ onChange, initialContent, disabled, token }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({ inline: false }),
    ],
    content: initialContent ?? "",
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[200px] p-3 focus:outline-none prose prose-slate max-w-none prose-p:my-1 prose-headings:my-2 text-sm",
      },
    },
  });

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    e.target.value = "";

    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/api/images/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail ?? "Upload failed");
      }

      const { url } = await res.json();
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      const { toast } = await import("sonner");
      toast.error(err instanceof Error ? err.message : "Image upload failed.");
    }
  };

  const ToolbarButton = ({
    onClick,
    active,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        active && "bg-accent text-foreground"
      )}
    >
      {children}
    </button>
  );

  return (
    <div
      className={cn(
        "border border-input rounded-md overflow-hidden",
        disabled && "opacity-60 pointer-events-none"
      )}
    >
      <div className="border-b border-input bg-muted/30 px-1 py-1 flex items-center gap-0.5">
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive("bold")}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive("italic")}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-0.5" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive("heading", { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor?.isActive("heading", { level: 3 })}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-0.5" />

        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive("bulletList")}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive("orderedList")}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        {token && (
          <>
            <div className="w-px h-4 bg-border mx-0.5" />
            <ToolbarButton onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="h-4 w-4" />
            </ToolbarButton>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={handleImageFileChange}
      />

      <EditorContent editor={editor} />
    </div>
  );
}
