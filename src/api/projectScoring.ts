import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type ProjectScore = {
  project_id: string;
  code: string;
  name: string;
  client: { id: string; code: string; name: string } | null;
  score: number;
  margin_pct: number | null;
  due_date: string | null;
  effort_days: number | null;
  segment: string | null;
  star: boolean;
};

export async function getProjectScores(): Promise<ProjectScore[]> {
  const res = await supabase.functions.invoke("project-scoring", { body: { action: "list" } });
  const data = unwrapFunction<{ scores: ProjectScore[] }>(res);
  return data.scores;
}