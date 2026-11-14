import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RootStack } from '../navigation';
import { C } from '../theme';
import { Card, Header } from '../ui';

const ITEMS: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; text: string }[] = [
  { icon: 'people-outline', title: 'Une décision humaine', text: 'Chaque décision est prise par des personnes, jamais par un ordinateur seul. Le motif vous est toujours expliqué.' },
  { icon: 'chatbox-ellipses-outline', title: 'Vous pouvez contester', text: 'Si vous n’êtes pas d’accord, vous pouvez faire un recours depuis l’application ou auprès de votre agent. Réponse sous 30 jours.' },
  { icon: 'card-outline', title: 'Pas besoin de papiers', text: 'L’absence de pièce d’identité ne vous empêche pas d’être recensé(e) ni accompagné(e).' },
  { icon: 'lock-closed-outline', title: 'Vos données sont protégées', text: 'Elles ne sont ni vendues ni publiées. Seules les personnes qui vous accompagnent y ont accès.' },
  { icon: 'cash-outline', title: 'Gratuit', text: 'Aucun agent ne peut vous demander de l’argent pour être inscrit(e) ou aidé(e). Signalez-le depuis « Signaler un problème » si cela arrive.' },
];

export default function HelpScreen({ navigation }: NativeStackScreenProps<RootStack, 'Help'>) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Mes droits" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        {ITEMS.map((i) => (
          <Card key={i.title} style={{ flexDirection: 'row', gap: 14 }}>
            <View style={st.icon}>
              <Ionicons name={i.icon} size={22} color={C.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.title}>{i.title}</Text>
              <Text style={st.text}>{i.text}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.tealPale, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: C.text },
  text: { fontSize: 14.5, color: C.textMuted, marginTop: 3, lineHeight: 21 },
});
