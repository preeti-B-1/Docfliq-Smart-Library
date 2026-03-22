import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActiveFiltersProps {
  specialties: string[];
  difficulties: string[];
  onRemoveSpecialty: (specialty: string) => void;
  onRemoveDifficulty: (difficulty: string) => void;
  onClearAll: () => void;
}

export default function ActiveFilters({
  specialties,
  difficulties,
  onRemoveSpecialty,
  onRemoveDifficulty,
  onClearAll,
}: ActiveFiltersProps) {
  if (specialties.length === 0 && difficulties.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {specialties.map((s) => (
        <Badge
          key={s}
          className="gap-1 cursor-default bg-[#DBEAFE] text-[#1E40AF] hover:bg-[#DBEAFE] border-[#BFDBFE] rounded-full pl-3 pr-2 py-1 text-xs font-medium"
        >
          {s}
          <button onClick={() => onRemoveSpecialty(s)} aria-label={`Remove ${s}`} className="hover:text-[#1E40AF]/70 ml-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {difficulties.map((d) => (
        <Badge
          key={d}
          className="gap-1 cursor-default bg-[#F1F5F9] text-[#334155] hover:bg-[#F1F5F9] border-[#E2E8F0] rounded-full pl-3 pr-2 py-1 text-xs font-medium"
        >
          {d}
          <button onClick={() => onRemoveDifficulty(d)} aria-label={`Remove ${d}`} className="hover:text-[#334155]/70 ml-0.5">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <button onClick={onClearAll} className="text-xs text-muted-foreground hover:text-foreground underline ml-1">
        Clear all
      </button>
    </div>
  );
}
