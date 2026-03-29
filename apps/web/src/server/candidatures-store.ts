import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "candidatures.json");

export async function readCandidatures(): Promise<unknown[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    throw e;
  }
}

export async function writeCandidatures(list: unknown[]): Promise<void> {
  const dir = path.dirname(DATA_FILE);
  await mkdir(dir, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(list, null, 2), "utf8");
}
