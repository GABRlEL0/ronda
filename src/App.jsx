import { Route, Routes } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import RequireRole from "./auth/RequireRole";
import RoleRedirect from "./auth/RoleRedirect";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import AdminLayout from "./components/layout/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminClients from "./pages/admin/Clients";
import AdminProducts from "./pages/admin/Products";
import AdminRounds from "./pages/admin/Rounds";
import AdminUsers from "./pages/admin/Users";
import Reports from "./pages/admin/Reports";
import DriverHome from "./pages/driver/Home";

export default function App() {
  return (
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
  );
}
