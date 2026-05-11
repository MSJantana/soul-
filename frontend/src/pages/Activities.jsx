import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearAuth, getAuth } from "../api";

const PERIODS = ["SEMANAL", "MES", "QUADRIENAL", "SEMESTRAL", "ANO"];
const AREAS = [
  "DISCIPLINAS",
  "CELEBRACAO",
  "LIDERANCA",
  "FAMILIA",
  "MISSAO_SOCIAL",
  "EVENTOS_IGREJA",
  "IDENTIDADE",
];

const PERIOD_LABEL = {
  SEMANAL: "SEMANAL",
  MES: "MÊS",
  QUADRIENAL: "QUADRIENAL",
  SEMESTRAL: "SEMESTRAL",
  SEMETRAL: "SEMESTRAL",
  ANO: "ANO",
  WEEK: "SEMANAL",
  MONTH: "MÊS",
  QUARTER: "QUADRIENAL",
  SEMESTER: "SEMESTRAL",
  YEAR: "ANO",
};

function periodLabel(period) {
  return PERIOD_LABEL[String(period)] || String(period || "");
}

function normalizePeriod(period) {
  if (period === "WEEK") return "SEMANAL";
  if (period === "MONTH") return "MES";
  if (period === "QUARTER") return "QUADRIENAL";
  if (period === "SEMESTER") return "SEMESTRAL";
  if (period === "SEMETRAL") return "SEMESTRAL";
  if (period === "YEAR") return "ANO";
  return period;
}

function Icon({ name }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5 3 11v10a1 1 0 0 0 1 1h5v-7h6v7h5a1 1 0 0 0 1-1V11l-9-7.5Zm7 17h-3v-7a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v7H5v-8.8l7-5.8 7 5.8v8.8Z" />
      </svg>
    );
  }
  if (name === "list") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 6h14v2H7V6Zm0 5h14v2H7v-2Zm0 5h14v2H7v-2ZM3 6h2v2H3V6Zm0 5h2v2H3v-2Zm0 5h2v2H3v-2Z" />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z" />
      </svg>
    );
  }
  if (name === "close") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.3 19.71 2.89 18.29 9.17 12 2.89 5.71 4.3 4.29l6.29 6.3 6.3-6.3 1.41 1.42Z" />
      </svg>
    );
  }
  if (name === "refresh") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.9 9.33h-2.07A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L14 10h6V4l-2.35 2.35Z" />
      </svg>
    );
  }
  if (name === "id") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm2 0v10h14V7H5Zm2 2h6v2H7V9Zm0 4h10v2H7v-2Z" />
      </svg>
    );
  }
  if (name === "edit") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92 1.83H5v-.92l9.06-9.06.92.92-9.06 9.06ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
      </svg>
    );
  }
  if (name === "trash") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 7h12l-1 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7Zm4-4h4l1 2h5v2H4V5h5l1-2Zm0 8h2v9h-2v-9Zm4 0h2v9h-2v-9Z" />
      </svg>
    );
  }
  if (name === "chevLeft") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59Z" />
      </svg>
    );
  }
  if (name === "chevRight") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m8.59 16.59 1.41 1.41 6-6-6-6-1.41 1.41L13.17 12l-4.58 4.59Z" />
      </svg>
    );
  }
  if (name === "gear") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.14 12.94a7.6 7.6 0 0 0 .05-.94 7.6 7.6 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.3 7.3 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 1h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 7.48a.5.5 0 0 0 .12.64l2.03 1.58c-.03.31-.05.63-.05.94s.02.63.05.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32c.13.23.4.32.64.22l2.39-.96c.5.4 1.05.71 1.63.94l.36 2.54c.04.24.25.42.5.42h3.8c.25 0 .46-.18.5-.42l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.24.1.51 0 .64-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" />
      </svg>
    );
  }
  if (name === "info") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11 17h2v-6h-2v6Zm0-8h2V7h-2v2Zm1 13a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
      </svg>
    );
  }
  if (name === "logout") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 17v-2h4v-6h-4V7h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4Zm-1-1.59L5.59 12 9 8.59 7.59 7.17 2.76 12l4.83 4.83L9 15.41ZM20 3h-8v2h8v14h-8v2h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z" />
      </svg>
    );
  }
  return null;
}

