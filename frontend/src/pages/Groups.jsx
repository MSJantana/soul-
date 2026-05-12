import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getAuth } from "../api";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";

export default function Groups() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [groups, setGroups] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [isActive, setIsActive] = useState(true);

  const [query, setQuery] = useState("");
  const [filterActive, setFilterActive] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [expandedId, setExpandedId] = useState("");
  const [memberToAdd, setMemberToAdd] = useState("");

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
      const [g, p] = await Promise.all([apiFetch("/api/groups"), apiFetch("/api/participants")]);
      setGroups(g.groups || []);
      setParticipants(p.participants || []);
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

  const participantById = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (filterActive === "ACTIVE" && !g.isActive) return false;
      if (filterActive === "INACTIVE" && g.isActive) return false;
      if (!q) return true;
      const hay = `${g.name || ""} ${g.year || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [groups, query, filterActive]);

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

  async function createGroup() {
    setStatus("loading");
    setError("");
    try {
      const y = year.trim() ? Number(year) : undefined;
      await apiFetch("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name, year: Number.isFinite(y) ? y : undefined, isActive: !!isActive }),
      });
      setName("");
      setYear(String(new Date().getFullYear()));
      setIsActive(true);
      setCreateOpen(false);
      setPage(1);
      await load();
    } catch (e) {
      setStatus("error");
      setError(e?.body?.error || e?.message || String(e));
    }
  }

  async function addMember(groupId) {
    if (!memberToAdd) return;
    setStatus("loading");
    setError("");
    try {
      await apiFetch(`/api/groups/${groupId}/members`, { method: "POST", body: JSON.stringify({ participantId: memberToAdd }) });
      setMemberToAdd("");
      await load();
      setExpandedId(groupId);
    } catch (e) {
      setStatus("error");
      setError(e?.body?.error || e?.message || String(e));
    }
  }

  async function removeMember(groupId, participantId) {
    const ok = globalThis.confirm("Remover participante do grupo?");
    if (!ok) return;
    setStatus("loading");
    setError("");
    try {
      await apiFetch(`/api/groups/${groupId}/members/${participantId}`, { method: "DELETE" });
      await load();
      setExpandedId(groupId);
    } catch (e) {
      setStatus("error");
      setError(e?.body?.error || e?.message || String(e));
    }
  }

  const canManage = auth?.user?.role === "ADMIN" || auth?.user?.role === "LIDER";

  return (
    <AppShell active="groups">
      <div className="pageHeading">Grupos</div>
      <div className="pageSubheading">Gerencie grupos e participantes</div>

      {error ? <div className="error">{error}</div> : null}

        <section className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Grupos</div>
            <button type="button" className="btnPrimary" onClick={() => setCreateOpen((v) => !v)} disabled={!canManage}>
              <span className="btnIcon" aria-hidden="true">
                <Icon name="plus" />
              </span>
              <span>Novo grupo</span>
            </button>
          </div>

          {createOpen ? (
            <div style={{ marginBottom: 12 }}>
              <div className="filtersGrid" style={{ gridTemplateColumns: "1.2fr 1fr 1fr" }}>
                <div className="filter">
                  <label htmlFor="createGroupName">Nome</label>
                  <input id="createGroupName" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do grupo" />
                </div>
                <div className="filter">
                  <label htmlFor="createGroupYear">Ano</label>
                  <input id="createGroupYear" className="input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
                </div>
                <div className="filter" style={{ display: "flex", alignItems: "end", gap: 10, justifyContent: "end" }}>
                  <label className="toggle" style={{ gap: 8 }}>
                    <input type="checkbox" checked={!!isActive} onChange={(e) => setIsActive(e.target.checked)} />
                    <span>Ativo</span>
                  </label>
                  <button type="button" className="btnPrimary" disabled={!name || status === "loading"} onClick={createGroup}>
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
              <label htmlFor="searchGroup">Filtrar por nome/ano</label>
              <input
                id="searchGroup"
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
                <option value="ACTIVE">Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>
            </div>
            <div className="filter" style={{ display: "flex", alignItems: "end", gap: 10, justifyContent: "end" }}>
              <select
                className="select"
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} por página
                  </option>
                ))}
              </select>
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
                  <th style={{ width: 120, textAlign: "center" }}>Ano</th>
                  <th style={{ width: 120, textAlign: "center" }}>Status</th>
                  <th style={{ width: 120, textAlign: "center" }}>Membros</th>
                  <th style={{ width: 200, textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((g) => (
                  <Fragment key={g.id}>
                    <tr>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 700 }}>{g.name}</div>
                      </td>
                      <td style={{ textAlign: "center" }}>{g.year ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>{g.isActive ? "ATIVO" : "INATIVO"}</td>
                      <td style={{ textAlign: "center" }}>{(g.members || []).length}</td>
                      <td style={{ textAlign: "center" }}>
                        <div className="actionsRow">
                          <button
                            type="button"
                            className="btnBlue"
                            disabled={status === "loading"}
                            onClick={() => setExpandedId((cur) => (cur === g.id ? "" : g.id))}
                          >
                            <span className="btnIcon" aria-hidden="true">
                              <Icon name="users" />
                            </span>
                            <span>{expandedId === g.id ? "Fechar" : "Membros"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedId === g.id ? (
                      <tr>
                        <td colSpan={5}>
                          <div className="filtersGrid" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
                            <div className="filter">
                              <label htmlFor={`addMember-${g.id}`}>Adicionar participante</label>
                              <select
                                id={`addMember-${g.id}`}
                                className="select"
                                value={memberToAdd}
                                onChange={(e) => setMemberToAdd(e.target.value)}
                                disabled={!canManage}
                              >
                                <option value="">Selecione...</option>
                                {participants.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="filter" style={{ display: "flex", alignItems: "end" }}>
                              <button type="button" className="btnPrimary" disabled={!canManage || !memberToAdd || status === "loading"} onClick={() => addMember(g.id)}>
                                <span className="btnIcon" aria-hidden="true">
                                  <Icon name="plus" />
                                </span>
                                <span>Adicionar</span>
                              </button>
                            </div>
                            <div className="filter" style={{ display: "flex", alignItems: "end", justifyContent: "end" }}>
                              <span className="hint">{g.name}</span>
                            </div>
                          </div>

                          <div className="tableWrap" style={{ borderRadius: 10, marginTop: 8 }}>
                            <table className="table">
                              <thead>
                                <tr>
                                  <th style={{ textAlign: "center" }}>Participante</th>
                                  <th style={{ width: 140, textAlign: "center" }}>Ação</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(g.members || []).map((m) => {
                                  const p = participantById.get(m.participantId) || m.participant;
                                  return (
                                    <tr key={`${g.id}-${m.participantId}`}>
                                      <td style={{ textAlign: "center" }}>{p?.name || m.participantId}</td>
                                      <td style={{ textAlign: "center" }}>
                                        <button type="button" className="btnDanger" disabled={!canManage || status === "loading"} onClick={() => removeMember(g.id, m.participantId)}>
                                          <span className="btnIcon" aria-hidden="true">
                                            <Icon name="trash" />
                                          </span>
                                          <span>Remover</span>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
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
            <div className="hint">
              Página {safePage} de {totalPages}
            </div>
            <div className="pagination">
              <button type="button" className="pageBtn" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, Math.min(totalPages, p) - 1))}>
                <span>Anterior</span>
              </button>
              {pageButtons.map((p) =>
                typeof p === "string" ? (
                  <span key={p} className="hint" style={{ padding: "0 6px" }}>
                    ...
                  </span>
                ) : (
                  <button key={String(p)} type="button" className={p === safePage ? "pageBtn pageNumBtn pageBtnActive" : "pageBtn pageNumBtn"} onClick={() => setPage(p)}>
                    {p}
                  </button>
                ),
              )}
              <button type="button" className="pageBtn" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, Math.max(1, p) + 1))}>
                <span>Próxima</span>
              </button>
            </div>
          </div>
        </section>
    </AppShell>
  );
}

