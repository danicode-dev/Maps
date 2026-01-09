import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useAuth } from "../auth/AuthContext";
import * as api from "../api";

const DEFAULT_CENTER: [number, number] = [37.1773, -3.5986];
const STATUS_LABELS: Record<api.PlaceStatus, string> = {
  PENDING: "Pendiente",
  VISITED: "Visitado"
};
const TILE_URL =
  import.meta.env.VITE_MAP_TILES_URL ??
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const TILE_ATTRIBUTION =
  import.meta.env.VITE_MAP_TILES_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const TILE_SUBDOMAINS = import.meta.env.VITE_MAP_TILES_SUBDOMAINS ?? "abcd";
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const POI_ZOOM_THRESHOLD = 15;
const POI_LIMIT = 180;

type DraftPlace = {
  lat: number;
  lng: number;
  name: string;
  status: api.PlaceStatus;
  notes: string;
  address: string;
  categoryId?: number | null;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
  type?: string;
  class?: string;
};

type NominatimReverseResult = {
  place_id: number;
  display_name?: string;
  boundingbox?: [string, string, string, string];
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
};

type CityBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

type PoiKind =
  | "restaurant"
  | "bar"
  | "cafe"
  | "fast_food"
  | "museum"
  | "park"
  | "attraction"
  | "pharmacy"
  | "fuel"
  | "other";

type PoiItem = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  kind: PoiKind;
  iconKey: string;
  label: string;
};

type PoiCity = {
  name: string;
  placeId: number;
  bounds: CityBounds;
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OverpassElement[];
};

