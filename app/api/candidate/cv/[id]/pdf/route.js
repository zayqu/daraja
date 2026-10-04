import prisma from "@/lib/prisma";
import { candidateCareerEnabled, getCandidateUser } from "@/lib/candidate-access";
import { normalizeCvContent, normalizeCvTheme } from "@/lib/cv-builder";
import { buildCandidateCvPdf, candidateCvPdfFilename } from "@/lib/cv-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, context) {
  if (!candidateCareerEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const user = await getCandidateUser();
  if (!user) {
    return new Response("Sign in required", { status: 401 });
  }
  if (!user.jobSeeker) {
    return new Response("CV not found", { status: 404 });
  }

  const { id } = await context.params;
  const record = await prisma.candidateCv.findFirst({
    where: { id, jobSeekerId: user.jobSeeker.id },
  });

  if (!record) {
    return new Response("CV not found", { status: 404 });
  }

  const cv = {
    ...record,
    content: normalizeCvContent(record.content),
    theme: normalizeCvTheme(record.theme),
  };

  const pdf = buildCandidateCvPdf(cv);
  const filename = candidateCvPdfFilename(cv);
  const encoded = encodeURIComponent(filename);

  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
