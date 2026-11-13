import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RootStack } from '../navigation';
import { useSession } from '../session';
import { C, R } from '../theme';
import { Banner, BottomBar, Button, Card, Header, SectionTitle } from '../ui';

const RELATION: Record<string, string> = {
  head: 'Chef de ménage',
  spouse: 'Conjoint(e)',
  child: 'Enfant',
  parent: 'Parent',
  relative: 'Autre parent',
  other: 'Autre',
};

export default function SubmissionDetailScreen({ route, navigation }: NativeStackScreenProps<RootStack, 'SubmissionDetail'>) {
  const { queue, syncNow, syncing, online } = useSession();
  const item = queue.find((q) => q.client_uuid === route.params.id);
  if (!item) return null;

  const codes = new Map(item.result?.members.map((m) => [m.client_uuid, m.public_code]) ?? []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={item.summary.headName} subtitle={item.summary.territoryName} onBack={() => navigation.navigate('Home')} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
        {item.status === 'sent' && (
          <View style={st.success}>
            <Ionicons name="checkmark-circle" size={44} color={C.success} />
            <Text style={st.successTitle}>Ménage enregistré sur le serveur</Text>
            <Text style={st.code}>{item.result?.household.public_code}</Text>
            <Text style={st.successSub}>Notez ce code sur la fiche papier si nécessaire.</Text>
          </View>
        )}
        {(item.status === 'pending' || item.status === 'sending') && (
          <View style={[st.success, { backgroundColor: C.warningPale }]}>
            <Ionicons name="phone-portrait-outline" size={40} color={C.warning} />
            <Text style={[st.successTitle, { color: C.warning }]}>Enregistré sur le téléphone</Text>
            <Text style={st.successSub}>
              {online ? 'Envoi en cours vers le serveur…' : 'Il sera envoyé automatiquement dès que le réseau revient.'}
            </Text>
          </View>
        )}
        {item.status === 'error' && <Banner tone="error" text={`Le serveur a refusé l’envoi : ${item.error}`} />}

        <Card>
          <SectionTitle icon="people-outline" title={`${item.payload.members.length} personne(s)`} />
          {item.payload.members.map((m) => (
            <View key={m.client_uuid} style={st.row}>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>
                  {m.first_name} {m.last_name}
                </Text>
                <Text style={st.sub}>
                  {RELATION[m.relation]}
                  {m.estimated_age !== null ? ` · ${m.estimated_age} ans` : ''}
                </Text>
              </View>
              {codes.get(m.client_uuid) && <Text style={st.memberCode}>{codes.get(m.client_uuid)}</Text>}
            </View>
          ))}
        </Card>
        <Text style={st.meta}>Saisi le {new Date(item.createdAt).toLocaleString('fr-FR')}</Text>
      </ScrollView>
      <BottomBar>
        {item.status === 'sent' ? (
          <Button title="Nouveau ménage" icon="add-circle-outline" onPress={() => navigation.replace('NewHousehold')} style={{ flex: 1 }} />
        ) : (
          <>
            <Button title="Envoyer maintenant" icon="cloud-upload-outline" onPress={syncNow} loading={syncing} style={{ flex: 1 }} />
            {item.status === 'error' && (
              <Button
                title="Aide"
                icon="help-circle-outline"
                variant="secondary"
                onPress={() => Alert.alert('Envoi refusé', 'Montrez ce message à votre superviseur. Le ménage reste enregistré sur le téléphone.')}
              />
            )}
          </>
        )}
      </BottomBar>
    </View>
  );
}

const st = StyleSheet.create({
  success: { alignItems: 'center', backgroundColor: C.successPale, borderRadius: R.lg, padding: 20, gap: 6 },
  successTitle: { fontSize: 18, fontWeight: '800', color: C.success, textAlign: 'center' },
  successSub: { fontSize: 14, color: C.textMuted, textAlign: 'center' },
  code: { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: 1, marginVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  name: { fontSize: 16, fontWeight: '700', color: C.text },
  sub: { fontSize: 13, color: C.textMuted },
  memberCode: { fontSize: 13, fontWeight: '700', color: C.primary },
  meta: { textAlign: 'center', color: C.textSoft, fontSize: 13 },
});
