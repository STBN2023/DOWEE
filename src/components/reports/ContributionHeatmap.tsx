import React from "react";

type Props = {
  start: Date; // lundi
  end: Date;   // dimanche
  counts: Record<string, number>; // yyyy-MM-dd -> n
};

function mondayOf(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Mon=0..Sun=6
  x.setDate(x.getDate() - day);
  return x;
}
function sundayOf(d: Date) {
  const x = mondayOf(d);
  x.setDate(x.getDate() + 6);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
const months = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"];

function levelFrom(count: number, max: number) {
  if (!max || max <= 0 || count <= 0) return 0;
  const step = Math.max(1, Math.ceil(max / 4));
  if (count >= step * 4) return 4;
  if (count >= step * 3) return 3;
  if (count >= step * 2) return 2;
  return 1;
}

function colorClass(level: number): string {
  switch (level) {
    case 0: return "bg-orange-50/50 border border-[#BFBFBF]/40";
    case 1: return "bg-orange-100";
    case 2: return "bg-orange-200";
    case 3: return "bg-orange-300";
    case 4: return "bg-orange-500";
    default: return "bg-orange-50/50";
  }
}

const ContributionHeatmap: React.FC<Props> = ({ start, end, counts }) => {
  const mStart = mondayOf(start);
  const sEnd = sundayOf(end);

  // Construire les semaines (colonnes)
  const weeks: Array<Array<{ date: Date; iso: string; count: number; level: number }>> = [];
  const maxCount = React.useMemo(() => {
    let m = 0;
    for (const k in counts) {
      const v = counts[k] ?? 0;
      if (v > m) m = v;
    }
    return m;
  }, [counts]);

  let cur = new Date(mStart);
  while (cur <= sEnd) {
    const col: Array<{ date: Date; iso: string; count: number; level: number }> = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(cur, i);
      const iso = toIso(d);
      const c = counts[iso] ?? 0;
      col.push({ date: d, iso, count: c, level: levelFrom(c, maxCount) });
    }
    weeks.push(col);
    cur = addDays(cur, 7);
  }

  // Labels de mois: afficher au changement de mois sur la 1ère ligne (lundi)
  const monthLabels: Array<string | null> = [];
  let prevMonth = -1;
  for (let w = 0; w < weeks.length; w++) {
    const monday = weeks[w][0].date;
    const m = monday.getMonth();
    if (m !== prevMonth) {
      monthLabels[w] = months[m];
      prevMonth = m;
    } else {
      monthLabels[w] = null;
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-block">
        {/* Labels mois */}
        <div className="ml-8 mb-1 flex gap-[3px]">
          {weeks.map((_, i) => (
            <div key={`m-${i}`} className="w-[12px] text-[10px] text-[#214A33]/70">
              {monthLabels[i] ? monthLabels[i] : ""}
            </div>
          ))}
        </div>

        <div className="flex">
          {/* Labels jours (Lun, Mer, Ven) */}
          <div className="mr-2 flex flex-col justify-between py-[2px]">
            <div className="h-[12px] text-[10px] text-[#214A33]/60">Lun</div>
            <div className="h-[12px] text-[10px] text-[#214A33]/60">Mer</div>
            <div className="h-[12px] text-[10px] text-[#214A33]/60">Ven</div>
          </div>

          {/* Grille */}
          <div className="flex gap-[3px]">
            {weeks.map((col, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {col.map((cell, j) => (
                  <div
                    key={`${i}-${j}`}
                    className={`h-[12px] w-[12px] rounded-[3px] ${colorClass(cell.level)}`}
                    title={`${cell.iso} • ${cell.count} modification${cell.count > 1 ? "s" : ""}`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Légende */}
          <div className="ml-3 flex items-center gap-2">
            <span className="text-[10px] text-[#214A33]/60">Moins</span>
            <div className="h-[12px] w-[12px] rounded-[3px] bg-orange-50/50 border border-[#BFBFBF]/40" />
            <div className="h-[12px] w-[12px] rounded-[3px] bg-orange-100" />
            <div className="h-[12px] w-[12px] rounded-[3px] bg-orange-200" />
            <div className="h-[12px] w-[12px] rounded-[3px] bg-orange-300" />
            <div className="h-[12px] w-[12px] rounded-[3px] bg-orange-500" />
            <span className="text-[10px] text-[#214A33]/60">Plus</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContributionHeatmap;