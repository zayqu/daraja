const SITE_URL = "https://www.ajira.daraja.co.tz";
const MAX_SUBSCRIBERS_PER_RUN = 50;
const MAX_JOBS_PER_EMAIL = 12;

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function jobMatchesInterests(job, interests) {
  const searchable = [
    job.title,
    job.category,
    job.company,
    job.description,
  ]
    .join(" ")
    .toLowerCase();
  return interests.some((interest) =>
    searchable.includes(String(interest).trim().toLowerCase())
  );
}

function buildAlertEmail(subscriber, jobs) {
  const jobRows = jobs
    .map(
      (job) => `
        <li style="margin:0 0 18px">
          <a href="${SITE_URL}/jobs/${encodeURIComponent(job.id)}" style="color:#087f6c;font-weight:700;text-decoration:none">
            ${escapeHtml(job.title)}
          </a><br>
          <span style="color:#344054">${escapeHtml(job.company)} · ${escapeHtml(job.location)}</span>
        </li>`
    )
    .join("");
  const unsubscribeUrl =
    `${SITE_URL}/api/job-alerts?unsubscribe=${encodeURIComponent(subscriber.unsubscribeToken)}`;

  return {
    subject: `${jobs.length} new matching job${jobs.length === 1 ? "" : "s"} on Daraja`,
    html: `
      <div style="max-width:620px;margin:auto;font-family:Arial,sans-serif;color:#1b2a3f;line-height:1.6">
        <h1 style="font-size:24px">New opportunities in Tanzania</h1>
        <p>Here are the latest verified vacancies published since your previous update.</p>
        <ul style="padding-left:22px">${jobRows}</ul>
        <p><a href="${SITE_URL}/jobs" style="display:inline-block;padding:12px 18px;border-radius:6px;background:#00c9a7;color:#1b2a3f;font-weight:700;text-decoration:none">Browse all jobs</a></p>
        <p style="margin-top:32px;font-size:12px;color:#667085">
          You received this because you subscribed to Daraja job alerts.
          <a href="${unsubscribeUrl}" style="color:#667085">Unsubscribe</a>
        </p>
      </div>`,
  };
}

async function sendJobAlertDigests(prisma, fetchFn = fetch) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.JOB_ALERTS_FROM_EMAIL;
  if (!apiKey || !from) {
    console.log("Email alerts skipped: RESEND_API_KEY or JOB_ALERTS_FROM_EMAIL is not configured.");
    return { sent: 0, skipped: true };
  }

  const subscribers = await prisma.jobAlertSubscriber.findMany({
    where: { active: true },
    orderBy: { lastNotifiedAt: "asc" },
    take: MAX_SUBSCRIBERS_PER_RUN,
  });
  let sent = 0;

  for (const subscriber of subscribers) {
    const candidates = await prisma.job.findMany({
      where: {
        active: true,
        createdAt: { gt: subscriber.lastNotifiedAt },
        OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        category: true,
        description: true,
        createdAt: true,
      },
    });
    const jobs = candidates
      .filter((job) => jobMatchesInterests(job, subscriber.interests || []))
      .slice(0, MAX_JOBS_PER_EMAIL);
    if (!jobs.length) {
      if (candidates.length) {
        await prisma.jobAlertSubscriber.update({
          where: { id: subscriber.id },
          data: { lastNotifiedAt: candidates.at(-1).createdAt },
        });
      }
      continue;
    }

    const email = buildAlertEmail(subscriber, jobs);
    const response = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [subscriber.email],
        subject: email.subject,
        html: email.html,
      }),
    });
    if (!response.ok) {
      console.error(`Email alert failed for subscriber ${subscriber.id}: HTTP ${response.status}`);
      continue;
    }

    await prisma.jobAlertSubscriber.update({
      where: { id: subscriber.id },
      data: { lastNotifiedAt: jobs.at(-1).createdAt },
    });
    sent += 1;
  }

  console.log(`Email alerts: ${sent} digest${sent === 1 ? "" : "s"} sent`);
  return { sent, skipped: false };
}

module.exports = {
  buildAlertEmail,
  escapeHtml,
  jobMatchesInterests,
  sendJobAlertDigests,
};
