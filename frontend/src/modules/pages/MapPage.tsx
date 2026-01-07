import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api";

const DEFAULT_CENTER: [number, number] = [37.1773, -3.5986];

function createStatusIcon(status: api.PlaceStatus) {
  return L.divIcon({
    className: "marker",
    html: `<span class="marker-dot marker-dot--${status.toLowerCase()}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

export function MapPage() {
  const { token } = useAuth();
  const [places, setPlaces] = useState<api.Place[]>([]);
  const [selected, setSelected] = useState<api.Place | null>(null);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [map, setMap] = useState<L.Map | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlaces = useCallback(async () => {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const data = await api.getPlaces(token, { size: 200 });
      setPlaces(data.content);
      if (data.content.length === 0) {
        setSelected(null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadPlaces();
  }, [token, loadPlaces]);

  const nearby = async () => {
    if (!token) return;
    if (!navigator.geolocation) {
      setError("Geolocalizacion no disponible");
      return;
    }
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setCenter([latitude, longitude]);
          if (map) {
            map.setView([latitude, longitude], 14);
          }
          const data = await api.getNearby(token, {
            lat: latitude,
            lng: longitude,
            radiusMeters: 2000
          });
          setPlaces(data);
        } catch (err) {
          setError((err as Error).message);
        }
      },
      () => {
        setError("No se pudo obtener la ubicacion");
      }
    );
  };

  const updateStatus = async (place: api.Place, nextStatus: api.PlaceStatus, favorite: boolean) => {
    if (!token) return;
    try {
      const updated = await api.updateStatus(token, place.id, {
        status: nextStatus,
        isFavorite: favorite
      });
      setPlaces((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelected(updated);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="map-page">
      <div className="map-toolbar">
        <button className="ghost-button" onClick={loadPlaces} disabled={loading}>
          Ver todo
        </button>
        <button className="primary-button" onClick={nearby}>
          Cerca de mi
        </button>
        {error && <span className="form-error">{error}</span>}
      </div>

      <div className="map-layout">
        <div className="map-shell">
          <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom
            className="map"
            whenCreated={setMap}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {places.map((place) => (
              <Marker
                key={place.id}
                position={[place.lat, place.lng]}
                icon={createStatusIcon(place.status)}
                eventHandlers={{
                  click: () => setSelected(place)
                }}
              />
            ))}
          </MapContainer>
        </div>

        <aside className={`place-panel ${selected ? "place-panel--open" : ""}`}>
          {selected ? (
            <>
              <div className="place-panel__header">
                <h2>{selected.name}</h2>
                <span className={`status-pill status-pill--${selected.status.toLowerCase()}`}>
                  {selected.status}
                </span>
              </div>
              <p className="place-panel__meta">{selected.category?.name || "Sin categoria"}</p>
              {selected.address && <p className="place-panel__meta">{selected.address}</p>}
              <div className="place-panel__actions">
                <button
                  className="ghost-button"
                  onClick={() => updateStatus(selected, selected.status, !selected.favorite)}
                >
                  {selected.favorite ? "Quitar favorito" : "Favorito"}
                </button>
                <button
                  className="primary-button"
                  onClick={() =>
                    updateStatus(
                      selected,
                      selected.status === "PENDING" ? "VISITED" : "PENDING",
                      selected.favorite
                    )
                  }
                >
                  {selected.status === "PENDING" ? "Marcar visitado" : "Marcar pendiente"}
                </button>
              </div>
              <Link className="link-button" to={`/app/place/${selected.id}`}>
                Ver detalle
              </Link>
            </>
          ) : (
            <div className="place-panel__empty">
              <h3>Selecciona un sitio</h3>
              <p>Explora el mapa y toca un marcador.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
