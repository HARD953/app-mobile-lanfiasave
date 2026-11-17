import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ApiError, NetworkError, api, clearTokens, hasSession, saveTokens } from './api';
import { clearPack, loadClaims, loadPack, loadQueue, saveClaims, saveQueue, savePack } from './store';
import type { ClaimSubmission, ClaimsMeta, FieldOperation, FieldPack, Me, Questionnaire, Submission, Territory } from './types';

type Ctx = {
  ready: boolean;
  signedIn: boolean;
  pack: FieldPack | null;
  queue: Submission[];
  claims: ClaimSubmission[];
  online: boolean;
  syncing: boolean;
  lastSync: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPack: () => Promise<void>;
  enqueue: (s: Submission) => Promise<void>;
  enqueueClaim: (c: ClaimSubmission) => Promise<void>;
  syncNow: () => Promise<void>;
  removeSent: () => Promise<void>;
};

const SessionCtx = createContext<Ctx | null>(null);

async function downloadPack(): Promise<FieldPack> {
  const me = await api<Me>('auth/me/');
  const surveyor = me.memberships.find((m) => m.permissions.includes('survey.submit') && m.permissions.includes('person.create'));
  const relay = me.memberships.find((m) => m.permissions.includes('claim.create'));
  const collect = surveyor ?? relay;
  if (!collect) throw new ApiError(403, "Ce compte n'est pas habilité à la collecte terrain.");
  const canSurvey = !!surveyor && surveyor.organization === collect.organization;
  const canClaim = collect.permissions.includes('claim.create');
  const canEnroll = collect.permissions.includes('operation.enroll');
  const [questionnaires, territories, operations, claimsMeta] = await Promise.all([
    canSurvey ? api<Questionnaire[]>('questionnaires/') : Promise.resolve([] as Questionnaire[]),
    api<Territory[]>('territories/'),
    canEnroll
      ? api<{ results: FieldOperation[] }>(`operations/?organization=${collect.organization}`).then((r) => r.results)
      : Promise.resolve([] as FieldOperation[]),
    canClaim ? api<ClaimsMeta>('claims-meta/') : Promise.resolve(undefined),
  ]);
  // Un formulaire par code (dernière version), triés du plus court au plus complet.
  const latest = new Map<string, Questionnaire>();
  for (const q of questionnaires) if (!latest.has(q.code) || latest.get(q.code)!.version < q.version) latest.set(q.code, q);
  const forms = [...latest.values()].sort((a, b) => (a.variant?.order ?? 99) - (b.variant?.order ?? 99));
  const questionnaire = forms.find((q) => q.variant?.variant === 'complete') ?? forms[forms.length - 1];
  if (canSurvey && !questionnaire) throw new ApiError(404, 'Aucun questionnaire publié.');
  return {
    me,
    canSurvey,
    canClaim,
    claimsMeta,
    organizationId: collect.organization,
    organizationName: collect.organization_name,
    questionnaire,
    questionnaires: forms,
    territories: territories.filter((t) => ['commune', 'neighborhood', 'village', 'site', 'subprefecture'].includes(t.level)),
    operations: operations.filter((o) => o.status !== 'closed'),
    downloadedAt: new Date().toISOString(),
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [pack, setPack] = useState<FieldPack | null>(null);
  const [queue, setQueue] = useState<Submission[]>([]);
  const [claims, setClaims] = useState<ClaimSubmission[]>([]);
  const claimsRef = useRef<ClaimSubmission[]>([]);
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

  const persistClaims = useCallback(async (next: ClaimSubmission[]) => {
    claimsRef.current = next;
    setClaims(next);
    await saveClaims(next);
  }, []);

  useEffect(() => {
    (async () => {
      const [session, p, q, c] = await Promise.all([hasSession(), loadPack(), loadQueue(), loadClaims()]);
      const restoredClaims = c.map((x) => (x.status === 'sending' ? { ...x, status: 'pending' as const } : x));
      claimsRef.current = restoredClaims;
      setClaims(restoredClaims);
      // Un envoi interrompu (application fermée) repasse en attente.
      const restored = q.map((s) => (s.status === 'sending' ? { ...s, status: 'pending' as const } : s));
      queueRef.current = restored;
      setQueue(restored);
      setPack(p);
      setSignedIn(session && !!p);
      setReady(true);
      // Pack téléchargé avant l'arrivée des formulaires courts : mise à jour silencieuse si le réseau le permet.
      if (session && p && !p.questionnaires) {
        downloadPack()
          .then(async (fresh) => {
            await savePack(fresh);
            setPack(fresh);
          })
          .catch(() => undefined);
      }
    })();
  }, []);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    const todo = queueRef.current.filter((s) => s.status === 'pending' || s.status === 'error');
    const claimTodo = claimsRef.current.filter((c) => c.status === 'pending' || c.status === 'error');
    if (!todo.length && !claimTodo.length) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      // Demandes des ménages affectés : le numéro du récépissé est envoyé et conservé par le serveur.
      for (const item of claimTodo) {
        const mark = (patch: Partial<ClaimSubmission>) =>
          persistClaims(claimsRef.current.map((c) => (c.client_uuid === item.client_uuid ? { ...c, ...patch } : c)));
        await mark({ status: 'sending' });
        try {
          const res = await api<{ reference: string }>('claims/', { method: 'POST', json: { ...item.payload, client_uuid: item.client_uuid, reference: item.reference } });
          await mark({ status: 'sent', sentAt: new Date().toISOString(), serverReference: res.reference, error: undefined });
        } catch (e) {
          if (e instanceof NetworkError) {
            await mark({ status: 'pending', attempts: item.attempts + 1 });
            setOnline(false);
            return;
          }
          await mark({ status: 'error', attempts: item.attempts + 1, error: e instanceof Error ? e.message : 'Erreur inconnue' });
        }
      }
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
  }, [persist, persistClaims]);

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

  const enqueueClaim = useCallback(
    async (item: ClaimSubmission) => {
      await persistClaims([item, ...claimsRef.current]);
      syncNow();
    },
    [persistClaims, syncNow],
  );

  const removeSent = useCallback(async () => {
    await persist(queueRef.current.filter((s) => s.status !== 'sent'));
    await persistClaims(claimsRef.current.filter((c) => c.status !== 'sent'));
  }, [persist, persistClaims]);

  return (
    <SessionCtx.Provider value={{ ready, signedIn, pack, queue, claims, online, syncing, lastSync, login, logout, refreshPack, enqueue, enqueueClaim, syncNow, removeSent }}>
      {children}
    </SessionCtx.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('SessionProvider manquant');
  return ctx;
}
