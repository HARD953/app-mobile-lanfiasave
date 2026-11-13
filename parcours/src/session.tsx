import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, clearTokens, hasSession, saveTokens } from './api';

export type Profile = {
  public_code: string;
  first_name: string;
  last_name: string;
  display_name: string;
  organization: string;
  status: string;
  status_label: string;
  is_provisional: boolean;
  household_code: string | null;
  territory: string | null;
};

export type Step = { code: string; label: string; done: boolean; current: boolean };

export type MyApplication = {
  id: string;
  program: string;
  program_description: string;
  status: string;
  status_label: string;
  status_reason: string;
  submitted_at: string;
  steps: Step[];
  decision: null | { id: string; outcome: 'approved' | 'rejected' | 'deferred'; outcome_label: string; motive: string; date: string; can_appeal: boolean };
  appeal: null | { status: string; status_label: string; due_date: string; resolution: string };
};

export type MyAid = {
  id: string;
  category: string;
  category_label: string;
  description: string;
  status: 'planned' | 'delivered';
  status_label: string;
  amount: number | null;
  quantity: string | null;
  unit: string;
  provider: string | null;
  date: string | null;
};

export type MyCase = {
  id: string;
  case_number: string;
  operation: string;
  operation_kind: string;
  status: string;
  status_label: string;
  needs: string[];
  relocation_site: string;
  opened_at: string;
};

type Ctx = {
  ready: boolean;
  profile: Profile | null;
  login: (identifier: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadProfile: () => Promise<void>;
};

const SessionCtx = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const reloadProfile = useCallback(async () => {
    setProfile(await api<Profile>('me/profile/'));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (await hasSession()) await reloadProfile();
      } catch {
        await clearTokens();
      } finally {
        setReady(true);
      }
    })();
  }, [reloadProfile]);

  const login = useCallback(
    async (identifier: string, pin: string) => {
      const data = await api<{ access: string; refresh: string }>('auth/beneficiary/login/', {
        method: 'POST',
        json: { identifier, pin },
        auth: false,
      });
      await saveTokens(data.access, data.refresh);
      await reloadProfile();
    },
    [reloadProfile],
  );

  const logout = useCallback(async () => {
    await clearTokens();
    setProfile(null);
  }, []);

  return <SessionCtx.Provider value={{ ready, profile, login, logout, reloadProfile }}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('SessionProvider manquant');
  return ctx;
}
