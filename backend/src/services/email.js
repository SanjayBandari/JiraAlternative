import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.EMAIL_FROM || 'noreply@yourdomain.com';
const APP    = process.env.APP_NAME   || 'TicketDesk';
const URL    = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Helpers ────────────────────────────────────────────────
async function send({ to, subject, html }) {
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error('[email] send failed:', err.message);
    // Non-fatal — log but don't crash the request
  }
}

function base(content) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#1e293b">
      <h2 style="color:#6366f1;margin-bottom:4px">${APP}</h2>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin-bottom:24px"/>
      ${content}
      <p style="color:#94a3b8;font-size:12px;margin-top:32px">
        You received this because you are a member of a ${APP} workspace.
      </p>
    </div>`;
}

// ── Email templates ────────────────────────────────────────

export async function sendInviteEmail({ to, inviterName, workspaceName, token }) {
  const link = `${URL}/accept-invite?token=${token}`;
  await send({
    to,
    subject: `${inviterName} invited you to ${workspaceName} on ${APP}`,
    html: base(`
      <p>Hi there,</p>
      <p><strong>${inviterName}</strong> has invited you to join the
         <strong>${workspaceName}</strong> workspace on ${APP}.</p>
      <a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;
         padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;
         margin:16px 0">Accept Invitation</a>
      <p style="color:#64748b;font-size:13px">This invite expires in 7 days.</p>
    `),
  });
}

export async function sendTicketAssignedEmail({ to, assigneeName, ticketTitle, ticketId, projectName }) {
  const link = `${URL}/tickets/${ticketId}`;
  await send({
    to,
    subject: `You've been assigned: ${ticketTitle}`,
    html: base(`
      <p>Hi ${assigneeName},</p>
      <p>You have been assigned a ticket in <strong>${projectName}</strong>:</p>
      <div style="background:#f8fafc;border-left:4px solid #6366f1;
           padding:12px 16px;border-radius:4px;margin:16px 0">
        <strong>${ticketTitle}</strong>
      </div>
      <a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;
         padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        View Ticket
      </a>
    `),
  });
}

export async function sendCommentNotificationEmail({ to, recipientName, commenterName, ticketTitle, ticketId, commentBody }) {
  const link = `${URL}/tickets/${ticketId}`;
  await send({
    to,
    subject: `New comment on: ${ticketTitle}`,
    html: base(`
      <p>Hi ${recipientName},</p>
      <p><strong>${commenterName}</strong> commented on <strong>${ticketTitle}</strong>:</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;
           padding:12px 16px;border-radius:8px;margin:16px 0;color:#334155">
        ${commentBody.slice(0, 300)}${commentBody.length > 300 ? '…' : ''}
      </div>
      <a href="${link}" style="display:inline-block;background:#6366f1;color:#fff;
         padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        Reply
      </a>
    `),
  });
}

export async function sendDueSoonEmail({ to, recipientName, tickets }) {
  const rows = tickets.map(t =>
    `<tr>
       <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${t.title}</td>
       <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#ef4444">${t.due_date}</td>
     </tr>`
  ).join('');

  await send({
    to,
    subject: `📅 You have ${tickets.length} ticket${tickets.length > 1 ? 's' : ''} due soon`,
    html: base(`
      <p>Hi ${recipientName},</p>
      <p>Here are your tickets due in the next 48 hours:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:8px 12px;text-align:left">Ticket</th>
            <th style="padding:8px 12px;text-align:left">Due Date</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <a href="${URL}" style="display:inline-block;background:#6366f1;color:#fff;
         padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
        Open ${APP}
      </a>
    `),
  });
}

export async function sendDailyDigestEmail({ to, recipientName, stats, myTickets }) {
  const ticketRows = myTickets.slice(0, 10).map(t =>
    `<tr>
       <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${t.title}</td>
       <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${t.status.replace('_',' ')}</td>
       <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;color:${t.priority==='urgent'?'#ef4444':t.priority==='high'?'#f97316':'#64748b'}">${t.priority}</td>
     </tr>`
  ).join('');

  await send({
    to,
    subject: `Your ${APP} digest for today`,
    html: base(`
      <p>Good morning, ${recipientName}!</p>
      <div style="display:flex;gap:16px;margin:16px 0">
        <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:24px;font-weight:700;color:#16a34a">${stats.open}</div>
          <div style="font-size:12px;color:#64748b">Open</div>
        </div>
        <div style="flex:1;background:#eff6ff;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:24px;font-weight:700;color:#2563eb">${stats.inProgress}</div>
          <div style="font-size:12px;color:#64748b">In Progress</div>
        </div>
        <div style="flex:1;background:#fef2f2;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:24px;font-weight:700;color:#dc2626">${stats.overdue}</div>
          <div style="font-size:12px;color:#64748b">Overdue</div>
        </div>
      </div>
      ${myTickets.length > 0 ? `
        <p><strong>Your tickets:</strong></p>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f1f5f9">
            <th style="padding:6px 12px;text-align:left">Title</th>
            <th style="padding:6px 12px;text-align:left">Status</th>
            <th style="padding:6px 12px;text-align:left">Priority</th>
          </tr></thead>
          <tbody>${ticketRows}</tbody>
        </table>` : '<p style="color:#64748b">No tickets assigned to you right now.</p>'}
      <a href="${URL}" style="display:inline-block;background:#6366f1;color:#fff;
         padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px">
        Open ${APP}
      </a>
    `),
  });
}
