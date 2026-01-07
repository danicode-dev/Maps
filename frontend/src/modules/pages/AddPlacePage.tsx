import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api";
import { getActiveGroupId } from "../utils/storage";

const DEFAULT_CENTER: [number, number] = [37.1773, -3.5986];

function markerIcon() {
  return L.divIcon({
    className: "marker",
    html: '<span class="marker-dot marker-dot--pending"></span>',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

type Coordinate = { lat: number; lng: number };

function LocationPicker({ value, onChange }: { value?: Coordinate; onChange: (c: Coordinate) => void }) {
  useMapEvents({
    click(event) {
      onChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });
  if (!value) return null;
  return <Marker position={[value.lat, value.lng]} icon={markerIcon()} />;
}

export function AddPlacePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<api.Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<Coordinate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.getCategories(token).then(setCategories).catch(() => undefined);
  }, [token]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const activeGroupId = getActiveGroupId();
    if (!activeGroupId) {
      setError("Crea o unete a un grupo antes de anadir lugares");
      return;
    }
    if (!coords) {
      setError("Selecciona una ubicacion en el mapa");
      return;
    }
    if (!categoryId) {
      setError("Selecciona una categoria");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const created = await api.createPlace(token, {
        groupId: activeGroupId,
        name,
        description,
        categoryId,
        lat: coords.lat,
        lng: coords.lng,
        address
      });
      navigate(`/app/place/${created.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="add-page">
      <h2>Nuevo lugar</h2>
      <p className="card-meta">Primero elige el punto en el mapa.</p>

      <div className="map-shell map-shell--compact">
        <MapContainer center={DEFAULT_CENTER} zoom={13} className="map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationPicker value={coords || undefined} onChange={setCoords} />
        </MapContainer>
      </div>

      <form className="form" onSubmit={submit}>
        <label>
          Nombre
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          Categoria
          <select
            value={categoryId ?? ""}
            onChange={(event) =>
              setCategoryId(event.target.value ? Number(event.target.value) : null)
            }
            required
          >
            <option value="">Selecciona una categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Descripcion
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          Direccion
          <input value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        {coords && (
          <div className="coords">
            Lat {coords.lat.toFixed(5)} / Lng {coords.lng.toFixed(5)}
          </div>
        )}
        {error && <div className="form-error">{error}</div>}
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar lugar"}
        </button>
      </form>
    </section>
  );
}
