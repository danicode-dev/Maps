import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-eyebrow">Granada Guide</p>
          <h1>Tu mapa privado</h1>
        </div>
        <div className="app-user">
          <span>{user?.name}</span>
          <button
            className="ghost-button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Salir
          </button>
        </div>
      </header>

      <nav className="app-nav">
        <NavLink to="/app/map" className="nav-link">
          Mapa
        </NavLink>
        <NavLink to="/app/list" className="nav-link">
          Listas
        </NavLink>
        <NavLink to="/app/add" className="nav-link">
          Anadir
        </NavLink>
        <NavLink to="/app/group" className="nav-link">
          Grupo
        </NavLink>
      </nav>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
