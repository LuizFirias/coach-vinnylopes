import { POST as sendNotification } from '../send/route';

/** Compat: Cobrar Check-in → send com tipo checkin_reminder. */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  return sendNotification(
    new Request(req.url, {
      method: 'POST',
      headers: req.headers,
      body: JSON.stringify({
        alunoId: body.alunoId,
        tipo: 'checkin_reminder',
      }),
    }),
  );
}
