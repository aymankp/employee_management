import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function ProtectedRoute({ children, role }) {
  const { user } = useContext(AuthContext);

  const storedUser = localStorage.getItem("user");
  const parsedUser = storedUser ? JSON.parse(storedUser) : null;

  const currentUser = user || parsedUser;

  if (!currentUser) return <Navigate to="/login" />;

  if (role && currentUser.role !== role)
    return <Navigate to="/" />;

  return children;
}
