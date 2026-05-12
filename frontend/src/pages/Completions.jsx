import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getAuth } from "../api";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";

export default function Completions() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [participants, setParticipants] = useState([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [periodKey, setPeriodKey] = useState("");
  const [periods, setPeriods] = useState(null);
  const [scope, setScope] = useState("WEEK");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!auth?.accessToken) {
      navigate("/login", { replace: true });
      return;
    }
    if (auth.user?.role === "PARTICIPANTE") {
      navigate("/", { replace: true });
    }
  }, [auth, navigate]);

  const isManager = auth?.user?.role === "ADMIN" || auth?.user?.role === "LIDER";

  const loadBase = useCallback(async () => {
    if (!isManager) return;
    setStatus("loading");
    setError("");
    try {
      const [p, keys] = await Promise.all([apiFetch("/api/participants"), apiFetch("/api/periods/current")]);
      setParticipants(p.participants || []);
      setPeriods(keys);
      setScope("WEEK");
      setPeriodKey(keys.weekKey);
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setError(e?.body?.error || e?.message || String(e));
    }
  }, [isManager]);

  useEffect(() => {
    if (!auth?.accessToken || !isManager) return;
    const t = setTimeout(() => {
      loadBase();
    }, 0);
    return () => clearTimeout(t);
  }, [auth?.accessToken, isManager, loadBase]);

  function changeScope(nextScope) {
    setScope(nextScope);
    if (!periods) return;
    const scopeToKey = {
      WEEK: periods.weekKey,
      MONTH: periods.monthKey,
      QUARTER: periods.quarterKey,
      SEMESTER: periods.semesterKey,
      YEAR: periods.yearKey,
    };
    const next = scopeToKey[nextScope] || periods.weekKey;
    setPeriodKey(next);
  }

  const loadRows = useCallback(async () => {
    if (!selectedParticipantId || !periodKey) return;
    setStatus("loading");
    setError("");
    try {
      const res = await apiFetch(`/api/completions?participantId=${encodeURIComponent(selectedParticipantId)}&periodKey=${encodeURIComponent(periodKey)}`);
      const list = (res.completions || []).map((c) => ({
        id: c.id,
        participantId: c.participantId,
        activityId: c.activityId,
        periodKey: c.periodKey,
        status: c.status,
        note: c.note || "",
        evidenceUrl: c.evidenceUrl || "",
        activity: c.activity,
      }));
      setRows(list);
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setError(e?.body?.error || e?.message || String(e));
    }
  }, [periodKey, selectedParticipantId]);

  async function saveRow(row) {
    setStatus("loading");
    setError("");
    try {
      const payload = {
        participantId: row.participantId,
        activityId: row.activityId,
        periodKey: row.periodKey,
        status: row.status,
      };
      if (row.note?.trim()) payload.note = row.note.trim();
      if (row.evidenceUrl?.trim()) payload.evidenceUrl = row.evidenceUrl.trim();

      await apiFetch("/api/completions", { method: "PUT", body: JSON.stringify(payload) });
      await loadRows();
    } catch (e) {
      setStatus("error");
      setError(e?.body?.error || e?.message || String(e));
    }
  }

  const PERIOD_LABEL = { WEEK: "SEMANAL", MONTH: "MÊS", QUARTER: "TRIMESTRE", SEMESTER: "SEMESTRE", YEAR: "ANO" };

  return (
    <AppShell active="completions">
      <div className="pageHeading">Conclusões</div>
      <div className="pageSubheading">Gerencie completões por participante e período</div>

      {error ? <div className="error">{error}</div> : null}

      <section className="panel">
        <div className="panelHeader">
          <div className="panelTitle">Filtro</div>
          <button type="button" className="pageBtn" disabled={status === "loading"} onClick={loadBase}>
            <span className="btnIcon" aria-hidden="true">
              <Icon name="refresh" />
            </span>
            <span>Recarregar</span>
          </button>
        </div>
        <div className="filtersGrid" style={{ gridTemplateColumns: "1.4fr 1fr 1fr" }}>
          <div className="filter">
            <label htmlFor="participant">Participante</label>
            <select id="participant" className="select" value={selectedParticipantId} onChange={(e) => setSelectedParticipantId(e.target.value)}>
              <option value="">Selecione...</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter">
            <label htmlFor="scope">Tipo</label>
            <select id="scope" className="select" value={scope} onChange={(e) => changeScope(e.target.value)}>
              {["WEEK", "MONTH", "QUARTER", "SEMESTER", "YEAR"].map((k) => (
                <option key={k} value={k}>
                  {PERIOD_LABEL[k] || k}
                </option>
              ))}
            </select>
          </div>
          <div className="filter">
            <label htmlFor="periodKey">Chave</label>
            <input id="periodKey" className="input" value={periodKey} onChange={(e) => setPeriodKey(e.target.value)} placeholder="2026-W19" />
          </div>
        </div>
        <div className="pagination" style={{ justifyContent: "end" }}>
          <button type="button" className="btnPrimary" disabled={status === "loading" || !selectedParticipantId || !periodKey} onClick={loadRows}>
            <span className="btnIcon" aria-hidden="true">
              <Icon name="list" />
            </span>
            <span>Carregar</span>
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div className="panelTitle">Resultados</div>
          <span className="hint">{rows.length} itens</span>
        </div>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Atividade</th>
                <th style={{ width: 140, textAlign: "center" }}>Status</th>
                <th style={{ width: 260 }}>Nota</th>
                <th style={{ width: 300 }}>Evidência</th>
                <th style={{ width: 120, textAlign: "center" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{r.activity?.title || r.activityId}</div>
                    <div className="hint">
                      {r.periodKey} • {r.activity?.area || "-"} • {r.activity?.period || "-"} • {r.activity?.points ?? "-"} pts
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <select
                      className="select"
                      value={r.status}
                      onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: e.target.value } : x)))}
                    >
                      <option value="PENDENTE">PENDENTE</option>
                      <option value="CONCLUIDA">CONCLUIDA</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className="input"
                      value={r.note}
                      onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, note: e.target.value } : x)))}
                      placeholder="Opcional"
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      value={r.evidenceUrl}
                      onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, evidenceUrl: e.target.value } : x)))}
                      placeholder="https://..."
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button type="button" className="btnPrimary" disabled={status === "loading"} onClick={() => saveRow(r)}>
                      <span className="btnIcon" aria-hidden="true">
                        <Icon name="check" />
                      </span>
                      <span>Salvar</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
