import { apiRequest } from "./client";

export type AuthResponse = { token: string };
export type Me = { id: number; email: string; name: string };
export type GroupResponse = { id: number; name: string; createdAt: string };
export type InviteResponse = { code: string; expiresAt: string };
export type Category = { id: number; name: string; icon?: string | null };
export type UserSummary = { id: number; name: string };
export type CategorySummary = { id: number; name: string; icon?: string | null };
export type PlaceStatus = "PENDING" | "VISITED";

export type Place = {
  id: number;
  groupId: number;
  name: string;
  description?: string | null;
  category?: CategorySummary | null;
  lat: number;
  lng: number;
  address?: string | null;
  createdBy: UserSummary;
  createdAt: string;
  status: PlaceStatus;
  favorite: boolean;
};

export type Comment = {
  id: number;
  user: UserSummary;
  text: string;
  createdAt: string;
};

export type Photo = {
  id: number;
  user: UserSummary;
  url: string;
  caption?: string | null;
  createdAt: string;
};

export type Page<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
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

export function createGroup(token: string, name: string) {
  return apiRequest<GroupResponse>("/api/groups", {
    method: "POST",
    body: { name },
    token
  });
}

export function createInvite(token: string, groupId: number) {
  return apiRequest<InviteResponse>(`/api/groups/${groupId}/invite`, {
    method: "POST",
    token
  });
}

export function joinGroup(token: string, code: string) {
  return apiRequest<GroupResponse>("/api/groups/join", {
    method: "POST",
    body: { code },
    token
  });
}

export function getCategories(token: string) {
  return apiRequest<Category[]>("/api/categories", { token });
}

export function getPlaces(
  token: string,
  params: { status?: string; categoryId?: number; q?: string; page?: number; size?: number } = {}
) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.categoryId) search.set("categoryId", params.categoryId.toString());
  if (params.q) search.set("q", params.q);
  if (params.page !== undefined) search.set("page", params.page.toString());
  if (params.size !== undefined) search.set("size", params.size.toString());
  const suffix = search.toString();
  return apiRequest<Page<Place>>(`/api/places${suffix ? `?${suffix}` : ""}`, { token });
}

export function getPlace(token: string, id: number) {
  return apiRequest<Place>(`/api/places/${id}`, { token });
}

export function createPlace(
  token: string,
  payload: {
    groupId: number;
    name: string;
    description?: string;
    categoryId: number;
    lat: number;
    lng: number;
    address?: string;
  }
) {
  return apiRequest<Place>("/api/places", { method: "POST", body: payload, token });
}

export function updatePlace(
  token: string,
  id: number,
  payload: {
    name?: string;
    description?: string;
    categoryId?: number;
    lat?: number;
    lng?: number;
    address?: string;
  }
) {
  return apiRequest<Place>(`/api/places/${id}`, { method: "PATCH", body: payload, token });
}

export function deletePlace(token: string, id: number) {
  return apiRequest<void>(`/api/places/${id}`, { method: "DELETE", token });
}

export function updateStatus(
  token: string,
  id: number,
  payload: { status: PlaceStatus; isFavorite: boolean }
) {
  return apiRequest<Place>(`/api/places/${id}/status`, {
    method: "PUT",
    body: payload,
    token
  });
}

export function getNearby(
  token: string,
  params: { lat: number; lng: number; radiusMeters?: number; status?: string; categoryId?: number }
) {
  const search = new URLSearchParams();
  search.set("lat", params.lat.toString());
  search.set("lng", params.lng.toString());
  if (params.radiusMeters) search.set("radiusMeters", params.radiusMeters.toString());
  if (params.status) search.set("status", params.status);
  if (params.categoryId) search.set("categoryId", params.categoryId.toString());
  return apiRequest<Place[]>(`/api/places/nearby?${search.toString()}`, { token });
}

export function getComments(token: string, placeId: number) {
  return apiRequest<Comment[]>(`/api/places/${placeId}/comments`, { token });
}

export function addComment(token: string, placeId: number, text: string) {
  return apiRequest<Comment>(`/api/places/${placeId}/comments`, {
    method: "POST",
    body: { text },
    token
  });
}

export function getPhotos(token: string, placeId: number) {
  return apiRequest<Photo[]>(`/api/places/${placeId}/photos`, { token });
}

export function uploadPhoto(
  token: string,
  placeId: number,
  file: File,
  caption?: string
) {
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
