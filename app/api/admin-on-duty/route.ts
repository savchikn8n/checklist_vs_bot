const SUPABASE_REST_PATH = "/rest/v1/workspace_states";

type WorkspaceStateRow = {
  workspace_id: string;
  data: {
    months?: Record<
      string,
      {
        asgn?: Record<
          string,
          {
            admin?: Array<{
              name?: string;
            }>;
          }
        >;
      }
    >;
  };
};

function getEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function extractAdminName(row: WorkspaceStateRow, date: string) {
  const [year, month, day] = date.split("-");
  const monthKey = `${year}-${month}`;
  const dayKey = String(Number(day));
  const dayKeyPadded = day.padStart(2, "0");

  return {
    administrator:
      row.data.months?.[monthKey]?.asgn?.[dayKey]?.admin?.[0]?.name ??
      row.data.months?.[monthKey]?.asgn?.[dayKeyPadded]?.admin?.[0]?.name ??
      null,
    monthKey,
    dayKey,
    dayKeyPadded,
    hasMonth: Boolean(row.data.months?.[monthKey]),
    hasDay:
      Boolean(row.data.months?.[monthKey]?.asgn?.[dayKey]) ||
      Boolean(row.data.months?.[monthKey]?.asgn?.[dayKeyPadded])
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return Response.json({ error: "Missing date parameter" }, { status: 400 });
    }

    const supabaseUrl = getEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const workspaceId = process.env.SUPABASE_WORKSPACE_ID ?? "default";

    const url = new URL(`${supabaseUrl}${SUPABASE_REST_PATH}`);
    url.searchParams.set("select", "workspace_id,data");
    url.searchParams.set("workspace_id", `eq.${workspaceId}`);
    url.searchParams.set("limit", "1");

    const response = await fetch(url, {
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        {
          error: "Supabase request failed",
          details: errorText
        },
        { status: 502 }
      );
    }

    const rows = (await response.json()) as WorkspaceStateRow[];
    const row = rows[0];

    if (!row) {
      return Response.json({ administrator: null });
    }

    const result = extractAdminName(row, date);

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
