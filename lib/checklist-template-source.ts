import {
  DEFAULT_WEEK_CYCLE_LENGTH,
  DAY_LABELS,
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

  if (!isDayId(candidate.id) || !Array.isArray(candidate.tasks)) {
    return null;
  }

  const fallbackShortTitles: Record<ChecklistTemplateDay["id"], string> = {
    monday: "Пн",
    tuesday: "Вт",
    wednesday: "Ср",
    thursday: "Чт",
    friday: "Пт",
    saturday: "Сб",
    sunday: "Вс"
  };

  return {
    id: candidate.id,
    title: typeof candidate.title === "string" ? candidate.title : DAY_LABELS[candidate.id],
    shortTitle:
      typeof candidate.shortTitle === "string"
        ? candidate.shortTitle
        : fallbackShortTitles[candidate.id],
    sortOrder: typeof candidate.sortOrder === "number" ? candidate.sortOrder : index + 1,
    enabled: candidate.enabled ?? true,
    tasks: candidate.tasks
      .map((task, taskIndex) => normalizeTask(task, taskIndex, weekCycleLength))
      .filter((task): task is ChecklistTemplateTask => task !== null)
  };
}

function normalizeChecklistTemplateRow(
  row: Pick<ChecklistTemplateRow, "version" | "data">,
  workspaceId: string
): ChecklistTemplate | null {
  if (!row.data || typeof row.data !== "object") {
    return null;
  }

  const nestedData =
    "template" in (row.data as Record<string, unknown>)
      ? (row.data as Record<string, unknown>).template
      : "data" in (row.data as Record<string, unknown>)
        ? (row.data as Record<string, unknown>).data
        : row.data;

  if (!nestedData || typeof nestedData !== "object") {
    return null;
  }

  if (isChecklistTemplate(nestedData)) {
    return {
      ...nestedData,
      version: row.version ?? nestedData.version,
      workspaceId
    };
  }

  const candidate = nestedData as Partial<ChecklistTemplate> & {
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
  debug?: string;
  dayCountRaw?: number;
  dayCountNormalized?: number;
  firstRawDayId?: string | null;
  firstNormalizedDayId?: string | null;
}> {
  try {
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
    const rawContainer =
      row?.data && typeof row.data === "object"
        ? "template" in (row.data as Record<string, unknown>)
          ? (row.data as Record<string, unknown>).template
          : "data" in (row.data as Record<string, unknown>)
            ? (row.data as Record<string, unknown>).data
            : row.data
        : null;
    const rawDays =
      rawContainer && typeof rawContainer === "object" && Array.isArray((rawContainer as { days?: unknown[] }).days)
        ? (rawContainer as { days: unknown[] }).days
        : [];
    const firstRawDay =
      rawDays[0] && typeof rawDays[0] === "object"
        ? ((rawDays[0] as { id?: unknown }).id ?? null)
        : null;

    if (!row?.data) {
      return {
        template: {
          ...LOCAL_CHECKLIST_TEMPLATE,
          version: row?.version ?? LOCAL_CHECKLIST_TEMPLATE.version,
          workspaceId
        },
        source: "fallback",
        debug: "No checklist_templates row or empty data",
        dayCountRaw: 0,
        dayCountNormalized: LOCAL_CHECKLIST_TEMPLATE.days.length,
        firstRawDayId: null,
        firstNormalizedDayId: LOCAL_CHECKLIST_TEMPLATE.days[0]?.id ?? null
      };
    }

    const template = normalizeChecklistTemplateRow(row, workspaceId);

    if (!template) {
      return {
        template: {
          ...LOCAL_CHECKLIST_TEMPLATE,
          workspaceId
        },
        source: "fallback",
        debug: "Invalid checklist_templates.data format",
        dayCountRaw: rawDays.length,
        dayCountNormalized: LOCAL_CHECKLIST_TEMPLATE.days.length,
        firstRawDayId: typeof firstRawDay === "string" ? firstRawDay : null,
        firstNormalizedDayId: LOCAL_CHECKLIST_TEMPLATE.days[0]?.id ?? null
      };
    }

    return {
      template: sortChecklistTemplate(template),
      source: "supabase",
      dayCountRaw: rawDays.length,
      dayCountNormalized: template.days.length,
      firstRawDayId: typeof firstRawDay === "string" ? firstRawDay : null,
      firstNormalizedDayId: template.days[0]?.id ?? null
    };
  } catch (error) {
    return {
      template: {
        ...LOCAL_CHECKLIST_TEMPLATE,
        workspaceId
      },
      source: "fallback",
      debug: error instanceof Error ? error.message : "Unknown template loader error",
      dayCountRaw: 0,
      dayCountNormalized: LOCAL_CHECKLIST_TEMPLATE.days.length,
      firstRawDayId: null,
      firstNormalizedDayId: LOCAL_CHECKLIST_TEMPLATE.days[0]?.id ?? null
    };
  }
}
