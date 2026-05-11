import "./App.css";
import { Navigate, Route, Routes } from "react-router-dom";
import Activities from "./pages/Activities";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/atividades" element={<Activities />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
