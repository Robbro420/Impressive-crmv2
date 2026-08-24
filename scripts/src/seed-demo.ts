/**
 * seed-demo.ts — Fyller databasen med exempeldata för lokal utveckling.
 * Kör ALDRIG mot produktionsdatabasen.
 *
 *   DATABASE_URL=pglite://./.dev-db pnpm --filter @workspace/scripts run seed:demo
 */
import {
  db,
  pool,
  customersTable,
  ordersTable,
  emailsTable,
  todosTable,
  casesTable,
  goalsTable,
  timelineTable,
} from "@workspace/db";

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const customers = await db
    .insert(customersTable)
    .values([
      { name: "Bergströms Bygg AB", email: "info@bergstromsbygg.se", phone: "070-123 45 67", city: "Örebro", postalCode: "70210", address: "Verkstadsgatan 12", category: "foretag", status: "aktiv", customerNumber: "1101" },
      { name: "Camping Sörmland", email: "bokning@campingsormland.se", phone: "0155-22 33 44", city: "Nyköping", postalCode: "61130", address: "Strandvägen 3", category: "foretag", status: "aktiv", customerNumber: "1102" },
      { name: "Tandläkarna Vasastan", email: "kontakt@tandvasastan.se", phone: "08-30 40 50", city: "Stockholm", postalCode: "11320", address: "Odengatan 45", category: "foretag", status: "aktiv", customerNumber: "1103" },
      { name: "Ekens Trädgårdsdesign", email: "hej@ekenstradgard.se", phone: "073-987 65 43", city: "Göteborg", postalCode: "41263", address: "Ekgatan 8", category: "foretag", status: "aktiv", customerNumber: "1104" },
      { name: "Norrlands Fönsterputs", email: "order@norrfonster.se", phone: "090-12 34 56", city: "Umeå", postalCode: "90325", address: "Björkvägen 22", category: "foretag", status: "vilande", customerNumber: "1105" },
      { name: "Restaurang Piazza", email: "info@piazzamalmo.se", phone: "040-97 86 75", city: "Malmö", postalCode: "21134", address: "Stortorget 2", category: "foretag", status: "aktiv", customerNumber: "1106" },
    ])
    .returning();

  const [bergstroms, camping, tandlakarna, ekens, , piazza] = customers;

  const orders = await db
    .insert(ordersTable)
    .values([
      { customerId: bergstroms.id, subject: "Display annonsering – Stort paket", orderNumber: "1132", status: "aktiv", amount: "14360.00", orderDate: new Date(Date.now() - 12 * 864e5), campaignStart: daysFromNow(-12), campaignEnd: daysFromNow(18), orderText: "Display annonsering – Stort paket, 30 dagar" },
      { customerId: camping.id, subject: "Native-kampanj sommar", orderNumber: "1128", status: "produktion", amount: "22500.00", orderDate: new Date(Date.now() - 3 * 864e5), campaignStart: daysFromNow(4), campaignEnd: daysFromNow(64), orderText: "Native-annonsering 2 månader, geo: Sörmland" },
      { customerId: tandlakarna.id, subject: "Display annonsering – Mellanpaket", orderNumber: "1119", status: "aktiv", amount: "9800.00", orderDate: new Date(Date.now() - 25 * 864e5), campaignStart: daysFromNow(-25), campaignEnd: daysFromNow(5), orderText: "Display 30 dagar, radie 10 km" },
      { customerId: ekens.id, subject: "Vårkampanj display", orderNumber: "1098", status: "uppföljning", amount: "11200.00", orderDate: new Date(Date.now() - 70 * 864e5), campaignStart: daysFromNow(-70), campaignEnd: daysFromNow(-40), orderText: "Display 30 dagar" },
      { customerId: piazza.id, subject: "Lunchkampanj native", orderNumber: "1140", status: "ny", amount: "7500.00", orderDate: new Date(), campaignStart: daysFromNow(7), campaignEnd: daysFromNow(37), orderText: "Native 30 dagar, lunchmeny" },
      { customerId: bergstroms.id, subject: "Höstkampanj (avslutad)", orderNumber: "1055", status: "avslutad", amount: "14360.00", orderDate: new Date(Date.now() - 200 * 864e5), campaignStart: daysFromNow(-200), campaignEnd: daysFromNow(-170), orderText: "Display 30 dagar" },
    ])
    .returning();

  await db.insert(emailsTable).values([
    { fromEmail: "info@bergstromsbygg.se", fromName: "Anna Bergström", subject: "Orderbekräftelse #1132", bodyText: "Tack för er beställning av Display annonsering – Stort paket.", customerId: bergstroms.id, processed: true, receivedAt: new Date(Date.now() - 12 * 864e5) },
    { fromEmail: "bokning@campingsormland.se", fromName: "Lars Ek", subject: "Re: Materialfrågor native-kampanj", bodyText: "Hej! Bifogar logotyp och bilder enligt önskemål.", customerId: camping.id, processed: true, receivedAt: new Date(Date.now() - 2 * 864e5) },
    { fromEmail: "ny.kund@exempel.se", fromName: "Ny Kund", subject: "Förfrågan om annonsering", bodyText: "Hej, vi är intresserade av digital annonsering i Västerås-området.", customerId: null, processed: false, receivedAt: new Date(Date.now() - 864e5) },
  ]);

  await db.insert(todosTable).values([
    { title: "💡 Mersälj – Ekens Trädgårdsdesign", description: "Kampanjen \"Vårkampanj display\" avslutades. Följ upp och presentera nytt erbjudande.", done: false, customerId: ekens.id, dueDate: new Date(Date.now() + 2 * 864e5), contactName: "Eva Ek", contactEmail: "hej@ekenstradgard.se" },
    { title: "Ring Tandläkarna Vasastan om förlängning", description: "Kampanjen går ut om 5 dagar — boka möte om förlängning.", done: false, customerId: tandlakarna.id, dueDate: new Date(Date.now() + 3 * 864e5) },
    { title: "Skicka rapport till Bergströms", description: "Månadsrapport för displaykampanjen.", done: true, customerId: bergstroms.id },
  ]);

  await db.insert(casesTable).values([
    { title: "Fel logotyp i annons", description: "Kunden rapporterar att gammal logotyp visas i en av bannrarna.", status: "pågående", customerId: camping.id },
    { title: "Fakturafråga oktober", description: "Kunden undrar över specifikationen på senaste fakturan.", status: "öppet", customerId: bergstroms.id },
  ]);

  await db.insert(goalsTable).values([
    { name: "Månadsförsäljning", metric: "SEK", target: "150000.00", current: "65360.00", period: "månad" },
    { name: "Nya kunder", metric: "st", target: "8.00", current: "3.00", period: "månad" },
  ]);

  await db.insert(timelineTable).values(
    orders.map((o) => ({
      customerId: o.customerId,
      type: "order_created",
      description: `Order #${o.orderNumber} skapad`,
      referenceId: o.id,
      occurredAt: o.orderDate,
    })),
  );

  console.log(`✔ Demo-data: ${customers.length} kunder, ${orders.length} ordrar.`);
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
    return pool.end();
  });
