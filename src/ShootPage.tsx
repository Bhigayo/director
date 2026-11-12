import { useMemo, useRef, useState } from "react";
import { aiPlan } from "./ai";
import { useDirector } from "./app";
import Frame from "./Frame";
import { planShoot } from "./library";
import {
  FORMAT_INFO,
  FORMATS,
  formatDuration,
  makeShot,
  MOVE_INFO,
  MOVES,
  parseList,
  SIZE_INFO,
  SIZES,
  totalSeconds,
  type Format,
  type Shoot,
  type Shot,
} from "./model";
import { searchPlaces } from "./places";
import { clock, sunDay } from "./sun";
import { Field, Segmented } from "./ui";

export default function ShootPage({ id }: { id: string }) {
  const d = useDirector();
  const shoot = d.shoots.find((s) => s.id === id);
  if (!shoot) {
    return (
      <div className="page">
        <p className="muted">That shoot isn't here any more.</p>
        <a className="button" href="#/">
          All shoots
        </a>
      </div>
    );
  }
  return <ShootEditor shoot={shoot} />;
}

function ShootEditor({ shoot }: { shoot: Shoot }) {
  const d = useDirector();
  const set = (fields: Partial<Shoot>) => d.saveShoot({ ...shoot, ...fields });
  const [piecesText, setPiecesText] = useState(shoot.pieces.join(", "));
  const [variant, setVariant] = useState(0);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const light = useMemo(() => (shoot.date ? sunDay(shoot.date, shoot.place.lat, shoot.place.lon) : null), [shoot.date, shoot.place]);
  const lightText = light?.goldenEvening ? `golden hour ${clock(light.goldenEvening.start)}–${clock(light.goldenEvening.end)}, sunset ${light.sunset ? clock(light.sunset) : "?"}` : "";

  const done = shoot.shots.filter((s) => s.done).length;
  const total = totalSeconds(shoot.shots);

  function confirmReplace() {
    return !shoot.shots.some((s) => s.done) || confirm("This replaces your shot list, including shots you've ticked off. Carry on?");
  }

  function builtIn() {
    if (!confirmReplace()) return;
    const next = shoot.shots.length ? variant + 1 : variant;
    setVariant(next);
    set({ shots: planShoot(shoot, next) });
    setPlanError(null);
  }

  async function withAi() {
    if (!confirmReplace()) return;
    setPlanning(true);
    setPlanError(null);
    try {
      set({ shots: await aiPlan(shoot, lightText, d.apiKey) });
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : "The AI plan failed. Try the built-in planner.");
    } finally {
      setPlanning(false);
    }
  }

  function updateShot(shot: Shot) {
    set({ shots: shoot.shots.map((s) => (s.id === shot.id ? shot : s)) });
  }

  function moveShot(i: number, by: number) {
    const shots = [...shoot.shots];
    const [s] = shots.splice(i, 1);
    shots.splice(Math.max(0, Math.min(shots.length, i + by)), 0, s);
    set({ shots });
  }

  async function copyList() {
    const lines = [
      `${shoot.name}${shoot.date ? ` · ${shoot.date}` : ""} · ${shoot.spot || shoot.place.name}`,
      lightText ? `Light: ${lightText}` : null,
      "",
      ...shoot.shots.map(
        (s, i) => `${i + 1}. ${s.title} (${SIZE_INFO[s.size].label}, ${MOVE_INFO[s.move].label}, ${s.seconds}s)\n   ${s.subject}${s.notes ? `\n   Tip: ${s.notes}` : ""}`,
      ),
    ].filter((l) => l !== null);
    const text = lines.join("\n");
    try {
      if (navigator.share) await navigator.share({ title: shoot.name, text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // share sheet closed
    }
  }

  return (
    <div className="page shoot-page">
      <header className="page-head">
        <a className="back" href="#/" aria-label="All shoots">
          ←
        </a>
        <input className="title-input" value={shoot.name} onChange={(e) => set({ name: e.target.value })} aria-label="Shoot name" placeholder="Shoot name" />
      </header>

      <section className="card">
        <h2>The brief</h2>
        <Field label="What's the idea?" hint="The mood, the setting and the energy. Words like street, studio, night, calm or loud change the plan.">
          <textarea rows={4} value={shoot.brief} onChange={(e) => set({ brief: e.target.value })} placeholder="e.g. Titi's Closet capsule in the Jewellery Quarter, soft and editorial, rose and cream" />
        </Field>
        <Field label="Pieces to feature" hint="Separate with commas. Each gets its own close-ups.">
          <input value={piecesText} onChange={(e) => setPiecesText(e.target.value)} onBlur={() => set({ pieces: parseList(piecesText) })} placeholder="e.g. The Ace, Love All, The Serve" />
        </Field>
        <div className="two">
          <Field label="Spot">
            <input value={shoot.spot} onChange={(e) => set({ spot: e.target.value })} placeholder="e.g. Digbeth" />
          </Field>
          <Field label="Date">
            <input type="date" value={shoot.date} onChange={(e) => set({ date: e.target.value })} />
          </Field>
        </div>
        <TownPicker shoot={shoot} onPick={(place) => set({ place })} />
        <div className="field">
          <span className="field-label">Format</span>
          <Segmented<Format> label="Format" value={shoot.format} onChange={(format) => set({ format })} options={FORMATS.map((f) => ({ value: f, label: f }))} />
          <span className="field-hint">{FORMAT_INFO[shoot.format]}</span>
        </div>
        <div className="field">
          <span className="field-label">Length</span>
          <Segmented<15 | 30 | 60>
            label="Length"
            value={shoot.length}
            onChange={(length) => set({ length })}
            options={[
              { value: 15, label: "15s" },
              { value: 30, label: "30s" },
              { value: 60, label: "60s" },
            ]}
          />
        </div>
        <Refs shoot={shoot} onChange={(refs) => set({ refs })} />
      </section>

      {light && (
        <section className="card light">
          <h2>The light</h2>
          <p className="muted">
            {new Date(shoot.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} in {shoot.place.name.split(",")[0]}
          </p>
          <div className="light-grid">
            {light.goldenMorning && <LightSlot label="Morning golden hour" w={light.goldenMorning} kind="gold" />}
            {light.sunrise && <LightSlot label="Sunrise" at={light.sunrise} />}
            {light.sunset && <LightSlot label="Sunset" at={light.sunset} />}
            {light.goldenEvening && <LightSlot label="Evening golden hour" w={light.goldenEvening} kind="gold" />}
            {light.blueEvening && <LightSlot label="Blue hour" w={light.blueEvening} kind="blue" />}
          </div>
          {light.goldenEvening && (
            <p className="light-tip">
              Be set up by {clock(new Date(light.goldenEvening.start.getTime() - 30 * 60_000))}. Shoot the hero shots and close-ups first, while the light is best.
            </p>
          )}
        </section>
      )}

      <section className="plan">
        <div className="plan-head">
          <h2>Shot list</h2>
          {shoot.shots.length > 0 && (
            <span className={`runtime ${Math.abs(total - shoot.length) > shoot.length * 0.25 ? "off" : ""}`}>
              {shoot.shots.length} shots · {formatDuration(total)} of {shoot.length}s
            </span>
          )}
        </div>
        <div className="plan-actions">
          <button className="button" onClick={builtIn} disabled={planning}>
            {shoot.shots.length ? "New version" : "Plan it"}
          </button>
          {d.apiKey ? (
            <button className="button ghost" onClick={withAi} disabled={planning}>
              {planning ? "Planning…" : "Plan with AI"}
            </button>
          ) : (
            <a className="text-button muted" href="#/settings">
              Add a Claude key for AI plans
            </a>
          )}
        </div>
        {planError && (
          <p className="error-text" role="alert">
            {planError}
          </p>
        )}

        <ol className="shots">
          {shoot.shots.map((shot, i) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              n={i + 1}
              format={shoot.format}
              onChange={updateShot}
              onDelete={() => set({ shots: shoot.shots.filter((s) => s.id !== shot.id) })}
              onUp={i > 0 ? () => moveShot(i, -1) : undefined}
              onDown={i < shoot.shots.length - 1 ? () => moveShot(i, 1) : undefined}
            />
          ))}
        </ol>
        <button className="add-shot" onClick={() => set({ shots: [...shoot.shots, makeShot()] })}>
          + Add a shot
        </button>
      </section>

      {shoot.shots.length > 0 && (
        <div className="go-bar">
          <a className="button go" href={`#/go/${shoot.id}`}>
            {done && done < shoot.shots.length ? `Carry on shooting (${done}/${shoot.shots.length})` : done === shoot.shots.length ? "Review the shoot" : "Start the shoot"}
          </a>
          <button className="button ghost" onClick={copyList}>
            {copied ? "Copied" : "Share list"}
          </button>
        </div>
      )}

      <div className="danger-zone">
        {confirmDelete ? (
          <>
            <button
              className="button danger small"
              onClick={() => {
                d.deleteShoot(shoot.id);
                location.hash = "#/";
              }}
            >
              Delete this shoot
            </button>
            <button className="text-button" onClick={() => setConfirmDelete(false)}>
              Keep it
            </button>
          </>
        ) : (
          <button className="text-button muted" onClick={() => setConfirmDelete(true)}>
            Delete shoot
          </button>
        )}
      </div>
    </div>
  );
}

function LightSlot({ label, w, at, kind }: { label: string; w?: { start: Date; end: Date }; at?: Date; kind?: "gold" | "blue" }) {
  return (
    <div className={`slot ${kind ?? ""}`}>
      <span>{label}</span>
      <b>{w ? `${clock(w.start)}–${clock(w.end)}` : clock(at!)}</b>
    </div>
  );
}

function TownPicker({ shoot, onPick }: { shoot: Shoot; onPick: (p: Shoot["place"]) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Shoot["place"][] | null>(null);
  if (!open)
    return (
      <p className="town">
        Town for the light times: <b>{shoot.place.name}</b>{" "}
        <button className="text-button" onClick={() => setOpen(true)}>
          Change
        </button>
      </p>
    );
  return (
    <div className="town-search">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (q.trim()) setResults(await searchPlaces(q.trim()).catch(() => []));
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a town or city" aria-label="Town or city" autoFocus />
        <button className="button small">Search</button>
      </form>
      {results && (
        <ul>
          {results.length === 0 && <li className="muted">No places found.</li>}
          {results.map((p) => (
            <li key={`${p.lat},${p.lon}`}>
              <button
                className="text-button"
                onClick={() => {
                  onPick(p);
                  setOpen(false);
                  setResults(null);
                }}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Refs({ shoot, onChange }: { shoot: Shoot; onChange: (refs: string[]) => void }) {
  const d = useDirector();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="field">
      <span className="field-label">References</span>
      <div className="refs">
        {shoot.refs.map((key) => (
          <div key={key} className="ref">
            {d.photoUrl(key) && <img src={d.photoUrl(key)} alt="Reference" />}
            <button aria-label="Remove reference" onClick={() => onChange(shoot.refs.filter((k) => k !== key))}>
              ×
            </button>
          </div>
        ))}
        <button className="ref add" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? "…" : "+"}
        </button>
      </div>
      <span className="field-hint">Screenshots and mood images, to show on the day.</span>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (!files.length) return;
          setBusy(true);
          const keys: string[] = [];
          for (const f of files) keys.push(await d.savePhoto(f));
          onChange([...shoot.refs, ...keys]);
          setBusy(false);
        }}
      />
    </div>
  );
}

function ShotCard({
  shot,
  n,
  format,
  onChange,
  onDelete,
  onUp,
  onDown,
}: {
  shot: Shot;
  n: number;
  format: Format;
  onChange: (s: Shot) => void;
  onDelete: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const set = (fields: Partial<Shot>) => onChange({ ...shot, ...fields });
  return (
    <li className={`shot ${shot.done ? "done" : ""}`}>
      <button className="shot-summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Frame size={shot.size} move={shot.move} format={format} className="shot-frame" />
        <span className="shot-text">
          <span className="shot-n">
            {n}
            {shot.done && " ✓"}
          </span>
          <b>{shot.title}</b>
          <span className="shot-meta">
            {SIZE_INFO[shot.size].label} · {MOVE_INFO[shot.move].label} · {shot.seconds}s
          </span>
          {!open && <span className="shot-subject">{shot.subject}</span>}
        </span>
      </button>
      {open && (
        <div className="shot-edit">
          <Field label="Shot name">
            <input value={shot.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="What happens">
            <textarea rows={3} value={shot.subject} onChange={(e) => set({ subject: e.target.value })} />
          </Field>
          <div className="two">
            <Field label="Framing">
              <select value={shot.size} onChange={(e) => set({ size: e.target.value as Shot["size"] })}>
                {SIZES.map((s) => (
                  <option key={s} value={s}>
                    {SIZE_INFO[s].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Camera move">
              <select value={shot.move} onChange={(e) => set({ move: e.target.value as Shot["move"] })}>
                {MOVES.map((m) => (
                  <option key={m} value={m}>
                    {MOVE_INFO[m].label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="gimbal-tip">
            <b>Gimbal:</b> {MOVE_INFO[shot.move].gimbal}
          </p>
          <div className="field">
            <span className="field-label">Length</span>
            <div className="stepper">
              <button onClick={() => set({ seconds: Math.max(1, shot.seconds - 1) })} aria-label="Shorter">
                −
              </button>
              <b>{shot.seconds}s</b>
              <button onClick={() => set({ seconds: Math.min(15, shot.seconds + 1) })} aria-label="Longer">
                +
              </button>
            </div>
          </div>
          <Field label="Notes">
            <input value={shot.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Props, wardrobe, anything to remember" />
          </Field>
          <div className="shot-tools">
            <button className="text-button" onClick={onUp} disabled={!onUp}>
              Move up
            </button>
            <button className="text-button" onClick={onDown} disabled={!onDown}>
              Move down
            </button>
            <button className="text-button" onClick={() => set({ done: !shot.done })}>
              {shot.done ? "Mark not done" : "Mark done"}
            </button>
            <button className="text-button danger-text" onClick={onDelete}>
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
