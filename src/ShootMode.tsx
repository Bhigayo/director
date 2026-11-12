// On the day: one shot at a time, big and clear, with the screen kept awake.

import { useEffect, useState } from "react";
import { useDirector } from "./app";
import Frame from "./Frame";
import { MOVE_INFO, SIZE_INFO, type Shoot } from "./model";

export default function ShootMode({ id }: { id: string }) {
  const d = useDirector();
  const shoot = d.shoots.find((s) => s.id === id);
  if (!shoot || !shoot.shots.length) {
    return (
      <div className="go-page">
        <p>Nothing to shoot yet.</p>
        <a className="button" href="#/">
          All shoots
        </a>
      </div>
    );
  }
  return <Run shoot={shoot} />;
}

function Run({ shoot }: { shoot: Shoot }) {
  const d = useDirector();
  const firstOpen = shoot.shots.findIndex((s) => !s.done);
  const [i, setI] = useState(firstOpen === -1 ? shoot.shots.length : firstOpen);
  const [count, setCount] = useState<number | null>(null);
  const [showRefs, setShowRefs] = useState(false);

  // Keep the screen on while shooting
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const grab = () =>
      navigator.wakeLock
        ?.request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    grab();
    const again = () => document.visibilityState === "visible" && grab();
    document.addEventListener("visibilitychange", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      lock?.release().catch(() => {});
    };
  }, []);

  // The hold timer: counts the shot's length so you know when you've got enough
  useEffect(() => {
    if (count === null || count <= 0) return;
    const t = setTimeout(() => setCount((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [count]);

  useEffect(() => setCount(null), [i]);

  const finished = i >= shoot.shots.length;
  const shot = shoot.shots[i];
  const done = shoot.shots.filter((s) => s.done).length;

  function mark(doneValue: boolean) {
    d.saveShoot({ ...shoot, shots: shoot.shots.map((s, n) => (n === i ? { ...s, done: doneValue } : s)) });
    // Next shot that isn't done yet, or the end
    const next = shoot.shots.findIndex((s, n) => n > i && !s.done);
    setI(next === -1 ? shoot.shots.length : next);
  }

  if (finished) {
    const missed = shoot.shots.map((s, n) => ({ s, n })).filter(({ s }) => !s.done);
    return (
      <div className="go-page wrap">
        <p className="eyebrow">{shoot.name}</p>
        <h1>{missed.length ? "Nearly there" : "That's a wrap"}</h1>
        <p className="go-sub">
          {done} of {shoot.shots.length} shots done.
        </p>
        {missed.length > 0 && (
          <ul className="missed">
            {missed.map(({ s, n }) => (
              <li key={s.id}>
                <button className="text-button" onClick={() => setI(n)}>
                  {n + 1}. {s.title}
                </button>
              </li>
            ))}
          </ul>
        )}
        <a className="button" href={`#/shoot/${shoot.id}`}>
          Back to the plan
        </a>
      </div>
    );
  }

  const move = MOVE_INFO[shot.move];
  return (
    <div className="go-page">
      <header className="go-top">
        <a href={`#/shoot/${shoot.id}`} className="go-close" aria-label="Leave shoot mode">
          ✕
        </a>
        <span>
          Shot {i + 1} of {shoot.shots.length}
        </span>
        {shoot.refs.length > 0 ? (
          <button className="go-refs" onClick={() => setShowRefs((v) => !v)}>
            {showRefs ? "Shot" : "Refs"}
          </button>
        ) : (
          <span />
        )}
      </header>
      <div className="go-progress" aria-hidden="true">
        {shoot.shots.map((s, n) => (
          <span key={s.id} className={`${s.done ? "done" : ""} ${n === i ? "now" : ""}`} />
        ))}
      </div>

      {showRefs ? (
        <div className="go-ref-grid">
          {shoot.refs.map((k) => d.photoUrl(k) && <img key={k} src={d.photoUrl(k)} alt="Reference" />)}
        </div>
      ) : (
        <>
          <Frame size={shot.size} move={shot.move} format={shoot.format} className="go-frame" />
          <h1 className="go-title">{shot.title}</h1>
          <p className="go-tags">
            <span>{SIZE_INFO[shot.size].label}</span>
            <span>{move.label}</span>
            <span>{shot.seconds}s</span>
          </p>
          <p className="go-subject">{shot.subject}</p>
          <div className="go-tip">
            <b>{move.label}:</b> {move.how} {move.gimbal}
          </div>
          {shot.notes && <p className="go-notes">{shot.notes}</p>}
        </>
      )}

      <div className="go-actions">
        <button className="button ghost" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0} aria-label="Previous shot">
          ←
        </button>
        <button className={`button hold ${count === 0 ? "ok" : ""}`} onClick={() => setCount(shot.seconds + 2)}>
          {count === null ? `Hold ${shot.seconds + 2}s` : count > 0 ? `${count}` : "Got enough"}
        </button>
        <button className="button got" onClick={() => mark(true)}>
          Got it ✓
        </button>
      </div>
      <button className="text-button skip" onClick={() => setI((n) => n + 1)}>
        Skip for now
      </button>
    </div>
  );
}
