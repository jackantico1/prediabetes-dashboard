import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const AI_MODEL = "claude-opus-5-5";

export const aiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

let client: Anthropic | null = null;
export function getAiClient(): Anthropic {
  if (!client) client = new Anthropic({ timeout: 90_000, maxRetries: 2 });
  return client;
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
  }
}

/** Human-readable message for an AI call failure. Never leaks the raw SDK error. */
export function describeAiError(err: unknown): string {
  if (err instanceof AiNotConfiguredError) return "AI features aren't set up on this server yet (missing ANTHROPIC_API_KEY).";
  if (err instanceof Anthropic.AuthenticationError) return "The Claude API key on this server was rejected.";
  if (err instanceof Anthropic.RateLimitError) return "Claude is busy right now. Try again in a minute.";
  if (err instanceof Anthropic.APIConnectionError) return "Couldn't reach Claude. Check the server's network connection.";
  if (err instanceof Anthropic.APIError) return `Claude returned an error (${err.status}). Try again.`;
  return "Something went wrong. Try again, or enter the values manually.";
}
