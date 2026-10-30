import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";
import RoleRedirect from "./auth/RoleRedirect";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import ScreenLoader from "./components/ScreenLoader";

// Carga diferida: el repartidor no descarga Admin (recharts, xlsx) y viceversa.
const AdminLayout = lazy(() => import("./components/layout/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminClients = lazy(() => import("./pages/admin/Clients"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminRounds = lazy(() => import("./pages/admin/Rounds"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const Reports = lazy(() => import("./pages/admin/Reports"));
const DriverHome = lazy(() => import("./pages/driver/Home"));

export default function App() {
  return (
    <Suspense fallback={<ScreenLoader label="Cargando..." />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <RoleRedirect />
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireRole allow={["admin"]}>
                <AdminLayout />
              </RequireRole>
            </RequireAuth>
          }
        >
          <Route index element={<AdminClients />} />
          <Route path="clientes" element={<AdminClients />} />
          <Route path="productos" element={<AdminProducts />} />
          <Route path="rondas" element={<AdminRounds />} />
          <Route path="usuarios" element={<AdminUsers />} />
          <Route path="reportes" element={<Reports />} />
          <Route path="dashboard" element={<AdminDashboard />} />
        </Route>

        <Route
          path="/driver"
          element={
            <RequireAuth>
              <RequireRole allow={["driver", "admin"]}>
                <DriverHome />
              </RequireRole>
            </RequireAuth>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
