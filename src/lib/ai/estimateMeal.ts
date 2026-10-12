import "server-only";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AI_MODEL, AiNotConfiguredError, aiConfigured, getAiClient } from "./client";

export const MealEstimateSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      portion: z.string().describe("Assumed portion, e.g. '1 cup' or '2 slices'"),
      carbs_g: z.number(),
      protein_g: z.number(),
      fat_g: z.number(),
      fiber_g: z.number(),
      calories: z.number(),
    })
  ),
  total: z.object({
    carbs_g: z.number(),
    protein_g: z.number(),
    fat_g: z.number(),
    fiber_g: z.number(),
    calories: z.number(),
  }),
  confidence: z.enum(["low", "medium", "high"]),
  assumptions: z.string().describe("One or two short sentences on what was assumed about portions or preparation. Empty string if nothing notable."),
  glycemic_note: z.string().describe("One short, practical sentence about how this meal tends to affect blood glucose for someone with prediabetes, and one easy tweak if relevant. Plain language, no lecturing."),
});

export type MealEstimate = z.infer<typeof MealEstimateSchema>;

const SYSTEM = `You estimate the nutrition of meals described in plain English for a person managing prediabetes.
Rules:
- Use typical US portion sizes when the description doesn't give amounts, and state the assumption.
- Totals must equal the sum of the items (round to whole grams and calories).
- Be realistic rather than optimistic; restaurant and takeout portions are larger than home-cooked.
- Confidence is "high" when amounts are given, "medium" for ordinary descriptions, "low" when the description is vague or the food is highly variable.
- Keep the glycemic note to one sentence, encouraging and specific to this meal. Never mention medication.`;

export async function estimateMeal(description: string): Promise<MealEstimate> {
  if (!aiConfigured()) throw new AiNotConfiguredError();
  const client = getAiClient();
  const response = await client.messages.parse({
    model: AI_MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    output_config: { effort: "low", format: zodOutputFormat(MealEstimateSchema) },
    messages: [{ role: "user", content: `Meal: ${description.trim()}` }],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("Claude couldn't estimate this meal");
  }
  return response.parsed_output;
}
