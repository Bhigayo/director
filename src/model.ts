// What Director stores, plus the camera language it uses. No UI or storage code here, so it's easy to test.

export const SIZES = ["wide", "full", "medium", "close", "detail", "overhead", "low"] as const;
export type Size = (typeof SIZES)[number];

export const SIZE_INFO: Record<Size, { label: string; how: string }> = {
  wide: { label: "Wide", how: "The whole scene. The person is small, so the place tells the story." },
  full: { label: "Full body", how: "Head to shoes, with a little space above and below." },
  medium: { label: "Medium", how: "Waist up. Good for faces and upper-body pieces." },
  close: { label: "Close-up", how: "Head and shoulders, or hands filling the frame." },
  detail: { label: "Detail", how: "Very close on fabric, stitching, a logo or a trim." },
  overhead: { label: "Overhead", how: "Phone pointing straight down from above." },
  low: { label: "Low angle", how: "Phone near the ground, looking up. Makes the subject feel bigger." },
};

export const MOVES = ["static", "push", "pull", "pan", "tilt", "orbit", "follow", "lead", "handheld"] as const;
export type Move = (typeof MOVES)[number];

export const MOVE_INFO: Record<Move, { label: string; how: string; gimbal: string }> = {
  static: {
    label: "Locked off",
    how: "Camera stays still and the subject moves.",
    gimbal: "Rest your elbows against your body, or put the gimbal on its tripod. Count three seconds before and after the action.",
  },
  push: {
    label: "Push in",
    how: "Move slowly towards the subject.",
    gimbal: "Walk forward heel to toe with your knees soft. Keep the speed even, and stop before you get too close to focus.",
  },
  pull: {
    label: "Pull out",
    how: "Move slowly away to reveal more.",
    gimbal: "Walk backwards heel to toe. Check behind you first, and have a friend spot you on busy streets.",
  },
  pan: {
    label: "Pan",
    how: "Turn left or right from one spot.",
    gimbal: "Use the joystick for a smooth, steady pan, or turn your whole body from the hips rather than your wrist.",
  },
  tilt: {
    label: "Tilt",
    how: "Tilt up or down from one spot.",
    gimbal: "Push the joystick up or down for an even tilt. Start and end on something worth looking at.",
  },
  orbit: {
    label: "Orbit",
    how: "Circle around the subject while keeping them centred.",
    gimbal: "Use Lock mode (hold the trigger) so the camera stays on the subject, then walk a half circle at the same distance.",
  },
  follow: {
    label: "Follow",
    how: "Walk behind or beside the subject at their pace.",
    gimbal: "Use Follow mode. Match their walking speed, and keep the gimbal low and level by the hips.",
  },
  lead: {
    label: "Lead",
    how: "Walk backwards in front of the subject as they walk towards you.",
    gimbal: "Use Follow mode and walk backwards at their pace, with a spotter behind you. Keep the same distance the whole time.",
  },
  handheld: {
    label: "Handheld energy",
    how: "Loose, quick movement with a little shake for energy.",
    gimbal: "Turn the gimbal off and hold the phone, or use Sport mode if your gimbal has it. Short, punchy clips.",
  },
};

export const FORMATS = ["9:16", "4:5", "16:9"] as const;
export type Format = (typeof FORMATS)[number];
export const FORMAT_INFO: Record<Format, string> = {
  "9:16": "Reels and TikTok",
  "4:5": "Instagram feed",
  "16:9": "YouTube and websites",
};

export type Shot = {
  id: string;
  title: string;
  size: Size;
  move: Move;
  subject: string; // what's in frame and what happens
  seconds: number;
  notes: string;
  done: boolean;
};

export type Place = { name: string; lat: number; lon: number };
export const BIRMINGHAM: Place = { name: "Birmingham", lat: 52.4862, lon: -1.8904 };

export type Shoot = {
  id: string;
  name: string;
  brief: string;
  pieces: string[]; // products or outfits to feature
  place: Place;
  spot: string; // the actual spot, e.g. "Digbeth, Custard Factory"
  date: string; // "YYYY-MM-DD" or ""
  format: Format;
  length: 15 | 30 | 60;
  shots: Shot[];
  refs: string[]; // reference photo keys
  created_at: string;
  updated_at: string;
};

export function newId() {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function makeShoot(fields: Partial<Shoot> = {}): Shoot {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: "New shoot",
    brief: "",
    pieces: [],
    place: BIRMINGHAM,
    spot: "",
    date: "",
    format: "9:16",
    length: 30,
    shots: [],
    refs: [],
    created_at: now,
    updated_at: now,
    ...fields,
  };
}

export function makeShot(fields: Partial<Shot> = {}): Shot {
  return { id: newId(), title: "New shot", size: "medium", move: "static", subject: "", seconds: 3, notes: "", done: false, ...fields };
}

export function totalSeconds(shots: Shot[]) {
  return shots.reduce((n, s) => n + s.seconds, 0);
}

/** "1:05" or "45s". */
export function formatDuration(seconds: number) {
  const s = Math.round(seconds);
  return s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`;
}

/** Splits "Varsity jacket, knit, cargos" or one-per-line text into a clean list. */
export function parseList(text: string) {
  return text
    .split(/[\n,]/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s, i, all) => s && all.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i);
}

/** Makes a shot list from any source (the AI, an old backup) safe to use: known sizes and moves, sensible lengths. */
export function cleanShots(raw: unknown): Shot[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
    .map((r) => {
      const size = SIZES.includes(r.size as Size) ? (r.size as Size) : "medium";
      const move = MOVES.includes(r.move as Move) ? (r.move as Move) : "static";
      const seconds = Math.min(15, Math.max(1, Math.round(Number(r.seconds) || 3)));
      const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
      return makeShot({ title: text(r.title, 60) || "Shot", size, move, subject: text(r.subject, 300), seconds, notes: text(r.notes, 300) });
    })
    .slice(0, 30);
}
