import { listActiveTelegramSubscribers } from "../../../../lib/telegram-subscribers";

const TELEGRAM_API = "https://api.telegram.org";

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

export async function GET() {
  try {
    const subscribers = await listActiveTelegramSubscribers();

    await Promise.all(
      subscribers.map((chatId) =>
        sendTelegramMessage(
          chatId,
          "Не забудь сначала выполнить чеклист, а потом отправить отчет."
        )
      )
    );

    return Response.json({
      ok: true,
      sent: subscribers.length
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
