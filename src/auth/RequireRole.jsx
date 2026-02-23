import { Navigate } from "react-router-dom";
import { useAuth } from "./authContext";
import ScreenLoader from "../components/ScreenLoader";

export default function RequireRole({ allow, children }) {
  const { role, loading } = useAuth();

  if (loading) {
    return <ScreenLoader label="Validando permisos..." />;
  }

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (!allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
