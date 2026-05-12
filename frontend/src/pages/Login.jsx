import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiFetch, setAuth } from "../api";
import Icon from "../components/Icon";

function mapErrorToMessage(e) {
  const code = e?.body?.error || e?.message || "";
  if (code === "INVALID_CREDENTIALS") return "Email ou senha inválidos.";
  if (code === "VALIDATION_ERROR") return "Preencha o email e a senha corretamente.";
  if (code === "REQUEST_FAILED") return "Não foi possível fazer login. Tente novamente.";
  if (String(code).toLowerCase().includes("failed to fetch")) return "Falha ao conectar com o servidor.";
  return "Ocorreu um erro ao fazer login.";
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("idle");

  async function handleLogin() {
    setStatus("loading");
    toast.dismiss();

    try {
      const body = await apiFetch("/api/auth/login", {
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
      toast.error(
        <div>
          <div className="toastifyTitle">Error!</div>
          <div className="toastifyMsg">{mapErrorToMessage(e)}</div>
        </div>,
      );
      setStatus("error");
    }
  }

  return (
    <div className="loginPrintPage">
      <div className="loginPrintBlob" aria-hidden="true" />

      <div className="loginPrintPanel">
        <div className="loginPrintTitle">SIGN IN</div>

        <div className="loginPrintField">
          <label className="loginPrintLabel" htmlFor="loginEmail">
            Email
          </label>
          <div className="loginPrintInputRow">
            <span className="loginPrintPrefix" aria-hidden="true">
              ›
            </span>
            <input
              id="loginEmail"
              className="loginPrintInput"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
        </div>

        <div className="loginPrintField">
          <label className="loginPrintLabel" htmlFor="loginPassword">
            Senha
          </label>
          <div className="loginPrintInputRow">
            <span className="loginPrintPrefix" aria-hidden="true">
              ›
            </span>
            <input
              id="loginPassword"
              className="loginPrintInput"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="loginPrintEye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} />
            </button>
          </div>
        </div>

        <button type="button" className="loginPrintPrimary" disabled={status === "loading"} onClick={handleLogin}>
          ENTRAR
        </button>

        <div className="loginPrintDivider">
          <span>OR</span>
        </div>

        <button type="button" className="loginPrintSecondary" onClick={(e) => e.preventDefault()}>
          Esqueci minha senha
        </button>
      </div>
    </div>
  );
}

