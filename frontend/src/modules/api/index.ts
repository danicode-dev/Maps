import { apiRequest } from "./client";

export type AuthResponse = { token: string };
export type Me = { id: number; email: string; name: string };
export type UserSummary = { id: number; name: string };
export type Category = { id: number; name: string; icon: string | null };

export type PlaceStatus = "PENDING" | "VISITED";

export type Place = {
  id: number;
  groupId: number;
  name: string;
  lat: number;
  lng: number;
  status: PlaceStatus;
  notes?: string | null;
  address?: string | null;
  category?: Category | null;
  createdBy: UserSummary;
  createdAt: string;
  visitedAt?: string | null;
};

export type Photo = {
  id: number;
  user: UserSummary;
  url: string;
  caption?: string | null;
  createdAt: string;
};

export function register(email: string, password: string, name: string) {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: { email, password, name }
  });
}

export function login(email: string, password: string) {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: { email, password }
  });
}

export function me(token: string) {
  return apiRequest<Me>("/api/me", { token });
}

export function getCategories(token: string) {
  return apiRequest<Category[]>("/api/categories", { token });
}

export function getPlaces(
  token: string,
  params: { bbox?: string; status?: "ALL" | PlaceStatus } = {}
) {
  const search = new URLSearchParams();
  if (params.bbox) search.set("bbox", params.bbox);
  if (params.status) search.set("status", params.status);
  const suffix = search.toString();
  return apiRequest<Place[]>(`/api/places${suffix ? `?${suffix}` : ""}`, { token });
}

export function getPlace(token: string, id: number) {
  return apiRequest<Place>(`/api/places/${id}`, { token });
}

export function createPlace(
  token: string,
  payload: {
    name: string;
    lat: number;
    lng: number;
    status: PlaceStatus;
    notes?: string;
    address?: string | null;
    categoryId?: number | null;
  }
) {
  return apiRequest<Place>("/api/places", { method: "POST", body: payload, token });
}

export function updatePlace(
  token: string,
  id: number,
  payload: {
    name?: string;
    notes?: string | null;
    status?: PlaceStatus;
    visitedAt?: string | null;
    address?: string | null;
    categoryId?: number | null;
  }
) {
  return apiRequest<Place>(`/api/places/${id}`, { method: "PATCH", body: payload, token });
}

export function deletePlace(token: string, id: number) {
  return apiRequest<void>(`/api/places/${id}`, { method: "DELETE", token });
}

export function getPhotos(token: string, placeId: number) {
  return apiRequest<Photo[]>(`/api/places/${placeId}/photos`, { token });
}

export function uploadPhoto(token: string, placeId: number, file: File, caption?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (caption) formData.append("caption", caption);
  return apiRequest<Photo>(`/api/places/${placeId}/photos`, {
    method: "POST",
    body: formData,
    token,
    isForm: true
  });
}

export function deletePhoto(token: string, photoId: number) {
  return apiRequest<void>(`/api/photos/${photoId}`, { method: "DELETE", token });
}
