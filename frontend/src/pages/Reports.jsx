import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function Reports() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [status, setStatus] = useState("idle");

  const [periods, setPeriods] = useState(null);
  const [scope, setScope] = useState("QUARTER");
  const [periodKey, setPeriodKey] = useState("");

  const [groupRanking, setGroupRanking] = useState(null);
  const [selectedGroupPeriodKey, setSelectedGroupPeriodKey] = useState("");
  const [reportCompletions, setReportCompletions] = useState([]);

  useEffect(() => {
    if (!auth?.accessToken) {
      navigate("/login", { replace: true });
    }
  }, [auth, navigate]);

  const isManager = auth?.user?.role === "ADMIN" || auth?.user?.role === "LIDER";
  const isParticipant = auth?.user?.role === "PARTICIPANTE";

  const groupPeriodKeys = groupRanking?.periodKeys || [];
  const effectiveGroupPeriodKey =
    selectedGroupPeriodKey && groupPeriodKeys.includes(selectedGroupPeriodKey)
      ? selectedGroupPeriodKey
      : groupPeriodKeys[groupPeriodKeys.length - 1] || "";

  const groupRows = useMemo(() => {
    if (!effectiveGroupPeriodKey) return [];
    return groupRanking?.byPeriod?.[effectiveGroupPeriodKey] || [];
  }, [effectiveGroupPeriodKey, groupRanking?.byPeriod]);

  const consolidatedRows = useMemo(() => {
    return groupRanking?.consolidated || [];
  }, [groupRanking?.consolidated]);

  const loadGroupRanking = useCallback(
    async (periodType) => {
      if (!isManager) return;
      const type = periodType || "QUARTER";
      const res = await apiFetch(`/api/reports/ranking-groups?periodType=${encodeURIComponent(type)}`);
      setGroupRanking(res || null);
      const keys = res?.periodKeys || [];
      const latest = keys[keys.length - 1] || "";
      setSelectedGroupPeriodKey((prev) => (prev && keys.includes(prev) ? prev : latest));
    },
    [isManager],
  );

  const loadBase = useCallback(async () => {
    setStatus("loading");
    try {
      const keys = await apiFetch("/api/periods/current");
      setPeriods(keys);
      setPeriodKey(keys.quarterKey);
      setScope("QUARTER");
      if (isManager) await loadGroupRanking("QUARTER");
      else setGroupRanking(null);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [isManager, loadGroupRanking]);

  useEffect(() => {
    if (!auth?.accessToken) return;
    const t = setTimeout(() => {
      loadBase();
    }, 0);
    return () => clearTimeout(t);
  }, [auth?.accessToken, loadBase]);

  async function changeScope(nextScope) {
    setScope(nextScope);
    if (isManager) {
      setStatus("loading");
      try {
        await loadGroupRanking(nextScope);
        setStatus("success");
      } catch {
        setStatus("error");
      }
    }
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

  const loadReport = useCallback(async () => {
    setStatus("loading");
    try {
      if (isParticipant) {
        const res = await apiFetch(`/api/reports/me?periodKey=${encodeURIComponent(periodKey || "")}`);
        setReportCompletions(res.completions || []);
      } else {
        setReportCompletions([]);
      }
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [isParticipant, periodKey]);

  async function openGroupsReport() {
    if (!isManager) return;

    const w = window.open("about:blank", "_blank");
    if (!w) {
      toast.error("Não é possível abrir uma nova aba para o relatório. Verifique o bloqueador de pop-up.");
      return;
    }
    w.document.open();
    w.document.write(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Relatórios por Grupos</title></head><body style="font-family:system-ui,Segoe UI,Roboto,Arial;margin:24px;color:#111827;"><div style="font-weight:900;font-size:16px;">Carregando relatório...</div><div style="margin-top:8px;color:#6b7280;">Aguarde um instante.</div></body></html>`,
    );
    w.document.close();
    w.focus();

    setStatus("loading");
    try {
      const res = await apiFetch(`/api/reports/ranking-groups?periodType=${encodeURIComponent(scope || "QUARTER")}`);
      setGroupRanking(res || null);
      setStatus("success");

      const keys = res?.periodKeys || [];
      const periodKeyToShow =
        (selectedGroupPeriodKey && keys.includes(selectedGroupPeriodKey) ? selectedGroupPeriodKey : keys[keys.length - 1]) || "";

      const rows = periodKeyToShow ? res?.byPeriod?.[periodKeyToShow] || [] : [];
      const consolidated = res?.consolidated || [];

      const now = new Date();
      const stamp = now.toLocaleString("pt-BR");
      const title = "Relatórios por Grupos";
      const subtitle = `${PERIOD_LABEL[scope] || scope}${periodKeyToShow ? ` • ${escapeHtml(periodKeyToShow)}` : ""} • Gerado em ${escapeHtml(stamp)}`;

      const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        --card: #ffffff;
        --muted: #6b7280;
        --text: #0f172a;
        --line: #e5e7eb;
        --th: #f8fafc;
        --brand1: #7c3aed;
        --brand2: #2563eb;
        --brand3: #06b6d4;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        color: var(--text);
        background: #ffffff;
      }
      .page { padding: 28px; }
      .hero {
        border-radius: 18px;
        padding: 18px;
        background: linear-gradient(90deg, var(--brand1) 0%, var(--brand2) 52%, var(--brand3) 100%);
        color: #fff;
      }
      .heroTop { display:flex; align-items:center; justify-content:space-between; gap: 14px; }
      .brand { font-weight: 900; letter-spacing: 1px; font-size: 14px; opacity: 0.95; }
      .heroTitle { margin: 10px 0 0; font-size: 22px; font-weight: 900; letter-spacing: -0.2px; }
      .heroSub { margin-top: 6px; opacity: 0.92; font-size: 13px; }
      .actions {
        margin-top: 12px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .btn {
        appearance: none;
        border: 1px solid rgba(255, 255, 255, 0.22);
        background: rgba(255, 255, 255, 0.14);
        color: #fff;
        font-weight: 800;
        font-size: 12px;
        padding: 10px 12px;
        border-radius: 12px;
        cursor: pointer;
      }
      .btn:hover { background: rgba(255, 255, 255, 0.22); }
      .grid { margin-top: 14px; display: grid; grid-template-columns: 1fr; gap: 14px; }
      .card { background: var(--card); border-radius: 18px; border: 1px solid rgba(15, 23, 42, 0.08); overflow: hidden; }
      .cardHeader { padding: 14px 16px; border-bottom: 1px solid var(--line); display:flex; align-items:baseline; justify-content:space-between; gap: 12px; }
      .cardTitle { font-weight: 900; font-size: 14px; }
      .cardHint { color: var(--muted); font-size: 12px; white-space: nowrap; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 11px 12px; border-bottom: 1px solid var(--line); font-size: 13px; }
      th { text-align:left; font-size: 12px; letter-spacing: 0.6px; text-transform: uppercase; color: #111827; background: var(--th); }
      td.num, th.num { text-align:center; width: 160px; white-space: nowrap; }
      .rowMuted { color: var(--muted); }
      .footer { margin-top: 10px; color: var(--muted); font-size: 11px; }
      @media print {
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { background: #fff; }
        .page { padding: 0; }
        .hero { border-radius: 0; }
        .card { border: 1px solid #ddd; border-radius: 0; }
        .actions { display: none; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="hero">
        <div class="heroTop">
          <div class="brand">SOUL+</div>
          <div style="font-size:12px;opacity:.92;">${escapeHtml(auth?.user?.email || "")}</div>
        </div>
        <div class="heroTitle">${escapeHtml(title)}</div>
        <div class="heroSub">${subtitle}</div>
        <div class="actions">
          <button class="btn" type="button" onclick="window.print()">Imprimir</button>
        </div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="cardHeader">
            <div class="cardTitle">Ranking do Período</div>
            <div class="cardHint">${escapeHtml(periodKeyToShow || "-")}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Grupo</th>
                <th class="num">Atividades feitas</th>
                <th class="num">Pontos</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows.length
                  ? rows
                      .map(
                        (r) => `<tr>
                  <td>${escapeHtml(r.groupName)}</td>
                  <td class="num">${escapeHtml(r.doneCount)}</td>
                  <td class="num">${escapeHtml(r.points)}</td>
                </tr>`,
                      )
                      .join("")
                  : `<tr><td class="rowMuted" colspan="3">Sem dados para o período selecionado.</td></tr>`
              }
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="cardHeader">
            <div class="cardTitle">Consolidado</div>
            <div class="cardHint">${escapeHtml(keys.length)} período(s)</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Grupo</th>
                <th class="num">Atividades feitas</th>
                <th class="num">Pontos</th>
              </tr>
            </thead>
            <tbody>
              ${
                consolidated.length
                  ? consolidated
                      .map(
                        (r) => `<tr>
                  <td>${escapeHtml(r.groupName)}</td>
                  <td class="num">${escapeHtml(r.doneCount)}</td>
                  <td class="num">${escapeHtml(r.points)}</td>
                </tr>`,
                      )
                      .join("")
                  : `<tr><td class="rowMuted" colspan="3">Sem dados consolidados.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="footer">Para gerar PDF, clique em “Imprimir” e selecione “Salvar como PDF”.</div>
    </div>
  </body>
</html>`;

      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
    } catch (e) {
      setStatus("error");
      if (e?.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/login", { replace: true });
      }
      try {
        w.document.open();
        w.document.write(
          `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Erro</title></head><body style="font-family:system-ui,Segoe UI,Roboto,Arial;margin:24px;color:#111827;"><div style="font-weight:900;font-size:16px;">Não foi possível abrir o relatório.</div><div style="margin-top:8px;color:#6b7280;">Tente novamente.</div></body></html>`,
        );
        w.document.close();
      } catch {
        // ignore
      }
    }
  }

  async function printGroupsPdf() {
    if (!isManager) return;

    const w = window.open("about:blank", "_blank");
    if (!w) {
      toast.error("Não é possível abrir uma nova aba para impressão. Verifique o bloqueador de pop-up.");
      return;
    }
    w.document.open();
    w.document.write(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Gerando PDF...</title></head><body style="font-family:system-ui,Segoe UI,Roboto,Arial;margin:24px;color:#111827;"><div style="font-weight:900;font-size:16px;">Gerando relatório...</div><div style="margin-top:8px;color:#6b7280;">Aguarde um instante.</div></body></html>`,
    );
    w.document.close();
    w.focus();

    setStatus("loading");
    try {
      const res = await apiFetch(`/api/reports/ranking-groups?periodType=${encodeURIComponent(scope || "QUARTER")}`);
      setGroupRanking(res || null);
      setStatus("success");

      const keys = res?.periodKeys || [];
      const periodKeyToPrint =
        (selectedGroupPeriodKey && keys.includes(selectedGroupPeriodKey) ? selectedGroupPeriodKey : keys[keys.length - 1]) || "";

      const rows = periodKeyToPrint ? res?.byPeriod?.[periodKeyToPrint] || [] : [];
      const consolidated = res?.consolidated || [];

      const now = new Date();
      const stamp = now.toLocaleString("pt-BR");
      const title = "Relatórios por Grupos";
      const subtitle = `${PERIOD_LABEL[scope] || scope}${periodKeyToPrint ? ` • ${escapeHtml(periodKeyToPrint)}` : ""} • Gerado em ${escapeHtml(stamp)}`;

      const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        --card: #ffffff;
        --muted: #6b7280;
        --text: #0f172a;
        --line: #e5e7eb;
        --th: #f8fafc;
        --brand1: #7c3aed;
        --brand2: #2563eb;
        --brand3: #06b6d4;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
        color: var(--text);
        background: #ffffff;
      }
      .page { padding: 28px; }
      .hero {
        border-radius: 18px;
        padding: 18px;
        background: linear-gradient(90deg, var(--brand1) 0%, var(--brand2) 52%, var(--brand3) 100%);
        color: #fff;
      }
      .heroTop { display:flex; align-items:center; justify-content:space-between; gap: 14px; }
      .brand { font-weight: 900; letter-spacing: 1px; font-size: 14px; opacity: 0.95; }
      .heroTitle { margin: 10px 0 0; font-size: 22px; font-weight: 900; letter-spacing: -0.2px; }
      .heroSub { margin-top: 6px; opacity: 0.92; font-size: 13px; }
      .grid { margin-top: 14px; display: grid; grid-template-columns: 1fr; gap: 14px; }
      .card { background: var(--card); border-radius: 18px; border: 1px solid rgba(15, 23, 42, 0.08); overflow: hidden; }
      .cardHeader { padding: 14px 16px; border-bottom: 1px solid var(--line); display:flex; align-items:baseline; justify-content:space-between; gap: 12px; }
      .cardTitle { font-weight: 900; font-size: 14px; }
      .cardHint { color: var(--muted); font-size: 12px; white-space: nowrap; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 11px 12px; border-bottom: 1px solid var(--line); font-size: 13px; }
      th { text-align:left; font-size: 12px; letter-spacing: 0.6px; text-transform: uppercase; color: #111827; background: var(--th); }
      td.num, th.num { text-align:center; width: 160px; white-space: nowrap; }
      .rowMuted { color: var(--muted); }
      .footer { margin-top: 10px; color: var(--muted); font-size: 11px; }
      @media print {
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        body { background: #fff; }
        .page { padding: 0; }
        .hero { border-radius: 0; }
        .card { border: 1px solid #ddd; border-radius: 0; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="hero">
        <div class="heroTop">
          <div class="brand">SOUL+</div>
          <div style="font-size:12px;opacity:.92;">${escapeHtml(auth?.user?.email || "")}</div>
        </div>
        <div class="heroTitle">${escapeHtml(title)}</div>
        <div class="heroSub">${subtitle}</div>
      </div>

      <div class="grid">
        <div class="card">
          <div class="cardHeader">
            <div class="cardTitle">Ranking do Período</div>
            <div class="cardHint">${escapeHtml(periodKeyToPrint || "-")}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Grupo</th>
                <th class="num">Atividades feitas</th>
                <th class="num">Pontos</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows.length
                  ? rows
                      .map(
                        (r) => `<tr>
                  <td>${escapeHtml(r.groupName)}</td>
                  <td class="num">${escapeHtml(r.doneCount)}</td>
                  <td class="num">${escapeHtml(r.points)}</td>
                </tr>`,
                      )
                      .join("")
                  : `<tr><td class="rowMuted" colspan="3">Sem dados para o período selecionado.</td></tr>`
              }
            </tbody>
          </table>
        </div>

        <div class="card">
          <div class="cardHeader">
            <div class="cardTitle">Consolidado</div>
            <div class="cardHint">${escapeHtml(keys.length)} período(s)</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Grupo</th>
                <th class="num">Atividades feitas</th>
                <th class="num">Pontos</th>
              </tr>
            </thead>
            <tbody>
              ${
                consolidated.length
                  ? consolidated
                      .map(
                        (r) => `<tr>
                  <td>${escapeHtml(r.groupName)}</td>
                  <td class="num">${escapeHtml(r.doneCount)}</td>
                  <td class="num">${escapeHtml(r.points)}</td>
                </tr>`,
                      )
                      .join("")
                  : `<tr><td class="rowMuted" colspan="3">Sem dados consolidados.</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="footer">Dica: na janela de impressão, escolha “Salvar como PDF”.</div>
    </div>
    <script>setTimeout(() => { window.print(); }, 250);</script>
  </body>
</html>`;

      w.document.open();
      w.document.write(html);
      w.document.close();
      w.focus();
    } catch (e) {
      setStatus("error");
      if (e?.status === 401) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/login", { replace: true });
      }
      try {
        w.document.open();
        w.document.write(
          `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Erro</title></head><body style="font-family:system-ui,Segoe UI,Roboto,Arial;margin:24px;color:#111827;"><div style="font-weight:900;font-size:16px;">Não foi possível gerar o relatório.</div><div style="margin-top:8px;color:#6b7280;">Tente novamente.</div></body></html>`,
        );
        w.document.close();
      } catch {
        // ignore
      }
    }
  }

  return (
    <AppShell active="reports">
      <div className="pageHeading">Relatórios</div>
      <div className="pageSubheading">Relatórios por grupo e por período</div>

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

          <div className="filtersGrid" style={{ gridTemplateColumns: isManager ? "1fr 1fr 1fr" : "1fr 1fr" }}>
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
            {isManager ? (
              <div className="filter">
                <label htmlFor="groupPeriod">Período</label>
                <select
                  id="groupPeriod"
                  className="select"
                  value={effectiveGroupPeriodKey}
                  onChange={(e) => setSelectedGroupPeriodKey(e.target.value)}
                  disabled={!groupPeriodKeys.length}
                >
                  {!groupPeriodKeys.length ? <option value="">Selecione...</option> : null}
                  {groupPeriodKeys.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="filter" style={{ display: "flex", alignItems: "end", justifyContent: "end", gap: 10 }}>
              {isManager ? (
                <>
                  <button type="button" className="pageBtn" disabled={status === "loading" || !groupPeriodKeys.length} onClick={printGroupsPdf}>
                    <span className="btnIcon" aria-hidden="true">
                      <Icon name="id" />
                    </span>
                    <span>Imprimir</span>
                  </button>
                  <button type="button" className="btnPrimary" disabled={status === "loading"} onClick={openGroupsReport}>
                    <span className="btnIcon" aria-hidden="true">
                      <Icon name="chart" />
                    </span>
                    <span>Relatórios por grupos</span>
                  </button>
                </>
              ) : null}
              {isParticipant ? (
                <button type="button" className="btnPrimary" disabled={status === "loading" || !periodKey} onClick={loadReport}>
                  <span className="btnIcon" aria-hidden="true">
                    <Icon name="list" />
                  </span>
                  <span>Meu relatório</span>
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {isManager ? (
          <>
            <section className="panel">
              <div className="panelHeader">
                <div className="panelTitle">Ranking por Grupo</div>
                <span className="hint">
                  {PERIOD_LABEL[scope] || scope}
                  {effectiveGroupPeriodKey ? ` • ${effectiveGroupPeriodKey}` : ""}
                </span>
              </div>
              <div className="tableWrap" style={{ maxHeight: 420, overflow: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th style={{ width: 180, textAlign: "center" }}>Atividades feitas</th>
                      <th style={{ width: 140, textAlign: "center" }}>Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupRows.length ? (
                      groupRows.map((r) => (
                        <tr key={r.groupId}>
                          <td>{r.groupName}</td>
                          <td style={{ textAlign: "center" }}>{r.doneCount}</td>
                          <td style={{ textAlign: "center" }}>{r.points}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="hint">
                          Clique em “Recarregar” para buscar os dados ou selecione um período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panelHeader">
                <div className="panelTitle">Consolidado</div>
                <span className="hint">{groupPeriodKeys.length ? `${groupPeriodKeys.length} período(s)` : ""}</span>
              </div>
              <div className="tableWrap" style={{ maxHeight: 420, overflow: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th style={{ width: 180, textAlign: "center" }}>Atividades feitas</th>
                      <th style={{ width: 140, textAlign: "center" }}>Pontos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consolidatedRows.length ? (
                      consolidatedRows.map((r) => (
                        <tr key={r.groupId}>
                          <td>{r.groupName}</td>
                          <td style={{ textAlign: "center" }}>{r.doneCount}</td>
                          <td style={{ textAlign: "center" }}>{r.points}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="hint">
                          Sem dados para exibir.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        {isParticipant ? (
          <section className="panel">
            <div className="panelHeader">
              <div className="panelTitle">Meu relatório</div>
              <span className="hint">{auth?.user?.email || ""}</span>
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
        ) : null}
    </AppShell>
  );
}
