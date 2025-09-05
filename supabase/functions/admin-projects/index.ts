import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ListPayload = { action: "list" };
type CreatePayload = { action: "create"; project: { code: string; name: string; status: "active" | "onhold" | "archived" } };
type AssignPayload = { action: "assign"; project_id: string; employee_ids: string[] };
type UpdatePayload = { action: "update"; project_id: string; patch: Partial<{ code: string; name: string; status: "active" | "onhold" | "archived" }> };
type Payload = ListPayload | CreatePayload | AssignPayload | UpdatePayload;

function isCreatePayload(p: any): p is CreatePayload {
  return p?.action === "create" && p?.project && typeof p.project?.code === "string" && typeof p.project?.name === "string";
}
function isAssignPayload(p: any): p is AssignPayload {
  return p?.action === "assign" && typeof p?.project_id === "string" && Array.isArray(p?.employee_ids);
}
function isUpdatePayload(p: any): p is UpdatePayload {
  return p?.action === "update" && typeof p?.project_id === "string" && p?.patch && typeof p.patch === "object";
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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify user is authenticated (RLS-aware)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Service role client for admin ops
  const admin = createClient(supabaseUrl, serviceRole, {
    global: { headers: { Authorization: `Bearer ${serviceRole}` } },
  });

  // Orphan check (server-side)
  const { data: empRow, error: empErr } = await admin
    .from("employees")
    .select("id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (empErr) {
    return new Response(JSON.stringify({ error: empErr.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!empRow) {
    return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;

  if (body.action === "list") {
    const [{ data: employees, error: empErr2 }, { data: projects, error: projErr }, { data: pe, error: peErr }] =
      await Promise.all([
        admin.from("employees").select("id, first_name, last_name, display_name"),
        admin.from("projects").select("id, code, name, status"),
        admin.from("project_employees").select("project_id, employee_id"),
      ]);

    if (empErr2 || projErr || peErr) {
      const err = empErr2?.message || projErr?.message || peErr?.message || "Unknown error";
      return new Response(JSON.stringify({ error: err }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assignments: Record<string, string[]> = {};
    for (const row of pe ?? []) {
      if (!assignments[row.project_id]) assignments[row.project_id] = [];
      assignments[row.project_id].push(row.employee_id);
    }

    return new Response(
      JSON.stringify({
        employees: employees ?? [],
        projects: projects ?? [],
        assignments,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (isCreatePayload(body)) {
    const { project } = body;
    const { data, error } = await admin
      .from("projects")
      .insert({
        code: project.code,
        name: project.name,
        status: project.status ?? "active",
      })
      .select("id, code, name, status")
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ project: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (isUpdatePayload(body)) {
    const { project_id, patch } = body;
    const payload: Record<string, any> = {};
    if (typeof patch.code === "string") payload.code = patch.code;
    if (typeof patch.name === "string") payload.name = patch.name;
    if (patch.status === "active" || patch.status === "onhold" || patch.status === "archived") payload.status = patch.status;

    const { data, error } = await admin
      .from("projects")
      .update(payload)
      .eq("id", project_id)
      .select("id, code, name, status")
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ project: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (isAssignPayload(body)) {
    const { project_id, employee_ids } = body;
    // Read current assignments
    const { data: current, error: curErr } = await admin
      .from("project_employees")
      .select("employee_id")
      .eq("project_id", project_id);

    if (curErr) {
      return new Response(JSON.stringify({ error: curErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentSet = new Set((current ?? []).map((r) => r.employee_id));
    const targetSet = new Set(employee_ids);

    // To delete
    const toDelete = [...currentSet].filter((id) => !targetSet.has(id));
    // To insert
    const toInsert = [...targetSet].filter((id) => !currentSet.has(id));

    if (toDelete.length > 0) {
      const { error } = await admin
        .from("project_employees")
        .delete()
        .eq("project_id", project_id)
        .in("employee_id", toDelete);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (toInsert.length > 0) {
      const rows = toInsert.map((eid) => ({ project_id, employee_id: eid }));
      const { error } = await admin.from("project_employees").insert(rows);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
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