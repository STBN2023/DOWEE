import { supabase } from "@/integrations/supabase/client";

export type TeamRef = {
  id: string;
  slug: string;
  label: string;
};

export async function listTeams(): Promise<TeamRef[]> {
  const { data, error } = await supabase
    .from("ref_teams")
    .select("id, slug, label")
    .order("label", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as TeamRef[];
}

// Normalise les variantes vers l’attendu par les métriques: "commercial" | "créa" | "dev" | "direction"
export function normalizeTeamSlug(input?: string | null): string | null {
  if (!input) return null;
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // strip accents

  if (base === "commercial") return "commercial";
  if (base === "direction") return "direction";
  if (base === "crea" || base === "creation") return "créa";
  if (base === "dev" || base === "developpement" || base === "developpement") return "dev";

  // fallback: renvoyer tel quel (permet d'accepter d'autres futures équipes)
  return input;
}