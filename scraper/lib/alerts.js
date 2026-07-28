const crypto = require("node:crypto");

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

function containsAny(searchable, values) {
  if (!values?.length) return true;
  return values.some((value) =>
    searchable.includes(String(value).trim().toLowerCase())
  );
}

function jobMatchesPreferences(job, subscriber) {
  if (!subscriber.categories?.includes(job.category)) return false;
  const roleText = [job.title, job.description].join(" ").toLowerCase();
  const organisation = String(job.company || "").toLowerCase();
  const location = String(job.location || "").toLowerCase();
  const arrangementText = [job.title, job.description, job.location]
    .join(" ")
    .toLowerCase();

  return (
    containsAny(location, subscriber.locations) &&
    containsAny(organisation, subscriber.organisations) &&
    containsAny(roleText, subscriber.keywords) &&
    containsAny(roleText, subscriber.experienceLevels) &&
    containsAny(arrangementText, subscriber.workArrangements)
  );
}

function jobMatchesInterests(job, interests) {
  return jobMatchesPreferences(job, { categories: interests });
}

function buildAlertEmail(subscriber, jobs) {
  const jobRows = jobs
    .map(
      (job) => `
        <li style="margin:0 0 18px">
          <a href="${SITE_URL}/jobs/${encodeURIComponent(job.slug || job.id)}" style="color:#087f6c;font-weight:700;text-decoration:none">
            ${escapeHtml(job.title)}
          </a><br>
          <span style="color:#344054">${escapeHtml(job.company)} · ${escapeHtml(job.location)}</span>
        </li>`
    )
    .join("");
  const encodedToken = encodeURIComponent(subscriber.unsubscribeToken);
  const unsubscribeUrl = `${SITE_URL}/alerts/unsubscribe?token=${encodedToken}`;
  const oneClickUnsubscribeUrl =
    `${SITE_URL}/api/job-alerts?unsubscribe=${encodedToken}`;

  return {
    subject: `${jobs.length} new matching job${jobs.length === 1 ? "" : "s"} on Daraja`,
    headers: {
      "List-Unsubscribe": `<${oneClickUnsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: `
      <div style="max-width:620px;margin:auto;font-family:Arial,sans-serif;color:#1b2a3f;line-height:1.6">
        <h1 style="font-size:24px">New opportunities matching your preferences</h1>
        <p>Here are verified vacancies published since your previous update.</p>
        <ul style="padding-left:22px">${jobRows}</ul>
        <p><a href="${SITE_URL}/jobs" style="display:inline-block;padding:12px 18px;border-radius:6px;background:#00c9a7;color:#1b2a3f;font-weight:700;text-decoration:none">Browse all jobs</a></p>
        <p style="margin-top:32px;font-size:12px;color:#667085">
          You received this because job alerts are enabled in your Daraja candidate account.
          <a href="${unsubscribeUrl}" style="color:#667085">Unsubscribe</a>
        </p>
      </div>`,
  };
}

function deliveryKey(subscriberId, jobs) {
  return crypto
    .createHash("sha256")
    .update(`${subscriberId}:${jobs.map((job) => job.id).sort().join(",")}`)
    .digest("hex");
}

async function recordFailure(prisma, delivery, message) {
  const attemptCount = delivery.attemptCount + 1;
  const delayMinutes = Math.min(60, 2 ** Math.min(attemptCount, 6));
  await prisma.jobAlertDelivery.update({
    where: { id: delivery.id },
    data: {
      status: "FAILED",
      attemptCount,
      lastError: String(message).slice(0, 500),
      nextAttemptAt: new Date(Date.now() + delayMinutes * 60_000),
    },
  });
}

async function sendJobAlertDigests(prisma, fetchFn = fetch) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.JOB_ALERTS_FROM_EMAIL;
  if (!apiKey || !from) {
    console.log("Email alerts skipped: RESEND_API_KEY or JOB_ALERTS_FROM_EMAIL is not configured.");
    return { sent: 0, skipped: true };
  }

  const subscribers = await prisma.jobAlertSubscriber.findMany({
    where: { active: true, userId: { not: null } },
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
        slug: true,
        title: true,
        company: true,
        location: true,
        category: true,
        description: true,
        createdAt: true,
      },
    });
    const jobs = candidates
      .filter((job) => jobMatchesPreferences(job, subscriber))
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

    const deduplicationKey = deliveryKey(subscriber.id, jobs);
    const existing = await prisma.jobAlertDelivery.findUnique({
      where: { deduplicationKey },
    });
    if (existing?.status === "SENT") continue;
    if (existing?.nextAttemptAt && existing.nextAttemptAt > new Date()) continue;
    const delivery = existing || await prisma.jobAlertDelivery.create({
      data: {
        subscriberId: subscriber.id,
        deduplicationKey,
        jobIds: jobs.map((job) => job.id),
      },
    });

    const email = buildAlertEmail(subscriber, jobs);
    let response;
    try {
      response = await fetchFn("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": deduplicationKey,
        },
        body: JSON.stringify({
          from,
          to: [subscriber.email],
          subject: email.subject,
          html: email.html,
          headers: email.headers,
        }),
      });
    } catch (error) {
      await recordFailure(prisma, delivery, error.message);
      continue;
    }
    if (!response.ok) {
      await recordFailure(prisma, delivery, `Resend HTTP ${response.status}`);
      continue;
    }
    const result = await response.json().catch(() => ({}));
    await prisma.$transaction([
      prisma.jobAlertDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "SENT",
          attemptCount: delivery.attemptCount + 1,
          sentAt: new Date(),
          nextAttemptAt: null,
          lastError: null,
          providerMessageId: result.id || null,
        },
      }),
      prisma.jobAlertSubscriber.update({
        where: { id: subscriber.id },
        data: { lastNotifiedAt: jobs.at(-1).createdAt },
      }),
    ]);
    sent += 1;
  }

  console.log(`Email alerts: ${sent} digest${sent === 1 ? "" : "s"} sent`);
  return { sent, skipped: false };
}

module.exports = {
  buildAlertEmail,
  deliveryKey,
  escapeHtml,
  jobMatchesInterests,
  jobMatchesPreferences,
  sendJobAlertDigests,
};
