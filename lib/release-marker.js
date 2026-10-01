import { readFile } from "node:fs/promises";
import { join } from "node:path";

const RELEASE_PATTERN = /^[0-9a-f]{40}$/;

async function readMarkerFile(path) {
  try {
    const value = await readFile(path, "utf8");
    const release = value.trim().toLowerCase();
    return RELEASE_PATTERN.test(release) ? release : null;
  } catch {
    return null;
  }
}

export async function readReleaseMarker(appDirectory) {
  if (appDirectory) {
    return readMarkerFile(join(appDirectory, ".next", ".daraja-commit"));
  }

  const workingDirectory = process.cwd();
  const candidates = [
    join(workingDirectory, ".next", ".daraja-commit"),
    join(workingDirectory, "runtime", ".next", ".daraja-commit"),
  ];

  for (const candidate of candidates) {
    const release = await readMarkerFile(candidate);
    if (release) return release;
  }

  return null;
}
