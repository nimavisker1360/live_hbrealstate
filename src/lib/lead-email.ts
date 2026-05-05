import {
  getGmailSender,
  getGmailTransporter,
  getPasswordEmailSender,
  getPasswordEmailTransporter,
  isEmailPasswordConfigured,
} from "@/lib/gmail-transporter";

const CONTACT_RECIPIENT =
  process.env.HB_LEAD_EMAIL_TO?.trim() || "hbrealstate2019@gmail.com";

type LeadNotificationInput = {
  id: string;
  fullName: string;
  phone: string;
  interest: string;
  budget: string;
  source: string;
  viewingAt: Date | null;
  message: string | null;
  createdAt: Date;
  agent: {
    id: string;
    name: string;
    company: string;
  };
  property: {
    id: string;
    title: string;
    location: string;
  };
  liveSession: {
    id: string;
    roomId: string;
    title: string;
  } | null;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTimestamp(value: Date) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return new Date().toISOString();
  }

  return value.toISOString();
}

function formatViewingTime(value: Date | null) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "Europe/Istanbul",
    timeZoneName: "short",
    year: "numeric",
  }).format(value);
}

function buildDetailRows(fields: Array<{ label: string; value?: string | null }>) {
  return fields
    .filter((field) => field.value)
    .map(
      (field) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; width: 160px; vertical-align: top;">
            <strong style="color: #111827;">${escapeHtml(field.label)}</strong>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #374151;">
            ${field.value}
          </td>
        </tr>
      `,
    )
    .join("");
}

function buildLeadEmailHtml(lead: LeadNotificationInput) {
  const timestamp = formatTimestamp(lead.createdAt);
  const viewingTime = formatViewingTime(lead.viewingAt);
  const rows = buildDetailRows([
    { label: "Lead ID", value: escapeHtml(lead.id) },
    { label: "Full name", value: escapeHtml(lead.fullName) },
    {
      label: "WhatsApp number",
      value: `<a href="tel:${escapeHtml(lead.phone)}" style="color: #0f766e;">${escapeHtml(lead.phone)}</a>`,
    },
    { label: "Budget", value: escapeHtml(lead.budget) },
    { label: "Viewing time", value: viewingTime ? escapeHtml(viewingTime) : null },
    { label: "Interested in", value: escapeHtml(lead.interest) },
    { label: "Source", value: escapeHtml(lead.source) },
    {
      label: "Property",
      value: escapeHtml(`${lead.property.title} | ${lead.property.location}`),
    },
    { label: "Property ID", value: escapeHtml(lead.property.id) },
    {
      label: "Live session",
      value: lead.liveSession
        ? escapeHtml(`${lead.liveSession.title} | ${lead.liveSession.roomId}`)
        : null,
    },
    { label: "Agent", value: escapeHtml(`${lead.agent.name} | ${lead.agent.company}`) },
    { label: "Submitted at", value: escapeHtml(timestamp) },
  ]);

  return `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #111827;">
      <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
        <div style="padding: 24px 28px; background: linear-gradient(135deg, #0f766e 0%, #115e59 100%);">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px;">New HB Live Lead</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
            Submitted from the HB Live property room.
          </p>
        </div>
        <div style="padding: 28px;">
          <table style="width: 100%; border-collapse: collapse;">
            ${rows}
          </table>
          <div style="margin-top: 24px;">
            <h2 style="margin: 0 0 12px; font-size: 16px; color: #111827;">Message</h2>
            <div style="padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb; color: #374151; line-height: 1.7;">
              ${escapeHtml(lead.message || "Not provided").replace(/\r?\n/g, "<br />")}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildLeadEmailText(lead: LeadNotificationInput) {
  const viewingTime = formatViewingTime(lead.viewingAt);

  return [
    "New HB Live Lead",
    "",
    `Lead ID: ${lead.id}`,
    `Full name: ${lead.fullName}`,
    `WhatsApp number: ${lead.phone}`,
    `Budget: ${lead.budget}`,
    `Viewing time: ${viewingTime || "Not provided"}`,
    `Interested in: ${lead.interest}`,
    `Source: ${lead.source}`,
    `Property: ${lead.property.title}`,
    `Property location: ${lead.property.location}`,
    `Property ID: ${lead.property.id}`,
    `Live session: ${lead.liveSession?.title || "Not provided"}`,
    `Room ID: ${lead.liveSession?.roomId || "Not provided"}`,
    `Agent: ${lead.agent.name} (${lead.agent.company})`,
    `Submitted at: ${formatTimestamp(lead.createdAt)}`,
    "",
    "Message:",
    lead.message || "Not provided",
  ].join("\n");
}

function isOauthAuthError(error: unknown) {
  const candidate = error as { code?: unknown; message?: unknown };
  return (
    candidate.code === "EAUTH" ||
    /invalid_grant|expired|revoked|oauth/i.test(String(candidate.message || ""))
  );
}

export async function sendLeadNotificationEmail(lead: LeadNotificationInput) {
  const subject = `New HB Live lead: ${lead.fullName} - ${lead.property.title}`;
  const mailOptions = {
    to: CONTACT_RECIPIENT,
    subject,
    text: buildLeadEmailText(lead),
    html: buildLeadEmailHtml(lead),
  };

  try {
    const transporter = getGmailTransporter();
    const sender = getGmailSender();

    return await transporter.sendMail({
      ...mailOptions,
      from: `"HB Real Estate" <${sender}>`,
    });
  } catch (error) {
    if (!isOauthAuthError(error) || !isEmailPasswordConfigured()) {
      throw error;
    }

    console.warn(
      "Gmail OAuth failed; retrying lead notification with password SMTP.",
    );

    const fallbackTransporter = getPasswordEmailTransporter();
    const fallbackSender = getPasswordEmailSender();

    return fallbackTransporter.sendMail({
      ...mailOptions,
      from: `"HB Real Estate" <${fallbackSender}>`,
    });
  }
}
