import React from "react";
import { useTicker } from "./TickerProvider";
import { cn } from "@/lib/utils";

function dotClass(sev: "critical" | "warning" | "info" | undefined) {
  if (sev === "critical") return "bg-red-600";
  if (sev === "warning") return "bg-amber-500";
  return "bg-[#214A33]";
}

// Normalise le texte: supprime les retours à la ligne et compacte les espaces
function normalizeText(text: string): string {
  return text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function linkify(text: string): React.ReactNode[] {
  const clean = normalizeText(text);
  const parts: React.ReactNode[] = [];
  const regex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/g;
  let lastIndex = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(clean)) !== null) {
    if (m.index > lastIndex) parts.push(clean.slice(lastIndex, m.index));
    const url = m[0];
    const href = url.startsWith("http") ? url : `https://${url}`;
    parts.push(
      <a
        key={`lnk-${i++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="whitespace-nowrap underline decoration-[#214A33]/40 underline-offset-2 text-[#214A33] hover:text-[#214A33]/80"
      >
        {url}
      </a>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < clean.length) parts.push(clean.slice(lastIndex));
  return parts;
}

const TickerBar: React.FC = () => {
  const { items, loading } = useTicker();

  const prefersReduced = React.useMemo(() => {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  }, []);

  if (!loading && items.length === 0) return null;

  const base = items.length === 0 ? [{ id: "placeholder", short: "Chargement des infos…" } as any] : items;

  const renderShort = (txt?: string) => linkify(String(txt ?? ""));

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-[#BFBFBF] bg-white">
      <div className="relative overflow-hidden">
        <div
          className={cn(
            "flex w-[200%] py-2 text-sm text-[#214A33] translate-x-0 whitespace-nowrap",
            !prefersReduced && "animate-[ticker_30s_linear_infinite] hover:[animation-play-state:paused]"
          )}
        >
          <div className="flex w-1/2 shrink-0 items-center gap-10 whitespace-nowrap">
            {base.map((it) => (
              <span key={`${(it as any).id}-A`} className="inline-flex items-center whitespace-nowrap">
                <span className={cn("mr-2 inline-block h-2 w-2 rounded-full", dotClass((it as any)?.severity))} />
                <span className="whitespace-nowrap font-medium">{renderShort((it as any)?.short)}</span>
              </span>
            ))}
          </div>
          <div className="flex w-1/2 shrink-0 items-center gap-10 whitespace-nowrap" aria-hidden="true">
            {base.map((it) => (
              <span key={`${(it as any).id}-B`} className="inline-flex items-center whitespace-nowrap">
                <span className={cn("mr-2 inline-block h-2 w-2 rounded-full", dotClass((it as any)?.severity))} />
                <span className="whitespace-nowrap font-medium">{renderShort((it as any)?.short)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <style>
        {`
        @keyframes ticker {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        `}
      </style>
    </div>
  );
};

export default TickerBar;