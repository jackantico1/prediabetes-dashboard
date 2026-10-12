import "server-only";
import type { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AI_MODEL, AiNotConfiguredError, aiConfigured, getAiClient } from "./client";

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel request body limit is 4.5 MB
export const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedMime = (typeof ACCEPTED_MIME)[number];

export function isAcceptedMime(m: string): m is AcceptedMime {
  return (ACCEPTED_MIME as readonly string[]).includes(m);
}

/** Sniff the real file type from magic bytes so a renamed file can't lie about its MIME type. */
export function sniffMime(buf: Uint8Array): AcceptedMime | null {
  if (buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "application/pdf";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length > 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "image/webp";
  return null;
}

function fileBlock(data: Uint8Array, mime: AcceptedMime): Anthropic.ContentBlockParam {
  const b64 = Buffer.from(data).toString("base64");
  if (mime === "application/pdf") return { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } };
  return { type: "image", source: { type: "base64", media_type: mime, data: b64 } };
}

/**
 * Extracts structured data from an uploaded PDF or image using Claude structured outputs.
 * The file is sent inline and never stored.
 */
export async function extractFromDocument<S extends z.ZodType>(
  data: Uint8Array,
  mime: AcceptedMime,
  schema: S,
  system: string,
  instruction: string
): Promise<z.infer<S>> {
  if (!aiConfigured()) throw new AiNotConfiguredError();
  const client = getAiClient();
  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 8000,
    system,
    output_config: { effort: "medium", format: zodOutputFormat(schema) },
    messages: [{ role: "user", content: [fileBlock(data, mime), { type: "text", text: instruction }] }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("Claude could not read this document");
  }
  return response.parsed_output;
}
