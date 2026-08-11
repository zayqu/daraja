import { readFile } from "node:fs/promises";
import { join } from "node:path";

const RELEASE_PATTERN = /^[0-9a-f]{40}$/;

export async function readReleaseMarker(appDirectory = process.cwd()) {
  try {
    const value = await readFile(
      join(appDirectory, ".next", ".daraja-commit"),
      "utf8",
    );
    const release = value.trim().toLowerCase();
    return RELEASE_PATTERN.test(release) ? release : null;
  } catch {
    return null;
  }
}

