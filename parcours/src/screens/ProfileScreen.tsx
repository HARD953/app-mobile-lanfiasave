import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RootStack } from '../navigation';
import { useSession } from '../session';
import { C } from '../theme';
import { Banner, Button, Card, Header, SectionTitle } from '../ui';

export default function ProfileScreen({ navigation }: NativeStackScreenProps<RootStack, 'Profile'>) {
  const { profile, logout } = useSession();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Mon dossier" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Card>
          <SectionTitle icon="person-outline" title={profile?.display_name ?? ''} hint={profile?.organization} />
          <Row label="Code dossier" value={profile?.public_code} />
          <Row label="Code ménage" value={profile?.household_code ?? '—'} />
          <Row label="Localité" value={profile?.territory ?? '—'} />
          <Row label="État du dossier" value={profile?.status_label} />
        </Card>
        {profile?.is_provisional && <Banner tone="info" text="Votre identité est enregistrée à titre provisoire. Cela ne vous empêche pas d’être accompagné(e)." />}
        <Card>
          <SectionTitle icon="lock-closed-outline" title="Mes données" />
          <Text style={st.body}>
            Vos informations sont protégées et ne sont visibles que par les personnes chargées de votre accompagnement. Vous pouvez demander à les consulter ou à les corriger auprès de votre travailleur social.
          </Text>
        </Card>
        <Button
          title="Me déconnecter"
          icon="log-out-outline"
          variant="secondary"
          onPress={() =>
            Alert.alert('Se déconnecter ?', 'Il faudra saisir à nouveau votre code dossier et votre code PIN.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Se déconnecter', style: 'destructive', onPress: logout },
            ])
          }
        />
      </ScrollView>
    </View>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <View style={st.row}>
      <Text style={st.label}>{label}</Text>
      <Text style={st.value}>{value || '—'}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  label: { color: C.textMuted, fontSize: 15 },
  value: { color: C.text, fontSize: 15, fontWeight: '700' },
  body: { fontSize: 15, color: C.text, lineHeight: 22 },
});
