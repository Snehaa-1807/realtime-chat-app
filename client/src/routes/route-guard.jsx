import { useAuth } from "@/hooks/use-auth";
import { Navigate, Outlet } from "react-router-dom";

const RouteGuard = ({ requireAuth }) => {
  const { user } = useAuth();

  if (requireAuth && !user) return <Navigate to="/" replace />;
  if (!requireAuth && user) return <Navigate to="/chat" replace />;

  return <Outlet />;
};

export default RouteGuard;
