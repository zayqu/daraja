import { ImageResponse } from "next/og";
import { OG_SIZE, ShareCard } from "@/lib/og-card";
import { findPublicJob } from "@/lib/public-job";

export const alt = "Job opportunity on Daraja";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }) {
  const { id } = await params;
  let job = null;
  try {
    job = await findPublicJob(id);
  } catch (error) {
    console.error("Job share image read failed:", error);
  }
  return new ImageResponse(<ShareCard job={job} />, OG_SIZE);
}
