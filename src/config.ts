import "dotenv/config";

const parsePort = (raw: string | undefined): number => {
  if (raw === undefined || raw.trim() === "") return 3000;
  // parseInt partially parses ("3000abc" -> 3000) while Number rejects the whole string ("3000abc" -> NaN).
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port number: ${raw}`);
  }
  return port;
};
export const config = {
  port: parsePort(process.env.PORT),
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;
