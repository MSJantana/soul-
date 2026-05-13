import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getAuth } from "../api";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";

function periodKeyForActivity(activity, keys) {
  if (!keys) return "";
  if (activity.period === "WEEK" || activity.period === "SEMANAL") return keys.weekKey;
  if (activity.period === "MONTH" || activity.period === "MES") return keys.monthKey;
  if (activity.period === "QUARTER" || activity.period === "QUADRIENAL") return keys.quarterKey;
  if (activity.period === "SEMESTER" || activity.period === "SEMESTRAL" || activity.period === "SEMETRAL") return keys.semesterKey;
  if (activity.period === "YEAR" || activity.period === "ANO") return keys.yearKey;
  return "";
}

const PERIOD_LABEL = {
  SEMANAL: "SEMANAL",
  MES: "MÊS",
  QUADRIENAL: "TRIMESTRAL",
  SEMESTRAL: "SEMESTRAL",
  SEMETRAL: "SEMESTRAL",
  ANO: "ANO",
  WEEK: "SEMANAL",
  MONTH: "MÊS",
  QUARTER: "TRIMESTRAL",
  SEMESTER: "SEMESTRAL",
  YEAR: "ANO",
};

function periodLabel(period) {
  return PERIOD_LABEL[String(period)] || String(period || "");
}

