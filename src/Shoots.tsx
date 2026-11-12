import { useDirector } from "./app";
import Frame from "./Frame";
import { formatDuration, makeShoot, totalSeconds } from "./model";

export default function Shoots() {
  const d = useDirector();

  function create() {
    const shoot = makeShoot();
    d.saveShoot(shoot);
    location.hash = `#/shoot/${shoot.id}`;
  }

  return (
    <div className="page">
      <header className="home-head">
        <p className="eyebrow">Your creative director</p>
        <h1>Director</h1>
        <p className="lede">Describe the shoot. Get a shot list with framing, camera moves and gimbal tips, then work through it on the day.</p>
        <button className="button" onClick={create}>
          New shoot
        </button>
      </header>

      {d.shoots.length === 0 ? (
        <div className="empty-card">
          <p>No shoots yet.</p>
          <button
            className="text-button"
            onClick={() => {
              const s = d.addExample();
              location.hash = `#/shoot/${s.id}`;
            }}
          >
            See an example: an AW26 shoot in Digbeth
          </button>
        </div>
      ) : (
        <ul className="shoot-list">
          {d.shoots.map((s) => {
            const done = s.shots.filter((x) => x.done).length;
            const first = s.shots[0];
            return (
              <li key={s.id}>
                <a href={`#/shoot/${s.id}`} className="shoot-card">
                  <div className="shoot-thumb">{first ? <Frame size={first.size} move={first.move} format="4:5" /> : <span>✦</span>}</div>
                  <div className="shoot-info">
                    <b>{s.name || "Untitled shoot"}</b>
                    <span>
                      {[s.date && new Date(s.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }), s.spot || s.place.name].filter(Boolean).join(" · ")}
                    </span>
                    <span className="muted">
                      {s.shots.length ? `${s.shots.length} shots · ${formatDuration(totalSeconds(s.shots))} · ${done}/${s.shots.length} done` : "No shot list yet"}
                    </span>
                  </div>
                  {s.shots.length > 0 && <span className="progress-ring" style={{ ["--p" as string]: done / s.shots.length }} aria-hidden="true" />}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
