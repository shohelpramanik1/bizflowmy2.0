import { formatDate, formatMoney, normalizeMsisdn } from "./format";

export type EmailTemplateKey =
  | "welcome"
  | "verify_email"
  | "password_reset"
  | "quotation_sent"
  | "quotation_accepted"
  | "invoice_sent"
  | "payment_received"
  | "invoice_overdue"
  | "booking_confirmation"
  | "booking_reminder"
  | "team_invitation"
  | "subscription_confirmation";

export type TemplateContext = {
  businessName: string;
  customerName?: string;
  documentNumber?: string;
  amount?: string;
  dueDate?: string;
  link?: string;
  extra?: string;
};

export function renderEmail(key: EmailTemplateKey, ctx: TemplateContext): { subject: string; body: string } {
  const b = ctx.businessName;
  const c = ctx.customerName ?? "there";
  switch (key) {
    case "welcome":
      return {
        subject: `Welcome to BizFlow MY, ${c}!`,
        body: `Hi ${c},\n\nWelcome to BizFlow MY. Your workspace "${b}" is ready.\n\nNext steps:\n1. Complete your business profile\n2. Add your first customer\n3. Create your first quotation\n\nSelamat maju jaya!\nThe BizFlow MY team`,
      };
    case "verify_email":
      return { subject: "Verify your BizFlow MY email", body: `Hi ${c},\n\nPlease confirm your email address to secure your account.\n\n${ctx.link ?? ""}` };
    case "password_reset":
      return { subject: "Reset your BizFlow MY password", body: `Hi ${c},\n\nUse the secure link below to reset your password. It expires in 60 minutes.\n\n${ctx.link ?? ""}` };
    case "quotation_sent":
      return {
        subject: `Quotation ${ctx.documentNumber} from ${b}`,
        body: `Hi ${c},\n\nPlease find quotation ${ctx.documentNumber} for ${ctx.amount}.\n\nView & accept online: ${ctx.link ?? ""}\n\nThank you,\n${b}`,
      };
    case "quotation_accepted":
      return { subject: `Quotation ${ctx.documentNumber} accepted`, body: `Good news — ${c} accepted quotation ${ctx.documentNumber} (${ctx.amount}). You can now convert it into an invoice.` };
    case "invoice_sent":
      return {
        subject: `Invoice ${ctx.documentNumber} from ${b}`,
        body: `Hi ${c},\n\nPlease find invoice ${ctx.documentNumber}.\nAmount: ${ctx.amount}\nDue date: ${ctx.dueDate}\n\nView invoice: ${ctx.link ?? ""}\n\n${ctx.extra ?? ""}\n\nThank you,\n${b}`,
      };
    case "payment_received":
      return { subject: `Payment received — ${ctx.documentNumber}`, body: `Hi ${c},\n\nWe have received your payment of ${ctx.amount} for invoice ${ctx.documentNumber}. Thank you!\n\n${b}` };
    case "invoice_overdue":
      return {
        subject: `Reminder: Invoice ${ctx.documentNumber} is overdue`,
        body: `Hi ${c},\n\nThis is a friendly reminder that invoice ${ctx.documentNumber} for ${ctx.amount} was due on ${ctx.dueDate}.\n\nPay or view: ${ctx.link ?? ""}\n\nThank you,\n${b}`,
      };
    case "booking_confirmation":
      return { subject: `Booking confirmed with ${b}`, body: `Hi ${c},\n\nYour booking is confirmed.\n${ctx.extra ?? ""}\n\nSee you soon,\n${b}` };
    case "booking_reminder":
      return { subject: `Reminder: your appointment with ${b}`, body: `Hi ${c},\n\nJust a reminder about your upcoming appointment.\n${ctx.extra ?? ""}\n\n${b}` };
    case "team_invitation":
      return { subject: `You have been invited to join ${b} on BizFlow MY`, body: `Hi ${c},\n\nYou have been invited to join the ${b} workspace.\n\nAccept the invite: ${ctx.link ?? ""}` };
    case "subscription_confirmation":
      return { subject: `Your BizFlow MY subscription is active`, body: `Hi ${c},\n\nYour ${ctx.extra} plan for ${b} is now active. Thank you for your support!` };
    default:
      return { subject: `Message from ${b}`, body: "" };
  }
}

export function whatsappMessageForInvoice(params: {
  customerName: string;
  number: string;
  amountCents: number;
  dueDate: string;
  link?: string;
  symbol?: string;
}) {
  const { customerName, number, amountCents, dueDate, link, symbol = "RM" } = params;
  return (
    `Hello ${customerName},\n\n` +
    `Please find your invoice ${number}.\n` +
    `Amount: ${formatMoney(amountCents, symbol)}\n` +
    `Due date: ${formatDate(dueDate)}.\n\n` +
    (link ? `Secure link: ${link}\n\n` : "") +
    `Thank you.`
  );
}

export function whatsappMessageForQuotation(params: {
  customerName: string;
  number: string;
  amountCents: number;
  link?: string;
  symbol?: string;
}) {
  const { customerName, number, amountCents, link, symbol = "RM" } = params;
  return (
    `Hello ${customerName},\n\n` +
    `Here is your quotation ${number}.\n` +
    `Total: ${formatMoney(amountCents, symbol)}\n\n` +
    (link ? `View & accept: ${link}\n\n` : "") +
    `Thank you.`
  );
}

export function whatsappUrl(phone: string | null | undefined, message: string) {
  const to = normalizeMsisdn(phone);
  const text = encodeURIComponent(message);
  return to ? `https://wa.me/${to}?text=${text}` : `https://wa.me/?text=${text}`;
}