export default function Dashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [activities, setActivities] = useState([]);
  const [periods, setPeriods] = useState(null);
  const [me, setMe] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [rankPeriodType, setRankPeriodType] = useState("QUARTER");
  const [groupRanking, setGroupRanking] = useState(null);
  const [rankPage, setRankPage] = useState(Number.MAX_SAFE_INTEGER);

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

  const periodKeys = groupRanking?.periodKeys || [];
  const totalRankPages = Math.max(1, periodKeys.length);
  const safeRankPage = useMemo(
    () => Math.min(Math.max(rankPage, 1), totalRankPages),
    [rankPage, totalRankPages],
  );
  const currentPeriodKey = periodKeys.length ? periodKeys[safeRankPage - 1] : "";

  const rankPageButtons = useMemo(() => {
    if (totalRankPages <= 9) return Array.from({ length: totalRankPages }, (_, i) => i + 1);
    const set = new Set([1, 2, totalRankPages - 1, totalRankPages, safeRankPage - 1, safeRankPage, safeRankPage + 1]);
    const pages = Array.from(set)
      .filter((n) => n >= 1 && n <= totalRankPages)
      .sort((a, b) => a - b);

    const out = [];
    for (let i = 0; i < pages.length; i++) {
      const cur = pages[i];
      const prev = pages[i - 1];
      if (i > 0 && cur - prev > 1) out.push(`dots-${prev}-${cur}`);
      out.push(cur);
    }
    return out;
  }, [safeRankPage, totalRankPages]);

  useEffect(() => {
    if (!auth?.accessToken) {
      navigate("/login", { replace: true });
    }
  }, [auth, navigate]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [keysRes, actsRes] = await Promise.all([apiFetch("/api/periods/current"), apiFetch("/api/activities")]);
        if (cancelled) return;
        setPeriods(keysRes);
        setActivities(actsRes.activities || []);

        if (auth?.user?.role === "PARTICIPANTE") {
          const completionsRes = await apiFetch("/api/completions");
          if (cancelled) return;
          setCompletions(completionsRes.completions || []);

          const meRes = await apiFetch("/api/participants/me");
          if (cancelled) return;
          setMe(meRes.participant);
          setGroupRanking(null);
        } else {
          setCompletions([]);
          setMe(null);
          const rankRes = await apiFetch(
            `/api/reports/ranking-groups?periodType=${encodeURIComponent(rankPeriodType || "QUARTER")}`,
          );
          if (cancelled) return;
          setGroupRanking(rankRes);
        }
      } catch {
        if (cancelled) return;
      }
    }

    if (auth?.accessToken) load();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken, auth?.user?.role, rankPeriodType]);

  const completionMap = useMemo(() => {
    const map = new Map();
    for (const c of completions) {
      map.set(`${c.activityId}|${c.periodKey}`, c);
    }
    return map;
  }, [completions]);

  async function toggle(activity) {
    if (!me) return;
    const periodKey = periodKeyForActivity(activity, periods);
    const key = `${activity.id}|${periodKey}`;
    const current = completionMap.get(key);
    const nextStatus = current?.status === "CONCLUIDA" ? "PENDENTE" : "CONCLUIDA";

    try {
      const res = await apiFetch("/api/completions", {
        method: "PUT",
        body: JSON.stringify({
          participantId: me.id,
          activityId: activity.id,
          periodKey,
          status: nextStatus,
        }),
      });

      setCompletions((prev) => {
        const rest = prev.filter(
          (c) => !(c.activityId === res.completion.activityId && c.periodKey === res.completion.periodKey),
        );
        return [res.completion, ...rest];
      });
    } catch {
      return;
    }
  }

  return (
    <AppShell active="dashboard">
      <div className="pageHeading">Bem-vindo, {auth?.user?.role === "PARTICIPANTE" ? me?.name || displayName : displayName}</div>
      <div className="pageSubheading">
        {auth?.user?.role ? `Perfil: ${auth.user.role}` : ""} {periods ? `• ${periods.weekKey} • ${periods.quarterKey}` : ""}
      </div>

        {auth?.user?.role === "PARTICIPANTE" ? (
          <section className="panel">
            <div className="panelHeader">
              <div className="panelTitle">Minhas Atividades</div>
              <span className="hint">{me ? me.name : "Carregando perfil..."}</span>
            </div>

            <div className="tableWrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 320 }}>Nome</th>
                    <th style={{ width: 120 }}>Período</th>
                    <th style={{ width: 180 }}>Área</th>
                    <th style={{ width: 90, textAlign: "center" }}>Pontos</th>
                    <th style={{ width: 140 }}>Chave</th>
                    <th style={{ width: 140, textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((a) => {
                    const periodKey = periodKeyForActivity(a, periods);
                    const done = completionMap.get(`${a.id}|${periodKey}`)?.status === "CONCLUIDA";
                    return (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{a.title}</div>
                          <div className="hint">{a.description}</div>
                        </td>
                        <td>{periodLabel(a.period)}</td>
                        <td>{a.area}</td>
                        <td style={{ textAlign: "center" }}>{a.points}</td>
                        <td>{periodKey}</td>
                        <td style={{ textAlign: "center" }}>
                          <label className="toggle" style={{ justifyContent: "center" }}>
                            <input
                              type="checkbox"
                              checked={!!done}
                              onChange={() => toggle(a)}
                              disabled={!me || !periodKey}
                            />
                            <span>{done ? "Concluída" : "Pendente"}</span>
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <>
            <section className="panel">
              <div className="panelHeader">
                <div className="panelTitle">Admin</div>
                <button type="button" className="btnPrimary" onClick={() => navigate("/atividades")}>
                  <span className="btnIcon" aria-hidden="true">
                    <Icon name="list" />
                  </span>
                  <span>Gerenciar atividades</span>
                </button>
              </div>
              <div className="hint">Acesse o painel para criar/editar/ativar/desativar atividades do quadro.</div>
            </section>

            <section className="panel">
              <div className="panelHeader">
                <div className="panelTitle">Ranking Geral por Grupo</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <select
                    className="select"
                    value={rankPeriodType}
                    onChange={(e) => {
                      setRankPeriodType(e.target.value);
                      setRankPage(Number.MAX_SAFE_INTEGER);
                    }}
                  >
                    {["WEEK", "MONTH", "QUARTER", "SEMESTER", "YEAR"].map((k) => (
                      <option key={k} value={k}>
                        {periodLabel(k)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentPeriodKey ? (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 800 }}>{currentPeriodKey}</div>
                    <span className="hint">Atividades feitas e pontuação por grupo</span>
                  </div>
                  <div className="tableWrap" style={{ marginTop: 10, maxHeight: "420px" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Grupo</th>
                          <th style={{ width: 180, textAlign: "center" }}>Atividades feitas</th>
                          <th style={{ width: 140, textAlign: "center" }}>Pontos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(groupRanking?.byPeriod?.[currentPeriodKey] || []).map((r) => (
                          <tr key={r.groupId}>
                            <td>{r.groupName}</td>
                            <td style={{ textAlign: "center" }}>{r.doneCount}</td>
                            <td style={{ textAlign: "center" }}>{r.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalRankPages > 1 ? (
                    <div className="panelFooter">
                      <div className="hint">
                        Período {safeRankPage} de {totalRankPages}
                      </div>
                      <div className="pagination">
                        <button
                          type="button"
                          className="pageBtn"
                          disabled={safeRankPage <= 1}
                          onClick={() => setRankPage((p) => Math.max(1, Math.min(totalRankPages, p) - 1))}
                        >
                          <span className="btnIcon" aria-hidden="true">
                            <Icon name="chevLeft" />
                          </span>
                          <span>Anterior</span>
                        </button>
                        {rankPageButtons.map((p) =>
                          typeof p === "string" ? (
                            <span key={p} className="hint" style={{ padding: "0 6px" }}>
                              ...
                            </span>
                          ) : (
                            <button
                              key={String(p)}
                              type="button"
                              className={p === safeRankPage ? "pageBtn pageNumBtn pageBtnActive" : "pageBtn pageNumBtn"}
                              onClick={() => setRankPage(p)}
                            >
                              {p}
                            </button>
                          ),
                        )}
                        <button
                          type="button"
                          className="pageBtn"
                          disabled={safeRankPage >= totalRankPages}
                          onClick={() => setRankPage((p) => Math.min(totalRankPages, Math.max(1, p) + 1))}
                        >
                          <span>Próxima</span>
                          <span className="btnIcon" aria-hidden="true">
                            <Icon name="chevRight" />
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={{ marginTop: 18 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 900 }}>Consolidado</div>
                  <span className="hint">
                    {(groupRanking?.periodKeys || []).length
                      ? `${(groupRanking.periodKeys || []).length} período(s) • Total por grupo`
                      : "Total por grupo"}
                  </span>
                </div>
                <div className="tableWrap" style={{ marginTop: 10 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Grupo</th>
                        <th style={{ width: 180, textAlign: "center" }}>Atividades feitas</th>
                        <th style={{ width: 140, textAlign: "center" }}>Pontos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(groupRanking?.consolidated || []).map((r) => (
                        <tr key={r.groupId}>
                          <td>{r.groupName}</td>
                          <td style={{ textAlign: "center" }}>{r.doneCount}</td>
                          <td style={{ textAlign: "center" }}>{r.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </>
        )}
    </AppShell>
  );
}

