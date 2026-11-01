import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function loadState(path, startingCash) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { cashUsd: startingCash, positions: [], trades: [], day: new Date().toISOString().slice(0, 10), dayStartEquityUsd: startingCash, seenMints: [] };
  }
}

export async function saveState(path, state) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
}
