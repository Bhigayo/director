import { useState } from "react";
import { MODEL } from "./ai";
import { useDirector } from "./app";

export default function Settings() {
  const d = useDirector();
  const [key, setKey] = useState(d.apiKey);
  const [saved, setSaved] = useState(false);

  return (
    <div className="page settings">
      <header className="page-head">
        <a className="back" href="#/" aria-label="All shoots">
          ←
        </a>
        <h1>Settings</h1>
      </header>

      <section className="card">
        <h2>AI shot lists (optional)</h2>
        <p className="muted">
          Director plans shoots on its own. Add your own Claude API key and it can also write a plan tailored to your brief, using {MODEL}. Each plan costs a few pence on your Anthropic account.
        </p>
        <p className="muted">The key is saved only on this device and is only ever sent to Anthropic. Don't use this on a shared device.</p>
        <form
          className="key-form"
          onSubmit={(e) => {
            e.preventDefault();
            d.setApiKey(key.trim());
            setSaved(true);
          }}
        >
          <input type="password" value={key} onChange={(e) => (setKey(e.target.value), setSaved(false))} placeholder="sk-ant-…" autoComplete="off" aria-label="Claude API key" />
          <button className="button small">Save</button>
        </form>
        {saved && <p className="ok-text">{key.trim() ? "Saved. Plan with AI is now on every shoot." : "Key removed."}</p>}
        {d.apiKey && (
          <button
            className="text-button muted"
            onClick={() => {
              setKey("");
              d.setApiKey("");
              setSaved(true);
            }}
          >
            Remove key
          </button>
        )}
        <p className="field-hint">Get a key at console.anthropic.com → API keys. Set a monthly spend limit there too.</p>
      </section>

      <section className="card">
        <h2>Install it</h2>
        <p className="muted">On iPhone: open this page in Safari, tap Share, then Add to Home Screen. It opens like an app and works offline on the day, apart from AI plans.</p>
      </section>
    </div>
  );
}
