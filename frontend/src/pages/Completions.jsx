import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiFetch, getAuth, toastConfirm } from "../api";
import AppShell from "../components/AppShell";
import Icon from "../components/Icon";

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("READ_FAILED"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

function activityMatchesScope(activityPeriod, scope) {
  const p = String(activityPeriod || "");
  if (scope === "WEEK") return p === "SEMANAL" || p === "WEEK";
  if (scope === "MONTH") return p === "MES" || p === "MONTH";
  if (scope === "QUARTER") return p === "QUADRIENAL" || p === "QUARTER";
  if (scope === "SEMESTER") return p === "SEMESTRAL" || p === "SEMESTER" || p === "SEMETRAL";
  if (scope === "YEAR") return p === "ANO" || p === "YEAR";
  return true;
}

export default function Completions() {
  const navigate = useNavigate();
  const auth = getAuth();

  const [status, setStatus] = useState("idle");

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [periodKey, setPeriodKey] = useState("");
  const [periods, setPeriods] = useState(null);
  const [scope, setScope] = useState("WEEK");
  const [periodKeyOptions, setPeriodKeyOptions] = useState([]);
  const [activeActivityId, setActiveActivityId] = useState("");
  const [loadedActivities, setLoadedActivities] = useState([]);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [byActivityId, setByActivityId] = useState({});
  const [originalActivityFormById, setOriginalActivityFormById] = useState({});  
  const [activeForm, setActiveForm] = useState({ evidenceUrl: "" });
  const dialogRef = useRef(null);

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
  const isAdmin = auth?.user?.role === "ADMIN";

  const loadPeriodKeyOptions = useCallback(async (periodType) => {
    const type = periodType || "WEEK";
    try {
      const res = await apiFetch(`/api/periods/list?periodType=${encodeURIComponent(type)}`, { suppressToast: true });
      const keys = Array.isArray(res?.periodKeys) ? res.periodKeys : [];
      setPeriodKeyOptions(keys);
      return keys;
    } catch {
      setPeriodKeyOptions([]);
      return [];
    }
  }, []);

  const effectivePeriodKeyOptions = useMemo(() => {
    if (periodKeyOptions.length) return periodKeyOptions;
    const fallback =
      scope === "WEEK"
        ? periods?.weekKey
        : scope === "MONTH"
          ? periods?.monthKey
          : scope === "QUARTER"
            ? periods?.quarterKey
            : scope === "SEMESTER"
              ? periods?.semesterKey
              : periods?.yearKey;
    return fallback ? [fallback] : [];
  }, [periodKeyOptions, periods, scope]);

  const loadBase = useCallback(async () => {
    if (!isManager) return;
    setStatus("loading");
    try {
      const [g, keys] = await Promise.all([apiFetch("/api/groups"), apiFetch("/api/periods/current")]);
      setGroups(g.groups || []);
      setPeriods(keys);
      setScope("WEEK");
      const options = await loadPeriodKeyOptions("WEEK");
      const nextKey = (options && options.length ? options[options.length - 1] : keys.weekKey) || "";
      setPeriodKey(nextKey);
      setSelectedGroupId("");
      setLoadedActivities([]);
      setParticipantsCount(0);
      setByActivityId({});
      setOriginalActivityFormById({});      
      setActiveActivityId("");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [isManager, loadPeriodKeyOptions]);

  useEffect(() => {
    if (!auth?.accessToken || !isManager) return;
    const t = setTimeout(() => {
      loadBase();
    }, 0);
    return () => clearTimeout(t);
  }, [auth?.accessToken, isManager, loadBase]);

  async function changeScope(nextScope) {
    setScope(nextScope);
    const options = await loadPeriodKeyOptions(nextScope);
    const fallback =
      nextScope === "WEEK"
        ? periods?.weekKey
        : nextScope === "MONTH"
          ? periods?.monthKey
          : nextScope === "QUARTER"
            ? periods?.quarterKey
            : nextScope === "SEMESTER"
              ? periods?.semesterKey
              : periods?.yearKey;
    const nextKey = (options && options.length ? options[options.length - 1] : fallback) || "";
    setPeriodKey(nextKey);
  }

  function changeGroup(nextGroupId) {
    setSelectedGroupId(nextGroupId);
    setLoadedActivities([]);
    setParticipantsCount(0);
    setByActivityId({});
    setOriginalActivityFormById({});    
    setActiveActivityId("");
  }

  const loadRows = useCallback(async () => {
    if (!selectedGroupId || !periodKey) return;
    setStatus("loading");
    try {
      const [summary, acts] = await Promise.all([
        apiFetch(
          `/api/completions/by-group/summary?groupId=${encodeURIComponent(selectedGroupId)}&periodKey=${encodeURIComponent(periodKey)}`,
          { suppressToast: true },
        ),
        apiFetch("/api/activities"),
      ]);
      const activities = (acts.activities || []).filter((a) => activityMatchesScope(a.period, scope));

      const nextActivityFormById = Object.fromEntries(activities.map((a) => [a.id, { evidenceUrl: "" }]));
      setLoadedActivities(activities);
      setParticipantsCount(Number(summary.totalParticipants ?? 0));
      setByActivityId(summary.byActivityId || {});
      setOriginalActivityFormById(nextActivityFormById);      
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [periodKey, scope, selectedGroupId]);


  const PERIOD_LABEL = { WEEK: "SEMANAL", MONTH: "MÊS", QUARTER: "TRIMESTRE", SEMESTER: "SEMESTRE", YEAR: "ANO" };
  const selectedGroup = useMemo(() => (groups || []).find((g) => g.id === selectedGroupId) || null, [groups, selectedGroupId]);
  const tasks = useMemo(() => {
  const list = (loadedActivities || []).map((a) => {
    const c = byActivityId?.[a.id] || null;

    return {
      activityId: a.id,
      activity: a,
      total: participantsCount,
      saved: c?.saved ? 1 : 0,
      status: c?.status || "PENDENTE",
      isValidated: c?.isValidated === true || c?.status === "CONCLUIDA",
    };
  });

  list.sort((a, b) =>
    String(a.activity?.title || "").localeCompare(String(b.activity?.title || ""))
  );

  return list;
}, [byActivityId, loadedActivities, participantsCount]);

  const activeTask = useMemo(() => (tasks || []).find((t) => t.activityId === activeActivityId) || null, [activeActivityId, tasks]);
  const openActivityModal = useCallback(
    async (activityId) => {
      setActiveActivityId(activityId);
      try {
        const res = await apiFetch(
          `/api/completions/by-group/activity?groupId=${encodeURIComponent(selectedGroupId)}&periodKey=${encodeURIComponent(periodKey)}&activityId=${encodeURIComponent(activityId)}`,
          { suppressToast: true },
        );
        const c = res.completion || null;
        const form = { evidenceUrl: String(c?.evidenceUrl || "") };
        setOriginalActivityFormById((p) => ({ ...p, [activityId]: form }));        
        setActiveForm(form);
      } catch {
        setActiveForm({ evidenceUrl: "" });
      }
    },
    [periodKey, selectedGroupId],
  );

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return undefined;
    if (!activeActivityId) return undefined;
    if (d.open) return undefined;
    try {
      d.showModal();
    } catch {
      // ignore
    }
    return undefined;
  }, [activeActivityId]);

  const closeModal = useCallback(() => {
    const d = dialogRef.current;
    if (d?.open) d.close();
    else setActiveActivityId("");
  }, []);

  async function saveActivityForGroup() {
    if (!activeActivityId || !periodKey) return;
    if (!selectedGroupId) return;
    setStatus("loading");
    try {
      const evidenceUrl = String(activeForm.evidenceUrl || "");
      const payload = {
        groupId: selectedGroupId,
        activityId: activeActivityId,
        periodKey,
        status: "PENDENTE",
        evidenceUrl,
      };

      await apiFetch("/api/completions/by-group", { method: "PUT", body: JSON.stringify(payload) });
      toast.success(
        <div>
          <div className="toastifyTitle">Sucesso!</div>
          <div className="toastifyMsg">Informações salvas com sucesso.</div>
        </div>,
      );
      closeModal();
      await loadRows();
    } catch {
      setStatus("error");
    }
  }
async function validateActivityForGroup(activityId) {
  console.log("[Conclusions] validate click", {
    groupId: selectedGroupId,
    activityId,
    periodKey,
  });

  if (!activityId || !periodKey) {
    console.error("[Conclusions] Dados inválidos para validar", {
      activityId,
      periodKey,
    });
    return;
  }

  if (!selectedGroupId) {
    console.error("[Conclusions] Grupo não selecionado");
    return;
  }

  const ok = await toastConfirm("Deseja validar os dados que estão salvos?", {
    title: "Validar",
    confirmText: "Sim, validar",
    cancelText: "Cancelar",
  });

  if (!ok) return;

  setStatus("loading");

  const payload = {
    groupId: selectedGroupId,
    activityId,
    periodKey,
  };

  console.log("[Conclusions] enviando validação para API:", payload);

  try {
    const res = await apiFetch("/api/completions/by-group/validate", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    console.log("[Conclusions] resposta da validação:", res);

    toast.success(
      <div>
        <div className="toastifyTitle">Sucesso!</div>
        <div className="toastifyMsg">Dados validados com sucesso.</div>
      </div>,
    );

    await loadRows();
    setStatus("success");
  } catch (error) {
    console.error("[Conclusions] erro ao validar:", error);

    setStatus("error");

    toast.error(
      <div>
        <div className="toastifyTitle">Erro!</div>
        <div className="toastifyMsg">Não foi possível validar os dados.</div>
      </div>,
    );
  }
} 
  return (
    <AppShell active="completions">
      <div className="pageHeading">Conclusões</div>
      <div className="pageSubheading">Gerencie conclusões por grupo e período</div>

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
        <div className="filtersGrid compactFilters" style={{ gridTemplateColumns: "1fr 1fr 0.8fr" }}>
          <div className="filter">
            <label htmlFor="group">Grupo</label>
            <select id="group" className="select" value={selectedGroupId} onChange={(e) => changeGroup(e.target.value)}>
              <option value="">Selecione...</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.year ? ` (${g.year})` : ""}
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
            <select
              id="periodKey"
              className="select"
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value)}
            >
              {!effectivePeriodKeyOptions.length ? <option value="">{periodKey || "Selecione..."}</option> : null}
              {effectivePeriodKeyOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="pagination" style={{ justifyContent: "end" }}>
          <button type="button" className="btnPrimary" disabled={status === "loading" || !selectedGroupId || !periodKey} onClick={loadRows}>
            <span className="btnIcon" aria-hidden="true">
              <Icon name="list" />
            </span>
            <span>Carregar tarefas</span>
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panelHeader">
          <div className="panelTitle">Tarefas ({PERIOD_LABEL[scope] || scope})</div>
          <span className="hint">
            {tasks.length} tarefas
          </span>
        </div>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 320 }}>Atividade</th>
                <th style={{ width: 150, textAlign: "center" }}>Tipo</th>
                <th style={{ width: 110, textAlign: "center" }}>Pontos</th>
                <th style={{ width: 160, textAlign: "center" }}>Status</th>
                <th style={{ width: 160, textAlign: "center" }}>Salvos</th>
                <th style={{ width: 260, textAlign: "center" }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.activityId}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{t.activity?.title || t.activityId}</div>
                  </td>
                  <td style={{ textAlign: "center" }}>{t.activity?.period || "-"}</td>
                  <td style={{ textAlign: "center" }}>{t.activity?.points ?? "-"}</td>
                  <td style={{ textAlign: "center" }}>
                    {t.status === "CONCLUIDA" ? "CONCLUIDA" : "PENDENTE"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {t.saved === 0 ? "PENDENTE" : t.isValidated ? "VALIDADO" : "PENDENTE"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <button type="button" className="btnBlue" disabled={status === "loading"} onClick={() => openActivityModal(t.activityId)}>
                        <span className="btnIcon" aria-hidden="true">
                          <Icon name="eye" />
                        </span>
                        <span>Visualizar</span>
                      </button>
                      {isAdmin ? (
                        <button
                          type="button"
                          className="btnPrimary"
                          disabled={status === "loading" || t.isValidated}
                          onClick={() => validateActivityForGroup(t.activityId)}
                        >
                          <span className="btnIcon" aria-hidden="true">
                            <Icon name="check" />
                          </span>
                          <span>Validar</span>
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {activeActivityId ? (
        <dialog ref={dialogRef} className="modalDialog" onClose={() => setActiveActivityId("")}>
          <div className="modalCard">
            <div className="modalTop">
              <div className="modalTopLeft">
                <div className="modalTitle">{selectedGroup?.name || "Grupo"}</div>
                <div className="modalSub">
                  Tarefa • {PERIOD_LABEL[scope] || scope} • {periodKey}
                </div>
              </div>
              <button type="button" className="modalClose" onClick={closeModal} aria-label="Fechar">
                <Icon name="close" />
              </button>
            </div>

            <div className="modalBody">
              <div className="modalGrid">
                <div className="modalPane">
                  <div className="modalSectionLabel">DADOS DA ATIVIDADE</div>
                  <div className="modalBig">{activeTask?.activity?.title || activeActivityId}</div>

                  <div className="modalFacts">
                    <div className="modalFact">
                      <div className="modalFactLabel">TIPO</div>
                      <div className="modalFactValue">{activeTask?.activity?.period || "-"}</div>
                    </div>
                    <div className="modalFact">
                      <div className="modalFactLabel">PONTOS</div>
                      <div className="modalFactValue">{activeTask?.activity?.points ?? "-"}</div>
                    </div>
                  </div>
                </div>

                <div className="modalPane">
                  <div className="modalForm">
                    <div className="modalFormGrid">
                      <div className="modalField">
                        <div className="modalFieldLabel">STATUS</div>
                        <div style={{ fontWeight: 800, color: "#111827", height: 38, display: "flex", alignItems: "center" }}>
                          PENDENTE DE VALIDAÇÃO
                        </div>
                      </div>
                    </div>

                    <div className="modalField" style={{ marginTop: 12 }}>
                      <div className="modalFieldLabel">EVIDÊNCIA</div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) {
                              e.target.value = "";
                              return;
                            }
                            try {
                              const dataUrl = await fileToDataUrl(file);
                              setActiveForm((p) => ({ ...p, evidenceUrl: dataUrl }));
                              /*setDraftActivityFormById((p) => ({
                                ...p,
                                [activeActivityId]: { ...(p?.[activeActivityId] || {}), evidenceUrl: dataUrl },
                              }));
*/
                            } catch {
                              // ignore
                            } finally {
                              e.target.value = "";
                            }
                          }}
                        />
                        {activeForm.evidenceUrl ? (
                          <>
                            <button type="button" className="pageBtn" onClick={() => window.open(activeForm.evidenceUrl, "_blank", "noopener,noreferrer")}>
                              Ver
                            </button>
                            <button
                              type="button"
                              className="pageBtn"
                              onClick={() => {
                                setActiveForm((p) => ({ ...p, evidenceUrl: "" }));
                                /*setDraftActivityFormById((p) => ({
                                  ...p,
                                  [activeActivityId]: { ...(p?.[activeActivityId] || {}), evidenceUrl: "" },
                                }));
*/
                              }}
                            >
                              Remover
                            </button>
                          </>
                        ) : null}
                      </div>
                      {activeForm.evidenceUrl ? (
                        <div className="evidencePreview">
                          <img src={activeForm.evidenceUrl} alt="Evidência" />
                        </div>
                      ) : null}
                    </div>

                    <div className="actionsRow" style={{ justifyContent: "flex-end", marginTop: 14 }}>
                      <button type="button" className="btnPrimary" disabled={status === "loading"} onClick={saveActivityForGroup}>
                        <span className="btnIcon" aria-hidden="true">
                          <Icon name="check" />
                        </span>
                        <span>Salvar</span>
                      </button>
                      <button
                        type="button"
                        className="pageBtn"
                        disabled={status === "loading"}
                        onClick={() => {
                          const o = originalActivityFormById?.[activeActivityId];
                          if (!o) return;
                          setActiveForm(o);
                          /*setDraftActivityFormById((p) => ({ ...p, [activeActivityId]: o }));
*/
                        }}
                      >
                        Não salvar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </dialog>
      ) : null}
    </AppShell>
  );
}
