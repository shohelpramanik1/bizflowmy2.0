import "dotenv/config";
import { randomBytes, scryptSync } from "crypto";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import * as s from "../src/db/schema";

function hash(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(pw, salt, 64).toString("hex")}`;
}
const token = () => randomBytes(18).toString("base64url");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 864e5));
const daysAhead = (n: number) => iso(new Date(Date.now() + n * 864e5));

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const plans = [
    { code: "free", name: "Free", priceCents: 0, tagline: "Get started with the basics", sortOrder: 1, limits: { invoices: 5, quotations: 5, customers: 20, team: 1 }, features: ["5 invoices / month", "5 quotations / month", "20 customers", "Basic dashboard", "Basic PDF templates", "1 user"] },
    { code: "pro", name: "Pro", priceCents: 2900, tagline: "For growing freelancers & small teams", sortOrder: 2, limits: { invoices: -1, quotations: -1, customers: 500, team: 3 }, features: ["Unlimited quotations", "Unlimited invoices", "500 customers", "Expense management", "Task manager & Kanban", "Booking system", "Reports & exports", "Email + WhatsApp sharing", "3 team members", "Advanced templates"] },
    { code: "business", name: "Business", priceCents: 5900, tagline: "For SMEs running a full operation", sortOrder: 3, limits: { invoices: -1, quotations: -1, customers: -1, team: 10 }, features: ["Everything in Pro", "Unlimited customers", "Unlimited documents", "10+ team members", "Advanced reports", "Multiple staff scheduling", "Advanced booking", "Automated payment reminders", "Custom branding", "Priority support"] },
  ];
  for (const p of plans) {
    const existing = await db.select().from(s.subscriptionPlans).where(eq(s.subscriptionPlans.code, p.code)).limit(1);
    if (existing.length === 0) await db.insert(s.subscriptionPlans).values(p);
  }

  const existingDemo = await db.select().from(s.users).where(eq(s.users.email, "demo@bizflowmy.com")).limit(1);
  if (existingDemo.length > 0) {
    console.log("Demo data already present — skipping.");
    await pool.end();
    return;
  }

  const [admin] = await db.insert(s.users).values({ name: "BizFlow Admin", email: "admin@bizflowmy.com", passwordHash: hash("admin12345"), isPlatformAdmin: true }).returning();
  const [owner] = await db.insert(s.users).values({ name: "Aisyah Rahman", email: "demo@bizflowmy.com", passwordHash: hash("demo12345"), phone: "012-345 6789" }).returning();
  const [staffUser] = await db.insert(s.users).values({ name: "Lim Wei Chun", email: "wei@kreatifstudio.my", passwordHash: hash("demo12345"), phone: "013-888 2211" }).returning();
  const [acctUser] = await db.insert(s.users).values({ name: "Rajesh Kumar", email: "rajesh@kreatifstudio.my", passwordHash: hash("demo12345"), phone: "016-772 1188" }).returning();

  const [biz] = await db.insert(s.businesses).values({
    ownerId: owner.id, name: "Kreatif Studio Enterprise", slug: "kreatif-studio",
    businessType: "Digital Agency", registrationNo: "202301234567 (1234567-A)",
    address: "No. 12-3, Jalan PJU 5/20, The Strand, Kota Damansara",
    city: "Petaling Jaya", state: "Selangor", postcode: "47810", country: "Malaysia",
    phone: "03-6141 8899", email: "hello@kreatifstudio.my", website: "www.kreatifstudio.my",
    defaultPaymentTerms: "Payment due within 30 days from the invoice date.", paymentTermDays: 30,
    taxEnabled: true, taxLabel: "SST", taxRateBp: 600,
    bankInfo: "Maybank 5123 4567 8901\nAccount name: Kreatif Studio Enterprise\nDuitNow QR available on request",
    quotationTerms: "This quotation is valid for 14 days. 50% deposit is required before work commences.",
    invoiceNotes: "Terima kasih for your business!",
    reminderSettings: { stages: [-3, 0, 3, 7, 14], auto: true }, setupCompleted: true,
  }).returning();

  const [mOwner] = await db.insert(s.memberships).values({ businessId: biz.id, userId: owner.id, name: owner.name, phone: owner.phone, role: "owner", position: "Founder & Creative Director", department: "Management", status: "active" }).returning();
  const [mStaff] = await db.insert(s.memberships).values({ businessId: biz.id, userId: staffUser.id, inviteEmail: staffUser.email, name: staffUser.name, phone: staffUser.phone, role: "manager", position: "Project Manager", department: "Operations", status: "active" }).returning();
  const [mAcct] = await db.insert(s.memberships).values({ businessId: biz.id, userId: acctUser.id, inviteEmail: acctUser.email, name: acctUser.name, phone: acctUser.phone, role: "accountant", position: "Finance Executive", department: "Finance", status: "active" }).returning();

  await db.insert(s.subscriptions).values({ businessId: biz.id, planCode: "pro", status: "active", renewsAt: new Date(Date.now() + 20 * 864e5) });

  const customerRows = await db.insert(s.customers).values([
    { businessId: biz.id, name: "Encik Zulkifli", companyName: "ABC Construction Sdn Bhd", email: "zul@abcconstruction.my", phone: "012-908 7766", whatsapp: "012-908 7766", address: "Lot 45, Jalan Industri 3", city: "Shah Alam", state: "Selangor", postcode: "40000", country: "Malaysia", taxNo: "201801009988", portalToken: token() },
    { businessId: biz.id, name: "Nurul Huda", companyName: "Nusantara Cafe", email: "nurul@nusantaracafe.my", phone: "011-2233 4455", whatsapp: "011-2233 4455", address: "23, Jalan Telawi 2, Bangsar", city: "Kuala Lumpur", state: "W.P. Kuala Lumpur", postcode: "59100", country: "Malaysia", portalToken: token() },
    { businessId: biz.id, name: "David Tan", companyName: "Sinar Digital Marketing", email: "david@sinardigital.my", phone: "017-556 1200", whatsapp: "017-556 1200", city: "George Town", state: "Pulau Pinang", postcode: "10450", country: "Malaysia", portalToken: token() },
    { businessId: biz.id, name: "Puan Salmah", companyName: "Salmah Beauty House", email: "salmah@sbh.my", phone: "019-334 7788", city: "Johor Bahru", state: "Johor", postcode: "80100", country: "Malaysia", portalToken: token() },
    { businessId: biz.id, name: "Ir. Hafiz Osman", companyName: "Vertex Renovation", email: "hafiz@vertexreno.my", phone: "014-880 2299", city: "Seremban", state: "Negeri Sembilan", postcode: "70200", country: "Malaysia", portalToken: token() },
  ]).returning();

  const productRows = await db.insert(s.products).values([
    { businessId: biz.id, name: "Website Development", sku: "WEB-001", description: "Custom responsive website, up to 8 pages", category: "Development", unit: "project", kind: "service", priceCents: 250000, costCents: 90000, taxRateBp: 600 },
    { businessId: biz.id, name: "Logo Design", sku: "DSG-001", description: "3 concepts with 2 rounds of revision", category: "Design", unit: "project", kind: "service", priceCents: 50000, costCents: 12000, taxRateBp: 600 },
    { businessId: biz.id, name: "Monthly Maintenance", sku: "MNT-001", description: "Hosting, backups, updates and support", category: "Support", unit: "month", kind: "service", priceCents: 15000, costCents: 4000, taxRateBp: 600 },
    { businessId: biz.id, name: "Social Media Management", sku: "SMM-001", description: "12 posts per month across 2 platforms", category: "Marketing", unit: "month", kind: "service", priceCents: 120000, costCents: 45000, taxRateBp: 600 },
    { businessId: biz.id, name: "Brand Consultation (1 hour)", sku: "CON-001", description: "One-to-one strategy session", category: "Consulting", unit: "hour", kind: "service", priceCents: 30000, costCents: 0, taxRateBp: 600, bookable: true, durationMinutes: 60 },
    { businessId: biz.id, name: "Product Photography Session", sku: "PHO-001", description: "Half-day studio shoot, 20 edited images", category: "Photography", unit: "session", kind: "service", priceCents: 90000, costCents: 25000, taxRateBp: 600, bookable: true, durationMinutes: 120 },
  ]).returning();

  const year = new Date().getFullYear();
  const line = (p: typeof productRows[number], qty: number, discBp = 0) => {
    const gross = qty * p.priceCents;
    const disc = Math.round((gross * discBp) / 10000);
    const net = gross - disc;
    const tax = Math.round((net * p.taxRateBp) / 10000);
    return { productId: p.id, name: p.name, description: p.description, quantity: qty, unitPriceCents: p.priceCents, discountBp: discBp, taxRateBp: p.taxRateBp, lineTotalCents: net + tax, gross, disc, tax };
  };

  // Quotations
  const quoteSpecs = [
    { c: 0, items: [line(productRows[0], 1), line(productRows[1], 1)], status: "converted", day: 92 },
    { c: 1, items: [line(productRows[3], 3, 500)], status: "accepted", day: 40 },
    { c: 2, items: [line(productRows[0], 1, 1000), line(productRows[2], 12)], status: "sent", day: 12 },
    { c: 3, items: [line(productRows[1], 1), line(productRows[5], 1)], status: "rejected", day: 60 },
    { c: 4, items: [line(productRows[4], 4)], status: "draft", day: 4 },
  ];
  let qn = 0;
  for (const spec of quoteSpecs) {
    qn += 1;
    const sub = spec.items.reduce((a, i) => a + i.gross, 0);
    const dis = spec.items.reduce((a, i) => a + i.disc, 0);
    const tax = spec.items.reduce((a, i) => a + i.tax, 0);
    const [q] = await db.insert(s.quotations).values({
      businessId: biz.id, customerId: customerRows[spec.c].id, number: `QT-${year}-${String(qn).padStart(4, "0")}`,
      issueDate: daysAgo(spec.day), expiryDate: daysAgo(spec.day - 14), status: spec.status,
      subtotalCents: sub, discountCents: dis, taxCents: tax, totalCents: sub - dis + tax,
      terms: biz.quotationTerms, publicToken: token(), createdBy: owner.id,
    }).returning();
    await db.insert(s.quotationItems).values(spec.items.map((i, idx) => ({ quotationId: q.id, productId: i.productId, name: i.name, description: i.description, quantity: i.quantity, unitPriceCents: i.unitPriceCents, discountBp: i.discountBp, taxRateBp: i.taxRateBp, lineTotalCents: i.lineTotalCents, sortOrder: idx })));
  }

  // Invoices spread across the year
  const invoiceSpecs = [
    { c: 0, items: [line(productRows[0], 1), line(productRows[1], 1)], day: 90, paid: 1, status: "paid" },
    { c: 1, items: [line(productRows[3], 2)], day: 75, paid: 1, status: "paid" },
    { c: 2, items: [line(productRows[2], 6)], day: 60, paid: 1, status: "paid" },
    { c: 3, items: [line(productRows[1], 2)], day: 45, paid: 0.4, status: "partially_paid" },
    { c: 4, items: [line(productRows[0], 1, 500)], day: 38, paid: 0, status: "overdue" },
    { c: 1, items: [line(productRows[3], 1), line(productRows[2], 3)], day: 20, paid: 0, status: "sent" },
    { c: 2, items: [line(productRows[5], 2)], day: 10, paid: 1, status: "paid" },
    { c: 0, items: [line(productRows[2], 12)], day: 5, paid: 0, status: "sent" },
    { c: 4, items: [line(productRows[4], 6)], day: 1, paid: 0, status: "draft" },
  ];
  let inum = 0;
  for (const spec of invoiceSpecs) {
    inum += 1;
    const sub = spec.items.reduce((a, i) => a + i.gross, 0);
    const dis = spec.items.reduce((a, i) => a + i.disc, 0);
    const tax = spec.items.reduce((a, i) => a + i.tax, 0);
    const total = sub - dis + tax;
    const paidCents = Math.round(total * spec.paid);
    const issue = daysAgo(spec.day);
    const due = spec.status === "overdue" ? daysAgo(spec.day - 15) : daysAhead(30 - spec.day);
    const [inv] = await db.insert(s.invoices).values({
      businessId: biz.id, customerId: customerRows[spec.c].id, number: `INV-${year}-${String(inum).padStart(4, "0")}`,
      issueDate: issue, dueDate: due, status: spec.status,
      subtotalCents: sub, discountCents: dis, taxCents: tax, totalCents: total, paidCents,
      paymentTerms: biz.defaultPaymentTerms, notes: biz.invoiceNotes, bankInfo: biz.bankInfo,
      publicToken: token(), createdBy: spec.c % 2 === 0 ? owner.id : staffUser.id,
      lockedAt: spec.status === "draft" ? null : new Date(),
    }).returning();
    await db.insert(s.invoiceItems).values(spec.items.map((i, idx) => ({ invoiceId: inv.id, productId: i.productId, name: i.name, description: i.description, quantity: i.quantity, unitPriceCents: i.unitPriceCents, discountBp: i.discountBp, taxRateBp: i.taxRateBp, lineTotalCents: i.lineTotalCents, sortOrder: idx })));
    if (paidCents > 0) {
      await db.insert(s.payments).values({
        businessId: biz.id, invoiceId: inv.id, customerId: inv.customerId, amountCents: paidCents,
        paidAt: daysAgo(Math.max(0, spec.day - 5)), method: ["bank_transfer", "online", "cash", "ewallet"][inum % 4],
        reference: `FPX${100000 + inum}`, createdBy: acctUser.id,
      });
    }
  }

  const expenseData = [
    ["Adobe Creative Cloud", "Software", "Adobe", 28900, 95], ["Office rental — Kota Damansara", "Rent", "Damansara Uptown Mgmt", 250000, 85],
    ["Facebook Ads campaign", "Marketing", "Meta Platforms", 120000, 70], ["Petrol & tolls", "Transportation", "Shell / PLUS", 32000, 60],
    ["Staff salary — Wei Chun", "Salary", null, 380000, 55], ["MacBook Pro accessories", "Equipment", "Machines", 89000, 44],
    ["TNB electricity", "Utilities", "Tenaga Nasional", 42000, 33], ["Client meeting in Penang", "Travel", "AirAsia", 68000, 25],
    ["Figma team plan", "Software", "Figma", 18000, 15], ["Printing & stationery", "Office", "Popular", 15600, 8],
    ["Google Workspace", "Software", "Google", 9600, 3],
  ] as const;
  await db.insert(s.expenses).values(expenseData.map(([name, category, supplier, amountCents, day]) => ({
    businessId: biz.id, name, category, supplier, amountCents, taxCents: Math.round(amountCents * 0.06),
    expenseDate: daysAgo(day), method: "bank_transfer", createdBy: acctUser.id,
  })));

  await db.insert(s.tasks).values([
    { businessId: biz.id, title: "Prepare quotation for ABC Construction", customerId: customerRows[0].id, assigneeId: mOwner.id, priority: "high", status: "completed", dueDate: daysAgo(80), completedAt: new Date(), createdBy: owner.id },
    { businessId: biz.id, title: "Call customer to confirm scope", customerId: customerRows[0].id, assigneeId: mStaff.id, priority: "medium", status: "completed", dueDate: daysAgo(70), completedAt: new Date(), createdBy: owner.id },
    { businessId: biz.id, title: "Visit location — Shah Alam site", customerId: customerRows[0].id, assigneeId: mStaff.id, priority: "medium", status: "in_progress", dueDate: daysAhead(2), createdBy: owner.id },
    { businessId: biz.id, title: "Prepare invoice for Nusantara Cafe", customerId: customerRows[1].id, assigneeId: mAcct.id, priority: "high", status: "review", dueDate: daysAhead(1), createdBy: owner.id },
    { businessId: biz.id, title: "Follow up payment INV-2026-0005", customerId: customerRows[4].id, assigneeId: mAcct.id, priority: "urgent", status: "todo", dueDate: daysAgo(1), createdBy: owner.id },
    { businessId: biz.id, title: "Design second logo concept", customerId: customerRows[3].id, assigneeId: mOwner.id, priority: "medium", status: "in_progress", dueDate: daysAhead(5), estimatedHours: 6, createdBy: owner.id },
    { businessId: biz.id, title: "Draft Q3 social media calendar", customerId: customerRows[1].id, assigneeId: mStaff.id, priority: "low", status: "todo", dueDate: daysAhead(9), createdBy: owner.id },
    { businessId: biz.id, title: "Renew studio insurance", assigneeId: mOwner.id, priority: "low", status: "waiting", dueDate: daysAhead(21), createdBy: owner.id },
  ]);

  await db.insert(s.bookings).values([
    { businessId: biz.id, customerId: customerRows[2].id, customerName: "David Tan", customerPhone: "017-556 1200", customerEmail: "david@sinardigital.my", productId: productRows[4].id, serviceName: "Brand Consultation (1 hour)", staffMembershipId: mOwner.id, bookingDate: daysAhead(1), startTime: "10:00", endTime: "11:00", location: "Studio, Kota Damansara", status: "confirmed", source: "public" },
    { businessId: biz.id, customerId: customerRows[3].id, customerName: "Puan Salmah", customerPhone: "019-334 7788", productId: productRows[5].id, serviceName: "Product Photography Session", staffMembershipId: mStaff.id, bookingDate: daysAhead(3), startTime: "14:00", endTime: "16:00", location: "Studio", status: "pending", source: "public" },
    { businessId: biz.id, customerId: customerRows[0].id, customerName: "Encik Zulkifli", customerPhone: "012-908 7766", serviceName: "Site visit — Shah Alam", staffMembershipId: mStaff.id, bookingDate: daysAhead(5), startTime: "09:30", endTime: "11:30", location: "Lot 45, Jalan Industri 3", status: "confirmed", source: "internal" },
    { businessId: biz.id, customerId: customerRows[1].id, customerName: "Nurul Huda", customerPhone: "011-2233 4455", productId: productRows[4].id, serviceName: "Brand Consultation (1 hour)", staffMembershipId: mOwner.id, bookingDate: daysAgo(4), startTime: "15:00", endTime: "16:00", status: "completed", source: "internal" },
  ]);

  await db.insert(s.documents).values([
    { businessId: biz.id, customerId: customerRows[0].id, name: "ABC Construction — signed contract.pdf", type: "contract", url: "https://example.com/files/abc-contract.pdf", uploadedBy: owner.id },
    { businessId: biz.id, customerId: customerRows[1].id, name: "Nusantara Cafe brand guide.pdf", type: "other", url: "https://example.com/files/nusantara-brand.pdf", uploadedBy: owner.id },
    { businessId: biz.id, name: "Office rental receipt — March.pdf", type: "expense_receipt", url: "https://example.com/files/rental.pdf", uploadedBy: acctUser.id },
  ]);

  await db.insert(s.notifications).values([
    { businessId: biz.id, type: "payment", title: "Payment received for INV-" + year + "-0007", body: "RM 1,908.00 recorded via online payment.", link: "/app/payments" },
    { businessId: biz.id, type: "invoice", title: "Invoice overdue", body: "INV-" + year + "-0005 is past its due date.", link: "/app/invoices" },
    { businessId: biz.id, type: "booking", title: "New online booking 🗓️", body: "David Tan booked Brand Consultation.", link: "/app/bookings" },
    { businessId: biz.id, type: "quotation", title: "Quotation accepted 🎉", body: "Nusantara Cafe accepted QT-" + year + "-0002.", link: "/app/quotations" },
  ]);

  await db.insert(s.activityLogs).values([
    { businessId: biz.id, userId: owner.id, userName: owner.name, action: `created quotation QT-${year}-0003`, entityType: "quotation" },
    { businessId: biz.id, userId: acctUser.id, userName: acctUser.name, action: `marked invoice INV-${year}-0003 as paid`, entityType: "invoice" },
    { businessId: biz.id, userId: staffUser.id, userName: staffUser.name, action: 'completed task "Call customer to confirm scope"', entityType: "task" },
    { businessId: biz.id, userId: owner.id, userName: owner.name, action: "updated business settings", entityType: "business" },
  ]);

  await db.insert(s.analyticsEvents).values(
    ["user_registered", "invoice_created", "invoice_created", "quotation_created", "quotation_converted", "payment_recorded", "payment_recorded", "user_login", "subscription_changed"]
      .map((event) => ({ event, businessId: biz.id, userId: owner.id })),
  );

  await db.insert(s.supportTickets).values({
    businessId: biz.id, userId: owner.id, name: owner.name, email: owner.email,
    subject: "How do I add my SST number to invoices?", message: "I need my SST registration number printed on all invoices. Where do I configure this?",
  });

  await db.execute(sql`SELECT 1`);
  console.log("✅ Seed complete");
  console.log("   Demo owner : demo@bizflowmy.com / demo12345");
  console.log("   Platform admin : admin@bizflowmy.com / admin12345");
  console.log(`   Admin user id ${admin.id}, business ${biz.slug}`);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
