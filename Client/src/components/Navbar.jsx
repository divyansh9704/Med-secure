import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, Inbox, Send, FileText, LogOut, Settings, Home, Shield } from "lucide-react";
import { api } from "../lib/api";
import "bootstrap/dist/css/bootstrap.min.css";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/auth/profile");
        setSession(res.data.user);
      } catch (e) {
        setSession(null);
      }
    })();
  }, [location.pathname]);

  const handleLogout = async () => {
    // Disconnect socket before clearing session
    const socket = window.__medsecure_socket;
    if (socket) {
      socket.emit('leave_room', {
        doctorId: session?.username || '',
        doctorName: session?.username || ''
      });
      socket.disconnect();
      window.__medsecure_socket = null;
    }
    // Clear client-side token first
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('auth_token');
    }
    try { await api.post("/auth/logout", {}); } catch {}
    setSession(null);
    navigate("/");
  };

  const displayName = (() => {
    const raw = session?.username || "";
    return raw
      ? raw
          .split(" ")
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : "";
  })();

  const initials = (() => {
    if (!displayName) return "";
    const parts = displayName.split(" ").filter(Boolean);
    const first = parts[0]?.charAt(0) || "";
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (first + last).toUpperCase();
  })();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm">
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold" to={session ? "/dashboard" : "/"}>
          MedSecure
        </Link>

        {session && (
          <div className="ms-auto">
            <div className="dropdown">
              <button
                className="btn btn-link text-white text-decoration-none dropdown-toggle d-flex align-items-center"
                type="button"
                id="userDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <span
                  className="me-2 d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.2)",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {initials || <User size={16} />}
                </span>
                <span>{displayName}</span>
              </button>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                <li className="px-3 py-2">
                  <div className="d-flex align-items-center">
                    <div
                      className="me-2 d-inline-flex align-items-center justify-content-center"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "#0d6efd",
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      {initials || <User size={18} />}
                    </div>
                    <div>
                      <div className="fw-semibold">{displayName}</div>
                      <div className="text-muted small">{session.email || session.username}</div>
                    </div>
                  </div>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <Link className="dropdown-item d-flex align-items-center" to="/dashboard">
                    <Home size={16} className="me-2" /> Dashboard
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item d-flex align-items-center" to="/dashboard/inbox">
                    <Inbox size={16} className="me-2" /> Inbox
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item d-flex align-items-center" to="/dashboard/sent">
                    <Send size={16} className="me-2" /> Sent
                  </Link>
                </li>
                {session.role === "admin" && (
                  <li>
                    <Link className="dropdown-item d-flex align-items-center" to="/dashboard/logs">
                      <FileText size={16} className="me-2" /> Audit Logs
                    </Link>
                  </li>
                )}
                <li>
                  <Link className="dropdown-item d-flex align-items-center" to="/dashboard/profile">
                    <User size={16} className="me-2" /> Profile
                  </Link>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item d-flex align-items-center text-danger" onClick={handleLogout}>
                    <LogOut size={16} className="me-2" /> Logout
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
