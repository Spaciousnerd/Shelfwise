import React from "react";
import { protectedRouteStyles as s } from "../assets/dummyStyles";
import { useAuth } from "./AuthContext";
import { Navigate, Outlet, useLocation } from "react-router-dom";
const ProtectedRoutes = ({ allowedRole }) => {
  const { currentUser, ready } = useAuth();
  const location = useLocation();
  if (!ready) {
    console.log("Protected route auth not ready yet");
    return (
      <div className={s.loadingContainer}>
        <div className={s.loadingCard}>Loading your library workspace...</div>
      </div>
    );
  }
  if (!currentUser) {
    const hasToken = localStorage.getItem("library-auth-token");
    console.log(
      "Protected Route : No Current Use. HasToken:",
      hasToken,
      "AllowedRole : ",
      allowedRole,
    );
    if (hasToken) {
      return (
        <div className={s.loadingContainer}>
          <div className={s.loadingCard}>Syncing your workspace...</div>
        </div>
      );
    }
    return <Navigate to="login" replace state={{ from: location.pathname }} />;
  }
  console.log(
    "Protected Route : CurrentUser : ",
    currentUser.role,
    "Allowed Roles : ",
    allowedRole,
  );
  if (currentUser.role !== allowedRole) {
    console.warn("ProtectedRoute : Role mismatch : Redirecting to login...");
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  console.log("Protected Route : Access Granted");
  return <Outlet />;
};

export default ProtectedRoutes;
