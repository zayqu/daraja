import prisma from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;
const EAST_AFRICA_OFFSET_MS = 3 * 60 * 60 * 1000;

// Today's calendar day in Tanzania as a UTC-midnight Date (stored as DATE).
export function tanzaniaDay(date = new Date(), offsetDays = 0) {
  const local = new Date(date.getTime() + EAST_AFRICA_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + offsetDays * DAY_MS);
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse/i;

export function isLikelyBot(userAgent) {
  return !userAgent || BOT.test(userAgent);
}

// One more view of a published job today.
export async function recordJobView(jobId, now = new Date()) {
  const day = tanzaniaDay(now);
  await prisma.jobViewDay.upsert({
    where: { jobId_day: { jobId, day } },
    create: { jobId, day, views: 1 },
    update: { views: { increment: 1 } },
  });
}

// Total views per job id (all time).
export async function viewTotalsByJob(jobIds) {
  if (!jobIds.length) return {};
  const rows = await prisma.jobViewDay.groupBy({
    by: ["jobId"],
    where: { jobId: { in: jobIds } },
    _sum: { views: true },
  });
  return Object.fromEntries(rows.map((row) => [row.jobId, row._sum.views || 0]));
}

// Views this week (last 7 days including today) and the 7 days before.
export async function weeklyViews(jobWhere, now = new Date()) {
  const thisWeek = tanzaniaDay(now, -6);
  const lastWeek = tanzaniaDay(now, -13);
  const [current, previous] = await Promise.all([
    prisma.jobViewDay.aggregate({ where: { job: jobWhere, day: { gte: thisWeek } }, _sum: { views: true } }),
    prisma.jobViewDay.aggregate({ where: { job: jobWhere, day: { gte: lastWeek, lt: thisWeek } }, _sum: { views: true } }),
  ]);
  return { thisWeek: current._sum.views || 0, lastWeek: previous._sum.views || 0 };
}

// "+18% on last week", or a plain note when there is nothing to compare.
export function weeklyChangeLabel({ thisWeek, lastWeek }) {
  if (!lastWeek) return thisWeek ? "First week with views" : "No views yet";
  const change = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  if (change === 0) return "Same as last week";
  return `${change > 0 ? "+" : ""}${change}% on last week`;
}