const iconSvg = (body: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="place-marker__svg" stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const CATEGORY_ICON_MAP: Record<string, string> = {
  utensils: iconSvg(
    '<path d="M7 3h10v4a5 5 0 0 1-10 0V3z" /><line x1="12" y1="12" x2="12" y2="18" /><line x1="8" y1="21" x2="16" y2="21" />'
  ),
  wine: iconSvg(
    '<path d="M7 3h10c0 4-2 7-5 7s-5-3-5-7z" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="12" y1="10" x2="12" y2="18" /><line x1="8" y1="21" x2="16" y2="21" />'
  ),
  coffee: iconSvg(
    '<path d="M5 8h10v4a4 4 0 0 1-8 0V8z" /><path d="M15 9h1a2 2 0 0 1 0 4h-1" /><line x1="7" y1="21" x2="13" y2="21" />'
  ),
  burger: iconSvg(
    '<path d="M5 10a7 7 0 0 1 14 0H5z" /><path d="M4 13h16" /><path d="M6 16h12" /><path d="M7 18h10" />'
  ),
  pharmacy: iconSvg(
    '<line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />'
  ),
  fuel: iconSvg(
    '<rect x="6" y="4" width="8" height="16" rx="1.5" /><path d="M14 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-1" /><line x1="8" y1="8" x2="12" y2="8" />'
  ),
  landmark: iconSvg(
    '<path d="M4 10h16L12 4 4 10z" /><line x1="4" y1="20" x2="20" y2="20" /><line x1="6" y1="10" x2="6" y2="18" /><line x1="10" y1="10" x2="10" y2="18" /><line x1="14" y1="10" x2="14" y2="18" /><line x1="18" y1="10" x2="18" y2="18" />'
  ),
  tree: iconSvg(
    '<circle cx="12" cy="8" r="5" /><line x1="12" y1="13" x2="12" y2="19" /><line x1="9" y1="19" x2="15" y2="19" />'
  ),
  binoculars: iconSvg(
    '<circle cx="8" cy="12" r="4" /><circle cx="16" cy="12" r="4" /><line x1="10" y1="12" x2="14" y2="12" />'
  ),
  walking: iconSvg(
    '<circle cx="10" cy="5" r="2" /><path d="M10 7l2 4 4 2" /><path d="M12 11l-3 8" /><path d="M9 16l-4 4" />'
  ),
  "umbrella-beach": iconSvg(
    '<path d="M4 11a8 8 0 0 1 16 0" /><line x1="12" y1="11" x2="12" y2="20" /><line x1="12" y1="20" x2="15" y2="20" />'
  ),
  default: iconSvg(
    '<path d="M12 3a5 5 0 0 1 5 5c0 4-5 10-5 10S7 12 7 8a5 5 0 0 1 5-5z" /><circle cx="12" cy="8" r="2" />'
  )
};

const DEFAULT_CATEGORY_ICON = "default";

function resolveCategoryIconKey(icon?: string | null) {
  if (!icon) return DEFAULT_CATEGORY_ICON;
  return CATEGORY_ICON_MAP[icon] ? icon : DEFAULT_CATEGORY_ICON;
}

function createPlaceIcon(place: api.Place) {
  const iconKey = resolveCategoryIconKey(place.category?.icon);
  const icon = CATEGORY_ICON_MAP[iconKey] ?? CATEGORY_ICON_MAP[DEFAULT_CATEGORY_ICON];
  return L.divIcon({
    className: "marker",
    html: `<span class="place-marker place-marker--${iconKey}">
      <span class="place-marker__icon">${icon}</span>
      <span class="place-marker__status place-marker__status--${place.status.toLowerCase()}"></span>
    </span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
}

function parseCityBounds(boundingbox: [string, string, string, string]): CityBounds | null {
  const south = Number.parseFloat(boundingbox[0]);
  const north = Number.parseFloat(boundingbox[1]);
  const west = Number.parseFloat(boundingbox[2]);
  const east = Number.parseFloat(boundingbox[3]);
  if (
    Number.isNaN(south) ||
    Number.isNaN(north) ||
    Number.isNaN(west) ||
    Number.isNaN(east)
  ) {
    return null;
  }
  return {
    minLat: south,
    maxLat: north,
    minLng: west,
    maxLng: east
  };
}

function isWithinBounds([lat, lng]: [number, number], bounds: CityBounds) {
  return (
    lat >= bounds.minLat &&
    lat <= bounds.maxLat &&
    lng >= bounds.minLng &&
    lng <= bounds.maxLng
  );
}

function intersectBounds(mapBounds: L.LatLngBounds, cityBounds: CityBounds): CityBounds | null {
  const sw = mapBounds.getSouthWest();
  const ne = mapBounds.getNorthEast();
  const minLat = Math.max(sw.lat, cityBounds.minLat);
  const maxLat = Math.min(ne.lat, cityBounds.maxLat);
  const minLng = Math.max(sw.lng, cityBounds.minLng);
  const maxLng = Math.min(ne.lng, cityBounds.maxLng);
  if (minLat >= maxLat || minLng >= maxLng) {
    return null;
  }
  return { minLat, maxLat, minLng, maxLng };
}

function classifyPoi(tags: Record<string, string>) {
  const amenity = tags.amenity;
  const tourism = tags.tourism;
  const leisure = tags.leisure;
  const name = `${tags.name ?? ""} ${tags.brand ?? ""}`.toLowerCase();
  const isFastFoodBrand =
    name.includes("mcdonald") || name.includes("burger king");

  if (tourism === "museum" || tourism === "gallery") {
    return { kind: "museum" as const, iconKey: "landmark", label: "Museo" };
  }
  if (tourism === "attraction") {
    return { kind: "attraction" as const, iconKey: "default", label: "Atraccion" };
  }
  if (leisure === "park" || leisure === "garden" || leisure === "recreation_ground") {
    return { kind: "park" as const, iconKey: "tree", label: "Parque" };
  }
  if (amenity === "pharmacy") {
    return { kind: "pharmacy" as const, iconKey: "pharmacy", label: "Farmacia" };
  }
  if (amenity === "fuel") {
    return { kind: "fuel" as const, iconKey: "fuel", label: "Gasolinera" };
  }
  if (amenity === "fast_food" || isFastFoodBrand) {
    return { kind: "fast_food" as const, iconKey: "burger", label: "Comida rapida" };
  }
  if (amenity === "restaurant") {
    return { kind: "restaurant" as const, iconKey: "wine", label: "Restaurante" };
  }
  if (amenity === "bar" || amenity === "pub") {
    return { kind: "bar" as const, iconKey: "wine", label: "Bar" };
  }
  if (amenity === "cafe") {
    return { kind: "cafe" as const, iconKey: "coffee", label: "Cafe" };
  }
  return { kind: "other" as const, iconKey: "default", label: "Sitio" };
}

function resolvePoiName(tags: Record<string, string>, label: string) {
  const name =
    tags["name:es"] ??
    tags.name ??
    tags.brand ??
    tags.operator ??
    tags.short_name;
  if (name && name.trim()) {
    return name;
  }
  return `${label} sin nombre`;
}

function buildOverpassQuery(bounds: CityBounds) {
  const { minLat, minLng, maxLat, maxLng } = bounds;
  return `[out:json][timeout:25];
(
  node["amenity"~"restaurant|bar|pub|cafe|fast_food|pharmacy|fuel"](${minLat},${minLng},${maxLat},${maxLng});
  way["amenity"~"restaurant|bar|pub|cafe|fast_food|pharmacy|fuel"](${minLat},${minLng},${maxLat},${maxLng});
  relation["amenity"~"restaurant|bar|pub|cafe|fast_food|pharmacy|fuel"](${minLat},${minLng},${maxLat},${maxLng});
  node["tourism"~"museum|gallery|attraction"](${minLat},${minLng},${maxLat},${maxLng});
  way["tourism"~"museum|gallery|attraction"](${minLat},${minLng},${maxLat},${maxLng});
  relation["tourism"~"museum|gallery|attraction"](${minLat},${minLng},${maxLat},${maxLng});
  node["leisure"~"park|garden|recreation_ground"](${minLat},${minLng},${maxLat},${maxLng});
  way["leisure"~"park|garden|recreation_ground"](${minLat},${minLng},${maxLat},${maxLng});
  relation["leisure"~"park|garden|recreation_ground"](${minLat},${minLng},${maxLat},${maxLng});
  node["brand"~"McDonald's|McDonalds|Burger King",i](${minLat},${minLng},${maxLat},${maxLng});
  way["brand"~"McDonald's|McDonalds|Burger King",i](${minLat},${minLng},${maxLat},${maxLng});
  relation["brand"~"McDonald's|McDonalds|Burger King",i](${minLat},${minLng},${maxLat},${maxLng});
  node["name"~"McDonald's|McDonalds|Burger King",i](${minLat},${minLng},${maxLat},${maxLng});
  way["name"~"McDonald's|McDonalds|Burger King",i](${minLat},${minLng},${maxLat},${maxLng});
  relation["name"~"McDonald's|McDonalds|Burger King",i](${minLat},${minLng},${maxLat},${maxLng});
);
out center;`;
}

function createPoiIcon(poi: PoiItem) {
  const icon = CATEGORY_ICON_MAP[poi.iconKey] ?? CATEGORY_ICON_MAP[DEFAULT_CATEGORY_ICON];
  return L.divIcon({
    className: "poi-marker",
    html: `<span class="poi-marker__icon poi-marker__icon--${poi.iconKey}">${icon}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

function MapEvents({
  addMode,
  onPickPoint,
  onBoundsChange,
  onViewChange
}: {
  addMode: boolean;
  onPickPoint: (lat: number, lng: number) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
  onViewChange?: (center: L.LatLng, zoom: number) => void;
}) {
  useMapEvents({
    click: (event) => {
      if (addMode) {
        onPickPoint(event.latlng.lat, event.latlng.lng);
      }
    },
    moveend: (event) => {
      const map = event.target;
      onBoundsChange(map.getBounds());
      if (onViewChange) {
        onViewChange(map.getCenter(), map.getZoom());
      }
    }
  });
  return null;
}

function MapViewController({
  target
}: {
  target:
    | { center: [number, number]; zoom: number }
    | { bounds: [[number, number], [number, number]] }
    | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    if ("bounds" in target) {
      map.fitBounds(target.bounds, { padding: [80, 80], animate: true, duration: 0.8 });
      return;
    }
    map.flyTo(target.center, target.zoom, { animate: true, duration: 0.8 });
  }, [map, target]);

  return null;
}

function PhotoThumb({
  photo,
  token,
  onDelete,
  deleting
}: {
  photo: api.Photo;
  token: string | null;
  onDelete?: (photoId: number) => void;
  deleting?: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    let objectUrl: string | null = null;
    const controller = new AbortController();
    setLoading(true);
    setSrc(null);
    const load = async () => {
      try {
        const response = await fetch(photo.url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error("Photo not available");
        }
        const blob = await response.blob();
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (active) {
          setSrc(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [photo.id, photo.url, token]);

  return (
    <figure className="photo-card">
      {onDelete && (
        <div className="photo-card__actions">
          <button
            type="button"
            className="photo-card__delete"
            onClick={() => onDelete(photo.id)}
            disabled={deleting}
            aria-label="Eliminar foto"
          >
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      )}
      {src ? (
        <img src={src} alt={photo.caption || "Foto"} />
      ) : (
        <div className="photo-skeleton">{loading ? "Cargando..." : "No disponible"}</div>
      )}
      {photo.caption && <figcaption>{photo.caption}</figcaption>}
    </figure>
  );
}

export function MapPage() {
  const { token, user, logout } = useAuth();
  const [places, setPlaces] = useState<api.Place[]>([]);
  const [poiItems, setPoiItems] = useState<PoiItem[]>([]);
  const [poiCity, setPoiCity] = useState<PoiCity | null>(null);
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiError, setPoiError] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [mapZoom, setMapZoom] = useState(13);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [categories, setCategories] = useState<api.Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selected, setSelected] = useState<api.Place | null>(null);
  const [draft, setDraft] = useState<DraftPlace | null>(null);
  const [draftAddressLoading, setDraftAddressLoading] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [bbox, setBbox] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [viewTarget, setViewTarget] = useState<
    { center: [number, number]; zoom: number } | { bounds: [[number, number], [number, number]] } | null
  >(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoDeletingId, setPhotoDeletingId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<api.Photo[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<Record<number, string | null>>({});
  const [photoPreviewLoading, setPhotoPreviewLoading] = useState<Record<number, boolean>>({});
  const photoPreviewUrlsRef = useRef<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(
    null
  );
  const searchTimerRef = useRef<number | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);
  const poiTimerRef = useRef<number | null>(null);
  const poiControllerRef = useRef<AbortController | null>(null);
  const poiCityTimerRef = useRef<number | null>(null);
  const poiCityControllerRef = useRef<AbortController | null>(null);
  const poiRequestKeyRef = useRef<string | null>(null);
  const draftAddressControllerRef = useRef<AbortController | null>(null);
  const drawerView = draft ? "create" : selected ? "detail" : "home";

  const pendingCount = useMemo(
    () => places.filter((place) => place.status === "PENDING").length,
    [places]
  );
  const visitedCount = useMemo(
    () => places.filter((place) => place.status === "VISITED").length,
    [places]
  );
  const latestPlaces = useMemo(() => {
    return [...places]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [places]);

  const showToast = useCallback((message: string, tone: "success" | "error" = "success") => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setCategoriesLoading(true);
    api
      .getCategories(token)
      .then((data) => {
        if (active) {
          setCategories(data);
        }
      })
      .catch((err) => {
        if (active) {
          showToast((err as Error).message, "error");
        }
      })
      .finally(() => {
        if (active) {
          setCategoriesLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [token, showToast]);

  const flyTo = useCallback((lat: number, lng: number, zoomLevel: number) => {
    const nextCenter: [number, number] = [lat, lng];
    setCenter(nextCenter);
    setViewTarget({ center: nextCenter, zoom: zoomLevel });
  }, []);

  const resolveAddress = useCallback(async (lat: number, lng: number) => {
    if (draftAddressControllerRef.current) {
      draftAddressControllerRef.current.abort();
    }
    const controller = new AbortController();
    draftAddressControllerRef.current = controller;
    setDraftAddressLoading(true);
    try {
      const response = await fetch(
        `${NOMINATIM_BASE_URL}/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${lat}&lon=${lng}`,
        { signal: controller.signal }
      );
      if (!response.ok) {
        throw new Error("No pudimos obtener la direccion.");
      }
      const data = (await response.json()) as NominatimReverseResult;
      if (controller.signal.aborted) return;
      const address = data.display_name ?? "";
      setDraft((prev) =>
        prev && prev.lat === lat && prev.lng === lng ? { ...prev, address } : prev
      );
    } catch {
      if (!controller.signal.aborted) {
        setDraft((prev) =>
          prev && prev.lat === lat && prev.lng === lng ? { ...prev, address: "" } : prev
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setDraftAddressLoading(false);
      }
    }
  }, []);

  const applySearchResult = useCallback(
    (result: NominatimResult) => {
      if (result.boundingbox && result.boundingbox.length === 4) {
        const south = parseFloat(result.boundingbox[0]);
        const north = parseFloat(result.boundingbox[1]);
        const west = parseFloat(result.boundingbox[2]);
        const east = parseFloat(result.boundingbox[3]);
        if (
          !Number.isNaN(south) &&
          !Number.isNaN(north) &&
          !Number.isNaN(west) &&
          !Number.isNaN(east)
        ) {
          setCenter([(south + north) / 2, (west + east) / 2]);
          setViewTarget({ bounds: [[south, west], [north, east]] });
          return;
        }
      }
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        flyTo(lat, lng, 14);
      }
    },
    [flyTo]
  );

  const loadPreview = useCallback(
    async (placeId: number) => {
      if (!token) return;
      if (photoPreviews[placeId] !== undefined || photoPreviewLoading[placeId]) return;
      setPhotoPreviewLoading((prev) => ({ ...prev, [placeId]: true }));
      try {
        const items = await api.getPhotos(token, placeId);
        if (items.length === 0) {
          setPhotoPreviews((prev) => ({ ...prev, [placeId]: null }));
          return;
        }
        const response = await fetch(items[0].url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error("Photo not available");
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        photoPreviewUrlsRef.current[placeId] = objectUrl;
        setPhotoPreviews((prev) => ({ ...prev, [placeId]: objectUrl }));
      } catch {
        setPhotoPreviews((prev) => ({ ...prev, [placeId]: null }));
      } finally {
        setPhotoPreviewLoading((prev) => ({ ...prev, [placeId]: false }));
      }
    },
    [token, photoPreviews, photoPreviewLoading]
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const stored = localStorage.getItem("granada.focusPlaceId");
    if (stored) {
      const parsed = Number(stored);
      if (!Number.isNaN(parsed)) {
        setFocusId(parsed);
      }
    }
  }, []);

  useEffect(() => {
    if (!hoveredId) return;
    void loadPreview(hoveredId);
  }, [hoveredId, loadPreview]);

  useEffect(() => {
    return () => {
      Object.values(photoPreviewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }
    if (searchControllerRef.current) {
      searchControllerRef.current.abort();
    }
    if (query.length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      setSearchLoading(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();
    searchControllerRef.current = controller;
    setSearchOpen(true);
    setSearchLoading(true);
    setSearchError(null);
    searchTimerRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${NOMINATIM_BASE_URL}/search?format=jsonv2&addressdetails=1&limit=8&dedupe=1&countrycodes=es&q=${encodeURIComponent(
            query
          )}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("No pudimos buscar la ubicacion.");
        }
        const data = (await response.json()) as NominatimResult[];
        setSearchResults(data);
        if (data.length === 0) {
          setSearchError("Sin resultados.");
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setSearchError("No pudimos buscar la ubicacion.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    if (mapZoom < POI_ZOOM_THRESHOLD) {
      setPoiCity(null);
      setPoiItems([]);
      setPoiLoading(false);
      setPoiError(null);
      poiRequestKeyRef.current = null;
      return;
    }

    if (poiCity && isWithinBounds(mapCenter, poiCity.bounds)) {
      return;
    }

    if (poiCityControllerRef.current) {
      poiCityControllerRef.current.abort();
    }
    if (poiCityTimerRef.current) {
      window.clearTimeout(poiCityTimerRef.current);
    }

    const controller = new AbortController();
    poiCityControllerRef.current = controller;
    poiCityTimerRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `${NOMINATIM_BASE_URL}/reverse?format=jsonv2&zoom=10&addressdetails=1&lat=${mapCenter[0]}&lon=${mapCenter[1]}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error("No pudimos obtener la ciudad.");
        }
        const data = (await response.json()) as NominatimReverseResult;
        if (controller.signal.aborted) return;
        const name =
          data.address?.city ??
          data.address?.town ??
          data.address?.village ??
          data.address?.municipality;
        const bounds = data.boundingbox ? parseCityBounds(data.boundingbox) : null;
        if (!name || !bounds) {
          setPoiCity(null);
          setPoiItems([]);
          poiRequestKeyRef.current = null;
          return;
        }
        if (!poiCity || poiCity.placeId !== data.place_id) {
          setPoiItems([]);
          setPoiLoading(false);
          setPoiError(null);
          poiRequestKeyRef.current = null;
        }
        setPoiCity((prev) => {
          if (prev && prev.placeId === data.place_id) {
            return prev;
          }
          return { name, placeId: data.place_id, bounds };
        });
      } catch (err) {
        if (!controller.signal.aborted) {
          setPoiCity(null);
          setPoiItems([]);
          poiRequestKeyRef.current = null;
        }
      }
    }, 450);

    return () => {
      controller.abort();
      if (poiCityTimerRef.current) {
        window.clearTimeout(poiCityTimerRef.current);
      }
    };
  }, [mapCenter, mapZoom, poiCity]);

  useEffect(() => {
    if (mapZoom < POI_ZOOM_THRESHOLD || !poiCity || !mapBounds) {
      setPoiItems([]);
      setPoiLoading(false);
      setPoiError(null);
      return;
    }

    const intersection = intersectBounds(mapBounds, poiCity.bounds);
    if (!intersection) {
      setPoiItems([]);
      setPoiLoading(false);
      setPoiError(null);
      return;
    }

    const key = [
      poiCity.placeId,
      intersection.minLat.toFixed(3),
      intersection.minLng.toFixed(3),
      intersection.maxLat.toFixed(3),
      intersection.maxLng.toFixed(3)
    ].join("|");

    if (poiRequestKeyRef.current === key) {
      return;
    }

    if (poiControllerRef.current) {
      poiControllerRef.current.abort();
    }
    if (poiTimerRef.current) {
      window.clearTimeout(poiTimerRef.current);
    }

    const controller = new AbortController();
    poiControllerRef.current = controller;
    setPoiLoading(true);
    setPoiError(null);
    poiTimerRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(OVERPASS_URL, {
          method: "POST",
          body: buildOverpassQuery(intersection),
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error("No pudimos cargar los sitios de interes.");
        }
        const data = (await response.json()) as OverpassResponse;
        if (controller.signal.aborted) return;
        const rawItems = data.elements
          .map((element) => {
            const tags = element.tags ?? {};
            const coords =
              element.type === "node"
                ? typeof element.lat === "number" && typeof element.lon === "number"
                  ? { lat: element.lat, lon: element.lon }
                  : null
                : element.center
                  ? { lat: element.center.lat, lon: element.center.lon }
                  : null;
            if (!coords) return null;
            const info = classifyPoi(tags);
            const name = resolvePoiName(tags, info.label);
            return {
              id: `${element.type}-${element.id}`,
              lat: coords.lat,
              lng: coords.lon,
              name,
              kind: info.kind,
              iconKey: info.iconKey,
              label: info.label
            };
          })
          .filter((item): item is PoiItem => item !== null);
        const deduped = new Map<string, PoiItem>();
        rawItems.forEach((item) => {
          const key = `${item.iconKey}|${item.name.toLowerCase()}|${item.lat.toFixed(
            4
          )}|${item.lng.toFixed(4)}`;
          if (!deduped.has(key)) {
            deduped.set(key, item);
          }
        });
        const nextItems = Array.from(deduped.values()).slice(0, POI_LIMIT);
        setPoiItems(nextItems);
        poiRequestKeyRef.current = key;
      } catch (err) {
        if (!controller.signal.aborted) {
          setPoiItems([]);
          setPoiError("No pudimos cargar los sitios.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setPoiLoading(false);
        }
      }
    }, 500);

    return () => {
      controller.abort();
      if (poiTimerRef.current) {
        window.clearTimeout(poiTimerRef.current);
      }
    };
  }, [mapBounds, mapZoom, poiCity]);

  useEffect(() => {
    if (!token || !focusId) return;
    api
      .getPlace(token, focusId)
      .then((place) => {
        flyTo(place.lat, place.lng, 16);
        setSelected(place);
        localStorage.removeItem("granada.focusPlaceId");
        setFocusId(null);
      })
      .catch((err) => {
        showToast((err as Error).message, "error");
        localStorage.removeItem("granada.focusPlaceId");
        setFocusId(null);
      });
  }, [token, focusId, flyTo, showToast]);

  const buildBbox = (bounds: L.LatLngBounds) => {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
  };

  const loadPlaces = useCallback(
    async (bboxValue: string) => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await api.getPlaces(token, {
          bbox: bboxValue
        });
        setPlaces(data);
      } catch (err) {
        showToast((err as Error).message, "error");
      } finally {
        setLoading(false);
      }
    },
    [token, showToast]
  );

  useEffect(() => {
    if (!selected) return;
    const updated = places.find((place) => place.id === selected.id);
    if (updated) {
      setSelected(updated);
    }
  }, [places, selected?.id]);

  useEffect(() => {
    if (!token || !bbox) return;
    loadPlaces(bbox);
  }, [token, bbox, loadPlaces]);

  useEffect(() => {
    if (!token || !selected) {
      setPhotos([]);
      return;
    }
    setPhotoLoading(true);
    api
      .getPhotos(token, selected.id)
      .then((data) => setPhotos(data))
      .catch((err) => showToast((err as Error).message, "error"))
      .finally(() => setPhotoLoading(false));
  }, [token, selected, showToast]);

  const handleBoundsChange = (bounds: L.LatLngBounds) => {
    const nextBbox = buildBbox(bounds);
    setBbox(nextBbox);
    setMapBounds(bounds);
  };

  const handleViewChange = (centerPoint: L.LatLng, zoomLevel: number) => {
    setMapCenter([centerPoint.lat, centerPoint.lng]);
    setMapZoom(zoomLevel);
  };

  const handlePickPoint = (lat: number, lng: number) => {
    setDraft({
      lat,
      lng,
      name: "",
      status: "PENDING",
      notes: "",
      address: "",
      categoryId: null
    });
    void resolveAddress(lat, lng);
    setSelected(null);
    setAddMode(false);
  };

  const handleSelectPlace = (place: api.Place) => {
    setSelected(place);
    setDraft(null);
    setAddMode(false);
  };

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    try {
      const cached = searchResults;
      if (cached.length > 0) {
        applySearchResult(cached[0]);
        return;
      }
      const response = await fetch(
        `${NOMINATIM_BASE_URL}/search?format=jsonv2&addressdetails=1&limit=8&dedupe=1&countrycodes=es&q=${encodeURIComponent(
          query
        )}`
      );
      const data = (await response.json()) as NominatimResult[];
      setSearchResults(data);
      setSearchOpen(true);
      if (data.length === 0) {
        showToast("No encontramos resultados.", "error");
        return;
      }
      applySearchResult(data[0]);
    } catch (err) {
      showToast("No pudimos buscar la ubicacion.", "error");
    }
  };

  const handleSelectSearchResult = (result: NominatimResult) => {
    applySearchResult(result);
    setSearchOpen(false);
    setSearchResults([]);
  };

  const handleCreatePlace = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !draft) return;
    if (!draft.name.trim()) {
      showToast("El nombre es obligatorio", "error");
      return;
    }
    setLoading(true);
    try {
      const created = await api.createPlace(token, {
        name: draft.name.trim(),
        lat: draft.lat,
        lng: draft.lng,
        status: draft.status,
        notes: draft.notes.trim() ? draft.notes.trim() : undefined,
        address: draft.address.trim() ? draft.address.trim() : undefined,
        categoryId: draft.categoryId ?? undefined
      });
      setDraft(null);
      setSelected(created);
      if (bbox) {
        await loadPlaces(bbox);
      } else {
        setPlaces((prev) => [created, ...prev]);
      }
      showToast("Sitio guardado");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const detailName = selected?.name ?? "";
  const detailNotes = selected?.notes ?? "";
  const detailAddress = selected?.address ?? "";
  const detailCategoryId = selected?.category?.id ?? null;
  const [editedName, setEditedName] = useState(detailName);
  const [editedNotes, setEditedNotes] = useState(detailNotes);
  const [editedAddress, setEditedAddress] = useState(detailAddress);
  const [editedCategoryId, setEditedCategoryId] = useState<number | null>(
    detailCategoryId
  );

  useEffect(() => {
    setEditedName(detailName);
    setEditedNotes(detailNotes);
    setEditedAddress(detailAddress);
    setEditedCategoryId(detailCategoryId);
  }, [detailName, detailNotes, detailAddress, detailCategoryId, selected?.id]);

  const handleSaveDetails = async () => {
    if (!token || !selected) return;
    if (!editedName.trim()) {
      showToast("El nombre es obligatorio", "error");
      return;
    }
    try {
      const categoryChanged = editedCategoryId !== (selected.category?.id ?? null);
      const addressValue = editedAddress.trim() ? editedAddress.trim() : null;
      const addressChanged = addressValue !== (selected.address ?? null);
      const payload: Parameters<typeof api.updatePlace>[2] = {
        name: editedName.trim(),
        notes: editedNotes.trim() ? editedNotes.trim() : null
      };
      if (addressChanged) {
        payload.address = addressValue;
      }
      if (categoryChanged && editedCategoryId !== null) {
        payload.categoryId = editedCategoryId;
      }
      const updated = await api.updatePlace(token, selected.id, payload);
      setPlaces((prev) => prev.map((place) => (place.id === updated.id ? updated : place)));
      setSelected(updated);
      showToast("Cambios guardados");
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const handleToggleVisited = async () => {
    if (!token || !selected) return;
    const nextStatus = selected.status === "PENDING" ? "VISITED" : "PENDING";
    try {
      const updated = await api.updatePlace(token, selected.id, {
        status: nextStatus,
        visitedAt: nextStatus === "VISITED" ? new Date().toISOString() : null
      });
      setPlaces((prev) => prev.map((place) => (place.id === updated.id ? updated : place)));
      setSelected(updated);
      showToast(
        nextStatus === "VISITED" ? "Marcado como visitado" : "Marcado como pendiente"
      );
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  };

  const handleSelectPoi = (poi: PoiItem) => {
    const lat = poi.lat;
    const lng = poi.lng;
    setDraft({
      lat,
      lng,
      name: poi.name,
      status: "PENDING",
      notes: "",
      address: "",
      categoryId: null
    });
    setSelected(null);
    setAddMode(false);
    flyTo(lat, lng, Math.max(mapZoom, 16));
    void resolveAddress(lat, lng);
  };

  const handleDeletePlace = async () => {
    if (!token || !selected) return;
    const confirmed = window.confirm(
      `Seguro que quieres borrar "${selected.name}"?`
    );
    if (!confirmed) return;
    setLoading(true);
    try {
      await api.deletePlace(token, selected.id);
      setPlaces((prev) => prev.filter((place) => place.id !== selected.id));
      setSelected(null);
      setDraft(null);
      setPhotos([]);
      setPhotoPreviews((prev) => {
        if (prev[selected.id] === undefined) return prev;
        const next = { ...prev };
        delete next[selected.id];
        return next;
      });
      setPhotoPreviewLoading((prev) => {
        if (prev[selected.id] === undefined) return prev;
        const next = { ...prev };
        delete next[selected.id];
        return next;
      });
      const previewUrl = photoPreviewUrlsRef.current[selected.id];
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        delete photoPreviewUrlsRef.current[selected.id];
      }
      showToast("Sitio eliminado");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!token) return;
    const confirmed = window.confirm("Seguro que quieres borrar esta foto?");
    if (!confirmed) return;
    setPhotoDeletingId(photoId);
    try {
      await api.deletePhoto(token, photoId);
      setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      if (selected) {
        const previewUrl = photoPreviewUrlsRef.current[selected.id];
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          delete photoPreviewUrlsRef.current[selected.id];
        }
        setPhotoPreviews((prev) => {
          if (prev[selected.id] === undefined) return prev;
          const next = { ...prev };
          delete next[selected.id];
          return next;
        });
        setPhotoPreviewLoading((prev) => {
          if (prev[selected.id] === undefined) return prev;
          const next = { ...prev };
          delete next[selected.id];
          return next;
        });
      }
      showToast("Foto eliminada");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setPhotoDeletingId((prev) => (prev === photoId ? null : prev));
    }
  };

  const handleUploadPhotos = async (files: FileList | null) => {
    if (!token || !selected || !files?.length) return;
    setPhotoLoading(true);
    try {
      const uploads = Array.from(files);
      for (const file of uploads) {
        const uploaded = await api.uploadPhoto(token, selected.id, file);
        setPhotos((prev) => [...prev, uploaded]);
      }
      showToast("Foto subida");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setPhotoLoading(false);
    }
  };

  return (
    <div className={`map-page ${addMode ? "map-page--add" : ""}`}>
      <div className="map-shell">
        <MapContainer
          center={center}
          zoom={13}
          zoomControl={false}
          scrollWheelZoom
          className="map"
          whenCreated={(instance) => {
            const bounds = instance.getBounds();
            setBbox(buildBbox(bounds));
            setMapBounds(bounds);
            const centerPoint = instance.getCenter();
            setMapCenter([centerPoint.lat, centerPoint.lng]);
            setMapZoom(instance.getZoom());
          }}
        >
          <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} subdomains={TILE_SUBDOMAINS} />
          <MapEvents
            addMode={addMode}
            onPickPoint={handlePickPoint}
            onBoundsChange={handleBoundsChange}
            onViewChange={handleViewChange}
          />
          <MapViewController target={viewTarget} />
          <MarkerClusterGroup chunkedLoading>
            {places.map((place) => {
              const categoryKey = resolveCategoryIconKey(place.category?.icon);
              return (
                <Marker
                  key={place.id}
                  position={[place.lat, place.lng]}
                  icon={createPlaceIcon(place)}
                  eventHandlers={{
                    click: () => handleSelectPlace(place),
                    mouseover: () => setHoveredId(place.id),
                    mouseout: () =>
                      setHoveredId((prev) => (prev === place.id ? null : prev))
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -12]}
                    opacity={0.98}
                    className="place-tooltip"
                  >
                    <div className="place-tooltip__body">
                      <div className="place-tooltip__media">
                        {photoPreviews[place.id] ? (
                          <img src={photoPreviews[place.id] ?? ""} alt={place.name} />
                        ) : (
                          <div className="photo-skeleton">
                            {photoPreviewLoading[place.id] ? "Cargando..." : "Sin foto"}
                          </div>
                        )}
                      </div>
                      <div className="place-tooltip__content">
                        <div className="place-tooltip__row">
                          <strong>{place.name}</strong>
                          <span
                            className={`status-pill status-pill--${place.status.toLowerCase()}`}
                          >
                            {STATUS_LABELS[place.status]}
                          </span>
                        </div>
                        {place.category && (
                          <span
                            className={`category-pill category-pill--${categoryKey}`}
                          >
                            {place.category.name}
                          </span>
                        )}
                        <span
                          className={`place-tooltip__address ${
                            place.address ? "" : "place-tooltip__address--muted"
                          }`}
                        >
                          {place.address ? place.address : "Direccion pendiente"}
                        </span>
                        <span className="place-tooltip__meta">
                          Guardado por {place.createdBy?.name ?? "Usuario"}
                        </span>
                        <p className="place-tooltip__notes">
                          {place.notes ? place.notes : "Sin notas."}
                        </p>
                      </div>
                    </div>
                  </Tooltip>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
          {mapZoom >= POI_ZOOM_THRESHOLD && poiCity && poiItems.length > 0 && (
            <MarkerClusterGroup
              chunkedLoading
              disableClusteringAtZoom={POI_ZOOM_THRESHOLD}
              maxClusterRadius={40}
            >
              {poiItems.map((poi) => (
                <Marker
                  key={`poi-${poi.id}`}
                  position={[poi.lat, poi.lng]}
                  icon={createPoiIcon(poi)}
                  zIndexOffset={-200}
                  eventHandlers={{
                    click: () => handleSelectPoi(poi)
                  }}
                >
                  <Tooltip
                    direction="top"
                    offset={[0, -10]}
                    opacity={0.96}
                    className="poi-tooltip"
                  >
                    <strong>{poi.name}</strong>
                    <span>{poi.label}</span>
                    <span className="poi-tooltip__hint">Toca para guardar</span>
                  </Tooltip>
                </Marker>
              ))}
            </MarkerClusterGroup>
          )}
        </MapContainer>

        <div className="map-overlay">
          <div className="map-brand">
            <span className="map-brand__logo" aria-hidden="true">
              GG
            </span>
            <div className="map-brand__text">
              <span className="eyebrow">Tu mapa privado</span>
              <strong>Granada Guide</strong>
              <span className="map-brand__tagline">
                Planifiquen juntos su proxima salida.
              </span>
            </div>
          </div>
          <form className="search-bar" onSubmit={handleSearch}>
            <span className="search-bar__icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Buscar ciudad o lugar..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setSearchOpen(true)}
            />
            <button type="submit" className="chip chip--solid">
              Buscar
            </button>
          </form>
          {searchOpen && (
            <div className="search-results">
              {searchLoading && <div className="search-helper muted">Buscando...</div>}
              {!searchLoading && searchError && (
                <div className="search-helper form-error">{searchError}</div>
              )}
              {!searchLoading &&
                searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    className="search-result"
                    onClick={() => handleSelectSearchResult(result)}
                  >
                    <span className="search-result__title">{result.display_name}</span>
                    {result.type && (
                      <span className="search-result__meta">
                        {result.type.replace("_", " ")}
                      </span>
                    )}
                  </button>
                ))}
            </div>
          )}
          {mapZoom < POI_ZOOM_THRESHOLD && (
            <div className="poi-status poi-status--hint">
              Acerca el mapa para ver sitios de interes.
            </div>
          )}
          {mapZoom >= POI_ZOOM_THRESHOLD && poiCity && (
            <div className="poi-status">
              {poiLoading
                ? "Buscando sitios de interes..."
                : poiError
                  ? poiError
                  : `${poiItems.length} sitios en ${poiCity.name}`}
            </div>
          )}
        </div>

        <div className="profile-panel">
          <div className="profile-panel__meta">
            <span className="profile-panel__label">Tu perfil</span>
            <strong>{user?.name ?? "Perfil"}</strong>
            <span className="profile-panel__email">{user?.email}</span>
          </div>
          <button className="ghost-button" onClick={logout}>
            Salir
          </button>
        </div>

        <div className="floating-actions">
          <button
            className={`fab fab--primary ${addMode ? "fab--active" : ""}`}
            onClick={() => {
              setAddMode((prev) => !prev);
              setDraft(null);
              setSelected(null);
            }}
            title="Agregar sitio"
          >
            +
          </button>
        </div>

        <aside className={`drawer drawer--${drawerView}`}>
          {drawerView === "home" && (
            <div className="drawer__section">
              <div className="quick-actions">
                <Link className="ghost-button" to="/list">
                  Ver listas
                </Link>
              </div>
              <p className="muted">
                Pendientes: {pendingCount} / Visitados: {visitedCount}
              </p>
              <div className="drawer__list">
                <h3>Ultimos guardados</h3>
                {latestPlaces.length === 0 ? (
                  <p className="muted">Todavia no hay sitios guardados.</p>
                ) : (
                  latestPlaces.map((place) => (
                    <button
                      key={place.id}
                      className={`list-item ${
                        hoveredId === place.id ? "list-item--highlight" : ""
                      }`}
                      onClick={() => handleSelectPlace(place)}
                    >
                      <span className="list-item__main">
                        <span className="list-item__title">{place.name}</span>
                        {place.notes && <span className="list-item__notes">{place.notes}</span>}
                      </span>
                      <span className={`status-pill status-pill--${place.status.toLowerCase()}`}>
                        {STATUS_LABELS[place.status]}
                      </span>
                    </button>
                  ))
                )}
              </div>
              {addMode && (
                <p className="helper">Toca el mapa para elegir un punto.</p>
              )}
            </div>
          )}

          {drawerView === "create" && draft && (
            <div className="drawer__section">
              <div className="drawer__row">
                <h3>Agregar sitio</h3>
                <button className="link-button" onClick={() => setDraft(null)}>
                  Cancelar
                </button>
              </div>
              <form className="form" onSubmit={handleCreatePlace}>
                <label>
                  Nombre
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                    }
                    required
                  />
                </label>
                <label>
                  Direccion
                  <input
                    type="text"
                    value={draft.address}
                    onChange={(event) =>
                      setDraft((prev) =>
                        prev ? { ...prev, address: event.target.value } : prev
                      )
                    }
                    placeholder="Ej: Calle Elvira, Granada"
                  />
                  {draftAddressLoading && (
                    <span className="form-helper">Buscando direccion...</span>
                  )}
                </label>
                <label>
                  Categoria
                  <select
                    value={draft.categoryId ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDraft((prev) =>
                        prev
                          ? { ...prev, categoryId: value ? Number(value) : null }
                          : prev
                      );
                    }}
                    disabled={categoriesLoading}
                  >
                    <option value="">Sin categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Estado
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((prev) =>
                        prev ? { ...prev, status: event.target.value as api.PlaceStatus } : prev
                      )
                    }
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="VISITED">Visitado</option>
                  </select>
                </label>
                <label>
                  Notas
                  <textarea
                    rows={3}
                    value={draft.notes}
                    onChange={(event) =>
                      setDraft((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                    }
                  />
                </label>
                <div className="form-actions">
                  <button className="primary-button" type="submit" disabled={loading}>
                    {loading ? "Guardando..." : "Guardar sitio"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {drawerView === "detail" && selected && (
            <div className="drawer__section">
              <div className="drawer__row">
                <h3>Detalle del sitio</h3>
                <button className="link-button" onClick={() => setSelected(null)}>
                  Cerrar
                </button>
              </div>
              <div className="detail-card">
                <div className="detail-card__header">
                  <span className={`status-pill status-pill--${selected.status.toLowerCase()}`}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                  {selected.visitedAt && (
                    <span className="muted">
                      {new Date(selected.visitedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <label>
                  Nombre
                  <input
                    type="text"
                    value={editedName}
                    onChange={(event) => setEditedName(event.target.value)}
                  />
                </label>
                <label>
                  Direccion
                  <input
                    type="text"
                    value={editedAddress}
                    onChange={(event) => setEditedAddress(event.target.value)}
                    placeholder="Ej: Calle Elvira, Granada"
                  />
                </label>
                <label>
                  Categoria
                  <select
                    value={editedCategoryId ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setEditedCategoryId(value ? Number(value) : null);
                    }}
                    disabled={categoriesLoading}
                  >
                    {!selected.category && <option value="">Sin categoria</option>}
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Notas
                  <textarea
                    rows={3}
                    value={editedNotes}
                    onChange={(event) => setEditedNotes(event.target.value)}
                  />
                </label>
                <div className="detail-card__actions">
                  <button className="ghost-button" onClick={handleSaveDetails}>
                    Guardar cambios
                  </button>
                  <button className="primary-button" onClick={handleToggleVisited}>
                    {selected.status === "PENDING"
                      ? "Marcar como visitado"
                      : "Marcar como pendiente"}
                  </button>
                  <button
                    className="ghost-button ghost-button--danger"
                    type="button"
                    onClick={handleDeletePlace}
                  >
                    Eliminar sitio
                  </button>
                </div>
              </div>

              <div className="drawer__list">
                <div className="drawer__row">
                  <h4>Fotos</h4>
                  {photoLoading && <span className="muted">Cargando...</span>}
                </div>
                <div className="photo-grid">
                  {photos.map((photo) => (
                    <PhotoThumb
                      key={photo.id}
                      photo={photo}
                      token={token}
                      onDelete={handleDeletePhoto}
                      deleting={photoDeletingId === photo.id}
                    />
                  ))}
                  {photos.length === 0 && !photoLoading && (
                    <p className="muted">Todavia no hay fotos.</p>
                  )}
                </div>
                <label className="upload">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      handleUploadPhotos(event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                  Subir fotos
                </label>
                <p className="muted">Maximo 20MB por foto.</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {toast && (
        <div className={`toast toast--${toast.tone}`}>
          {toast.message}
        </div>
      )}
      {loading && <div className="loading-pill">Sincronizando...</div>}
    </div>
  );
}
