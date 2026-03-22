"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPECIALTIES, DIFFICULTY_LEVELS } from "@/config/constants";
import type { TagInput } from "@/types";

interface TagEditorProps {
  tags: TagInput[];
  onChange: (tags: TagInput[]) => void;
}

const TAG_TYPES = ["specialty", "difficulty", "topic", "key_term", "content_type"] as const;
type TagType = (typeof TAG_TYPES)[number];

const TYPE_LABELS: Record<TagType, string> = {
  specialty: "Specialty",
  difficulty: "Difficulty",
  topic: "Topic",
  key_term: "Key Term",
  content_type: "Content Type",
};

function tagChipClass(type: string, name: string): string {
  if (type === "specialty") return "bg-[#DBEAFE] text-[#1E40AF]";
  if (type === "difficulty") {
    switch (name.toLowerCase()) {
      case "beginner": return "bg-[#D1FAE5] text-[#065F46]";
      case "intermediate": return "bg-[#FEF3C7] text-[#92400E]";
      case "advanced": return "bg-[#FEE2E2] text-[#991B1B]";
    }
  }
  return "bg-[#F1F5F9] text-[#334155]";
}

const chipBase = "inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium pr-1";

export default function TagEditor({ tags, onChange }: TagEditorProps) {
  const [newTopicInput, setNewTopicInput] = useState("");
  const [newKeyTermInput, setNewKeyTermInput] = useState("");
  const [newContentTypeInput, setNewContentTypeInput] = useState("");

  const byType = (type: TagType) => tags.filter((t) => t.type === type);

  const removeTag = (type: string, name: string) => {
    onChange(tags.filter((t) => !(t.type === type && t.name === name)));
  };

  const addTag = (type: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const already = tags.some((t) => t.type === type && t.name.toLowerCase() === trimmed.toLowerCase());
    if (!already) {
      onChange([...tags, { name: trimmed, type }]);
    }
  };

  const handleFreeformAdd = (type: string, value: string, clear: () => void) => {
    addTag(type, value);
    clear();
  };

  const usedSpecialties = byType("specialty").map((t) => t.name);
  const availableSpecialties = SPECIALTIES.filter((s) => !usedSpecialties.includes(s));

  const usedDifficulty = byType("difficulty")[0]?.name ?? "";

  return (
    <div className="flex flex-col gap-4">
      {TAG_TYPES.map((type) => {
        const typeTags = byType(type);
        return (
          <div key={type}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              {TYPE_LABELS[type]}
            </p>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {typeTags.map((tag) => (
                <span key={tag.name} className={cn(chipBase, tagChipClass(type, tag.name))}>
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => removeTag(type, tag.name)}
                    className="ml-0.5 rounded-full hover:bg-black/10 p-0.5"
                    aria-label={`Remove ${tag.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {typeTags.length === 0 && (
                <span className="text-xs text-muted-foreground italic">None</span>
              )}
            </div>

            {type === "specialty" && availableSpecialties.length > 0 && (
              <Select onValueChange={(value) => addTag("specialty", value)}>
                <SelectTrigger className="max-w-[220px] h-9 text-sm">
                  <SelectValue placeholder="Add specialty..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSpecialties.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {type === "difficulty" && usedDifficulty === "" && (
              <Select onValueChange={(value) => addTag("difficulty", value)}>
                <SelectTrigger className="max-w-[200px] h-9 text-sm">
                  <SelectValue placeholder="Set difficulty..." />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {type === "topic" && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add topic..."
                  value={newTopicInput}
                  onChange={(e) => setNewTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFreeformAdd("topic", newTopicInput, () => setNewTopicInput(""));
                    }
                  }}
                  className="max-w-[220px] h-9 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFreeformAdd("topic", newTopicInput, () => setNewTopicInput(""))}
                >
                  Add
                </Button>
              </div>
            )}

            {type === "key_term" && (
              <div className="flex gap-2">
                <Input
                  placeholder="Add key term..."
                  value={newKeyTermInput}
                  onChange={(e) => setNewKeyTermInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFreeformAdd("key_term", newKeyTermInput, () => setNewKeyTermInput(""));
                    }
                  }}
                  className="max-w-[220px] h-9 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFreeformAdd("key_term", newKeyTermInput, () => setNewKeyTermInput(""))}
                >
                  Add
                </Button>
              </div>
            )}

            {type === "content_type" && (
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Article, Case Study..."
                  value={newContentTypeInput}
                  onChange={(e) => setNewContentTypeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleFreeformAdd("content_type", newContentTypeInput, () => setNewContentTypeInput(""));
                    }
                  }}
                  className="max-w-[220px] h-9 text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFreeformAdd("content_type", newContentTypeInput, () => setNewContentTypeInput(""))}
                >
                  Add
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
