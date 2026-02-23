import { Navigate } from "react-router-dom";
import { useAuth } from "./authContext";
import ScreenLoader from "../components/ScreenLoader";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <ScreenLoader label="Cargando sesión..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
