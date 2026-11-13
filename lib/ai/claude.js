import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

// =====================================================================
// AI helper (Claude API). Used for two things only:
//   1. reading a pasted load (email / WhatsApp / load board text) into
//      the load form, and
//   2. explaining the top-ranked matches in plain English.
// The fit filter, distances and scores are ALWAYS calculated by our own
// code (lib/matching). The AI never decides whether a load fits.
//
// The API key is read from ANTHROPIC_API_KEY on the server only. It is
// never sent to the browser (no NEXT_PUBLIC_ prefix).
// =====================================================================

export const AI_MODEL = "claude-opus-5-5";

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export class AiError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

// Sends one request and returns JSON that matches the Zod `schema`.
export async function askForJson({ system, prompt, schema, effort = "low", maxTokens = 8000 }) {
  if (!aiConfigured()) {
    throw new AiError("AI is not set up yet: add ANTHROPIC_API_KEY to .env.local.", 503);
  }

  const client = new Anthropic({ timeout: 60_000, maxRetries: 2 });

  let response;
  try {
    response = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: maxTokens,
      // If the main model declines, the API retries on a fallback model
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages: [{ role: "user", content: prompt }],
      output_config: { effort, format: betaZodOutputFormat(schema) },
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new AiError("The AI key in ANTHROPIC_API_KEY is not valid.", 503);
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AiError("The AI is busy right now. Please try again in a minute.", 429);
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new AiError("Couldn't reach the AI service. Check your internet connection.", 502);
    }
    if (error instanceof Anthropic.APIError) {
      throw new AiError(`The AI service returned an error (${error.status}).`, 502);
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    throw new AiError("The AI declined this request. Please fill in the details by hand.", 422);
  }
  if (response.stop_reason === "max_tokens" || !response.parsed_output) {
    throw new AiError("The AI answer was incomplete. Please try again.", 502);
  }
  return response.parsed_output;
}
