import { addDays, format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

export type DayInfo = {
  date: Date;
  iso: string; // yyyy-MM-dd
  label: string; // Lun 02/09
};

export function mondayOf(d: Date) {
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function weekFrom(startDate?: Date): DayInfo[] {
  const start = mondayOf(startDate ?? new Date());
  return Array.from({ length: 7 }).map((_, i) => {
    const date = addDays(start, i);
    const iso = format(date, "yyyy-MM-dd");
    const label = format(date, "EEE dd/MM", { locale: fr });
    return { date, iso, label };
  });
}

export function formatHour(h: number) {
  return `${h.toString().padStart(2, "0")}:00`;
}