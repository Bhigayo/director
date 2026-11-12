// The built-in shot planner: no AI needed. Reads the brief for the setting and energy,
// then builds a shot list with a classic structure: open, introduce, details, movement, hero, close.

import { makeShot, type Move, type Shoot, type Shot, type Size } from "./model";

type Role = "open" | "intro" | "detail" | "move" | "hero" | "close";
type Tag = "street" | "studio" | "night" | "product" | "energetic" | "calm";

type Template = {
  role: Role;
  title: string;
  size: Size;
  move: Move;
  subject: string; // {piece} and {place} are filled in
  seconds: number;
  tags?: Tag[]; // fits these settings best
  avoid?: Tag[]; // doesn't fit these
  needs?: Tag[]; // only used when the brief mentions one of these
  notes?: string;
};

export const TEMPLATES: Template[] = [
  // Open
  { role: "open", title: "Establishing shot", size: "wide", move: "pan", subject: "{place} empty for a beat, then the model walks into frame.", seconds: 3, avoid: ["studio"] },
  { role: "open", title: "Sky to street", size: "wide", move: "tilt", subject: "Start on the sky or a rooftop, tilt down to {place}.", seconds: 3, tags: ["street"], avoid: ["studio", "night"] },
  { role: "open", title: "Set reveal", size: "wide", move: "pull", subject: "Start close on the backdrop texture, pull back to reveal the set.", seconds: 3, tags: ["studio"], needs: ["studio"] },
  { role: "open", title: "City lights", size: "wide", move: "static", subject: "Out-of-focus lights; the model steps into frame and into focus.", seconds: 3, tags: ["night"], needs: ["night"] },
  { role: "open", title: "Product on the street", size: "detail", move: "push", subject: "The {piece} folded on a step or a bench in {place}. Slow push in.", seconds: 3, tags: ["product"], needs: ["product"] },
  // Introduce
  { role: "intro", title: "Walk towards", size: "full", move: "lead", subject: "The model walks towards camera through {place} as you walk backwards ahead.", seconds: 4, avoid: ["studio"] },
  { role: "intro", title: "Over the shoulder", size: "medium", move: "follow", subject: "Follow just behind, over the shoulder, as they move through {place}.", seconds: 3, avoid: ["studio"] },
  { role: "intro", title: "Step into frame", size: "full", move: "static", subject: "Locked frame. The model steps in, stops in the centre and settles.", seconds: 3 },
  { role: "intro", title: "Side walk", size: "full", move: "follow", subject: "Walk alongside them, matching pace, with the background sliding past.", seconds: 3, tags: ["street", "energetic"], avoid: ["studio"] },
  // Details: one per piece
  { role: "detail", title: "Fabric close-up", size: "detail", move: "push", subject: "Slow push in on the {piece}'s fabric texture.", seconds: 2 },
  { role: "detail", title: "Logo and stitching", size: "detail", move: "tilt", subject: "Tilt across the {piece} and land on the logo or embroidery.", seconds: 2 },
  { role: "detail", title: "Hands and trims", size: "close", move: "static", subject: "Hands adjusting the {piece}: cuff, zip, collar or drawcord.", seconds: 2 },
  { role: "detail", title: "In motion", size: "detail", move: "handheld", subject: "The {piece}'s hem or sleeve moving as they walk.", seconds: 2, tags: ["energetic"] },
  { role: "detail", title: "Flat lay", size: "overhead", move: "push", subject: "The {piece} laid flat with a few props, top-down. Slow push down.", seconds: 3, tags: ["product", "studio"], needs: ["product", "studio"] },
  // Movement
  { role: "move", title: "Orbit", size: "medium", move: "orbit", subject: "Circle halfway round as the model stands still and looks past camera.", seconds: 4 },
  { role: "move", title: "Low walk", size: "low", move: "follow", subject: "Gimbal low by the knees, following the walk. Shoes and the hem of the {piece} in frame.", seconds: 3, avoid: ["studio"] },
  { role: "move", title: "The turn", size: "full", move: "static", subject: "The model turns slowly on the spot to show the full fit from every side.", seconds: 3 },
  { role: "move", title: "Whip pan", size: "medium", move: "pan", subject: "Whip pan away from the model fast. Start the next shot with a whip in, for a clean cut.", seconds: 1, tags: ["energetic"], avoid: ["calm"] },
  { role: "move", title: "Lean on the wall", size: "medium", move: "push", subject: "Model leans on a wall or railing in {place}, relaxed. Slow push in.", seconds: 4, tags: ["street", "calm"], avoid: ["studio"] },
  { role: "move", title: "Jump cut energy", size: "medium", move: "handheld", subject: "Three quick poses, each held for half a second. Cut them together.", seconds: 2, tags: ["energetic"], avoid: ["calm"] },
  // Hero
  { role: "hero", title: "Hero look", size: "medium", move: "push", subject: "The model looks straight down the lens. Very slow push in.", seconds: 4 },
  { role: "hero", title: "Full fit", size: "full", move: "static", subject: "The whole outfit, centred, in the best light. Hold for four seconds.", seconds: 4 },
  { role: "hero", title: "Low hero", size: "low", move: "tilt", subject: "Low angle, tilting up from the shoes to the face.", seconds: 3 },
  // Close
  { role: "close", title: "Walk away", size: "wide", move: "static", subject: "The model walks away down {place} until they're small in frame.", seconds: 3, avoid: ["studio"] },
  { role: "close", title: "Pull out", size: "wide", move: "pull", subject: "Pull back slowly from the model to the widest view.", seconds: 3 },
  { role: "close", title: "End card", size: "detail", move: "static", subject: "Close on the label or tag. Leave space for text on screen.", seconds: 2, notes: "Good spot for the brand name and drop date." },
];

