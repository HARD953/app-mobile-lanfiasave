/**
 * Stockage local hors ligne : pack terrain (questionnaire + référentiels) et file d'envoi.
 * Les enquêtes restent sur le terminal tant que le serveur n'a pas confirmé leur réception (MOB-01).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { ClaimSubmission, FieldPack, Submission } from './types';

const PACK = 'lfs.pack';
const QUEUE = 'lfs.queue';
const DEVICE = 'lfs.device';
const CLAIMS = 'lfs.claims';

export async function loadPack(): Promise<FieldPack | null> {
  const raw = await AsyncStorage.getItem(PACK);
  return raw ? JSON.parse(raw) : null;
}

export async function savePack(pack: FieldPack) {
  await AsyncStorage.setItem(PACK, JSON.stringify(pack));
}

export async function clearPack() {
  await AsyncStorage.removeItem(PACK);
}

export async function loadQueue(): Promise<Submission[]> {
  const raw = await AsyncStorage.getItem(QUEUE);
  return raw ? JSON.parse(raw) : [];
}

export async function saveQueue(queue: Submission[]) {
  await AsyncStorage.setItem(QUEUE, JSON.stringify(queue));
}

export async function deviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE);
  if (!id) {
    id = `terminal-${Crypto.randomUUID().slice(0, 8)}`;
    await AsyncStorage.setItem(DEVICE, id);
  }
  return id;
}

export async function loadClaims(): Promise<ClaimSubmission[]> {
  const raw = await AsyncStorage.getItem(CLAIMS);
  return raw ? JSON.parse(raw) : [];
}

export async function saveClaims(claims: ClaimSubmission[]) {
  await AsyncStorage.setItem(CLAIMS, JSON.stringify(claims));
}

export const uuid = () => Crypto.randomUUID();

/** Numéro de dossier (même alphabet que le serveur, sans caractères ambigus). */
export function claimReference() {
  const alphabet = 'ACDEFGHJKMNPQRTUVWXY34679';
  const bytes = Crypto.getRandomBytes(8);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `DM-${chars.slice(0, 4)}-${chars.slice(4)}`;
}