function requiredStringProp(props, propName, componentName) {
  const value = props?.[propName];
  if (value == null) return new Error(`${componentName}: prop "${propName}" é obrigatória.`);
  if (typeof value !== "string") return new Error(`${componentName}: prop "${propName}" deve ser string.`);
  return null;
}

Icon.propTypes = { name: requiredStringProp };

export default function Activities() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState("SEMANAL");
  const [area, setArea] = useState("DISCIPLINAS");
  const [points, setPoints] = useState(10);
  const [createOpen, setCreateOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("ALL");
  const [filterArea, setFilterArea] = useState("ALL");
  const [filterActive, setFilterActive] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [editingId, setEditingId] = useState("");
  const [detailsId, setDetailsId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPeriod, setEditPeriod] = useState("SEMANAL");
  const [editArea, setEditArea] = useState("DISCIPLINAS");
  const [editPoints, setEditPoints] = useState(0);
  const [editIsActive, setEditIsActive] = useState(true);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!auth?.accessToken) {
      navigate("/login", { replace: true });
      return;
    }

    if (auth.user?.role === "PARTICIPANTE") {
      navigate("/", { replace: true });
    }
  }, [auth, navigate]);

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    try {
      const res = await apiFetch("/api/activities?includeInactive=1");
      setItems(res.activities || []);
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setError(e?.body?.error || e?.message || String(e));
    }
  }, []);

  useEffect(() => {
    if (!auth?.accessToken || auth.user?.role === "PARTICIPANTE") return;
    const t = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(t);
  }, [auth?.accessToken, auth?.user?.role, load]);

  const userEmail = auth?.user?.email || "";
  const displayName = useMemo(() => {
    const raw = String(userEmail || "Usuário");
    const base = raw.includes("@") ? raw.split("@")[0] : raw;
    const spaced = base.replaceAll(/[._-]+/g, " ").trim();
    if (!spaced) return "Usuário";
    return spaced
      .split(" ")
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");
  }, [userEmail]);

  const initials = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  }, [displayName]);

  useEffect(() => {
    function onDown(e) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    function onClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("keydown", onDown);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onDown);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  function logout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((a) => {
      if (filterActive === "ACTIVE" && !a.isActive) return false;
      if (filterActive === "INACTIVE" && a.isActive) return false;
      if (filterPeriod !== "ALL" && normalizePeriod(a.period) !== filterPeriod) return false;
      if (filterArea !== "ALL" && a.area !== filterArea) return false;
      if (!q) return true;
      const hay = `${a.title || ""} ${a.description || ""} ${a.slug || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, filterActive, filterPeriod, filterArea]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = useMemo(() => Math.min(Math.max(page, 1), totalPages), [page, totalPages]);

  const pageButtons = useMemo(() => {
    if (totalPages <= 9) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const set = new Set([1, 2, totalPages - 1, totalPages, safePage - 1, safePage, safePage + 1]);
    const pages = Array.from(set)
      .filter((n) => n >= 1 && n <= totalPages)
      .sort((a, b) => a - b);

    const out = [];
    for (let i = 0; i < pages.length; i++) {
      const cur = pages[i];
      const prev = pages[i - 1];
      if (i > 0 && cur - prev > 1) out.push(`dots-${prev}-${cur}`);
      out.push(cur);
    }
    return out;
  }, [safePage, totalPages]);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filtered.slice(start, end);
  }, [filtered, safePage, pageSize]);

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0 itens";
    const start = (safePage - 1) * pageSize + 1;
    const end = Math.min(total, safePage * pageSize);
    return `${start}-${end} de ${total}`;
  }, [safePage, pageSize, total]);

  function startEdit(activity) {
    setEditingId(activity.id);
    setEditTitle(activity.title || "");
    setEditDescription(activity.description || "");
    setEditPeriod(normalizePeriod(activity.period) || "SEMANAL");
    setEditArea(activity.area || "DISCIPLINAS");
    setEditPoints(typeof activity.points === "number" ? activity.points : 0);
    setEditIsActive(!!activity.isActive);
  }

  function cancelEdit() {
    setEditingId("");
    setEditTitle("");
    setEditDescription("");
    setEditPeriod("SEMANAL");
    setEditArea("DISCIPLINAS");
    setEditPoints(0);
    setEditIsActive(true);
  }

  async function saveEdit() {
    if (!editingId) return;
    await update(editingId, {
      title: editTitle,
      description: editDescription,
      period: editPeriod,
      area: editArea,
      points: Number(editPoints),
      isActive: !!editIsActive,
    });
    cancelEdit();
  }

  async function create() {
    setStatus("loading");
    setError("");
    try {
      await apiFetch("/api/activities", {
        method: "POST",
        body: JSON.stringify({ title, description, period, area, points: Number(points) }),
      });
      setTitle("");
      setDescription("");
      setPeriod("SEMANAL");
      setArea("DISCIPLINAS");
      setPoints(10);
      setPage(1);
      setCreateOpen(false);
      await load();
    } catch (e) {
      setStatus("error");
      setError(e?.body?.error || e?.message || String(e));
    }
  }

  async function update(id, patch) {
    setStatus("loading");
    setError("");
    try {
      await apiFetch(`/api/activities/${id}`, { method: "PUT", body: JSON.stringify(patch) });
      await load();
    } catch (e) {
      setStatus("error");
      setError(e?.body?.error || e?.message || String(e));
    }
  }

  async function deactivate(id) {
    setStatus("loading");
    setError("");
    try {
      await apiFetch(`/api/activities/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setStatus("error");
      setError(e?.body?.error || e?.message || String(e));
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbarInner">
          <div className="brand">
            <span>SOUL+</span>
            <span className="versionPill">v1.1.8</span>
          </div>
          <nav className="navLinks">
            <button type="button" className="navLink" onClick={() => navigate("/")}>
              <span className="btnIcon" aria-hidden="true">
                <Icon name="home" />
              </span>
              <span>Dashboard</span>
            </button>
            <button type="button" className="navLink navLinkActive">
              <span className="btnIcon" aria-hidden="true">
                <Icon name="list" />
              </span>
              <span>Atividades</span>
            </button>
          </nav>
          <div className="topbarRight">
            <div className="userMenu" ref={menuRef}>
              <button type="button" className="userBtn" onClick={() => setMenuOpen((v) => !v)}>
                <span className="userAvatar">{initials}</span>
                <span className="userName">{displayName}</span>
                <span className="navCaret">▾</span>
              </button>
              {menuOpen ? (
                <div className="menu">
                  <div className="menuHeader">
                    <div className="menuName">{displayName}</div>
                    <div className="menuEmail">{userEmail}</div>
                  </div>
                  <div className="menuDivider" />
                  <button type="button" className="menuItem" disabled>
                    <span className="menuItemLeft">
                      <span className="menuIcon" aria-hidden="true">
                        <Icon name="gear" />
                      </span>
                      <span>Configurações</span>
                    </span>
                  </button>
                  <button type="button" className="menuItem" disabled>
                    <span className="menuItemLeft">
                      <span className="menuIcon" aria-hidden="true">
                        <Icon name="info" />
                      </span>
                      <span>Novidades</span>
                    </span>
                  </button>
                  <div className="menuDivider" />
                  <button type="button" className="menuItem" onClick={logout}>
                    <span className="menuItemLeft">
                      <span className="menuIcon" aria-hidden="true">
                        <Icon name="logout" />
                      </span>
                      <span>Sair</span>
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="content">
        <div className="pageHeading">Bem-vindo, {displayName}</div>
        <div className="pageSubheading">Gestão de Atividades</div>

        {error ? <div className="error">{error}</div> : null}

        <section className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Atividades</div>
            <button type="button" className="btnPrimary" onClick={() => setCreateOpen((v) => !v)}>
              <span className="btnIcon" aria-hidden="true">
                <Icon name="plus" />
              </span>
              <span>Criar atividade</span>
            </button>
          </div>

          {createOpen ? (
            <div style={{ marginBottom: 12 }}>
              <div className="filtersGrid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                <div className="filter">
                  <label htmlFor="createTitle">Título</label>
                  <input
                    id="createTitle"
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nome da atividade"
                  />
                </div>
                <div className="filter">
                  <label htmlFor="createPeriod">Período</label>
                  <select id="createPeriod" className="select" value={period} onChange={(e) => setPeriod(e.target.value)}>
                    {PERIODS.map((p) => (
                      <option key={p} value={p}>
                        {periodLabel(p)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter">
                  <label htmlFor="createArea">Área</label>
                  <select id="createArea" className="select" value={area} onChange={(e) => setArea(e.target.value)}>
                    {AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="filtersGrid" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
                <div className="filter">
                  <label htmlFor="createDescription">Descrição</label>
                  <textarea
                    id="createDescription"
                    className="textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Descrição da atividade"
                  />
                </div>
                <div className="filter">
                  <label htmlFor="createPoints">Pontos</label>
                  <input
                    id="createPoints"
                    className="input"
                    type="number"
                    min={0}
                    value={points}
                    onChange={(e) => setPoints(e.target.value === "" ? 0 : Number(e.target.value))}
                  />
                </div>
                <div className="filter" style={{ display: "flex", alignItems: "end", gap: 10 }}>
                  <button
                    type="button"
                    className="btnPrimary"
                    disabled={!title || !description || status === "loading"}
                    onClick={create}
                  >
                    <span className="btnIcon" aria-hidden="true">
                      <Icon name="check" />
                    </span>
                    <span>Criar</span>
                  </button>
                  <button type="button" className="pageBtn" onClick={() => setCreateOpen(false)} disabled={status === "loading"}>
                    <span className="btnIcon" aria-hidden="true">
                      <Icon name="close" />
                    </span>
                    <span>Cancelar</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="filtersGrid">
            <div className="filter">
              <label htmlFor="searchQuery">Filtrar por título, descrição ou slug</label>
              <input
                id="searchQuery"
                className="input"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Digite para filtrar"
              />
            </div>
            <div className="filter">
              <label htmlFor="filterActive">Status</label>
              <select
                id="filterActive"
                className="select"
                value={filterActive}
                onChange={(e) => {
                  setFilterActive(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Todos</option>
                <option value="ACTIVE">Ativas</option>
                <option value="INACTIVE">Inativas</option>
              </select>
            </div>
            <div className="filter">
              <label htmlFor="pageSize">Itens por página</label>
              <select
                id="pageSize"
                className="select"
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={String(n)}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filtersGrid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div className="filter">
              <label htmlFor="filterPeriod">Período</label>
              <select
                id="filterPeriod"
                className="select"
                value={filterPeriod}
                onChange={(e) => {
                  setFilterPeriod(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Todos</option>
                {PERIODS.map((p) => (
                  <option key={p} value={p}>
                    {periodLabel(p)}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter">
              <label htmlFor="filterArea">Área</label>
              <select
                id="filterArea"
                className="select"
                value={filterArea}
                onChange={(e) => {
                  setFilterArea(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Todas</option>
                {AREAS.map((ar) => (
                  <option key={ar} value={ar}>
                    {ar}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter" style={{ display: "flex", alignItems: "end", gap: 10, justifyContent: "end" }}>
              <button type="button" className="pageBtn" disabled={status === "loading"} onClick={load}>
                <span className="btnIcon" aria-hidden="true">
                  <Icon name="refresh" />
                </span>
                <span>Recarregar</span>
              </button>
              <span className="hint">{status === "loading" ? "Carregando..." : rangeLabel}</span>
            </div>
          </div>

          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 260, textAlign: "center" }}>Nome</th>
                  <th style={{ width: 120, textAlign: "center" }}>Período</th>
                  <th style={{ width: 200, textAlign: "center" }}>Área</th>
                  <th style={{ width: 90, textAlign: "center" }}>Pontos</th>
                  <th style={{ width: 110, textAlign: "center" }}>Status</th>
                  <th style={{ width: 340, textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((a) => (
                  <Fragment key={a.id}>
                    <tr>
                      <td>
                        <div style={{ fontWeight: 700, textAlign: "center" }}>{a.title}</div>
                      </td>
                      <td style={{ textAlign: "center" }}>{periodLabel(a.period)}</td>
                      <td style={{ textAlign: "center" }}>{a.area}</td>
                      <td style={{ textAlign: "center" }}>{a.points}</td>
                      <td style={{ textAlign: "center" }}>{a.isActive ? "ATIVA" : "INATIVA"}</td>
                      <td style={{ textAlign: "center" }}>
                        <div className="actionsRow">
                          <button
                            type="button"
                            className="btnBlue"
                            disabled={status === "loading"}
                            onClick={() => setDetailsId((cur) => (cur === a.id ? "" : a.id))}
                          >
                            <span className="btnIcon" aria-hidden="true">
                              <Icon name="id" />
                            </span>
                            <span>Identificação</span>
                          </button>
                          <button
                            type="button"
                            className="btnWarn"
                            disabled={status === "loading"}
                            onClick={() => (editingId === a.id ? cancelEdit() : startEdit(a))}
                          >
                            <span className="btnIcon" aria-hidden="true">
                              <Icon name={editingId === a.id ? "close" : "edit"} />
                            </span>
                            <span>{editingId === a.id ? "Cancelar" : "Editar"}</span>
                          </button>
                          <button
                            type="button"
                            className="btnDanger"
                            disabled={status === "loading" || !a.isActive}
                            onClick={() => deactivate(a.id)}
                          >
                            <span className="btnIcon" aria-hidden="true">
                              <Icon name="trash" />
                            </span>
                            <span>Excluir</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {detailsId === a.id ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="hint" style={{ padding: "4px 2px" }}>
                            {a.description}
                          </div>
                        </td>
                      </tr>
                    ) : null}

                    {editingId === a.id ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="filtersGrid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
                            <div className="filter">
                              <label htmlFor="editTitle">Título</label>
                              <input id="editTitle" className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                            </div>
                            <div className="filter">
                              <label htmlFor="editPeriod">Período</label>
                              <select id="editPeriod" className="select" value={editPeriod} onChange={(e) => setEditPeriod(e.target.value)}>
                                {PERIODS.map((p) => (
                                  <option key={p} value={p}>
                                    {periodLabel(p)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="filter">
                              <label htmlFor="editArea">Área</label>
                              <select id="editArea" className="select" value={editArea} onChange={(e) => setEditArea(e.target.value)}>
                                {AREAS.map((ar) => (
                                  <option key={ar} value={ar}>
                                    {ar}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="filter" style={{ display: "flex", alignItems: "end" }}>
                              <label className="toggle" style={{ gap: 8 }}>
                                <input
                                  type="checkbox"
                                  checked={!!editIsActive}
                                  onChange={(e) => setEditIsActive(e.target.checked)}
                                />
                                <span>Ativa</span>
                              </label>
                            </div>
                          </div>

                          <div className="filtersGrid" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
                            <div className="filter">
                              <label htmlFor="editDescription">Descrição</label>
                              <textarea
                                id="editDescription"
                                className="textarea"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                rows={3}
                              />
                            </div>
                            <div className="filter">
                              <label htmlFor="editPoints">Pontos</label>
                              <input
                                id="editPoints"
                                className="input"
                                type="number"
                                min={0}
                                value={editPoints}
                                onChange={(e) => setEditPoints(e.target.value === "" ? 0 : Number(e.target.value))}
                              />
                            </div>
                            <div className="filter" style={{ display: "flex", alignItems: "end", gap: 10 }}>
                              <button
                                type="button"
                                className="btnPrimary"
                                disabled={status === "loading" || !editTitle || !editDescription}
                                onClick={saveEdit}
                              >
                                <span className="btnIcon" aria-hidden="true">
                                  <Icon name="check" />
                                </span>
                                <span>Salvar</span>
                              </button>
                              <button type="button" className="pageBtn" onClick={cancelEdit} disabled={status === "loading"}>
                                <span className="btnIcon" aria-hidden="true">
                                  <Icon name="close" />
                                </span>
                                <span>Cancelar</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panelFooter">
            <div className="hint">Página {safePage} de {totalPages}</div>
            <div className="pagination">
              <button
                type="button"
                className="pageBtn"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, Math.min(totalPages, p) - 1))}
              >
                <span className="btnIcon" aria-hidden="true">
                  <Icon name="chevLeft" />
                </span>
                <span>Anterior</span>
              </button>
              {pageButtons.map((p) =>
                typeof p === "string" ? (
                  <span key={p} className="hint" style={{ padding: "0 6px" }}>
                    ...
                  </span>
                ) : (
                  <button
                    key={String(p)}
                    type="button"
                    className={p === safePage ? "pageBtn pageNumBtn pageBtnActive" : "pageBtn pageNumBtn"}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                className="pageBtn"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, Math.max(1, p) + 1))}
              >
                <span>Próxima</span>
                <span className="btnIcon" aria-hidden="true">
                  <Icon name="chevRight" />
                </span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
