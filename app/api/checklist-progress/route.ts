const SUPABASE_REST_PATH = "/rest/v1/checklist_progress";

type ChecklistProgressRow = {
  workspace_id: string;
  checklist_date: string;
  week_cycle: number;
  day_id: string;
  completed_task_ids: string[];
  progress_percent: number;
};

function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function getSupabaseHeaders() {
  const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  return {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json"
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const checklistDate = searchParams.get("date");
    const weekCycle = searchParams.get("week");
    const dayId = searchParams.get("dayId");
    const workspaceId = process.env.SUPABASE_WORKSPACE_ID ?? "default";

    if (!checklistDate || !weekCycle || !dayId) {
      return Response.json(
        { error: "Missing date, week or dayId parameter" },
        { status: 400 }
      );
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const url = new URL(`${supabaseUrl}${SUPABASE_REST_PATH}`);
    url.searchParams.set(
      "select",
      "workspace_id,checklist_date,week_cycle,day_id,completed_task_ids,progress_percent"
    );
    url.searchParams.set("workspace_id", `eq.${workspaceId}`);
    url.searchParams.set("checklist_date", `eq.${checklistDate}`);
    url.searchParams.set("week_cycle", `eq.${weekCycle}`);
    url.searchParams.set("day_id", `eq.${dayId}`);
    url.searchParams.set("limit", "1");

    const response = await fetch(url, {
      headers: getSupabaseHeaders(),
      cache: "no-store"
    });

    if (!response.ok) {
      return Response.json(
        { error: "Supabase request failed", details: await response.text() },
        { status: 502 }
      );
    }

    const rows = (await response.json()) as ChecklistProgressRow[];
    const row = rows[0];

    return Response.json({
      completedTaskIds: row?.completed_task_ids ?? [],
      progressPercent: row?.progress_percent ?? 0
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      checklistDate?: string;
      weekCycle?: number;
      dayId?: string;
      completedTaskIds?: string[];
      progressPercent?: number;
    };

    if (
      !body.checklistDate ||
      !body.weekCycle ||
      !body.dayId ||
      !Array.isArray(body.completedTaskIds) ||
      typeof body.progressPercent !== "number"
    ) {
      return Response.json({ error: "Invalid payload" }, { status: 400 });
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const workspaceId = process.env.SUPABASE_WORKSPACE_ID ?? "default";
    const url = new URL(`${supabaseUrl}${SUPABASE_REST_PATH}`);
    url.searchParams.set("on_conflict", "workspace_id,checklist_date,week_cycle,day_id");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(),
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([
        {
          workspace_id: workspaceId,
          checklist_date: body.checklistDate,
          week_cycle: body.weekCycle,
          day_id: body.dayId,
          completed_task_ids: body.completedTaskIds,
          progress_percent: body.progressPercent,
          updated_at: new Date().toISOString()
        }
      ]),
      cache: "no-store"
    });

    if (!response.ok) {
      return Response.json(
        { error: "Supabase upsert failed", details: await response.text() },
        { status: 502 }
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
