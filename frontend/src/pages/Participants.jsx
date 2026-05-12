import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getAuth } from "../api";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";

function toIsoDateTimeOrUndefined(dateOnly) {
  const v = String(dateOnly || "").trim();
  if (!v) return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function dateLabel(value) {
  if (!value) return "";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return String(value);
  }
}

export default function Participants() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [phone, setPhone] = useState("");
  const [createLogin, setCreateLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [editingId, setEditingId] = useState("");
  const [editName, setEditName] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editGuardianName, setEditGuardianName] = useState("");
  const [editPhone, setEditPhone] = useState("");

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
      const res = await apiFetch("/api/participants");
      setItems(res.participants || []);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (!q) return true;
      const hay = `${p.name || ""} ${p.phone || ""} ${p.guardianName || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

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

  function startEdit(p) {
    setEditingId(p.id);
    setEditName(p.name || "");
    setEditBirthDate(p.birthDate ? dateLabel(p.birthDate) : "");
    setEditGuardianName(p.guardianName || "");
    setEditPhone(p.phone || "");
  }

  function cancelEdit() {
    setEditingId("");
    setEditName("");
    setEditBirthDate("");
    setEditGuardianName("");
    setEditPhone("");
  }

  async function saveEdit() {
    if (!editingId) return;
    setStatus("loading");
    setError("");
    try {
      await apiFetch(`/api/participants/${editingId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          birthDate: editBirthDate ? toIsoDateTimeOrUndefined(editBirthDate) : null,
          guardianName: editGuardianName || null,
          phone: editPhone || null,
        }),
      });
      cancelEdit();
      await load();
    } catch (e) {
      setStatus("error");
      setError(e?.body?.error || e?.message || String(e));
    }
  }

  async function remove(participant) {
    const ok = globalThis.confirm(`Excluir participante "${participant?.name || ""}"? Essa ação não pode ser desfeita.`);
    if (!ok) return;
    setStatus("loading");
    setError("");
    try {
      await apiFetch(`/api/participants/${participant.id}`, { method: "DELETE" });
      cancelEdit();
      await load();
    } catch (e) {
      setStatus("error");
      setError(e?.body?.error || e?.message || String(e));
    }
  }

  async function create() {
    setStatus("loading");
    setError("");
    try {
      const payload = {
        name,
        birthDate: toIsoDateTimeOrUndefined(birthDate),
        guardianName: guardianName || undefined,
        phone: phone || undefined,
      };
      if (createLogin) {
        payload.email = email;
        payload.password = password;
      }
      await apiFetch("/api/participants", { method: "POST", body: JSON.stringify(payload) });
      setName("");
      setBirthDate("");
      setGuardianName("");
      setPhone("");
      setCreateLogin(false);
      setEmail("");
      setPassword("");
      setCreateOpen(false);
      setPage(1);
      await load();
    } catch (e) {
      setStatus("error");
      setError(e?.body?.error || e?.message || String(e));
    }
  }

  const canCreate = !!name && (!createLogin || (email && password && password.length >= 8));

  return (
    <AppShell active="participants">
      <div className="pageHeading">Cadastro de Participantes</div>
      <div className="pageSubheading">Crie e edite perfis de participantes</div>

      {error ? <div className="error">{error}</div> : null}

        <section className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Participantes</div>
            <button type="button" className="btnPrimary" onClick={() => setCreateOpen((v) => !v)}>
              <span className="btnIcon" aria-hidden="true">
                <Icon name="plus" />
              </span>
              <span>Novo participante</span>
            </button>
          </div>

          {createOpen ? (
            <div style={{ marginBottom: 12 }}>
              <div className="filtersGrid" style={{ gridTemplateColumns: "1.2fr 1fr 1fr" }}>
                <div className="filter">
                  <label htmlFor="createName">Nome</label>
                  <input
                    id="createName"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do participante"
                  />
                </div>
                <div className="filter">
                  <label htmlFor="createBirthDate">Data de nascimento</label>
                  <input
                    id="createBirthDate"
                    className="input"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>
                <div className="filter">
                  <label htmlFor="createPhone">Telefone</label>
                  <input
                    id="createPhone"
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="filtersGrid" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
                <div className="filter">
                  <label htmlFor="createGuardian">Responsável</label>
                  <input
                    id="createGuardian"
                    className="input"
                    value={guardianName}
                    onChange={(e) => setGuardianName(e.target.value)}
                    placeholder="Nome do responsável (opcional)"
                  />
                </div>
                <div className="filter" style={{ display: "flex", alignItems: "end" }}>
                  <label className="toggle" style={{ gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={!!createLogin}
                      onChange={(e) => setCreateLogin(e.target.checked)}
                    />
                    <span>Criar login</span>
                  </label>
                </div>
                <div className="filter" style={{ display: "flex", alignItems: "end", gap: 10, justifyContent: "end" }}>
                  <button type="button" className="btnPrimary" disabled={!canCreate || status === "loading"} onClick={create}>
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

              {createLogin ? (
                <div className="filtersGrid" style={{ gridTemplateColumns: "1.3fr 1fr 1fr" }}>
                  <div className="filter">
                    <label htmlFor="createEmail">Email</label>
                    <input
                      id="createEmail"
                      className="input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      autoComplete="off"
                    />
                  </div>
                  <div className="filter">
                    <label htmlFor="createPassword">Senha</label>
                    <input
                      id="createPassword"
                      className="input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="mínimo 8 caracteres"
                      autoComplete="off"
                    />
                  </div>
                  <div className="filter" style={{ display: "flex", alignItems: "end", justifyContent: "end" }}>
                    <span className="hint">Role do login: PARTICIPANTE</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="filtersGrid">
            <div className="filter">
              <label htmlFor="searchQuery">Filtrar por nome, telefone ou responsável</label>
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
                  <th style={{ width: 130, textAlign: "center" }}>Nascimento</th>
                  <th style={{ width: 220, textAlign: "center" }}>Responsável</th>
                  <th style={{ width: 160, textAlign: "center" }}>Telefone</th>
                  <th style={{ width: 120, textAlign: "center" }}>Login</th>
                  <th style={{ width: 220, textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                  <Fragment key={p.id}>
                    <tr>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                      </td>
                      <td style={{ textAlign: "center" }}>{p.birthDate ? dateLabel(p.birthDate) : "-"}</td>
                      <td style={{ textAlign: "center" }}>{p.guardianName || "-"}</td>
                      <td style={{ textAlign: "center" }}>{p.phone || "-"}</td>
                      <td style={{ textAlign: "center" }}>{p.userId ? "SIM" : "NÃO"}</td>
                      <td style={{ textAlign: "center" }}>
                        <div className="actionsRow">
                          <button
                            type="button"
                            className="btnWarn"
                            disabled={status === "loading"}
                            onClick={() => (editingId === p.id ? cancelEdit() : startEdit(p))}
                          >
                            <span className="btnIcon" aria-hidden="true">
                              <Icon name={editingId === p.id ? "close" : "edit"} />
                            </span>
                            <span>{editingId === p.id ? "Cancelar" : "Editar"}</span>
                          </button>
                          <button
                            type="button"
                            className="btnDanger"
                            disabled={status === "loading"}
                            onClick={() => remove(p)}
                          >
                            <span className="btnIcon" aria-hidden="true">
                              <Icon name="trash" />
                            </span>
                            <span>Excluir</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {editingId === p.id ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="filtersGrid" style={{ gridTemplateColumns: "1.2fr 1fr 1fr" }}>
                            <div className="filter">
                              <label htmlFor="editName">Nome</label>
                              <input id="editName" className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            </div>
                            <div className="filter">
                              <label htmlFor="editBirthDate">Data de nascimento</label>
                              <input
                                id="editBirthDate"
                                className="input"
                                type="date"
                                value={editBirthDate}
                                onChange={(e) => setEditBirthDate(e.target.value)}
                              />
                            </div>
                            <div className="filter">
                              <label htmlFor="editPhone">Telefone</label>
                              <input id="editPhone" className="input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                            </div>
                          </div>

                          <div className="filtersGrid" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
                            <div className="filter">
                              <label htmlFor="editGuardian">Responsável</label>
                              <input
                                id="editGuardian"
                                className="input"
                                value={editGuardianName}
                                onChange={(e) => setEditGuardianName(e.target.value)}
                              />
                            </div>
                            <div className="filter" />
                            <div className="filter" style={{ display: "flex", alignItems: "end", gap: 10, justifyContent: "end" }}>
                              <button
                                type="button"
                                className="btnPrimary"
                                disabled={status === "loading" || !editName}
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
              <button type="button" className="pageBtn" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, Math.max(1, p) + 1))}>
                <span>Próxima</span>
              </button>
            </div>
          </div>
        </section>
    </AppShell>
  );
}

