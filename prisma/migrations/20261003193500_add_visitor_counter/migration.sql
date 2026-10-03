-- CreateTable
CREATE TABLE "VisitorCounter" (
    "period" TEXT NOT NULL,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisitorCounter_pkey" PRIMARY KEY ("period")
);