const KEYWORDS: Record<Tag, RegExp> = {
  street: /\b(street|city|road|digbeth|town|urban|outside|outdoor|alley|bridge|canal|market|walk)/i,
  studio: /\b(studio|backdrop|indoor|inside|white wall|set\b)/i,
  night: /\b(night|neon|evening|dark|after dark|lights)/i,
  product: /\b(product|flat ?lay|no model|still life|packaging|unboxing)/i,
  energetic: /\b(loud|hype|energy|energetic|fast|bold|punchy|chaos|party|afrobeats|drill)/i,
  calm: /\b(calm|quiet|soft|slow|editorial|premium|minimal|moody|cinematic|clean)/i,
};

/** The settings and energy a brief describes. Street is assumed when nothing else is said. */
export function readBrief(text: string): Set<Tag> {
  const tags = new Set<Tag>();
  for (const [tag, re] of Object.entries(KEYWORDS) as [Tag, RegExp][]) if (re.test(text)) tags.add(tag);
  if (!tags.has("studio") && !tags.has("street")) tags.add("street");
  return tags;
}

/** How many shots of each role, by video length. */
const STRUCTURE: Record<15 | 30 | 60, Record<Role, number>> = {
  15: { open: 1, intro: 1, detail: 2, move: 1, hero: 1, close: 0 },
  30: { open: 1, intro: 2, detail: 3, move: 2, hero: 1, close: 1 },
  60: { open: 2, intro: 2, detail: 5, move: 3, hero: 2, close: 2 },
};

/** A small seeded random generator, so the same shoot gives the same plan until you ask for a new one. */
function seeded(seedText: string) {
  let seed = 0;
  for (const c of seedText) seed = (seed * 31 + c.charCodeAt(0)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function planShoot(shoot: Pick<Shoot, "brief" | "pieces" | "spot" | "place" | "length">, variant = 0): Shot[] {
  const tags = readBrief(`${shoot.brief} ${shoot.spot}`);
  const rnd = seeded(`${shoot.brief}|${variant}`);
  const place = shoot.spot.trim() || shoot.place.name;
  const pieces = shoot.pieces.length ? shoot.pieces : ["outfit"];
  const fill = (t: string, piece: string) => t.replaceAll("{piece}", piece).replaceAll("{place}", place);

  // Score templates for this brief: matching tags help, clashing tags rule them out
  const fits = (t: Template) => !(t.avoid ?? []).some((a) => tags.has(a)) && (!t.needs || t.needs.some((n) => tags.has(n)));
  const weight = (t: Template) => 1 + (t.tags ?? []).filter((x) => tags.has(x)).length * 2 + rnd() * 1.5;

  const shots: Shot[] = [];
  const counts = STRUCTURE[shoot.length];
  for (const role of ["open", "intro", "detail", "move", "hero", "close"] as Role[]) {
    const options = TEMPLATES.filter((t) => t.role === role && fits(t)).sort((a, b) => weight(b) - weight(a));
    // Details can repeat a shot type for different pieces; other roles never repeat a shot
    const n = role === "detail" ? Math.min(counts.detail, Math.max(2, pieces.length * 2)) : Math.min(counts[role], options.length);
    for (let i = 0; i < n && options.length; i++) {
      const t = options[i % options.length];
      const piece = pieces[i % pieces.length];
      shots.push(makeShot({ title: t.title, size: t.size, move: t.move, subject: fill(t.subject, piece), seconds: t.seconds, notes: t.notes ?? "" }));
    }
  }

  // Calm briefs hold shots longer; energetic ones cut faster. Then fit the total to the target length.
  const pace = tags.has("calm") && !tags.has("energetic") ? 1.25 : tags.has("energetic") && !tags.has("calm") ? 0.8 : 1;
  return fitLength(
    shots.map((s) => ({ ...s, seconds: s.seconds * pace })),
    shoot.length,
  );
}

/** Scales shot lengths so the edit lands near the target, keeping every shot at least a second. */
export function fitLength(shots: Shot[], target: number): Shot[] {
  const total = shots.reduce((n, s) => n + s.seconds, 0);
  if (!total) return shots;
  const scale = target / total;
  return shots.map((s) => ({ ...s, seconds: Math.max(1, Math.round(s.seconds * scale)) }));
}
