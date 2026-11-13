/**
 * Stockage local hors ligne : pack terrain (questionnaire + référentiels) et file d'envoi.
 * Les enquêtes restent sur le terminal tant que le serveur n'a pas confirmé leur réception (MOB-01).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import type { FieldPack, Submission } from './types';

const PACK = 'lfs.pack';
const QUEUE = 'lfs.queue';
const DEVICE = 'lfs.device';

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

export const uuid = () => Crypto.randomUUID();
