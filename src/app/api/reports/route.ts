import { handleError, ok, requireBusiness } from "@/lib/api";
import {
  expenseByCategory,
  financialSummary,
  invoiceStatusBreakdown,
  monthlySeries,
  rangeForPreset,
  topCustomers,
  topProducts,
} from "@/lib/reports";

export async function GET(request: Request) {
  try {
    const session = await requireBusiness("reports.read");
    const url = new URL(request.url);
    const preset = url.searchParams.get("preset") ?? "year";
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const range = from && to ? { from, to } : rangeForPreset(preset);

    const [summary, monthly, statuses, categories, customersTop, productsTop] = await Promise.all([
      financialSummary(session.businessId, range),
      monthlySeries(session.businessId, new Date(`${range.to}T00:00:00Z`).getUTCFullYear()),
      invoiceStatusBreakdown(session.businessId),
      expenseByCategory(session.businessId, range),
      topCustomers(session.businessId, range),
      topProducts(session.businessId, range),
    ]);

    return ok({ range, summary, monthly, statuses, categories, topCustomers: customersTop, topProducts: productsTop });
  } catch (error) {
    return handleError(error);
  }
}
