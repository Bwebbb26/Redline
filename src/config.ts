import "dotenv/config";

const NODE_ENVS = ["development", "test", "production"] as const;
type NodeEnv = (typeof NODE_ENVS)[number];

const isNodeEnv = (value: string): value is NodeEnv =>
  (NODE_ENVS as readonly string[]).includes(value);

// A required variable has no safe fallback, so a missing one has to stop the process at
// boot rather than surface as `undefined` inside a request handler much later.
const requireEnv = (name: string): string => {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return raw.trim();
};

const parsePort = (raw: string | undefined): number => {
  if (raw === undefined || raw.trim() === "") return 3000;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port number: ${raw}`);
  }
  return port;
};
const parseNodeEnv = (raw: string | undefined): NodeEnv => {
  if (raw === undefined || raw.trim() === "") return "development";

  const value = raw.trim();
  if (!isNodeEnv(value)) {
    throw new Error(
      `Invalid NODE_ENV: "${raw}". Expected one of: ${NODE_ENVS.join(", ")}`,
    );
  }
  return value;
};
export const config = {
  port: parsePort(process.env.PORT),
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  databaseUrl: requireEnv("DATABASE_URL"),
} as const;
