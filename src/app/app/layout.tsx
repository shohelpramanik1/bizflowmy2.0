import { redirect } from "next/navigation";
import { and, count, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSession, listUserBusinesses } from "@/lib/auth";
import AppShell from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.business) redirect("/onboarding");

  const businesses = await listUserBusinesses(session.user.id);
  const [unread] = await db
    .select({ n: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.businessId, session.businessId),
        isNull(notifications.readAt),
        or(isNull(notifications.userId), eq(notifications.userId, session.user.id)),
      ),
    );

  return (
    <AppShell
      user={{ id: session.user.id, name: session.user.name, email: session.user.email, isPlatformAdmin: session.user.isPlatformAdmin }}
      businesses={businesses}
      activeBusiness={businesses.find((b) => b.id === session.businessId) ?? null}
      role={session.role}
      unreadCount={unread?.n ?? 0}
    >
      {children}
    </AppShell>
  );
}
