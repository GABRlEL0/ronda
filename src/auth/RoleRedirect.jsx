import { Navigate } from "react-router-dom";
import { useAuth } from "./authContext";
import ScreenLoader from "../components/ScreenLoader";

export default function RoleRedirect() {
  const { role, loading } = useAuth();

  if (loading) {
    return <ScreenLoader label="Preparando tu vista..." />;
  }

  if (role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (role === "driver") {
    return <Navigate to="/driver" replace />;
  }

  return <Navigate to="/login" replace />;
}
