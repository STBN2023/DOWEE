"use client";

import React from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  title?: string;
  botHint?: string;
  // Optionnel: question explicite à envoyer au bot
  ask?: string;
  children?: React.ReactNode;
};

export default function HelpInfo({ title, botHint, ask, children }: Props) {
  const sendToBot = (msg?: string) => {
    const fallback =
      (title && `Peux-tu expliquer: ${title} ?`) ||
      "Peux-tu m’expliquer ce point ?";
    const message = (msg || ask || "").trim() || fallback;
    try {
      window.dispatchEvent(
        new CustomEvent("dowee:bot:ask", { detail: { message } })
      );
    } catch {
      // no-op
    }
  };

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Aide"
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[#214A33]/60 hover:text-[#214A33] hover:bg-[#214A33]/5 focus:outline-none focus:ring-2 focus:ring-[#214A33]/30"
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
        <div className="mt-2">
          <button
            type="button"
            onClick={() => sendToBot(ask)}
            className="text-[11px] underline text-[#214A33] hover:text-[#214A33]/80"
          >
            Demander au bot
          </button>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}