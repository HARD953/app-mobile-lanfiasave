import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { ApiError, NetworkError, api } from '../api';
import type { RootStack } from '../navigation';
import { C } from '../theme';
import { Banner, BottomBar, Button, Card, Chips, Field, Header, SwitchRow } from '../ui';
import type { MyGrievance } from './GrievancesScreen';

// Utilisées si la liste n'a pas pu être chargée (hors ligne au moment d'ouvrir l'écran).
const FALLBACK = [
  { value: 'payment_delay', label: 'Mon aide est en retard' },
  { value: 'payment_amount', label: 'Mon aide est incomplète' },
  { value: 'data_correction', label: 'Une erreur dans mon dossier' },
  { value: 'fraud', label: 'On m’a demandé de l’argent' },
  { value: 'sea', label: 'Abus ou harcèlement sexuel' },
  { value: 'information', label: 'J’ai une question' },
  { value: 'other', label: 'Autre problème' },
];
const SENSITIVE = new Set(['sea', 'fraud', 'staff_conduct']);

export default function ReportScreen({ route, navigation }: NativeStackScreenProps<RootStack, 'Report'>) {
  const categories = route.params.categories.length ? route.params.categories : FALLBACK;
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [callback, setCallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<MyGrievance | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await api<MyGrievance>('me/grievances/', { method: 'POST', json: { category, description, callback } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(res);
    } catch (e) {
      setError(e instanceof NetworkError ? 'Pas de connexion. Réessayez quand vous aurez du réseau.' : e instanceof ApiError ? e.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title="Signalement envoyé" />
        <View style={{ flex: 1, padding: 16, gap: 14 }}>
          <Banner tone="success" text={`Nous avons bien reçu votre signalement n° ${done.reference}. Une réponse vous sera donnée avant le ${new Date(done.due_date).toLocaleDateString('fr-FR')}.`} />
          <Text style={{ color: C.textMuted, fontSize: 15, lineHeight: 22 }}>
            Vous suivrez la réponse dans « Mes signalements ». Gardez ce numéro : il vous sera demandé si vous appelez ou passez au guichet.
          </Text>
        </View>
        <BottomBar>
          <Button title="Voir mes signalements" icon="list-outline" onPress={() => navigation.goBack()} style={{ flex: 1 }} />
        </BottomBar>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Signaler un problème" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        {error && <Banner tone="error" text={error} />}
        <Card>
          <Chips label="De quoi s’agit-il ?" required options={categories} value={category} onChange={setCategory} />
          {category && SENSITIVE.has(category) && (
            <View style={{ marginBottom: 16 }}>
              <Banner tone="info" icon="lock-closed-outline" text="Ce signalement est confidentiel : seules les personnes habilitées le liront." />
            </View>
          )}
          <Field label="Expliquez en quelques mots" required multiline value={description} onChangeText={setDescription} placeholder="Ce qui s’est passé, quand, où…" maxLength={3000} />
          <SwitchRow icon="call-outline" label="Je souhaite être rappelé(e)" hint="Un agent vous appellera au numéro de votre dossier." value={callback} onChange={setCallback} />
        </Card>
      </ScrollView>
      <BottomBar>
        <Button title="Envoyer" icon="send" onPress={send} loading={sending} disabled={!category || description.trim().length < 10} style={{ flex: 1 }} />
      </BottomBar>
    </KeyboardAvoidingView>
  );
}
