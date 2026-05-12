import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuth, getAuth } from "../api";
import Icon from "./Icon";

function requiredStringProp(props, propName, componentName) {
  const value = props?.[propName];
  if (value == null) return new Error(`${componentName}: prop "${propName}" é obrigatória.`);
  if (typeof value !== "string") return new Error(`${componentName}: prop "${propName}" deve ser string.`);
  return null;
}

function requiredNodeProp(props, propName, componentName) {
  const value = props?.[propName];
  if (value == null) return new Error(`${componentName}: prop "${propName}" é obrigatória.`);
  return null;
}

export default function AppShell({ active, children }) {
  const navigate = useNavigate();
  const auth = getAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const role = auth?.user?.role || "";
  const isParticipant = role === "PARTICIPANTE";

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

  function logout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  function navClass(key) {
    return active === key ? "navLink navLinkActive" : "navLink";
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
            <button type="button" className={navClass("dashboard")} onClick={() => navigate("/")}>
              <span className="btnIcon" aria-hidden="true">
                <Icon name="home" />
              </span>
              <span>Dashboard</span>
            </button>
            <button type="button" className={navClass("activities")} onClick={() => navigate("/atividades")}>
              <span className="btnIcon" aria-hidden="true">
                <Icon name="list" />
              </span>
              <span>Atividades</span>
            </button>
            <button
              type="button"
              className={navClass("participants")}
              onClick={() => navigate("/participantes")}
              disabled={isParticipant}
            >
              <span className="btnIcon" aria-hidden="true">
                <Icon name="users" />
              </span>
              <span>Participantes</span>
            </button>
            <button type="button" className={navClass("groups")} onClick={() => navigate("/grupos")} disabled={isParticipant}>
              <span className="btnIcon" aria-hidden="true">
                <Icon name="group" />
              </span>
              <span>Grupos</span>
            </button>
            <button type="button" className={navClass("reports")} onClick={() => navigate("/relatorios")}>
              <span className="btnIcon" aria-hidden="true">
                <Icon name="chart" />
              </span>
              <span>Relatórios</span>
            </button>
            <button type="button" className={navClass("completions")} onClick={() => navigate("/conclusoes")} disabled={isParticipant}>
              <span className="btnIcon" aria-hidden="true">
                <Icon name="check" />
              </span>
              <span>Conclusões</span>
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

      <div className="content">{children}</div>
    </div>
  );
}

AppShell.propTypes = {
  active: requiredStringProp,
  children: requiredNodeProp,
};
