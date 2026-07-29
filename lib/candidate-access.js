import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export const candidateCareerEnabled = () =>
  process.env.CANDIDATE_CAREER_ENABLED === "true";

export async function getCandidateUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      jobSeeker: { select: { id: true } },
    },
  });
}

export async function ensureJobSeeker(tx, user) {
  if (user.jobSeeker) return user.jobSeeker;
  return tx.jobSeeker.create({
    data: {
      userId: user.id,
      fullName: user.name?.trim() || user.email.split("@")[0],
    },
    select: { id: true },
  });
}

export function validHttpsUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
