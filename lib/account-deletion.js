import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import {
  finalizeStagedCandidateDocumentDeletion,
  isPrivateCandidateDocumentLocator,
  restoreStagedCandidateDocument,
  stageCandidateDocumentDeletion,
} from "@/lib/candidate-document-storage";

export const ACCOUNT_DELETION_CONFIRMATION = "DELETE MY ACCOUNT";

export class AccountDeletionError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "AccountDeletionError";
    this.code = code;
    this.status = status;
  }
}

function normalizedEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function stagePrivateDocuments(documents) {
  const stages = [];

  try {
    for (const document of documents) {
      if (!isPrivateCandidateDocumentLocator(document.url)) continue;
      const stage = await stageCandidateDocumentDeletion(document.url);
      if (stage) stages.push(stage);
    }
    return stages;
  } catch (error) {
    await Promise.allSettled(
      stages.map((stage) => restoreStagedCandidateDocument(stage)),
    );
    throw error;
  }
}

async function restorePrivateDocuments(stages) {
  const results = await Promise.allSettled(
    stages.map((stage) => restoreStagedCandidateDocument(stage)),
  );
  return results.every((result) => result.status === "fulfilled");
}

async function finalizePrivateDocuments(stages) {
  const results = await Promise.allSettled(
    stages.map((stage) => finalizeStagedCandidateDocumentDeletion(stage)),
  );
  return results.filter((result) => result.status === "rejected").length;
}

export async function eraseAccount(
  { userId, email, confirmation, acknowledgeDataLoss },
  prismaClient = prisma,
) {
  if (!userId) {
    throw new AccountDeletionError("UNAUTHENTICATED", "Sign in required", 401);
  }

  if (confirmation !== ACCOUNT_DELETION_CONFIRMATION || acknowledgeDataLoss !== true) {
    throw new AccountDeletionError(
      "CONFIRMATION_REQUIRED",
      `Type ${ACCOUNT_DELETION_CONFIRMATION} and confirm permanent data loss.`,
    );
  }

  const account = await prismaClient.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      employer: { select: { id: true } },
      freelancer: { select: { id: true } },
      jobSeeker: {
        select: {
          id: true,
          documents: { select: { id: true, url: true } },
        },
      },
    },
  });

  if (!account) {
    throw new AccountDeletionError("ACCOUNT_NOT_FOUND", "Account not found", 404);
  }

  if (
    !normalizedEmail(email) ||
    normalizedEmail(email) !== normalizedEmail(account.email)
  ) {
    throw new AccountDeletionError(
      "EMAIL_CONFIRMATION_FAILED",
      "Enter the email address on this Daraja account.",
    );
  }

  const stagedDocuments = await stagePrivateDocuments(
    account.jobSeeker?.documents || [],
  );
  const deletionReference = `deleted-account:${randomUUID()}`;

  try {
    await prismaClient.$transaction(async (tx) => {
      if (account.role === "ADMIN") {
        const adminCount = await tx.user.count({ where: { role: "ADMIN" } });
        if (adminCount <= 1) {
          throw new AccountDeletionError(
            "LAST_ADMIN",
            "Add another administrator before deleting the last admin account.",
            409,
          );
        }
      }

      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.verificationToken.deleteMany({
        where: { identifier: account.email },
      });
      await tx.jobAlertSubscriber.deleteMany({ where: { userId } });
      await tx.savedJob.deleteMany({ where: { userId } });

      await tx.job.updateMany({
        where: { submittedById: userId },
        data: { submittedById: null },
      });
      await tx.job.updateMany({
        where: { moderatedById: userId },
        data: { moderatedById: null },
      });

      if (account.jobSeeker) {
        await tx.application.deleteMany({
          where: { jobSeekerId: account.jobSeeker.id },
        });
        await tx.candidateDocument.deleteMany({
          where: { jobSeekerId: account.jobSeeker.id },
        });
        await tx.jobSeeker.delete({ where: { id: account.jobSeeker.id } });
      }

      if (account.freelancer) {
        await tx.freelancer.delete({ where: { id: account.freelancer.id } });
      }

      if (account.employer) {
        await tx.job.updateMany({
          where: { employerId: account.employer.id },
          data: { employerId: null },
        });
        await tx.auditEvent.updateMany({
          where: { employerId: account.employer.id },
          data: { employerId: null },
        });
        await tx.auditEvent.updateMany({
          where: {
            entityType: "Employer",
            entityId: account.employer.id,
          },
          data: { entityId: deletionReference },
        });
        await tx.employer.delete({ where: { id: account.employer.id } });
      }

      await tx.auditEvent.updateMany({
        where: { actorUserId: userId },
        data: { actorUserId: null },
      });
      await tx.auditEvent.updateMany({
        where: { entityType: "User", entityId: userId },
        data: { entityId: deletionReference },
      });

      await tx.payment.updateMany({
        where: { userId },
        data: { userId: deletionReference },
      });
      await tx.subscription.updateMany({
        where: { userId },
        data: { userId: deletionReference },
      });

      await tx.user.delete({ where: { id: userId } });

      await tx.auditEvent.create({
        data: {
          action: "ACCOUNT_DELETED",
          entityType: "DeletedAccount",
          entityId: deletionReference,
          metadata: { role: account.role },
        },
      });
    });
  } catch (error) {
    const restored = await restorePrivateDocuments(stagedDocuments);
    if (!restored) {
      throw new AccountDeletionError(
        "ERASURE_ROLLBACK_FAILED",
        "Account deletion could not be completed safely.",
        500,
      );
    }
    throw error;
  }

  const pendingFileCleanup = await finalizePrivateDocuments(stagedDocuments);
  if (pendingFileCleanup > 0) {
    await prismaClient.auditEvent
      .create({
        data: {
          action: "ACCOUNT_DELETION_FILE_CLEANUP_PENDING",
          entityType: "DeletedAccount",
          entityId: deletionReference,
          metadata: { pendingFileCount: pendingFileCleanup },
        },
      })
      .catch(() => {});
  }

  return {
    deleted: true,
    pendingFileCleanup,
  };
}
