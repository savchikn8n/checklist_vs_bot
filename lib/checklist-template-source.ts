import {
  LOCAL_CHECKLIST_TEMPLATE,
  sortChecklistTemplate,
  type ChecklistTemplate
} from "./checklist-data";

const SUPABASE_TEMPLATE_REST_PATH = "/rest/v1/checklist_templates";

type ChecklistTemplateRow = {
  workspace_id: string;
  version: number | null;
  data: ChecklistTemplate | null;
  updated_at?: string | null;
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
    Authorization: `Bearer ${supabaseServiceRoleKey}`
  };
}

function isChecklistTemplate(value: unknown): value is ChecklistTemplate {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ChecklistTemplate>;
  return (
    typeof candidate.version === "number" &&
    typeof candidate.workspaceId === "string" &&
    typeof candidate.weekCycleLength === "number" &&
    Array.isArray(candidate.days)
  );
}

export async function loadChecklistTemplateFromSupabase(
  workspaceId = process.env.SUPABASE_WORKSPACE_ID ?? "default"
): Promise<{
  template: ChecklistTemplate;
  source: "supabase" | "fallback";
}> {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const url = new URL(`${supabaseUrl}${SUPABASE_TEMPLATE_REST_PATH}`);
  url.searchParams.set("select", "workspace_id,version,data,updated_at");
  url.searchParams.set("workspace_id", `eq.${workspaceId}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: getSupabaseHeaders(),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Supabase template request failed: ${await response.text()}`);
  }

  const rows = (await response.json()) as ChecklistTemplateRow[];
  const row = rows[0];

  if (!row?.data) {
    return {
      template: {
        ...LOCAL_CHECKLIST_TEMPLATE,
        version: row?.version ?? LOCAL_CHECKLIST_TEMPLATE.version,
        workspaceId
      },
      source: "fallback"
    };
  }

  if (!isChecklistTemplate(row.data)) {
    throw new Error("Invalid checklist template format in Supabase");
  }

  const template: ChecklistTemplate = {
    ...row.data,
    version: row.version ?? row.data.version,
    workspaceId
  };

  return {
    template: sortChecklistTemplate(template),
    source: "supabase"
  };
}
