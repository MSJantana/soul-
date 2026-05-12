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

export default function Dashboard() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [activities, setActivities] = useState([]);
  const [periods, setPeriods] = useState(null);
  const [me, setMe] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (!auth?.accessToken) {
      navigate("/login", { replace: true });
    }
  }, [auth, navigate]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");

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
        } else {
          setCompletions([]);
          setMe(null);
          const rankRes = await apiFetch(`/api/reports/ranking?periodKey=${encodeURIComponent(keysRes.quarterKey)}`);
          if (cancelled) return;
          setRanking(rankRes.ranking || []);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e?.body?.error || e?.message || String(e));
      }
    }

    if (auth?.accessToken) load();
    return () => {
      cancelled = true;
    };
  }, [auth?.accessToken, auth?.user?.role]);

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
    } catch (e) {
      setError(e?.body?.error || e?.message || String(e));
    }
  }

  return (
    <AppShell active="dashboard">
      <div className="pageHeading">Bem-vindo, {auth?.user?.role === "PARTICIPANTE" ? me?.name || displayName : displayName}</div>
      <div className="pageSubheading">
        {auth?.user?.role ? `Perfil: ${auth.user.role}` : ""} {periods ? `• ${periods.weekKey} • ${periods.quarterKey}` : ""}
      </div>

      {error ? <div className="error">{error}</div> : null}

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
              <div className="hint">Acesse o CRUD para criar/editar/ativar/desativar atividades do quadro.</div>
            </section>

            <section className="panel">
              <div className="panelHeader">
                <div className="panelTitle">Ranking (Trimestre)</div>
                <span className="hint">{periods ? periods.quarterKey : ""}</span>
              </div>

              <div className="tableWrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th style={{ width: 140, textAlign: "center" }}>Pontos</th>
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
          </>
        )}
    </AppShell>
  );
}

