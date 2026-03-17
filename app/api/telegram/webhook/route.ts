import { upsertTelegramSubscriber } from "../../../../lib/telegram-subscribers";

const TELEGRAM_API = "https://api.telegram.org";

type TelegramUpdate = {
  message?: {
    chat: {
      id: number;
    };
    text?: string;
  };
};

function getKeyboard(appUrl: string) {
  return {
    inline_keyboard: [
      [
        {
          text: "Открыть чеклист",
          web_app: {
            url: appUrl
          }
        }
      ]
    ]
  };
}

async function sendTelegramMessage(chatId: number, text: string) {
  const token = process.env.BOT_TOKEN;
  const appUrl = process.env.APP_URL;

  if (!token || !appUrl) {
    return;
  }

  await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: getKeyboard(appUrl)
    })
  });
}

export async function POST(request: Request) {
  const update = (await request.json()) as TelegramUpdate;
  const chatId = update.message?.chat.id;
  const text = update.message?.text?.trim();

  if (chatId) {
    try {
      await upsertTelegramSubscriber(chatId);
    } catch {
      // Subscriber persistence should not block bot usage.
    }
  }

  if (chatId && (!text || text === "/start")) {
    await sendTelegramMessage(
      chatId,
      "Открой мини-приложение кнопкой ниже. Чеклист сам покажет текущий день и неделю цикла."
    );
  }

  return Response.json({ ok: true });
}

export async function GET() {
  return Response.json({
    ok: true,
    hint: "Telegram webhook endpoint is alive"
  });
}
