// ESM loader hook used by the crypto self-audit script. Resolves:
//   - `server-only` → empty module (the production guard belongs to Next.js builds, not Node).
//   - `@/...`        → project-root relative path with explicit `.ts` extension when missing,
//                      so we can run the privacy-critical lib code directly under Node.

import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const stubUrl = pathToFileURL(path.join(here, "_empty.mjs")).href;

function resolveAlias(specifier) {
  if (!specifier.startsWith("@/")) return null;
  const rel = specifier.slice(2);
  const candidate = path.join(projectRoot, rel);
  const candidates = [
    candidate,
    candidate + ".ts",
    candidate + ".tsx",
    path.join(candidate, "index.ts"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return pathToFileURL(c).href;
  }
  return null;
}

export function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: stubUrl, shortCircuit: true, format: "module" };
  }
  const aliased = resolveAlias(specifier);
  if (aliased) {
    return { url: aliased, shortCircuit: true, format: "module" };
  }
  return nextResolve(specifier, context);
}
