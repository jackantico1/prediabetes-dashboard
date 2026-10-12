import { getCurrentUser } from "@/lib/session";
import { describeAiError } from "@/lib/ai/client";
import { MAX_UPLOAD_BYTES, sniffMime } from "@/lib/ai/documents";
import { extractLabs } from "@/lib/ai/extractLabs";
import { normalizeMarker } from "@/lib/labs/markers";

export const maxDuration = 120;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ ok: false, error: "Please sign in." }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ ok: false, error: "No file received." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ ok: false, error: "That file is over 4 MB. Try a smaller PDF or a photo of the results page." }, { status: 413 });

  const data = new Uint8Array(await file.arrayBuffer());
  const mime = sniffMime(data);
  if (!mime) return Response.json({ ok: false, error: "Please upload a PDF or a photo (JPG, PNG, WebP)." }, { status: 415 });

  try {
    const extraction = await extractLabs(data, mime);
    const results = extraction.results.map((r) => ({ ...r, canonical: normalizeMarker(r.marker) }));
    return Response.json({ ok: true, extraction: { ...extraction, results }, filename: file.name });
  } catch (err) {
    console.error("extractLabs failed", err);
    return Response.json({ ok: false, error: describeAiError(err) }, { status: 502 });
  }
}
