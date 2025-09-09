import React from "react";
import { useTicker } from "./TickerProvider";
import { cn } from "@/lib/utils";

function dotClass(sev: "critical" | "warning" | "info") {
  if (sev === "critical") return "bg-red-600";
  if (sev === "warning") return "bg-amber-500";
  return "bg-[#214A33]";
}

const TickerBar: React.FC = () => {
  const { items, loading } = useTicker();

  // Respect de l’accessibilité: pause si motion réduite
  const prefersReduced = React.useMemo(() => {
    try {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  }, []);

  // Si aucune donnée et pas en chargement, on n’affiche pas le bandeau
  if (!loading && items.length === 0) return null;

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-[#BFBFBF] bg-white">
      <div className="relative overflow-hidden">
        <div
          className={cn(
            "whitespace-nowrap py-2 px-3 text-sm text-[#214A33]",
            !prefersReduced && "animate-[ticker_30s_linear_infinite] hover:[animation-play-state:paused]"
          )}
        >
          {(items.length === 0 ? Array.from({ length: 1 }) : items).map((it, idx) => (
            <span key={idx} className="mr-10 inline-flex items-center">
              <span className={cn("mr-2 inline-block h-2 w-2 rounded-full", dotClass((it as any)?.severity || "info"))} />
              <span className="font-medium">{(it as any)?.short ?? "Chargement des alertes…"}</span>
            </span>
          ))}
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