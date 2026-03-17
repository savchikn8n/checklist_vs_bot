const SUPABASE_SUBSCRIBERS_REST_PATH = "/rest/v1/telegram_checklist_subscribers";

type TelegramSubscriberRow = {
  chat_id: number;
  is_active: boolean | null;
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

export async function upsertTelegramSubscriber(chatId: number) {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const url = new URL(`${supabaseUrl}${SUPABASE_SUBSCRIBERS_REST_PATH}`);
  url.searchParams.set("on_conflict", "chat_id");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...getSupabaseHeaders(),
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify([
      {
        chat_id: chatId,
        is_active: true,
        last_seen_at: new Date().toISOString()
      }
    ]),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Subscriber upsert failed: ${await response.text()}`);
  }
}

export async function listActiveTelegramSubscribers(): Promise<number[]> {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const url = new URL(`${supabaseUrl}${SUPABASE_SUBSCRIBERS_REST_PATH}`);
  url.searchParams.set("select", "chat_id,is_active");
  url.searchParams.set("is_active", "eq.true");

  const response = await fetch(url, {
    headers: getSupabaseHeaders(),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Subscriber fetch failed: ${await response.text()}`);
  }

  const rows = (await response.json()) as TelegramSubscriberRow[];
  return rows.map((row) => row.chat_id);
}
