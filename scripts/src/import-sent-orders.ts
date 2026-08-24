/**
 * import-sent-orders.ts — Historisk import av orderbekräftelser från mejlens
 * Skickat-mapp (Loopia IMAP) in i CRM:et.
 *
 * KÖRS AV DIG SJÄLV i PowerShell (lösenordet skrivs dolt i din terminal och
 * lämnar aldrig din dator — skriptet skickar bara PDF:erna till CRM:ets
 * webhook, som AI-tolkar och skapar kunder/ordrar med dubblettskydd):
 *
 *   cd "C:\Users\Robbanpro\Downloads\impressive-crm-project (1)\scripts"
 *   npx tsx src/import-sent-orders.ts
 *
 * Valfria miljövariabler:
 *   MAIL_HOST   (default mailcluster.loopia.se)
 *   SINCE       (default 2026-03-01)
 *   DRY_RUN=1   — visa bara vad som skulle importeras, skicka inget
 */
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import * as readline from "node:readline";

const WEBHOOK_URL =
  "https://impressive-crm.vercel.app/api/emails/webhook?token=wht_R4nd0mT0k3n_x8Kp2mVq7Lz9BcF3sYdN6aWe";
const MAIL_HOST = process.env.MAIL_HOST ?? "mailcluster.loopia.se";
const SINCE = new Date(process.env.SINCE ?? "2026-03-01");
const DRY_RUN = process.env.DRY_RUN === "1";

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!hidden) {
      rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
      return;
    }
    // Dolt läge: inget eko alls (readline stängs — den ekar annars tecknen)
    rl.close();
    const stdin = process.stdin;
    process.stdout.write(question);
    const chars: string[] = [];
    stdin.setRawMode?.(true);
    stdin.resume();
    const onData = (buf: Buffer) => {
      const ch = buf.toString("utf8");
      if (ch === "\r" || ch === "\n") {
        stdin.setRawMode?.(false);
        stdin.removeListener("data", onData);
        rl.close();
        process.stdout.write("\n");
        resolve(chars.join(""));
      } else if (ch === "\u0003") {
        process.exit(1);
      } else if (ch === "\u0008" || ch === "\u007f") {
        chars.pop();
      } else {
        chars.push(ch);
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  console.log("═══ Import av orderbekräftelser från Skickat (Loopia) ═══");
  console.log(`Server: ${MAIL_HOST} · sedan ${SINCE.toISOString().slice(0, 10)}${DRY_RUN ? " · TESTLÄGE (skickar inget)" : ""}\n`);

  // Uppgifter via miljövariabler (MAIL_USER / MAIL_PASS) — annars frågas de
  const user = process.env.MAIL_USER || (await ask("Din mejladress (avsändarkontot): "));
  const pass = process.env.MAIL_PASS || (await ask("Lösenord (syns inte alls när du skriver): ", true));

  const client = new ImapFlow({
    host: MAIL_HOST,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
    // TLS_INSECURE=1 krävs när antivirus/brandvägg avlyssnar TLS-trafiken
    // ("self-signed certificate in certificate chain")
    tls: process.env.TLS_INSECURE === "1" ? { rejectUnauthorized: false } : undefined,
  });

  console.log("\nAnsluter…");
  await client.connect();
  console.log("✔ Inloggad.");

  // Hitta Skickat-mappen (namn varierar: Sent, INBOX.Sent, Skickat…)
  const folders = await client.list();
  const sent =
    folders.find((f) => f.specialUse === "\\Sent") ??
    folders.find((f) => /sent|skickat/i.test(f.path));
  if (!sent) {
    console.error("Hittade ingen Skickat-mapp. Mappar:", folders.map((f) => f.path).join(", "));
    await client.logout();
    return;
  }
  console.log(`✔ Skickat-mapp: ${sent.path}`);

  const lock = await client.getMailboxLock(sent.path);
  const candidates: { uid: number; subject: string; date: Date }[] = [];
  try {
    for await (const msg of client.fetch({ since: SINCE }, { uid: true, envelope: true, bodyStructure: true })) {
      const subject = msg.envelope?.subject ?? "";
      // Grovfilter: ordermejl brukar nämna order i ämnet — resten avgör PDF-innehållet
      const hasPdfHint = JSON.stringify(msg.bodyStructure ?? {}).toLowerCase().includes("pdf");
      if (hasPdfHint && /order|bekräft/i.test(subject)) {
        candidates.push({ uid: msg.uid, subject, date: msg.envelope?.date ?? new Date() });
      }
    }
  } finally {
    lock.release();
  }

  console.log(`\n${candidates.length} mejl matchar (PDF + "order" i ämnet):`);
  for (const c of candidates) console.log(`  · ${c.date.toISOString().slice(0, 10)}  ${c.subject}`);

  if (DRY_RUN) {
    console.log("\nTESTLÄGE — inget skickades. Kör utan DRY_RUN=1 för att importera.");
    await client.logout();
    return;
  }

  if (candidates.length === 0) {
    await client.logout();
    return;
  }

  const proceed = await ask(`\nImportera dessa ${candidates.length} mejl? (ja/nej): `);
  if (!/^j/i.test(proceed)) {
    console.log("Avbrutet.");
    await client.logout();
    return;
  }

  let created = 0, duplicates = 0, skipped = 0, failed = 0;
  const lock2 = await client.getMailboxLock(sent.path);
  try {
    for (const c of candidates) {
      const dl = await client.download(String(c.uid), undefined, { uid: true });
      const chunks: Buffer[] = [];
      for await (const chunk of dl.content) chunks.push(chunk as Buffer);
      const parsed = await simpleParser(Buffer.concat(chunks));

      const pdfs = (parsed.attachments ?? []).filter(
        (a) => a.contentType === "application/pdf" || (a.filename ?? "").toLowerCase().endsWith(".pdf"),
      );
      if (pdfs.length === 0) { skipped++; continue; }

      const recipient = parsed.to && "value" in parsed.to ? parsed.to.value[0]?.address : undefined;
      const payload = {
        From: recipient ?? user,
        FromName: parsed.to && "value" in parsed.to ? parsed.to.value[0]?.name || undefined : undefined,
        Subject: parsed.subject ?? c.subject,
        TextBody: parsed.text ?? "",
        Date: (parsed.date ?? c.date).toISOString(),
        Attachments: pdfs.map((a) => ({
          Name: a.filename ?? "orderbekraftelse.pdf",
          Content: a.content.toString("base64"),
          ContentType: "application/pdf",
        })),
      };

      process.stdout.write(`→ ${c.date.toISOString().slice(0, 10)} ${c.subject.slice(0, 50)} … `);
      try {
        const res = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await res.json()) as { ok?: boolean; auto?: boolean; duplicate?: boolean; ai?: boolean; customer?: string };
        if (body.duplicate) { duplicates++; console.log("⏭ fanns redan"); }
        else if (body.auto) { created++; console.log(`✔ order skapad (${body.customer ?? "?"}${body.ai ? ", AI" : ", regex"})`); }
        else if (body.ok) { skipped++; console.log("⚠ ingen orderdata hittades — sparad som mejl"); }
        else { failed++; console.log("✖ fel"); }
      } catch (err) {
        failed++;
        console.log(`✖ ${(err as Error).message}`);
      }
      // Liten paus så AI:n inte överbelastas
      await new Promise((r) => setTimeout(r, 1500));
    }
  } finally {
    lock2.release();
  }

  console.log(`\n═══ KLART ═══`);
  console.log(`✔ ${created} ordrar skapade · ⏭ ${duplicates} dubbletter överhoppade · ⚠ ${skipped} utan orderdata · ✖ ${failed} fel`);
  await client.logout();
}

main().catch((err) => {
  console.error("\nFEL:", err.message ?? err);
  process.exit(1);
});
