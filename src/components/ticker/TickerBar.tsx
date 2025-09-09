import React from "react";
import { useTicker } from "./TickerProvider";
import { cn } from "@/lib/utils";

function dotClass(sev: "critical" | "warning" | "info" | undefined) {
  if (sev === "critical") return "bg-red-600";
  if (sev === "warning") return "bg-amber-500";
  return "bg-[#214A33]";
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

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-[#BFBFBF] bg-white">
      <div className="relative overflow-hidden">
        <div
          className={cn(
            "flex w-[200%] py-2 text-sm text-[#214A33] translate-x-0",
            !prefersReduced && "animate-[ticker_30s_linear_infinite] hover:[animation-play-state:paused]"
          )}
        >
          <div className="flex w-1/2 shrink-0 items-center gap-10">
            {base.map((it) => (
              <span key={`${it.id}-A`} className="inline-flex items-center">
                <span className={cn("mr-2 inline-block h-2 w-2 rounded-full", dotClass((it as any)?.severity))} />
                <span className="font-medium">{(it as any)?.short}</span>
              </span>
            ))}
          </div>
          <div className="flex w-1/2 shrink-0 items-center gap-10" aria-hidden="true">
            {base.map((it) => (
              <span key={`${it.id}-B`} className="inline-flex items-center">
                <span className={cn("mr-2 inline-block h-2 w-2 rounded-full", dotClass((it as any)?.severity))} />
                <span className="font-medium">{(it as any)?.short}</span>
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