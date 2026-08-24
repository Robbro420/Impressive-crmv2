import { Router, type IRouter } from "express";
import { db, todosTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/todos/:id/send-email", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { to, extraMessage } = req.body as { to: string; extraMessage?: string };

  if (!to) {
    res.status(400).json({ error: "Mottagarens e-post (to) krävs." });
    return;
  }

  const [todo] = await db.select().from(todosTable).where(eq(todosTable.id, id));
  if (!todo) {
    res.status(404).json({ error: "Ärendet hittades inte." });
    return;
  }

  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "RESEND_API_KEY saknas i miljövariabler." });
    return;
  }

  const dueDateStr = todo.dueDate
    ? new Date(todo.dueDate).toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 560px;">
      <h2 style="margin-bottom: 4px;">📋 Ärende: ${todo.title}</h2>
      ${todo.description ? `<p style="color:#555;">${todo.description}</p>` : ""}
      ${dueDateStr ? `<p><strong>Förfaller:</strong> ${dueDateStr}</p>` : ""}
      ${todo.contactName || todo.contactPhone || todo.contactEmail ? `
        <div style="background:#f5f5f5;border-radius:8px;padding:12px 16px;margin-top:12px;">
          <strong>Kontaktperson</strong><br>
          ${todo.contactName ? `${todo.contactName}<br>` : ""}
          ${todo.contactPhone ? `📞 ${todo.contactPhone}<br>` : ""}
          ${todo.contactEmail ? `✉️ ${todo.contactEmail}` : ""}
        </div>
      ` : ""}
      ${extraMessage ? `<p style="margin-top:16px;border-top:1px solid #eee;padding-top:12px;color:#333;">${extraMessage}</p>` : ""}
      <p style="margin-top:24px;font-size:12px;color:#999;">Skickat från Robbanbro CRM</p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Robbanbro CRM <onboarding@resend.dev>",
      to: [to],
      subject: `Ärende: ${todo.title}`,
      html: htmlBody,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    res.status(502).json({ error: "Resend-fel", detail: err });
    return;
  }

  res.json({ ok: true });
});

export default router;
