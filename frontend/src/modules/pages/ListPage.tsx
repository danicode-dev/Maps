import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api";

const STATUS_LABELS: Record<api.PlaceStatus, string> = {
  PENDING: "Pendiente",
  VISITED: "Visitado"
};

const CATEGORY_ICON_KEYS = new Set([
  "utensils",
  "wine",
  "coffee",
  "burger",
  "pharmacy",
  "fuel",
  "landmark",
  "tree",
  "binoculars",
  "walking",
  "umbrella-beach"
]);

const resolveCategoryKey = (icon?: string | null) =>
  icon && CATEGORY_ICON_KEYS.has(icon) ? icon : "default";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function ListPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const query = useQuery();
  const initialStatus = query.get("status");
  const [status, setStatus] = useState<api.PlaceStatus>(
    initialStatus === "VISITED" ? "VISITED" : "PENDING"
  );
  const [places, setPlaces] = useState<api.Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (initialStatus === "VISITED" || initialStatus === "PENDING") {
      setStatus(initialStatus);
    }
  }, [initialStatus]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    api
      .getPlaces(token)
      .then((data) => setPlaces(data))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [token]);

  const pendingCount = useMemo(
    () => places.filter((place) => place.status === "PENDING").length,
    [places]
  );
  const visitedCount = useMemo(
    () => places.filter((place) => place.status === "VISITED").length,
    [places]
  );

  const filtered = useMemo(() => {
    const subset = places.filter((place) => place.status === status);
    return subset.sort((a, b) => {
      const dateA = status === "VISITED" ? a.visitedAt ?? a.createdAt : a.createdAt;
      const dateB = status === "VISITED" ? b.visitedAt ?? b.createdAt : b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [places, status]);

  const emptyMessage =
    status === "PENDING"
      ? "No tienes sitios pendientes por ahora."
      : "Aun no has marcado sitios como visitados.";

  const pendingTabId = "list-tab-pending";
  const visitedTabId = "list-tab-visited";
  const activeTabId = status === "PENDING" ? pendingTabId : visitedTabId;
  const panelId = status === "PENDING" ? "list-panel-pending" : "list-panel-visited";

  const openOnMap = (placeId: number) => {
    localStorage.setItem("granada.focusPlaceId", placeId.toString());
    navigate("/");
  };

  const handleDeletePlace = async (place: api.Place) => {
    if (!token) return;
    const confirmed = window.confirm(`Seguro que quieres borrar "${place.name}"?`);
    if (!confirmed) return;
    setError(null);
    setDeletingId(place.id);
    try {
      await api.deletePlace(token, place.id);
      setPlaces((prev) => prev.filter((item) => item.id !== place.id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId((prev) => (prev === place.id ? null : prev));
    }
  };

  return (
    <div className="list-page">
      <header className="list-hero">
        <div className="list-hero__top">
          <div className="list-hero__intro">
            <span className="eyebrow">Organiza sus planes</span>
            <h1>Tus listas</h1>
            <p>Todo lo pendiente y lo que ya visitaron juntos.</p>
          </div>
          <Link className="ghost-button" to="/">
            Volver al mapa
          </Link>
        </div>
        <div className="list-hero__controls">
          <div className="list-tabs" role="tablist" aria-label="Listas">
            <button
              className={`chip ${status === "PENDING" ? "chip--active" : ""}`}
              onClick={() => setStatus("PENDING")}
              aria-selected={status === "PENDING"}
              aria-controls="list-panel-pending"
              id={pendingTabId}
              role="tab"
              tabIndex={status === "PENDING" ? 0 : -1}
            >
              Pendientes
              <span className="list-tabs__count">{pendingCount}</span>
            </button>
            <button
              className={`chip ${status === "VISITED" ? "chip--active" : ""}`}
              onClick={() => setStatus("VISITED")}
              aria-selected={status === "VISITED"}
              aria-controls="list-panel-visited"
              id={visitedTabId}
              role="tab"
              tabIndex={status === "VISITED" ? 0 : -1}
            >
              Visitados
              <span className="list-tabs__count">{visitedCount}</span>
            </button>
          </div>
          <span className="list-hero__summary muted">
            {places.length} sitios guardados
          </span>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      <section
        className="list-panel"
        role="tabpanel"
        id={panelId}
        aria-labelledby={activeTabId}
      >
        {loading && <p className="muted">Cargando lista...</p>}

        {loading && (
          <div className="list-grid list-grid--skeleton">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="list-card list-card--skeleton">
                <div className="list-card__skeleton-line"></div>
                <div className="list-card__skeleton-line list-card__skeleton-line--wide"></div>
                <div className="list-card__skeleton-block"></div>
                <div className="list-card__skeleton-block list-card__skeleton-block--tall"></div>
                <div className="list-card__skeleton-actions"></div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="list-empty muted">{emptyMessage}</p>
        )}

        {!loading && filtered.length > 0 && (
          <div className="list-grid">
            {filtered.map((place) => {
              const rawDate = place.visitedAt ?? place.createdAt;
              const displayDate = rawDate ? new Date(rawDate) : null;
              const categoryKey = resolveCategoryKey(place.category?.icon ?? null);
              return (
                <article
                  key={place.id}
                  className={`list-card list-card--${place.status.toLowerCase()}`}
                >
                  <div className="list-card__header">
                    <div className="list-card__badges">
                      <span className={`status-pill status-pill--${place.status.toLowerCase()}`}>
                        {STATUS_LABELS[place.status]}
                      </span>
                      {place.category && (
                        <span className={`category-pill category-pill--${categoryKey}`}>
                          {place.category.name}
                        </span>
                      )}
                    </div>
                    {displayDate && (
                      <time
                        className="list-card__date muted"
                        dateTime={displayDate.toISOString()}
                      >
                        {displayDate.toLocaleDateString()}
                      </time>
                    )}
                  </div>
                  <h3 className="list-card__title">{place.name}</h3>
                  <div className="list-card__meta">
                    <span className="list-card__meta-label">Lugar</span>
                    <span className={`list-card__meta-value ${place.address ? "" : "muted"}`}>
                      {place.address ? place.address : "Direccion pendiente"}
                    </span>
                  </div>
                  {place.notes ? (
                    <p className="list-card__notes">{place.notes}</p>
                  ) : (
                    <p className="list-card__notes list-card__notes--empty">
                      Sin notas aun.
                    </p>
                  )}
                  <div className="list-card__actions">
                    <button
                      className="primary-button"
                      onClick={() => openOnMap(place.id)}
                      aria-label={`Ver ${place.name} en el mapa`}
                    >
                      Ver en el mapa
                    </button>
                    <button
                      className="ghost-button ghost-button--danger"
                      onClick={() => handleDeletePlace(place)}
                      disabled={deletingId === place.id}
                    >
                      {deletingId === place.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
