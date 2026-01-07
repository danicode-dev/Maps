import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api";

export function ListPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState<api.PlaceStatus>("PENDING");
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<api.Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlaces = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPlaces(token, { status, q: query });
      setPlaces(data.content);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, status, query]);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  const updateStatus = async (place: api.Place, nextStatus: api.PlaceStatus, favorite: boolean) => {
    if (!token) return;
    try {
      const updated = await api.updateStatus(token, place.id, {
        status: nextStatus,
        isFavorite: favorite
      });
      setPlaces((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className="list-page">
      <div className="list-header">
        <div className="tabs">
          <button
            className={`tab ${status === "PENDING" ? "tab--active" : ""}`}
            onClick={() => setStatus("PENDING")}
          >
            Pendientes
          </button>
          <button
            className={`tab ${status === "VISITED" ? "tab--active" : ""}`}
            onClick={() => setStatus("VISITED")}
          >
            Visitados
          </button>
        </div>
        <div className="list-search">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o direccion"
          />
          <button className="ghost-button" onClick={loadPlaces} disabled={loading}>
            Filtrar
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="cards-grid">
        {places.map((place) => (
          <article key={place.id} className="card">
            <header className="card-header">
              <h3>{place.name}</h3>
              <span className={`status-pill status-pill--${place.status.toLowerCase()}`}>
                {place.status}
              </span>
            </header>
            <p className="card-meta">{place.category?.name || "Sin categoria"}</p>
            {place.address && <p className="card-meta">{place.address}</p>}
            <div className="card-actions">
              <button
                className="ghost-button"
                onClick={() => updateStatus(place, place.status, !place.favorite)}
              >
                {place.favorite ? "Quitar favorito" : "Favorito"}
              </button>
              <button
                className="primary-button"
                onClick={() =>
                  updateStatus(
                    place,
                    place.status === "PENDING" ? "VISITED" : "PENDING",
                    place.favorite
                  )
                }
              >
                {place.status === "PENDING" ? "Marcar visitado" : "Marcar pendiente"}
              </button>
            </div>
            <Link className="link-button" to={`/app/place/${place.id}`}>
              Ver detalle
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
