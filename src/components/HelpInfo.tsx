"use client";

import React from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  title?: string;
  botHint?: string;
  children?: React.ReactNode;
};

export default function HelpInfo({ title, botHint, children }: Props) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Aide"
          className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#BFBFBF] bg-white text-[#214A33] hover:bg-[#F7F7F7] focus:outline-none focus:ring-2 focus:ring-[#214A33]/40"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>

      <TooltipContent side="top" align="start" className="max-w-sm">
        {title && <div className="mb-1 text-sm font-medium">{title}</div>}
        {children && <div className="text-xs leading-relaxed">{children}</div>}
        {botHint && (
          <div className="mt-2 text-[11px] text-muted-foreground">{botHint}</div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}