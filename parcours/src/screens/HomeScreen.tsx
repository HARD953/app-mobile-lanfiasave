import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api, NetworkError } from '../api';
import type { RootStack } from '../navigation';
import { useSession, type MyApplication } from '../session';
import { C, R } from '../theme';
import { Banner, Card, Header, HeaderButton, Pill } from '../ui';

export const OUTCOME_TONE = { approved: 'success', rejected: 'error', deferred: 'warning' } as const;

export default function HomeScreen({ navigation }: NativeStackScreenProps<RootStack, 'Home'>) {
  const { profile, reloadProfile } = useSession();
  const [apps, setApps] = useState<MyApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list] = await Promise.all([api<MyApplication[]>('me/applications/'), reloadProfile()]);
      setApps(list);
    } catch (e) {
      setError(e instanceof NetworkError ? 'Pas de connexion. Les informations ne sont peut-être pas à jour.' : 'Impossible de charger vos demandes.');
    }
  }, [reloadProfile]);

  // L'événement « focus » est émis à l'ouverture puis à chaque retour sur l'écran.
  useEffect(() => navigation.addListener('focus', load), [load, navigation]);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={`Bonjour ${profile?.first_name ?? ''}`} subtitle={profile?.organization} right={<HeaderButton icon="person-circle-outline" label="Mon dossier" onPress={() => navigation.navigate('Profile')} />} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.primary} />}>
        {error && <Banner tone="warning" text={error} />}

        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={st.badge}>
            <Ionicons name="folder-open" size={24} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.muted}>Mon dossier</Text>
            <Text style={st.code}>{profile?.public_code}</Text>
          </View>
          <Pill text={profile?.status_label ?? '…'} tone={profile?.status === 'active' || profile?.status === 'verified' ? 'success' : 'info'} />
        </Card>

        <Text style={st.section}>Mes demandes d’aide</Text>
        {apps === null && !error && <Text style={st.muted}>Chargement…</Text>}
        {apps?.length === 0 && (
          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Ionicons name="document-text-outline" size={34} color={C.textSoft} />
            <Text style={[st.cardTitle, { marginTop: 8 }]}>Aucune demande pour l’instant</Text>
            <Text style={[st.muted, { textAlign: 'center', marginTop: 4 }]}>Votre travailleur social vous inscrira aux programmes adaptés à votre situation.</Text>
          </Card>
        )}
        {apps?.map((a) => {
          const current = a.steps.find((s) => s.current);
          return (
            <TouchableOpacity key={a.id} activeOpacity={0.8} onPress={() => navigation.navigate('Application', { application: a })} accessibilityRole="button">
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Text style={[st.cardTitle, { flex: 1 }]}>{a.program}</Text>
                  <Ionicons name="chevron-forward" size={20} color={C.textSoft} />
                </View>
                <View style={st.progressRow}>
                  {a.steps.map((s) => (
                    <View key={s.code} style={[st.seg, (s.done || s.current) && { backgroundColor: s.current && !s.done ? C.gold : C.success }]} />
                  ))}
                </View>
                {a.decision ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Pill text={`Demande ${a.decision.outcome_label.toLowerCase()}`} tone={OUTCOME_TONE[a.decision.outcome]} />
                    {a.appeal && <Pill text={`Recours : ${a.appeal.status_label.toLowerCase()}`} tone="info" />}
                  </View>
                ) : (
                  <Text style={st.muted}>
                    Étape en cours : <Text style={{ fontWeight: '700', color: C.text }}>{current?.label ?? a.status_label}</Text>
                  </Text>
                )}
              </Card>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={st.help} onPress={() => navigation.navigate('Help')} accessibilityRole="button">
          <Ionicons name="help-buoy-outline" size={22} color={C.teal} />
          <Text style={st.helpTxt}>Besoin d’aide ? Mes droits et contacts</Text>
          <Ionicons name="chevron-forward" size={18} color={C.textSoft} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  badge: { width: 48, height: 48, borderRadius: 14, backgroundColor: C.primaryPale, alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 14, color: C.textMuted },
  code: { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: 0.5 },
  section: { fontSize: 13, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  progressRow: { flexDirection: 'row', gap: 6, marginVertical: 14 },
  seg: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.borderLight },
  help: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.tealPale, borderRadius: R.lg, padding: 16, marginTop: 6 },
  helpTxt: { flex: 1, fontSize: 15, fontWeight: '600', color: C.text },
});
