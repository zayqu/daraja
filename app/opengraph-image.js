import { ImageResponse } from "next/og";
import { OG_SIZE, ShareCard } from "@/lib/og-card";

export const alt = "Daraja: jobs in Tanzania";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(<ShareCard />, OG_SIZE);
}
