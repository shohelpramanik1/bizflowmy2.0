import { and, count, eq, gte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, bookings, invoices, memberships, tasks } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { formatDateTime, formatMoney, today } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui";
import TeamManager from "./team-manager";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await getSession();
  if (!session?.business) return null;
  const bid = session.businessId;
  const sym = session.business.currencySymbol;

  const members = await db.select().from(memberships).where(eq(memberships.businessId, bid));

  const stats = await Promise.all(
    members.map(async (m) => {
      const [assigned] = await db.select({ n: count() }).from(tasks).where(and(eq(tasks.businessId, bid), eq(tasks.assigneeId, m.id)));
      const [done] = await db.select({ n: count() }).from(tasks).where(and(eq(tasks.businessId, bid), eq(tasks.assigneeId, m.id), eq(tasks.status, "completed")));
      const [upcoming] = await db.select({ n: count() }).from(bookings).where(and(eq(bookings.businessId, bid), eq(bookings.staffMembershipId, m.id), gte(bookings.bookingDate, today())));
      const [sales] = await db
        .select({ total: sql<number>`COALESCE(SUM(${invoices.totalCents}),0)::int` })
        .from(invoices)
        .where(and(eq(invoices.businessId, bid), eq(invoices.createdBy, m.userId ?? -1), ne(invoices.status, "draft"), ne(invoices.status, "cancelled")));
      return {
        id: m.id,
        assigned: assigned?.n ?? 0,
        completed: done?.n ?? 0,
        pending: (assigned?.n ?? 0) - (done?.n ?? 0),
        upcoming: upcoming?.n ?? 0,
        sales: sales?.total ?? 0,
      };
    }),
  );

  const activity = await db.select().from(activityLogs).where(eq(activityLogs.businessId, bid)).orderBy(sql`${activityLogs.createdAt} DESC`).limit(25);

  return (
    <div className="space-y-5">
      <PageHeader title="Team" subtitle="Invite staff, assign roles and monitor performance." />

      <TeamManager
        canWrite={can(session.role, "team.write")}
        members={members.map((m) => ({ id: m.id, name: m.name, inviteEmail: m.inviteEmail, phone: m.phone, role: m.role, position: m.position, department: m.department, status: m.status }))}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => {
          const s = stats.find((x) => x.id === m.id)!;
          return (
            <Card key={m.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {(m.name ?? m.inviteEmail ?? "?").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{m.name ?? m.inviteEmail}</p>
                  <p className="text-xs capitalize text-slate-500">{m.role}{m.position ? ` · ${m.position}` : ""}</p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-slate-50 p-2"><dt className="text-slate-400">Assigned</dt><dd className="text-sm font-bold text-slate-800">{s.assigned}</dd></div>
                <div className="rounded-lg bg-emerald-50 p-2"><dt className="text-emerald-600">Completed</dt><dd className="text-sm font-bold text-emerald-700">{s.completed}</dd></div>
                <div className="rounded-lg bg-amber-50 p-2"><dt className="text-amber-600">Outstanding</dt><dd className="text-sm font-bold text-amber-700">{s.pending}</dd></div>
                <div className="rounded-lg bg-brand-50 p-2"><dt className="text-brand-600">Bookings</dt><dd className="text-sm font-bold text-brand-700">{s.upcoming}</dd></div>
                <div className="col-span-2 rounded-lg bg-slate-900 p-2 text-white"><dt className="text-[10px] uppercase tracking-wide opacity-70">Sales generated</dt><dd className="text-sm font-bold">{formatMoney(s.sales, sym)}</dd></div>
              </dl>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title="Team activity log" subtitle="User · action · date · time" />
        <ul className="divide-y divide-slate-100">
          {activity.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-400">No activity yet.</li>}
          {activity.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                {(a.userName ?? "SY").slice(0, 2).toUpperCase()}
              </span>
              <span className="text-slate-700"><strong>{a.userName ?? "System"}</strong> {a.action}</span>
              <span className="ml-auto text-xs text-slate-400">{formatDateTime(a.createdAt)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
