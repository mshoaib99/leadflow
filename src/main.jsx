import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const states = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire",
  "New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota",
  "Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming"
];

const categories = [
  { id: "solar", label: "Solar", description: "Solar energy leads", icon: "☀" },
  { id: "home", label: "Home", description: "Home improvement leads", icon: "⌂" },
  { id: "mortgage", label: "Mortgage", description: "Mortgage leads", icon: "$" }
];

function App() {
  const [category, setCategory] = useState("home");
  const [mode, setMode] = useState("state");
  const [state, setState] = useState("California");
  const [zip, setZip] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState({ key: "", offset: 0 });

  function getSearchKey() {
    return JSON.stringify({ category, mode, value: mode === "state" ? state : zip.trim() });
  }

  function resetSearch() {
    setPage({ key: "", offset: 0 });
    setResults([]);
    setMessage("");
    setStatus("idle");
  }

  function changeCategory(value) {
    setCategory(value);
    resetSearch();
  }

  function changeMode(value) {
    setMode(value);
    resetSearch();
  }

  function changeState(value) {
    setState(value);
    setPage({ key: "", offset: 0 });
    setResults([]);
    setMessage("");
    setStatus("idle");
  }

  function changeZip(value) {
    setZip(value.replace(/\D/g, "").slice(0, 5));
    setPage({ key: "", offset: 0 });
    setResults([]);
    setMessage("");
    setStatus("idle");
  }

  async function searchLeads(e) {
    e.preventDefault();

    if (mode === "zip" && !/^\d{5}$/.test(zip.trim())) {
      setStatus("error");
      setResults([]);
      setMessage("Please enter a valid 5-digit ZIP code.");
      return;
    }

    const key = getSearchKey();
    const offset = page.key === key ? page.offset : 0;

    setStatus("loading");
    setMessage("");
    setResults([]);

    const body = { leadType: category, limit: 3, offset };
    if (mode === "state") body.state = state;
    else body.zip = zip.trim();

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");

      const rows = data.results || [];
      setResults(rows);
      setPage({ key, offset: data.nextOffset ?? 0 });
      setMessage(rows.length ? "" : "No leads were found for this search.");
      setStatus("done");
    } catch (err) {
      setMessage(err.message || "Database search failed.");
      setStatus("error");
      setResults([]);
    }
  }

  // The lead information is intentionally non-selectable and cannot be copied
  // through normal browser selection/context-menu shortcuts.
  useEffect(() => {
    const isLeadArea = (target) => target instanceof Element && !!target.closest(".lead-data");
    const preventCopy = (e) => {
      if (isLeadArea(e.target)) e.preventDefault();
    };
    const preventContextMenu = (e) => {
      if (isLeadArea(e.target)) e.preventDefault();
    };
    const preventShortcuts = (e) => {
      if (!isLeadArea(e.target)) return;
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "a"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    document.addEventListener("copy", preventCopy);
    document.addEventListener("cut", preventCopy);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("keydown", preventShortcuts);
    return () => {
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("cut", preventCopy);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("keydown", preventShortcuts);
    };
  }, []);

  const selectedCategory = categories.find(c => c.id === category);

  return (
    <main className="page">
      <header className="brand">
        <div className="brand-mark"><span>⌕</span></div>
        <div className="brand-copy">
          <h1>LeadFlow <span>Pro</span></h1>
          <p>Lead intelligence workspace</p>
        </div>
        <div className="workspace-status"><i /> Search workspace</div>
      </header>

      <section className="search-card">
        <div className="section-kicker">01 <span>LEAD CATEGORY</span></div>

        <div className="category-grid">
          {categories.map(item => (
            <button
              type="button"
              key={item.id}
              className={category === item.id ? "category-card active" : "category-card"}
              onClick={() => changeCategory(item.id)}
            >
              <span className="category-icon">{item.icon}</span>
              <span className="category-copy">
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
              {category === item.id && <span className="selected-dot" aria-hidden="true" />}
            </button>
          ))}
        </div>

        <div className="divider" />
        <div className="section-kicker">02 <span>DATABASE SEARCH</span></div>

        <div className="search-title-row">
          <div>
            <p className="eyebrow">CURRENT CATEGORY</p>
            <h2>{selectedCategory.label} leads</h2>
          </div>
          <div className="selected-pill"><span /> {selectedCategory.label}</div>
        </div>

        <div className="tabs" role="tablist" aria-label="Search method">
          <button type="button" className={mode === "state" ? "tab active" : "tab"} onClick={() => changeMode("state")}>
            <span>⌑</span> By State
          </button>
          <button type="button" className={mode === "zip" ? "tab active" : "tab"} onClick={() => changeMode("zip")}>
            <span>⌖</span> By ZIP Code
          </button>
        </div>

        <form onSubmit={searchLeads} className="search-form">
          {mode === "state" ? (
            <label className="field">
              <span>State</span>
              <div className="input-shell select-shell">
                <span className="field-icon">⌖</span>
                <select value={state} onChange={e => changeState(e.target.value)}>
                  {states.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </label>
          ) : (
            <label className="field">
              <span>ZIP Code</span>
              <div className="input-shell">
                <span className="field-icon">⌖</span>
                <input
                  inputMode="numeric"
                  maxLength="5"
                  value={zip}
                  onChange={e => changeZip(e.target.value)}
                  placeholder="Enter 5-digit ZIP code"
                  autoComplete="postal-code"
                />
              </div>
            </label>
          )}

          <button className="search-button" disabled={status === "loading"}>
            <span>{status === "loading" ? "Searching" : "Search leads"}</span>
            <b>→</b>
          </button>
        </form>
      </section>

      <section className="results">
        {status === "idle" && (
          <div className="empty">
            <div className="empty-icon">⌕</div>
            <h2>Ready to search</h2>
            <p>Select a state or enter a ZIP code to view leads.</p>
          </div>
        )}

        {status === "done" && !results.length && (
          <div className="empty">
            <div className="empty-icon">⌕</div>
            <h2>No leads found</h2>
            <p>{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="empty error">
            <div className="empty-icon">!</div>
            <h2>Search error</h2>
            <p>{message}</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="result-head">
              <div>
                <div className="result-kicker">SEARCH RESULTS</div>
                <h2>{selectedCategory.label} leads</h2>
              </div>
              <div className="result-mode">{mode === "zip" ? `ZIP ${zip}` : state}</div>
            </div>

            <div className="grid">
              {results.map((lead) => (
                <article className="lead-card lead-data" key={lead.id}>
                  <div className="lead-card-head">
                    <div className="initial">{(lead.name || "L").trim().charAt(0).toUpperCase()}</div>
                    <div className="record-type">{selectedCategory.label}</div>
                  </div>

                  <h3>{lead.name || "Unnamed lead"}</h3>

                  <div className="data-list">
                    <div className="data-row">
                      <span className="data-label">EMAIL</span>
                      <span className="data-value">{lead.email || "—"}</span>
                    </div>
                    <div className="data-row">
                      <span className="data-label">PHONE</span>
                      <span className="data-value">{lead.phone || "—"}</span>
                    </div>
                    <div className="data-row">
                      <span className="data-label">ADDRESS</span>
                      <span className="data-value">{lead.address || "—"}</span>
                    </div>
                    <div className="data-row two-col">
                      <div>
                        <span className="data-label">CITY</span>
                        <span className="data-value">{lead.city || "—"}</span>
                      </div>
                      <div>
                        <span className="data-label">STATE</span>
                        <span className="data-value">{lead.state || "—"}</span>
                      </div>
                    </div>
                    <div className="data-row">
                      <span className="data-label">ZIP CODE</span>
                      <span className="data-value">{lead.zip || "—"}</span>
                    </div>
                  </div>

                  <div className="manual-entry-note">
                    <span>i</span> View only • manual entry
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
