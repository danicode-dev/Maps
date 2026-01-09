export type ApiError = {
  message: string;
  errors?: Record<string, string>;
};

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  isForm?: boolean;
};

export async function apiRequest<T>(
  path: string,
  { method = "GET", body, token, isForm }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  let payload: BodyInit | undefined;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    if (isForm && body instanceof FormData) {
      payload = body;
    } else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  const response = await fetch(path, {
    method,
    headers,
    body: payload
  });

  if (!response.ok) {
    let errorBody: ApiError = { message: "No se pudo completar la solicitud" };
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { message: response.statusText || "No se pudo completar la solicitud" };
    }
    throw new Error(errorBody.message || "No se pudo completar la solicitud");
  }

  if (response.status === 204) {
    return null as T;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }
  return (response.text() as unknown) as T;
}
