"use client";

import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  multichoice: "Multiple Choice",
  truefalse: "True/False",
  shortanswer: "Short Answer",
  matching: "Matching",
  numerical: "Numerical",
  essay: "Essay",
};

interface QuestionBankItemProps {
  id: number;
  name: string;
  type: string;
  isInQuiz: boolean;
  onAdd: (id: number) => void;
}

export function QuestionBankItem({ id, name, type, isInQuiz, onAdd }: QuestionBankItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `bank-${id}`,
    data: { questionId: id, name, type },
    disabled: isInQuiz,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 rounded-lg border p-2.5 transition-colors",
        isInQuiz
          ? "bg-muted/50 border-dashed opacity-60"
          : "bg-card hover:border-primary/50 hover:shadow-sm",
        isDragging && "opacity-50"
      )}
    >
      {!isInQuiz && (
        <button
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      {isInQuiz && (
        <Check className="h-4 w-4 text-green-500 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
      </div>
      <Badge variant="outline" className="shrink-0 text-xs">
        {typeLabels[type] || type}
      </Badge>
      {!isInQuiz && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
          onClick={() => onAdd(id)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
