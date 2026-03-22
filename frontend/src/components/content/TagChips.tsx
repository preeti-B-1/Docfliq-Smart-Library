import { cn } from "@/lib/utils";

interface TagChipsProps {
  specialtyTags: string[];
  topicTags: string[];
  difficultyTag: string | null;
}

function difficultyClass(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "beginner": return "bg-[#D1FAE5] text-[#065F46]";
    case "intermediate": return "bg-[#FEF3C7] text-[#92400E]";
    case "advanced": return "bg-[#FEE2E2] text-[#991B1B]";
    default: return "bg-[#F1F5F9] text-[#334155]";
  }
}

const chipBase = "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border-0";

export default function TagChips({ specialtyTags, topicTags, difficultyTag }: TagChipsProps) {
  const chips: { label: string; className: string }[] = [];

  specialtyTags.slice(0, 2).forEach((tag) => {
    chips.push({ label: tag, className: cn(chipBase, "bg-[#DBEAFE] text-[#1E40AF]") });
  });

  if (difficultyTag) {
    chips.push({ label: difficultyTag, className: cn(chipBase, difficultyClass(difficultyTag)) });
  }

  const remaining = 4 - chips.length;
  topicTags.slice(0, remaining).forEach((tag) => {
    chips.push({ label: tag, className: cn(chipBase, "bg-[#F1F5F9] text-[#334155]") });
  });

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip, i) => (
        <span key={i} className={chip.className}>
          {chip.label}
        </span>
      ))}
    </div>
  );
}
