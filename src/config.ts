import "dotenv/config";

const parsePort = (raw: string | undefined): number => {
  if (raw === undefined || raw.trim() === "") return 3000;
  //number instead of parseInt() because parseInt() can return NaN for invalid inputs, while Number() will throw an error
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
