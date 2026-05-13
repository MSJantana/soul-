import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getAuth } from "../api";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";

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

export default function Activities() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");

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
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPeriod, setEditPeriod] = useState("SEMANAL");
  const [editArea, setEditArea] = useState("DISCIPLINAS");
  const [editPoints, setEditPoints] = useState(0);
  const [editIsActive, setEditIsActive] = useState(true);

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
    try {
      const res = await apiFetch("/api/activities?includeInactive=1");
      setItems(res.activities || []);
      setStatus("success");
    } catch {
      setStatus("error");
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
    } catch {
      setStatus("error");
    }
  }

  async function update(id, patch) {
    setStatus("loading");
    try {
      await apiFetch(`/api/activities/${id}`, { method: "PUT", body: JSON.stringify(patch) });
      await load();
    } catch {
      setStatus("error");
    }
  }

  async function deactivate(id) {
    setStatus("loading");
    try {
      await apiFetch(`/api/activities/${id}`, { method: "DELETE" });
      await load();
    } catch {
      setStatus("error");
    }
  }

  return (
    <AppShell active="activities">
      <div className="pageHeading">Bem-vindo, {displayName}</div>
      <div className="pageSubheading">Gestão de Atividades</div>

        <section
          className="panel"
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            maxHeight: "calc(100vh - 140px)",
            overflow: createOpen ? "auto" : "hidden",
          }}
        >
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

          <div
            className="filtersGrid compactFilters"
            style={{
              gridTemplateColumns:
                "minmax(260px, 2.2fr) minmax(140px, 0.8fr) minmax(120px, 0.6fr) minmax(160px, 0.9fr) minmax(180px, 1fr) auto",
              alignItems: "end",
              gap: 10,
            }}
          >
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

          <div className="tableWrap" style={{ flex: "1 1 auto", minHeight: 0 }}>
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
    </AppShell>
  );
}
