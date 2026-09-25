import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

import Loader from "../layout/Loader/Loader";

/**
 * Guards admin-only routes.
 *
 *   not signed in  -> /login
 *   signed in, not admin -> /
 *   signed in admin -> renders the route
 *
 * `loadUser()` runs on app mount, so on a hard refresh / deep-link the auth
 * state is briefly unresolved (`loading` is truthy or undefined). We show the
 * Loader until it settles rather than bouncing a real admin to /login on the
 * first frame. `replace` keeps the guarded URL out of history so Back doesn't
 * loop straight back into the redirect.
 */
const ProtectedAdminRoute = ({ children }) => {
  const { loading, isAuthenticated, user } = useSelector((state) => state.user);

  // Auth state not resolved yet — wait instead of redirecting.
  if (loading !== false) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedAdminRoute;
