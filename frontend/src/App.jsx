import "./App.css";
import { useEffect, useRef } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import Activities from "./pages/Activities";
import Completions from "./pages/Completions";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import Login from "./pages/Login";
import Participants from "./pages/Participants";
import Reports from "./pages/Reports";
import { clearAuth, getAuth, getLastActive, touchSession } from "./api";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

function useSessionTimeoutGuard() {
  const lastTouchRef = useRef(0);

  useEffect(() => {
    const touchThrottled = () => {
      const now = Date.now();
      if (now - lastTouchRef.current < 5000) return;
      lastTouchRef.current = now;
      touchSession(now);
    };

    const onStorage = (e) => {
      if (e.key === "soulmais_logout_at") {
        clearAuth();
        globalThis.location.href = "/login";
      }
    };

    const onActivity = () => touchThrottled();

    globalThis.addEventListener("storage", onStorage);
    globalThis.addEventListener("mousedown", onActivity);
    globalThis.addEventListener("keydown", onActivity);
    globalThis.addEventListener("touchstart", onActivity);
    globalThis.addEventListener("scroll", onActivity, { passive: true });

    const timer = globalThis.setInterval(() => {
      const auth = getAuth();
      if (!auth?.accessToken) return;
      const last = getLastActive() || 0;
      const now = Date.now();
      const base = last > 0 ? last : now;
      if (now - base >= SESSION_TIMEOUT_MS) {
        clearAuth();
        globalThis.location.href = "/login";
      }
    }, 15000);

    return () => {
      globalThis.removeEventListener("storage", onStorage);
      globalThis.removeEventListener("mousedown", onActivity);
      globalThis.removeEventListener("keydown", onActivity);
      globalThis.removeEventListener("touchstart", onActivity);
      globalThis.removeEventListener("scroll", onActivity);
      globalThis.clearInterval(timer);
    };
  }, []);
}

function App() {
  useSessionTimeoutGuard();
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/atividades" element={<Activities />} />
        <Route path="/conclusoes" element={<Completions />} />
        <Route path="/grupos" element={<Groups />} />
        <Route path="/participantes" element={<Participants />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable={false}
        theme="light"
      />
    </>
  );
}

export default App;
