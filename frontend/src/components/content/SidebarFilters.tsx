"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SPECIALTIES, DIFFICULTY_LEVELS } from "@/config/constants";
import { cn } from "@/lib/utils";

/* OLD — blue-tinted sidebar
export default function SidebarFilters(...) {
  return (
    <aside className="bg-card border border-[#DBEAFE] rounded-lg shadow-sm p-4 w-56 flex-shrink-0">
      ...blue card sidebar...
    </aside>
  );
}
*/

interface SidebarFiltersProps {
  selectedSpecialties: string[];
  selectedDifficulties: string[];
  onSpecialtyChange: (specialty: string) => void;
  onDifficultyChange: (difficulty: string) => void;
}

function FilterSection({
  title,
  count,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border-b border-zinc-100 last:border-b-0">
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 text-sm font-semibold text-zinc-800 hover:text-violet-700 transition-colors">
          <span className="flex items-center gap-2">
            {title}
            {count !== undefined && count > 0 && (
              <span className="text-xs font-medium text-white bg-violet-600 rounded-full px-1.5 py-0.5 leading-none">
                {count}
              </span>
            )}
          </span>
          {isOpen ? (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pb-3">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function SidebarFilters({
  selectedSpecialties,
  selectedDifficulties,
  onSpecialtyChange,
  onDifficultyChange,
}: SidebarFiltersProps) {
  const [specialtyOpen, setSpecialtyOpen] = useState(true);
  const [difficultyOpen, setDifficultyOpen] = useState(true);

  return (
    <aside className="bg-white border border-zinc-200 rounded-xl p-4 w-56 flex-shrink-0 shadow-card">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Filters</p>

      <FilterSection
        title="Specialty"
        count={selectedSpecialties.length}
        isOpen={specialtyOpen}
        onToggle={() => setSpecialtyOpen((v) => !v)}
      >
        <ScrollArea className="h-72 pr-2">
          <div className="space-y-0.5">
            {SPECIALTIES.map((specialty) => {
              const checked = selectedSpecialties.includes(specialty);
              return (
                <label
                  key={specialty}
                  className={cn(
                    "flex items-center gap-2.5 text-sm cursor-pointer py-1 px-1 rounded-md select-none transition-colors",
                    checked
                      ? "text-violet-700 font-medium"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onSpecialtyChange(specialty)}
                    className={cn(
                      "h-3.5 w-3.5",
                      checked && "border-violet-600 data-[state=checked]:bg-violet-600"
                    )}
                  />
                  {specialty}
                </label>
              );
            })}
          </div>
        </ScrollArea>
      </FilterSection>

      <FilterSection
        title="Difficulty"
        count={selectedDifficulties.length}
        isOpen={difficultyOpen}
        onToggle={() => setDifficultyOpen((v) => !v)}
      >
        <div className="space-y-0.5">
          {DIFFICULTY_LEVELS.map((level) => {
            const checked = selectedDifficulties.includes(level);
            return (
              <label
                key={level}
                className={cn(
                  "flex items-center gap-2.5 text-sm cursor-pointer py-1 px-1 rounded-md select-none transition-colors",
                  checked
                    ? "text-violet-700 font-medium"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onDifficultyChange(level)}
                  className={cn(
                    "h-3.5 w-3.5",
                    checked && "border-violet-600 data-[state=checked]:bg-violet-600"
                  )}
                />
                {level}
              </label>
            );
          })}
        </div>
      </FilterSection>
    </aside>
  );
}
