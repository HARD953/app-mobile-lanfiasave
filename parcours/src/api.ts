import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const SERVER_KEY = 'lfs.parcours.server';
const ACCESS = 'lfs.parcours.access';
const REFRESH = 'lfs.parcours.refresh';

/** URL de l'API : réglage local (écran Serveur) > EXPO_PUBLIC_API_URL > valeur par défaut. */
export const DEFAULT_SERVER = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function getServer(): Promise<string> {
  return ((await AsyncStorage.getItem(SERVER_KEY)) || DEFAULT_SERVER).replace(/\/$/, '');
}

export async function setServer(url: string) {
  await AsyncStorage.setItem(SERVER_KEY, url.trim().replace(/\/$/, ''));
}

export class ApiError extends Error {
  status: number;
  details: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export class NetworkError extends Error {}

export async function saveTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS, access);
  await SecureStore.setItemAsync(REFRESH, refresh);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
}

export async function hasSession() {
  return !!(await SecureStore.getItemAsync(REFRESH));
}

async function rawFetch(path: string, init: RequestInit, timeoutMs = 20000) {
  const server = await getServer();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${server}/${path.replace(/^\//, '')}`, { ...init, signal: controller.signal });
  } catch {
    throw new NetworkError('Serveur injoignable');
  } finally {
    clearTimeout(timer);
  }
}

async function refreshAccess(): Promise<string | null> {
  const refresh = await SecureStore.getItemAsync(REFRESH);
  if (!refresh) return null;
  const res = await rawFetch('auth/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  await saveTokens(data.access, data.refresh ?? refresh);
  return data.access;
}

function messageFrom(data: any, fallback: string) {
  const err = data?.error;
  if (!err) return fallback;
  const details = err.details;
  if (details && typeof details === 'object') {
    const first = Object.values(details)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
    if (typeof first === 'string') return first;
  }
  return err.message ?? fallback;
}

export async function api<T = any>(path: string, init: { method?: string; json?: unknown; headers?: Record<string, string>; auth?: boolean } = {}): Promise<T> {
  const { method = 'GET', json, headers = {}, auth = true } = init;
  const build = (token?: string | null): RequestInit => ({
    method,
    headers: {
      Accept: 'application/json',
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : undefined,
  });
  let token = auth ? await SecureStore.getItemAsync(ACCESS) : null;
  let res = await rawFetch(path, build(token));
  if (res.status === 401 && auth) {
    token = await refreshAccess();
    if (token) res = await rawFetch(path, build(token));
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, messageFrom(data, `Erreur ${res.status}`), data?.error?.details);
  return data as T;
}
