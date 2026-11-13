import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ApiError, NetworkError, api, clearTokens, hasSession, saveTokens } from './api';
import { clearPack, loadPack, loadQueue, saveQueue, savePack } from './store';
import type { FieldOperation, FieldPack, Me, Questionnaire, Submission, Territory } from './types';

type Ctx = {
  ready: boolean;
  signedIn: boolean;
  pack: FieldPack | null;
  queue: Submission[];
  online: boolean;
  syncing: boolean;
  lastSync: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPack: () => Promise<void>;
  enqueue: (s: Submission) => Promise<void>;
  syncNow: () => Promise<void>;
  removeSent: () => Promise<void>;
};

const SessionCtx = createContext<Ctx | null>(null);

async function downloadPack(): Promise<FieldPack> {
  const me = await api<Me>('auth/me/');
  const collect = me.memberships.find((m) => m.permissions.includes('survey.submit') && m.permissions.includes('person.create'));
  if (!collect) throw new ApiError(403, "Ce compte n'est pas habilité à la collecte terrain.");
  const canEnroll = collect.permissions.includes('operation.enroll');
  const [questionnaires, territories, operations] = await Promise.all([
    api<Questionnaire[]>('questionnaires/'),
    api<Territory[]>('territories/'),
    canEnroll
      ? api<{ results: FieldOperation[] }>(`operations/?organization=${collect.organization}`).then((r) => r.results)
      : Promise.resolve([] as FieldOperation[]),
  ]);
  const questionnaire = questionnaires.sort((a, b) => b.version - a.version)[0];
  if (!questionnaire) throw new ApiError(404, 'Aucun questionnaire publié.');
  return {
    me,
    organizationId: collect.organization,
    organizationName: collect.organization_name,
    questionnaire,
    territories: territories.filter((t) => ['commune', 'neighborhood', 'village', 'site'].includes(t.level)),
    operations: operations.filter((o) => o.status !== 'closed'),
    downloadedAt: new Date().toISOString(),
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [pack, setPack] = useState<FieldPack | null>(null);
  const [queue, setQueue] = useState<Submission[]>([]);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const queueRef = useRef<Submission[]>([]);
  const syncingRef = useRef(false);

  const persist = useCallback(async (next: Submission[]) => {
    queueRef.current = next;
    setQueue(next);
    await saveQueue(next);
  }, []);

  useEffect(() => {
    (async () => {
      const [session, p, q] = await Promise.all([hasSession(), loadPack(), loadQueue()]);
      // Un envoi interrompu (application fermée) repasse en attente.
      const restored = q.map((s) => (s.status === 'sending' ? { ...s, status: 'pending' as const } : s));
      queueRef.current = restored;
      setQueue(restored);
      setPack(p);
      setSignedIn(session && !!p);
      setReady(true);
    })();
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    const todo = queueRef.current.filter((s) => s.status === 'pending' || s.status === 'error');
    if (!todo.length) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      for (const item of todo) {
        await persist(queueRef.current.map((s) => (s.client_uuid === item.client_uuid ? { ...s, status: 'sending' } : s)));
        let patch: Partial<Submission>;
        try {
          const result = await api('collect/submissions/', {
            method: 'POST',
            json: item.payload,
            headers: { 'Idempotency-Key': item.client_uuid },
          });
          patch = { status: 'sent', sentAt: new Date().toISOString(), result, error: undefined };
        } catch (e) {
          if (e instanceof NetworkError) {
            patch = { status: 'pending', attempts: item.attempts + 1 };
            await persist(queueRef.current.map((s) => (s.client_uuid === item.client_uuid ? { ...s, ...patch } : s)));
            setOnline(false);
            break;
          }
          patch = { status: 'error', attempts: item.attempts + 1, error: e instanceof Error ? e.message : 'Erreur inconnue' };
        }
        await persist(queueRef.current.map((s) => (s.client_uuid === item.client_uuid ? { ...s, ...patch } : s)));
      }
      setLastSync(new Date().toISOString());
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [persist]);

  // Envoi automatique dès que le réseau revient.
  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      const isOnline = !!state.isConnected && state.isInternetReachable !== false;
      setOnline(isOnline);
      if (isOnline && signedIn) syncNow();
    });
  }, [signedIn, syncNow]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api<{ access: string; refresh: string }>('auth/login/', {
      method: 'POST',
      json: { username, password },
      auth: false,
    });
    await saveTokens(data.access, data.refresh);
    try {
      const p = await downloadPack();
      await savePack(p);
      setPack(p);
      setSignedIn(true);
    } catch (e) {
      await clearTokens();
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    await clearPack();
    setPack(null);
    setSignedIn(false);
  }, []);

  const refreshPack = useCallback(async () => {
    const p = await downloadPack();
    await savePack(p);
    setPack(p);
  }, []);

  const enqueue = useCallback(
    async (item: Submission) => {
      await persist([item, ...queueRef.current]);
      syncNow();
    },
    [persist, syncNow],
  );

  const removeSent = useCallback(async () => {
    await persist(queueRef.current.filter((s) => s.status !== 'sent'));
  }, [persist]);

  return (
    <SessionCtx.Provider value={{ ready, signedIn, pack, queue, online, syncing, lastSync, login, logout, refreshPack, enqueue, syncNow, removeSent }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('SessionProvider manquant');
  return ctx;
}
