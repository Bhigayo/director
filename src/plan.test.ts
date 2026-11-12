import { describe, expect, it } from "vitest";
import { buildPrompt, readResponse } from "./ai";
import { planShoot, readBrief } from "./library";
import { BIRMINGHAM, cleanShots, makeShoot, parseList, totalSeconds } from "./model";
import { sunDay } from "./sun";

const minutes = (d: Date | null) => (d ? d.getHours() * 60 + d.getMinutes() : NaN);
const hm = (h: number, m: number) => h * 60 + m;

describe("built-in planner", () => {
  const base = { brief: "AW26 on Birmingham streets, golden hour, calm and premium", pieces: ["varsity jacket", "funnel neck knit"], spot: "Digbeth", place: BIRMINGHAM, length: 30 as const };

  it("lands close to the target length and opens and closes the edit", () => {
    for (const length of [15, 30, 60] as const) {
      const shots = planShoot({ ...base, length });
      expect(Math.abs(totalSeconds(shots) - length)).toBeLessThanOrEqual(Math.ceil(shots.length / 2));
      expect(shots.every((s) => s.seconds >= 1)).toBe(true);
    }
    const shots = planShoot(base);
    expect(shots[0].size).toBe("wide");
    expect(shots.length).toBeGreaterThanOrEqual(8);
  });

  it("shows every piece up close and names the place", () => {
    const text = planShoot(base).map((s) => s.subject).join(" ");
    expect(text).toContain("varsity jacket");
    expect(text).toContain("funnel neck knit");
    expect(text).toContain("Digbeth");
  });

  it("keeps studio shoots off the street, and calm shoots free of whip pans", () => {
    const studio = planShoot({ ...base, brief: "white backdrop studio, minimal and calm", spot: "" });
    expect(studio.map((s) => s.title)).not.toContain("Walk towards");
    expect(studio.map((s) => s.title)).not.toContain("Whip pan");
    expect(studio[0].title).toBe("Set reveal");
    const titles = studio.filter((s) => !/close-up|stitching|trims|motion|lay/i.test(s.title)).map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length); // no repeated shots outside the details
  });

  it("reads the setting and energy from the brief", () => {
    expect([...readBrief("loud night shoot with neon")].sort()).toEqual(["energetic", "night", "street"]);
    expect(readBrief("studio flat lay, no model").has("product")).toBe(true);
  });

  it("gives a different plan when asked for another", () => {
    const a = planShoot({ ...base, length: 60 }).map((s) => s.title).join();
    const b = planShoot({ ...base, length: 60 }, 3).map((s) => s.title).join();
    expect(a).not.toBe(b);
  });
});

describe("light", () => {
  it("matches published Birmingham sunrise and sunset times", () => {
    const june = sunDay("2026-06-21", BIRMINGHAM.lat, BIRMINGHAM.lon);
    expect(Math.abs(minutes(june.sunrise) - hm(4, 43))).toBeLessThanOrEqual(4);
    expect(Math.abs(minutes(june.sunset) - hm(21, 34))).toBeLessThanOrEqual(4);
    const dec = sunDay("2026-12-21", BIRMINGHAM.lat, BIRMINGHAM.lon);
    expect(Math.abs(minutes(dec.sunrise) - hm(8, 15))).toBeLessThanOrEqual(4);
    expect(Math.abs(minutes(dec.sunset) - hm(15, 56))).toBeLessThanOrEqual(4);
  });

  it("puts golden hour before sunset and blue hour after it", () => {
    const d = sunDay("2026-11-14", BIRMINGHAM.lat, BIRMINGHAM.lon);
    expect(d.goldenEvening!.start < d.sunset!).toBe(true);
    expect(d.goldenEvening!.end >= d.sunset!).toBe(true);
    expect(d.blueEvening!.start >= d.goldenEvening!.end).toBe(true);
  });
});

describe("AI plans", () => {
  it("cleans whatever comes back", () => {
    const shots = readResponse({
      content: [
        { type: "text", text: "Here you go" },
        { type: "tool_use", name: "shot_list", input: { shots: [{ title: "Hero", size: "medium", move: "push", subject: "Look down the lens", seconds: 4 }, { title: "Odd", size: "drone", move: "fly", subject: "x", seconds: 99 }] } },
      ],
    });
    expect(shots.map((s) => [s.size, s.move, s.seconds])).toEqual([
      ["medium", "push", 4],
      ["medium", "static", 15],
    ]);
    expect(() => readResponse({ content: [] })).toThrow(/didn't return/);
    expect(cleanShots("nope")).toEqual([]);
  });

  it("tells the AI about the gear, place and pieces", () => {
    const p = buildPrompt(makeShoot({ brief: "Titi's Closet capsule", pieces: ["The Ace"], spot: "Jewellery Quarter" }), "golden hour 15:30-16:20");
    expect(p).toMatch(/Osmo Mobile 3/);
    expect(p).toMatch(/The Ace/);
    expect(p).toMatch(/Jewellery Quarter/);
    expect(p).toMatch(/golden hour 15:30/);
  });

  it("splits lists of pieces", () => {
    expect(parseList("Varsity jacket, knit\ncargos, knit")).toEqual(["Varsity jacket", "knit", "cargos"]);
  });
});
