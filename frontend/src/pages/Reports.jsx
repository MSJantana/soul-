import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getAuth } from "../api";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";

const PERIOD_LABEL = {
  WEEK: "SEMANAL",
  MONTH: "MÊS",
  QUARTER: "TRIMESTRE",
  SEMESTER: "SEMESTRE",
  YEAR: "ANO",
};

export default function Reports() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [status, setStatus] = useState("idle");

  const [periods, setPeriods] = useState(null);
  const [scope, setScope] = useState("QUARTER");
  const [periodKey, setPeriodKey] = useState("");

  const [ranking, setRanking] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [reportCompletions, setReportCompletions] = useState([]);

  useEffect(() => {
    if (!auth?.accessToken) {
      navigate("/login", { replace: true });
    }
  }, [auth, navigate]);

  const isManager = auth?.user?.role === "ADMIN" || auth?.user?.role === "LIDER";
  const isParticipant = auth?.user?.role === "PARTICIPANTE";

  const loadBase = useCallback(async () => {
    setStatus("loading");
    try {
      const keys = await apiFetch("/api/periods/current");
      setPeriods(keys);
      setPeriodKey(keys.quarterKey);
      setScope("QUARTER");
      if (isManager) {
        const p = await apiFetch("/api/participants");
        setParticipants(p.participants || []);
      } else {
        setParticipants([]);
      }
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [isManager]);

  useEffect(() => {
    if (!auth?.accessToken) return;
    const t = setTimeout(() => {
      loadBase();
    }, 0);
    return () => clearTimeout(t);
  }, [auth?.accessToken, loadBase]);

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
    const next = scopeToKey[nextScope] || periods.quarterKey;
    setPeriodKey(next);
  }

  const loadRanking = useCallback(async () => {
    if (!isManager) return;
    setStatus("loading");
    try {
      const res = await apiFetch(`/api/reports/ranking?periodKey=${encodeURIComponent(periodKey || "")}`);
      setRanking(res.ranking || []);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [isManager, periodKey]);

  const loadReport = useCallback(async () => {
    setStatus("loading");
    try {
      if (isParticipant) {
        const res = await apiFetch(`/api/reports/me?periodKey=${encodeURIComponent(periodKey || "")}`);
        setReportCompletions(res.completions || []);
      } else if (isManager && selectedParticipantId) {
        const res = await apiFetch(`/api/reports/participant/${selectedParticipantId}?periodKey=${encodeURIComponent(periodKey || "")}`);
        setReportCompletions(res.completions || []);
      } else {
        setReportCompletions([]);
      }
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [isParticipant, isManager, periodKey, selectedParticipantId]);

  return (
    <AppShell active="reports">
      <div className="pageHeading">Relatórios</div>
      <div className="pageSubheading">Ranking e desempenho por período</div>

        <section className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Período</div>
            <button type="button" className="pageBtn" disabled={status === "loading"} onClick={loadBase}>
              <span className="btnIcon" aria-hidden="true">
                <Icon name="refresh" />
              </span>
              <span>Recarregar</span>
            </button>
          </div>

          <div className="filtersGrid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
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
              {/* <label htmlFor="periodKey">Chave</label>
              <input id="periodKey" className="input" value={periodKey} onChange={(e) => setPeriodKey(e.target.value)} placeholder="2026-Q2" /> */}
            </div>
            <div className="filter" style={{ display: "flex", alignItems: "end", justifyContent: "end", gap: 10 }}>
              {isManager ? (
                <button type="button" className="btnPrimary" disabled={status === "loading" || !periodKey} onClick={loadRanking}>
                  <span className="btnIcon" aria-hidden="true">
                    <Icon name="chart" />
                  </span>
                  <span>Carregar ranking</span>
                </button>
              ) : null}
              <button type="button" className="btnPrimary" disabled={status === "loading" || !periodKey} onClick={loadReport}>
                <span className="btnIcon" aria-hidden="true">
                  <Icon name="list" />
                </span>
                <span>{isParticipant ? "Meu relatório" : "Relatório do participante"}</span>
              </button>
            </div>
          </div>
        </section>

        {isManager ? (
          <section className="panel">
            <div className="panelHeader">
              <div className="panelTitle">Ranking Geral</div>
              <span className="hint">{periodKey || ""}</span>
            </div>
            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th style={{ width: 160, textAlign: "center" }}>Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r) => (
                    <tr key={r.participantId}>
                      <td>{r.name}</td>
                      <td style={{ textAlign: "center" }}>{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="panelHeader">
            <div className="panelTitle">Atividades x Grupo</div>
            {isManager ? (
              <select
                className="select"
                value={selectedParticipantId}
                onChange={(e) => setSelectedParticipantId(e.target.value)}
                style={{ maxWidth: 420 }}
              >
                <option value="">Selecione um participante...</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="hint">{auth?.user?.email || ""}</span>
            )}
          </div>

          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Atividade</th>
                  <th style={{ width: 160, textAlign: "center" }}>Área</th>
                  <th style={{ width: 140, textAlign: "center" }}>Período</th>
                  <th style={{ width: 100, textAlign: "center" }}>Pontos</th>
                  <th style={{ width: 140, textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportCompletions.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{c.activity?.title || c.activityId}</div>
                      <div className="hint">{c.periodKey}</div>
                    </td>
                    <td style={{ textAlign: "center" }}>{c.activity?.area || "-"}</td>
                    <td style={{ textAlign: "center" }}>{c.activity?.period || "-"}</td>
                    <td style={{ textAlign: "center" }}>{c.activity?.points ?? "-"}</td>
                    <td style={{ textAlign: "center" }}>{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
    </AppShell>
  );
}
