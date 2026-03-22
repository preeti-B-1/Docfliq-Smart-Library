"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SPECIALTIES, DIFFICULTY_LEVELS } from "@/config/constants";
import { cn } from "@/lib/utils";

interface SidebarFiltersProps {
  selectedSpecialties: string[];
  selectedDifficulties: string[];
  onSpecialtyChange: (specialty: string) => void;
  onDifficultyChange: (difficulty: string) => void;
}

function FilterSection({
  title,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border-b border-border last:border-b-0">
        <CollapsibleTrigger className="flex items-center justify-between w-full py-3 text-sm font-semibold text-foreground hover:text-primary transition-colors">
          {title}
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
    <aside className="bg-card border border-[#DBEAFE] rounded-lg shadow-sm p-4 w-56 flex-shrink-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Filters</p>

      <FilterSection
        title="Specialty"
        isOpen={specialtyOpen}
        onToggle={() => setSpecialtyOpen((v) => !v)}
      >
        <ScrollArea className="h-72 pr-2">
          <div className="space-y-1">
            {SPECIALTIES.map((specialty) => (
              <label
                key={specialty}
                className="flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground cursor-pointer py-0.5 select-none"
              >
                <Checkbox
                  checked={selectedSpecialties.includes(specialty)}
                  onCheckedChange={() => onSpecialtyChange(specialty)}
                  className={cn(
                    "h-3.5 w-3.5",
                    selectedSpecialties.includes(specialty) && "border-primary data-[state=checked]:bg-primary"
                  )}
                />
                {specialty}
              </label>
            ))}
          </div>
        </ScrollArea>
      </FilterSection>

      <FilterSection
        title="Difficulty"
        isOpen={difficultyOpen}
        onToggle={() => setDifficultyOpen((v) => !v)}
      >
        <div className="space-y-1">
          {DIFFICULTY_LEVELS.map((level) => (
            <label
              key={level}
              className="flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground cursor-pointer py-0.5 select-none"
            >
              <Checkbox
                checked={selectedDifficulties.includes(level)}
                onCheckedChange={() => onDifficultyChange(level)}
                className={cn(
                  "h-3.5 w-3.5",
                  selectedDifficulties.includes(level) && "border-primary data-[state=checked]:bg-primary"
                )}
              />
              {level}
            </label>
          ))}
        </div>
      </FilterSection>
    </aside>
  );
}
