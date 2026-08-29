"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button, Card, EmptyState, apiRequest, cx, useToast } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

type N = { id: number; type: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };

const ICONS: Record<string, string> = {
  invoice: "🧾", quotation: "📄", payment: "💰", booking: "🗓️", task: "✅",
  team: "🧑‍🤝‍🧑", subscription: "⭐", reminder: "🔔", welcome: "🎉", info: "🔔",
};

export default function NotificationsPage() {
  const router = useRouter();
  const { push } = useToast();
  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await apiRequest<{ items: N[] }>("/api/notifications");
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markAll() {
    await apiRequest("/api/notifications", { method: "PATCH" });
    push("All notifications marked as read.");
    load();
    router.refresh();
  }

  const unread = items.filter((i) => !i.readAt).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={`${unread} unread`}
        action={unread > 0 ? <Button size="sm" variant="secondary" onClick={markAll}>Mark all as read</Button> : undefined}
      />
      <Card>
        {loading ? (
          <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState title="No notifications" description="You are all caught up." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li key={n.id} className={cx("flex gap-3 px-4 py-3", !n.readAt && "bg-brand-50/40")}>
                <span className="text-lg">{ICONS[n.type] ?? "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  {n.body && <p className="text-xs text-slate-500">{n.body}</p>}
                  <p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(n.createdAt)}</p>
                </div>
                {n.link && <Link href={n.link} className="self-center text-xs font-semibold text-brand-700 hover:underline">View →</Link>}
                {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
