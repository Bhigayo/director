// Optional: an AI-written shot list, using your own Claude API key.
// The key is stored only on this device and sent only to Anthropic.

import { cleanShots, FORMAT_INFO, MOVE_INFO, MOVES, SIZE_INFO, SIZES, type Shoot, type Shot } from "./model";

export const MODEL = "claude-sonnet-5-5";

export function buildPrompt(shoot: Shoot, light: string) {
  return [
    `Plan a ${shoot.length}-second ${shoot.format} video (${FORMAT_INFO[shoot.format]}) for a small clothing brand.`,
    `Brief: ${shoot.brief || "(no brief given)"}`,
    `Pieces to feature: ${shoot.pieces.join(", ") || "the outfit"}`,
    `Location: ${shoot.spot || shoot.place.name}`,
    light && `Light on the day: ${light}`,
    "Gear: an iPhone on a DJI Osmo Mobile 3 gimbal, filmed by one person, often with one model.",
    `Use only these shot sizes: ${SIZES.map((s) => `${s} (${SIZE_INFO[s].label})`).join(", ")}.`,
    `Use only these moves: ${MOVES.map((m) => `${m} (${MOVE_INFO[m].how})`).join("; ")}.`,
    `Shot lengths should add up to about ${shoot.length} seconds. Open strong, show every piece up close at least once, build to a hero shot, and end with something that leaves room for the brand name.`,
    "Write each subject as a direct instruction a friend could follow on the day. Put practical tips in notes.",
  ]
    .filter(Boolean)
    .join("\n");
}

const TOOL = {
  name: "shot_list",
  description: "The finished shot list, in the order it will be edited.",
  input_schema: {
    type: "object",
    properties: {
      shots: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Two to four words" },
            size: { type: "string", enum: [...SIZES] },
            move: { type: "string", enum: [...MOVES] },
            subject: { type: "string", description: "What's in frame and what happens, as an instruction" },
            seconds: { type: "number" },
            notes: { type: "string", description: "Practical tip for getting the shot, or empty" },
          },
          required: ["title", "size", "move", "subject", "seconds"],
        },
      },
    },
    required: ["shots"],
  },
};

/** Reads the shot list out of a Messages API response. */
export function readResponse(json: unknown): Shot[] {
  const content = (json as { content?: { type: string; name?: string; input?: { shots?: unknown } }[] })?.content ?? [];
  const call = content.find((c) => c.type === "tool_use" && c.name === TOOL.name);
  const shots = cleanShots(call?.input?.shots);
  if (!shots.length) throw new Error("The AI didn't return a shot list. Try again.");
  return shots;
}

export async function aiPlan(shoot: Shoot, light: string, apiKey: string): Promise<Shot[]> {
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: "You are a creative director for fashion content, planning shoots that one person can film on a phone and gimbal.",
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [{ role: "user", content: buildPrompt(shoot, light) }],
      }),
    });
  } catch {
    throw new Error("Couldn't reach the AI. Check your connection.");
  }
  if (res.status === 401) throw new Error("That API key wasn't accepted. Check it in Settings.");
  if (res.status === 429) throw new Error("The AI is busy or your key has hit its limit. Try again in a minute.");
  if (!res.ok) throw new Error(`The AI request failed (${res.status}). Try again, or use the built-in planner.`);
  return readResponse(await res.json());
}
