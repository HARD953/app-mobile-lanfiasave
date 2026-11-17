import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getServer } from '../api';
import type { RootStack } from '../navigation';
import { useSession } from '../session';
import { C } from '../theme';
import { Banner, Button, Card, Header, SectionTitle } from '../ui';

export default function SettingsScreen({ navigation }: NativeStackScreenProps<RootStack, 'Settings'>) {
  const { pack, queue, refreshPack, logout, removeSent } = useSession();
  const [server, setServer] = useState('');
  const [busy, setBusy] = useState(false);
  const unsent = queue.filter((q) => q.status !== 'sent').length;
  const sent = queue.length - unsent;

  useEffect(() => {
    getServer().then(setServer);
  }, []);

  async function update() {
    setBusy(true);
    try {
      await refreshPack();
      Alert.alert('Mise à jour terminée', 'Questionnaire et localités à jour.');
    } catch (e) {
      Alert.alert('Mise à jour impossible', e instanceof Error ? e.message : 'Réessayez avec du réseau.');
    } finally {
      setBusy(false);
    }
  }

  function confirmLogout() {
    if (unsent) {
      Alert.alert('Envois en attente', `${unsent} ménage(s) ne sont pas encore envoyés. Envoyez-les avant de vous déconnecter, sinon ils resteront sur ce téléphone.`);
      return;
    }
    Alert.alert('Se déconnecter ?', 'Le questionnaire devra être téléchargé à nouveau.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: logout },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Réglages" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Card>
          <SectionTitle icon="person-circle-outline" title={pack?.me.full_name ?? ''} hint={pack?.organizationName} />
          <Info label="Identifiant" value={pack?.me.username} />
          <Info label="Rôle" value={pack?.me.memberships.find((m) => m.organization === pack.organizationId)?.role_label} />
        </Card>
        <Card>
          <SectionTitle icon="cloud-download-outline" title="Données de terrain" />
          <Info label="Formulaires" value={pack ? (pack.questionnaires ?? (pack.questionnaire ? [pack.questionnaire] : [])).map((q) => q.variant?.label ?? q.title).join(' · ') : '—'} />
          <Info label="Localités" value={String(pack?.territories.length ?? 0)} />
          <Info label="Téléchargé le" value={pack ? new Date(pack.downloadedAt).toLocaleString('fr-FR') : '—'} />
          <Button title="Mettre à jour" icon="refresh" variant="secondary" onPress={update} loading={busy} style={{ marginTop: 12 }} />
        </Card>
        <Card>
          <SectionTitle icon="phone-portrait-outline" title="Ce téléphone" />
          <Info label="Serveur" value={server} />
          <Info label="Version de l’application" value={Constants.expoConfig?.version ?? '—'} />
          {sent > 0 && <Button title={`Effacer ${sent} ménage(s) déjà envoyés`} icon="trash-outline" variant="secondary" onPress={removeSent} style={{ marginTop: 12 }} />}
        </Card>
        {unsent > 0 && <Banner tone="warning" text={`${unsent} ménage(s) en attente d’envoi.`} />}
        <Button title="Se déconnecter" icon="log-out-outline" variant="danger" onPress={confirmLogout} />
      </ScrollView>
    </View>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <View style={st.row}>
      <Text style={st.label}>{label}</Text>
      <Text style={st.value} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  label: { color: C.textMuted, fontSize: 14 },
  value: { color: C.text, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
