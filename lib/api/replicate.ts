export function getReplicateApiKey(): string | undefined {
  return process.env.REPLICATE_API_TOKEN ?? process.env.REPLICATE_API_KEY;
}
