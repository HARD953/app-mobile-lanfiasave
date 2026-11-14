import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ApiError, NetworkError, api } from '../api';
import type { RootStack } from '../navigation';
import { C, R } from '../theme';
import { Banner, BottomBar, Button, Card, Header, Pill } from '../ui';

export type MyGrievance = {
  id: string;
  reference: string;
  category: string;
  category_label: string;
  status: string;
  status_label: string;
  answered: boolean;
  created_at: string;
  due_date: string;
  resolution: string;
  satisfaction: '' | 'satisfied' | 'partly' | 'unsatisfied';
};
export type GrievanceCategory = { value: string; label: string };

const RATINGS = [
  { value: 'satisfied', label: 'Oui', icon: 'happy-outline' },
  { value: 'partly', label: 'En partie', icon: 'remove-circle-outline' },
  { value: 'unsatisfied', label: 'Non', icon: 'sad-outline' },
] as const;

const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR');

export default function GrievancesScreen({ navigation }: NativeStackScreenProps<RootStack, 'Grievances'>) {
  const [items, setItems] = useState<MyGrievance[] | null>(null);
  const [categories, setCategories] = useState<GrievanceCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rating, setRating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api<{ results: MyGrievance[]; categories: GrievanceCategory[] }>('me/grievances/');
      setItems(data.results);
      setCategories(data.categories);
    } catch (e) {
      setError(e instanceof NetworkError ? 'Pas de connexion. Réessayez plus tard.' : 'Impossible de charger vos signalements.');
    }
  }, []);

  useEffect(() => navigation.addListener('focus', load), [load, navigation]);

  async function rate(g: MyGrievance, satisfaction: string) {
    setRating(g.id);
    try {
      const updated = await api<MyGrievance>(`me/grievances/${g.id}/feedback/`, { method: 'POST', json: { satisfaction } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setItems((list) => list?.map((x) => (x.id === g.id ? updated : x)) ?? null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Envoi impossible.');
    } finally {
      setRating(null);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Mes signalements" subtitle="Problèmes, plaintes et questions" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={C.primary}
          />
        }
      >
        <Banner tone="info" icon="shield-checkmark-outline" text="Signaler un problème est gratuit et sans risque pour votre aide. Les signalements d’abus ou de demande d’argent sont traités en toute confidentialité." />
        {error && <Banner tone="warning" text={error} />}
        {items === null && !error && <Text style={st.muted}>Chargement…</Text>}
        {items?.length === 0 && (
          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Ionicons name="chatbubbles-outline" size={34} color={C.textSoft} />
            <Text style={[st.title, { marginTop: 8 }]}>Aucun signalement</Text>
            <Text style={[st.muted, { textAlign: 'center', marginTop: 4 }]}>Si quelque chose ne va pas avec votre aide ou votre dossier, dites-le nous.</Text>
          </Card>
        )}
        {items?.map((g) => (
          <Card key={g.id}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={st.title}>{g.category_label}</Text>
                <Text style={st.muted}>
                  N° {g.reference} · envoyé le {fmt(g.created_at)}
                </Text>
              </View>
              <Pill text={g.status_label} tone={g.answered ? 'success' : 'warning'} />
            </View>
            {g.answered ? (
              <>
                <View style={st.answer}>
                  <Text style={st.answerLbl}>Réponse</Text>
                  <Text style={st.answerTxt}>{g.resolution || 'Votre signalement a été traité.'}</Text>
                </View>
                {g.satisfaction ? (
                  <Text style={[st.muted, { marginTop: 10 }]}>Merci pour votre avis : {RATINGS.find((r) => r.value === g.satisfaction)?.label.toLowerCase()}.</Text>
                ) : (
                  <>
                    <Text style={[st.question, { marginTop: 12 }]}>Cette réponse vous convient-elle ?</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      {RATINGS.map((r) => (
                        <TouchableOpacity key={r.value} style={st.rate} disabled={rating === g.id} onPress={() => rate(g, r.value)} accessibilityRole="button" accessibilityLabel={r.label}>
                          <Ionicons name={r.icon} size={20} color={C.primary} />
                          <Text style={st.rateTxt}>{r.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </>
            ) : (
              <Text style={[st.muted, { marginTop: 10 }]}>Réponse prévue au plus tard le {fmt(g.due_date)}.</Text>
            )}
          </Card>
        ))}
      </ScrollView>
      <BottomBar>
        <Button title="Signaler un problème" icon="megaphone-outline" onPress={() => navigation.navigate('Report', { categories })} style={{ flex: 1 }} />
      </BottomBar>
    </View>
  );
}

const st = StyleSheet.create({
  muted: { fontSize: 14, color: C.textMuted, marginTop: 2 },
  title: { fontSize: 16.5, fontWeight: '700', color: C.text },
  question: { fontSize: 15, fontWeight: '600', color: C.text },
  answer: { marginTop: 12, backgroundColor: C.successPale, borderRadius: R.md, padding: 12 },
  answerLbl: { fontSize: 12, fontWeight: '700', color: C.success, textTransform: 'uppercase', letterSpacing: 0.5 },
  answerTxt: { fontSize: 15, color: C.text, marginTop: 4, lineHeight: 21 },
  rate: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  rateTxt: { fontSize: 15, fontWeight: '600', color: C.primary },
});
