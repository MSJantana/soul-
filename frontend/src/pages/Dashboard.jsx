import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, clearAuth, getAuth } from "../api";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  function logout() {
    clearAuth();
    navigate("/login", { replace: true });
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
            <button type="button" className="navLink navLinkActive">
              <span className="btnIcon" aria-hidden="true">
                <Icon name="home" />
              </span>
              <span>Dashboard</span>
            </button>
            <button type="button" className="navLink" onClick={() => navigate("/atividades")}>
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
      </div>
    </div>
  );
}

