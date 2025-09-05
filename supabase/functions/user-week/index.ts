import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GetPayload = {
  action: "get";
  start?: string; // YYYY-MM-DD, lundi
};

type PatchPayload = {
  action: "patch";
  upserts?: Array<{ d: string; hour: number; project_id: string; planned_minutes?: number; note?: string | null }>;
  deletes?: Array<{ id?: string; d?: string; hour?: number }>;
};

type Payload = GetPayload | PatchPayload;

function mondayOf(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  return x;
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;
  const action = body?.action;

  // Resolve current user
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  if (action === "get") {
    const startStr = (body as GetPayload)?.start || isoDate(mondayOf(new Date()));
    const start = new Date(startStr);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const startIso = isoDate(start);
    const endIso = isoDate(end);

    // Plans of the week
    const { data: plans, error: plansError } = await supabase
      .from("plan_items")
      .select("id, d, hour, project_id, planned_minutes, note")
      .eq("employee_id", userId)
      .gte("d", startIso)
      .lte("d", endIso)
      .order("d", { ascending: true })
      .order("hour", { ascending: true });

    if (plansError) {
      return new Response(JSON.stringify({ error: plansError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assigned projects (non-archived)
    const { data: pe, error: peError } = await supabase
      .from("project_employees")
      .select("project_id")
      .eq("employee_id", userId);

    if (peError) {
      return new Response(JSON.stringify({ error: peError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const projectIds = Array.from(new Set((pe ?? []).map((r) => r.project_id).filter(Boolean)));

    let projects: Array<{ id: string; code: string; name: string; status: string }> = [];
    if (projectIds.length > 0) {
      const { data: projs, error: projError } = await supabase
        .from("projects")
        .select("id, code, name, status")
        .in("id", projectIds)
        .neq("status", "archived");

      if (projError) {
        return new Response(JSON.stringify({ error: projError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      projects = projs ?? [];
    }

    const response = {
      range: { start: startIso, end: endIso },
      plans: plans ?? [],
      projects,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "patch") {
    const payload = body as PatchPayload;
    const upserts = payload.upserts ?? [];
    const deletes = payload.deletes ?? [];

    // Deletes
    for (const del of deletes) {
      if (del.id) {
        const { error } = await supabase
          .from("plan_items")
          .delete()
          .eq("id", del.id)
          .eq("employee_id", userId);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (del.d && typeof del.hour === "number") {
        const { error } = await supabase
          .from("plan_items")
          .delete()
          .eq("employee_id", userId)
          .eq("d", del.d)
          .eq("hour", del.hour);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Upserts: delete duplicates then insert 60 min lines
    for (const up of upserts) {
      const planned_minutes = up.planned_minutes ?? 60;
      const note = up.note ?? null;
      // remove any existing row at (employee, d, hour)
      const del = await supabase
        .from("plan_items")
        .delete()
        .eq("employee_id", userId)
        .eq("d", up.d)
        .eq("hour", up.hour);
      if (del.error) {
        return new Response(JSON.stringify({ error: del.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const ins = await supabase
        .from("plan_items")
        .insert({
          employee_id: userId,
          d: up.d,
          hour: up.hour,
          project_id: up.project_id,
          planned_minutes,
          note,
        })
        .select("id")
        .single();
      if (ins.error) {
        return new Response(JSON.stringify({ error: ins.error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});