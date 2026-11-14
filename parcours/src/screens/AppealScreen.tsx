import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { ApiError, NetworkError, api } from '../api';
import type { RootStack } from '../navigation';
import { C } from '../theme';
import { Banner, BottomBar, Button, Card, Field, Header } from '../ui';

export default function AppealScreen({ route, navigation }: NativeStackScreenProps<RootStack, 'Appeal'>) {
  const { decisionId, program } = route.params;
  const [motive, setMotive] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const res = await api<{ due_date: string }>('me/appeals/', { method: 'POST', json: { decision: decisionId, motive } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(res.due_date);
    } catch (e) {
      setError(e instanceof NetworkError ? 'Pas de connexion. Réessayez quand vous aurez du réseau.' : e instanceof ApiError ? e.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title="Recours envoyé" />
        <View style={{ flex: 1, padding: 16, gap: 14 }}>
          <Banner tone="success" text={`Votre recours a bien été reçu. Une réponse vous sera donnée avant le ${new Date(done).toLocaleDateString('fr-FR')}.`} />
          <Text style={{ color: C.textMuted, fontSize: 15, lineHeight: 22 }}>
            Une autre personne que celle qui a pris la décision examinera votre demande. Vous ne pouvez subir aucune sanction pour avoir contesté une décision.
          </Text>
        </View>
        <BottomBar>
          <Button title="Retour à l’accueil" icon="home-outline" onPress={() => navigation.popToTop()} style={{ flex: 1 }} />
        </BottomBar>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Contester la décision" subtitle={program} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Banner tone="info" text="Expliquez simplement pourquoi vous n’êtes pas d’accord. Vous pouvez aussi demander l’aide de votre agent." />
        {error && <Banner tone="error" text={error} />}
        <Card>
          <Field label="Pourquoi contestez-vous ?" required multiline value={motive} onChangeText={setMotive} placeholder="Ex. j’habite bien dans la commune, j’ai un nouveau document…" maxLength={2000} />
        </Card>
      </ScrollView>
      <BottomBar>
        <Button title="Envoyer mon recours" icon="send" onPress={send} loading={sending} disabled={motive.trim().length < 5} style={{ flex: 1 }} />
      </BottomBar>
    </KeyboardAvoidingView>
  );
}
