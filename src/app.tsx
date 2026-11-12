// The app's state and actions, shared with every screen. Changes show straight away and save in the background.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { db } from "./db";
import { shrinkImage } from "./image";
import { planShoot } from "./library";
import { makeShoot, newId, type Shoot } from "./model";

type Director = {
  ready: boolean;
  shoots: Shoot[];
  apiKey: string;
  error: string | null;
  clearError(): void;
  photoUrl(key: string | null): string | undefined;
  savePhoto(file: Blob): Promise<string>;
  saveShoot(shoot: Shoot): void;
  deleteShoot(id: string): void;
  addExample(): Shoot;
  setApiKey(key: string): void;
};

const Ctx = createContext<Director | null>(null);

export function useDirector() {
  const d = useContext(Ctx);
  if (!d) throw new Error("useDirector must be used inside DirectorProvider");
  return d;
}

/** The next Saturday, for the example shoot. */
function nextSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

export function DirectorProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [shoots, setShoots] = useState<Shoot[]>([]);
  const [apiKey, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const requested = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pending = useRef(new Map<string, Shoot>());

  const fail = useCallback((e: unknown) => {
    console.error(e);
    setError("Couldn't save that change on this device. If your storage is full, free some space and try again.");
  }, []);

  useEffect(() => {
    Promise.all([db.allShoots(), db.getSetting<string>("apiKey")])
      .then(([all, key]) => {
        setShoots(all.sort((a, b) => b.updated_at.localeCompare(a.updated_at)));
        if (key) setKey(key);
      })
      .catch((e) => {
        console.error(e);
        setError("This browser won't let Director save on the device. Private browsing blocks it, so try a normal tab.");
      })
      .finally(() => setReady(true));
    navigator.storage?.persist?.().catch(() => {});
    // Save anything still waiting when the app is closed or put in the background
    const flush = () => {
      if (document.visibilityState !== "hidden") return;
      for (const [id, shoot] of pending.current) {
        clearTimeout(timers.current.get(id));
        db.putShoot(shoot).catch(() => {});
      }
      pending.current.clear();
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, []);

  const photoUrl = useCallback(
    (key: string | null) => {
      if (!key) return undefined;
      if (!urls[key] && !requested.current.has(key)) {
        requested.current.add(key);
        db.getPhoto(key).then((blob) => blob && setUrls((u) => ({ ...u, [key]: URL.createObjectURL(blob) })));
      }
      return urls[key];
    },
    [urls],
  );

  const value: Director = {
    ready,
    shoots,
    apiKey,
    error,
    clearError: () => setError(null),
    photoUrl,

    async savePhoto(file) {
      const small = await shrinkImage(file);
      const key = newId();
      await db.putPhoto(key, small);
      requested.current.add(key);
      setUrls((u) => ({ ...u, [key]: URL.createObjectURL(small) }));
      return key;
    },

    // Typing saves after a short pause, so each keystroke isn't a write
    saveShoot(shoot) {
      const updated = { ...shoot, updated_at: new Date().toISOString() };
      setShoots((all) => (all.some((s) => s.id === updated.id) ? all.map((s) => (s.id === updated.id ? updated : s)) : [updated, ...all]));
      clearTimeout(timers.current.get(updated.id));
      pending.current.set(updated.id, updated);
      timers.current.set(
        updated.id,
        setTimeout(() => {
          pending.current.delete(updated.id);
          db.putShoot(updated).catch(fail);
        }, 400),
      );
    },

    deleteShoot(id) {
      const shoot = shoots.find((s) => s.id === id);
      clearTimeout(timers.current.get(id));
      pending.current.delete(id);
      setShoots((all) => all.filter((s) => s.id !== id));
      db.deleteShoot(id)
        .then(() => Promise.all((shoot?.refs ?? []).map((k) => db.deletePhoto(k))))
        .catch(fail);
    },

    addExample() {
      const shoot = makeShoot({
        name: "AW26: Colder Tomorrow",
        brief: "Autumn/winter drop on Birmingham streets at golden hour. Calm, premium and cinematic. Maroon, rose, chocolate and cream. Same streets, different dreams.",
        pieces: ["varsity jacket", "funnel neck knit", "heavyweight sweatpants"],
        spot: "Digbeth",
        date: nextSaturday(),
        length: 30,
      });
      shoot.shots = planShoot(shoot);
      setShoots((all) => [shoot, ...all]);
      db.putShoot(shoot).catch(fail);
      return shoot;
    },

    setApiKey(key) {
      setKey(key);
      db.putSetting("apiKey", key).catch(fail);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
