import {
  DEFAULT_WEEK_CYCLE_LENGTH,
  LOCAL_CHECKLIST_TEMPLATE,
  sortChecklistTemplate,
  type ChecklistTemplateDay,
  type ChecklistTemplateTask,
  type ChecklistTemplate
} from "./checklist-data";

const SUPABASE_TEMPLATE_REST_PATH = "/rest/v1/checklist_templates";

type ChecklistTemplateRow = {
  workspace_id: string;
  version: number | null;
  data: unknown;
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

function isDayId(value: unknown): value is ChecklistTemplateDay["id"] {
  return (
    value === "monday" ||
    value === "tuesday" ||
    value === "wednesday" ||
    value === "thursday" ||
    value === "friday" ||
    value === "saturday" ||
    value === "sunday"
  );
}

function normalizeTask(
  rawTask: unknown,
  index: number,
  weekCycleLength: number
): ChecklistTemplateTask | null {
  if (!rawTask || typeof rawTask !== "object") {
    return null;
  }

  const candidate = rawTask as Partial<ChecklistTemplateTask> & {
    offWeeks?: number[];
  };

  if (typeof candidate.id !== "string" || typeof candidate.text !== "string") {
    return null;
  }

  const activeWeeks = Array.isArray(candidate.activeWeeks)
    ? candidate.activeWeeks.filter((week): week is number => typeof week === "number")
    : Array.isArray(candidate.offWeeks)
      ? Array.from({ length: weekCycleLength }, (_, position) => position + 1).filter(
          (week) => !candidate.offWeeks?.includes(week)
        )
      : Array.from({ length: weekCycleLength }, (_, position) => position + 1);

  return {
    id: candidate.id,
    text: candidate.text,
    activeWeeks,
    sortOrder: typeof candidate.sortOrder === "number" ? candidate.sortOrder : index + 1,
    enabled: candidate.enabled ?? true
  };
}

function normalizeDay(
  rawDay: unknown,
  index: number,
  weekCycleLength: number
): ChecklistTemplateDay | null {
  if (!rawDay || typeof rawDay !== "object") {
    return null;
  }

  const candidate = rawDay as Partial<ChecklistTemplateDay> & {
    tasks?: unknown[];
  };

  if (
    !isDayId(candidate.id) ||
    typeof candidate.title !== "string" ||
    typeof candidate.shortTitle !== "string" ||
    !Array.isArray(candidate.tasks)
  ) {
    return null;
  }

  return {
    id: candidate.id,
    title: candidate.title,
    shortTitle: candidate.shortTitle,
    sortOrder: typeof candidate.sortOrder === "number" ? candidate.sortOrder : index + 1,
    enabled: candidate.enabled ?? true,
    tasks: candidate.tasks
      .map((task, taskIndex) => normalizeTask(task, taskIndex, weekCycleLength))
      .filter((task): task is ChecklistTemplateTask => task !== null)
  };
}

function normalizeChecklistTemplateRow(
  row: ChecklistTemplateRow,
  workspaceId: string
): ChecklistTemplate | null {
  if (!row.data || typeof row.data !== "object") {
    return null;
  }

  if (isChecklistTemplate(row.data)) {
    return {
      ...row.data,
      version: row.version ?? row.data.version,
      workspaceId
    };
  }

  const candidate = row.data as Partial<ChecklistTemplate> & {
    days?: unknown[];
  };
  const weekCycleLength =
    typeof candidate.weekCycleLength === "number"
      ? candidate.weekCycleLength
      : DEFAULT_WEEK_CYCLE_LENGTH;

  if (!Array.isArray(candidate.days)) {
    return null;
  }

  return {
    version: row.version ?? candidate.version ?? LOCAL_CHECKLIST_TEMPLATE.version,
    workspaceId,
    weekCycleLength,
    days: candidate.days
      .map((day, dayIndex) => normalizeDay(day, dayIndex, weekCycleLength))
      .filter((day): day is ChecklistTemplateDay => day !== null)
  };
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

  const template = normalizeChecklistTemplateRow(row, workspaceId);

  if (!template) {
    throw new Error("Invalid checklist template format in Supabase");
  }

  return {
    template: sortChecklistTemplate(template),
    source: "supabase"
  };
}
