import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { DirectorProvider, useDirector } from "./app";
import Settings from "./Settings";
import ShootMode from "./ShootMode";
import ShootPage from "./ShootPage";
import Shoots from "./Shoots";

// Routes live after the # so the site works on GitHub Pages
type Route = { page: "home" } | { page: "shoot"; id: string } | { page: "go"; id: string } | { page: "settings" };

function readRoute(): Route {
  const [first, second] = location.hash.replace(/^#\/?/, "").split("/");
  if (first === "shoot" && second) return { page: "shoot", id: second };
  if (first === "go" && second) return { page: "go", id: second };
  if (first === "settings") return { page: "settings" };
  return { page: "home" };
}

function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onChange = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

function Shell() {
  const route = useRoute();
  const d = useDirector();
  if (!d.ready) return <div className="loading">Opening Director…</div>;
  return (
    <>
      {d.error && (
        <div className="error" role="alert">
          {d.error}
          <button className="text-button" onClick={d.clearError}>
            OK
          </button>
        </div>
      )}
      {route.page === "go" ? (
        <ShootMode id={route.id} />
      ) : (
        <main className="main">
          {route.page !== "settings" && (
            <a className="settings-link" href="#/settings" aria-label="Settings">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 2h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" />
              </svg>
            </a>
          )}
          {route.page === "home" && <Shoots />}
          {route.page === "shoot" && <ShootPage key={route.id} id={route.id} />}
          {route.page === "settings" && <Settings />}
        </main>
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DirectorProvider>
      <Shell />
    </DirectorProvider>
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
