import "server-only";

type LogLevel = "info" | "warn" | "error";

function line(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: "zkshare",
    msg,
    ...meta,
  };
  const text = JSON.stringify(entry);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

export function logInfo(msg: string, meta?: Record<string, unknown>) {
  line("info", msg, meta);
}

export function logWarn(msg: string, meta?: Record<string, unknown>) {
  line("warn", msg, meta);
}

export function logError(msg: string, meta?: Record<string, unknown>) {
  line("error", msg, meta);
}
