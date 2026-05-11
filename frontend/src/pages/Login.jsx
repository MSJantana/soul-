import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setAuth } from "../api";

function Icon({ name }) {
  if (name === "login") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 17v-2h4v-6h-4V7h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4Zm-1-1.59L5.59 12 9 8.59 7.59 7.17 2.76 12l4.83 4.83L9 15.41Z" />
      </svg>
    );
  }
  if (name === "userPlus") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-4 2c-3.31 0-6 2.24-6 5v1h12v-1c0-2.76-2.69-5-6-5Zm10-3V8h-2V6h-2v2h-2v2h2v2h2v-2h2Z" />
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

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handle(action) {
    setStatus("loading");
    setError("");

    try {
      const path = action === "bootstrap" ? "/api/auth/bootstrap" : "/api/auth/login";
      const body = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      setAuth({
        user: body.user,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
      });

      navigate("/", { replace: true });
    } catch (e) {
      setError(e?.body?.error || e?.message || String(e));
      setStatus("error");
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbarInner">
          <div className="brand">
            <span>SOUL+</span>
            <span className="versionPill">v1.1.8</span>
          </div>
        </div>
      </header>

      <div className="content">
        <div style={{ maxWidth: 420, margin: "40px auto 0" }}>
          <div className="pageHeading">Entrar</div>
          <div className="pageSubheading">Acesse sua conta para gerenciar o quadro</div>

          <section className="panel" style={{ marginTop: 14 }}>
            <div className="filtersGrid" style={{ gridTemplateColumns: "1fr" }}>
              <div className="filter">
                <label htmlFor="loginEmail">Email</label>
                <input
                  id="loginEmail"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@soulmais.local"
                  autoComplete="username"
                />
              </div>

              <div className="filter">
                <label htmlFor="loginPassword">Senha</label>
                <input
                  id="loginPassword"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="pagination" style={{ justifyContent: "end", marginTop: 12 }}>
              <button type="button" className="btnPrimary" disabled={status === "loading"} onClick={() => handle("login")}>
                <span className="btnIcon" aria-hidden="true">
                  <Icon name="login" />
                </span>
                <span>Login</span>
              </button>
              <button type="button" className="pageBtn" disabled={status === "loading"} onClick={() => handle("bootstrap")}>
                <span className="btnIcon" aria-hidden="true">
                  <Icon name="userPlus" />
                </span>
                <span>Criar Admin Inicial</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

