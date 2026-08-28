import prisma from "@/lib/prisma";

export async function buildAccountDataExport(userId, prismaClient = prisma) {
  const [user, subscriptions, payments] = await Promise.all([
    prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
          },
        },
        jobSeeker: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            cvUrl: true,
            headline: true,
            location: true,
            experienceLevel: true,
            workArrangement: true,
            portfolioUrl: true,
            createdAt: true,
            updatedAt: true,
            documents: {
              select: {
                id: true,
                name: true,
                kind: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
            applications: {
              select: {
                id: true,
                coverLetter: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                job: {
                  select: {
                    id: true,
                    slug: true,
                    title: true,
                    company: true,
                    location: true,
                    source: true,
                    sourceUrl: true,
                    deadline: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        employer: {
          select: {
            id: true,
            companyName: true,
            industry: true,
            website: true,
            logo: true,
            verified: true,
            verificationStatus: true,
            verificationNote: true,
            verifiedAt: true,
            createdAt: true,
            updatedAt: true,
            jobs: {
              select: {
                id: true,
                slug: true,
                title: true,
                company: true,
                location: true,
                category: true,
                type: true,
                salary: true,
                deadline: true,
                source: true,
                sourceUrl: true,
                featured: true,
                active: true,
                moderationStatus: true,
                moderationNote: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        freelancer: {
          select: {
            id: true,
            fullName: true,
            skills: true,
            bio: true,
            portfolio: true,
            phone: true,
            available: true,
            createdAt: true,
          },
        },
        savedJobs: {
          select: {
            id: true,
            createdAt: true,
            job: {
              select: {
                id: true,
                slug: true,
                title: true,
                company: true,
                location: true,
                source: true,
                sourceUrl: true,
                deadline: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        jobAlerts: {
          select: {
            id: true,
            email: true,
            categories: true,
            locations: true,
            experienceLevels: true,
            workArrangements: true,
            organisations: true,
            keywords: true,
            interests: true,
            active: true,
            consentedAt: true,
            lastNotifiedAt: true,
            createdAt: true,
            updatedAt: true,
            deliveries: {
              select: {
                id: true,
                status: true,
                jobIds: true,
                attemptCount: true,
                nextAttemptAt: true,
                sentAt: true,
                createdAt: true,
                updatedAt: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        auditEvents: {
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prismaClient.subscription.findMany({
      where: { userId },
      select: {
        id: true,
        plan: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prismaClient.payment.findMany({
      where: { userId },
      select: {
        id: true,
        amount: true,
        currency: true,
        reference: true,
        status: true,
        provider: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!user) return null;

  return {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    account: user,
    subscriptions,
    payments,
    notes: {
      authenticationSecretsExcluded: true,
      sessionTokensExcluded: true,
      privateDocumentStorageLocatorsExcluded: true,
      privateDocumentFilesNotEmbedded: true,
    },
  };
}
