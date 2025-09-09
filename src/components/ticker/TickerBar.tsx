import React from "react";
import { useTicker } from "./TickerProvider";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

function dotClass(sev: "critical" | "warning" | "info") {
  if (sev === "critical") return "bg-red-600";
  if (sev === "warning") return "bg-amber-500";
  return "bg-[#214A33]";
}

const TickerBar: React.FC = () => {
  const { items, hidden, setHidden, loading } = useTicker();
  const prefersReduced = React.useMemo(() => {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch { return false; }
  }, []);

  if (hidden) return null;
  if (!loading && items.length === 0) return null;

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-40">
      <div className="mx-auto max-w-6xl">
        <div className="relative m-2 overflow-hidden rounded-md border border-[#BFBFBF] bg-white shadow">
          <button
            aria-label="Masquer le bandeau"
            className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-[#F7F7F7] text-[#214A33]"
            onClick={() => setHidden(true)}
          >
            <X className="h-4 w-4" />
          </button>

          <div className={cn("whitespace-nowrap py-2 pl-3 pr-10 text-sm text-[#214A33]", !prefersReduced && "animate-[ticker_30s_linear_infinite] hover:[animation-play-state:paused]")}>
            {(items.length === 0 ? Array.from({ length: 1 }) : items).map((it, idx) => (
              <span key={idx} className="mr-8 inline-flex items-center">
                <span className={cn("mr-2 inline-block h-2 w-2 rounded-full", dotClass((it as any)?.severity || "info"))} />
                <span className="font-medium">{(it as any)?.short ?? "Chargement des alertes…"}</span>
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