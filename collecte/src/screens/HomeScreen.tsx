import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStack } from '../navigation';
import { useSession } from '../session';
import { C, R, SHADOW } from '../theme';
import type { Submission } from '../types';
import { Banner, Header, HeaderButton, Pill } from '../ui';

const STATUS: Record<Submission['status'], { label: string; tone: 'success' | 'warning' | 'error' | 'info' }> = {
  pending: { label: 'En attente d’envoi', tone: 'warning' },
  sending: { label: 'Envoi…', tone: 'info' },
  sent: { label: 'Envoyé', tone: 'success' },
  error: { label: 'À vérifier', tone: 'error' },
};

export default function HomeScreen({ navigation }: NativeStackScreenProps<RootStack, 'Home'>) {
  const insets = useSafeAreaInsets();
  const { pack, queue, claims, online, syncing, syncNow } = useSession();
  const canSurvey = pack?.canSurvey ?? true;
  const canClaim = !!pack?.canClaim;
  const pending = queue.filter((q) => q.status !== 'sent').length + claims.filter((c) => c.status !== 'sent').length;
  const sentToday = queue.filter((q) => q.status === 'sent' && q.sentAt?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const errors = queue.filter((q) => q.status === 'error');
  const firstName = pack?.me.full_name.split(' ')[0] ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={`Bonjour ${firstName}`} subtitle={pack?.organizationName} right={<HeaderButton icon="settings-outline" label="Réglages" onPress={() => navigation.navigate('Settings')} />}>
        <View style={st.statsRow}>
          <Stat value={pending} label="À envoyer" icon="cloud-upload-outline" />
          <Stat value={sentToday} label="Envoyés aujourd’hui" icon="checkmark-done-outline" />
          {canSurvey ? (
            <Stat value={queue.length} label="Ménages saisis" icon="home-outline" />
          ) : (
            <Stat value={claims.length} label="Demandes saisies" icon="document-text-outline" />
          )}
        </View>
      </Header>

      <FlatList
        data={queue}
        keyExtractor={(i) => i.client_uuid}
        contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 10 }}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={syncNow} tintColor={C.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 6 }}>
            <TouchableOpacity style={[st.syncCard, !online && { borderColor: C.warning }]} onPress={syncNow} disabled={syncing || !pending} accessibilityRole="button">
              <View style={[st.syncIcon, { backgroundColor: online ? C.successPale : C.warningPale }]}>
                <Ionicons name={online ? 'cloud-done-outline' : 'cloud-offline-outline'} size={22} color={online ? C.success : C.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.syncTitle}>{online ? 'Connecté' : 'Hors connexion'}</Text>
                <Text style={st.syncSub}>
                  {syncing ? 'Envoi en cours…' : pending ? `${pending} envoi(s) partiront automatiquement` : 'Tout est envoyé'}
                </Text>
              </View>
              {!!pending && !syncing && <Ionicons name="refresh" size={22} color={C.primary} />}
            </TouchableOpacity>
            {errors.length > 0 && <Banner tone="error" text={`${errors.length} envoi(s) refusé(s) par le serveur. Ouvrez-les pour voir le motif.`} />}
            {claims.length > 0 && <Text style={st.listTitle}>Mes demandes (récépissés)</Text>}
            {claims.map((c) => (
              <View key={c.client_uuid} style={st.item}>
                <View style={[st.itemIcon, c.summary.urgent && { backgroundColor: C.errorPale }]}>
                  <Ionicons name="document-text" size={20} color={c.summary.urgent ? C.error : C.primary} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={st.itemTitle}>{c.serverReference ?? c.reference}</Text>
                  <Text style={st.itemSub}>{c.summary.name}{c.summary.village ? ` · ${c.summary.village}` : ''}</Text>
                  {!!c.serverReference && c.serverReference !== c.reference && (
                    <Text style={[st.itemSub, { color: C.warning }]}>Numéro modifié par le serveur : prévenir le ménage (ancien {c.reference})</Text>
                  )}
                  {c.status === 'error' && !!c.error && <Text style={[st.itemSub, { color: C.error }]}>{c.error}</Text>}
                  <Pill text={STATUS[c.status].label} tone={STATUS[c.status].tone} />
                </View>
              </View>
            ))}
            {queue.length > 0 && <Text style={st.listTitle}>Mes ménages</Text>}
          </View>
        }
        ListEmptyComponent={
          claims.length ? undefined : (
          <View style={st.empty}>
            <View style={st.emptyIcon}>
              <Ionicons name="people-outline" size={34} color={C.primary} />
            </View>
            <Text style={st.emptyTitle}>{canSurvey ? 'Aucun ménage enregistré' : 'Aucune demande enregistrée'}</Text>
            <Text style={st.emptyText}>
              {canSurvey ? 'Touchez « Nouveau ménage » pour commencer.' : 'Touchez « Nouvelle demande » pour enregistrer un ménage affecté.'} Vous pouvez travailler sans réseau.
            </Text>
          </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={st.item} onPress={() => navigation.navigate('SubmissionDetail', { id: item.client_uuid })} accessibilityRole="button">
            <View style={st.itemIcon}>
              <Ionicons name="home" size={20} color={C.primary} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={st.itemTitle}>{item.summary.headName}</Text>
              <Text style={st.itemSub}>
                {item.summary.territoryName} · {item.summary.membersCount} personne(s)
              </Text>
              {!!item.summary.operationTitle && (
                <Text style={[st.itemSub, { color: C.warning, fontWeight: '600' }]} numberOfLines={1}>
                  {item.summary.operationTitle}
                </Text>
              )}
              <Pill text={item.result ? `${STATUS[item.status].label} · ${item.result.household.public_code}` : STATUS[item.status].label} tone={STATUS[item.status].tone} />
            </View>
            <Ionicons name="chevron-forward" size={20} color={C.textSoft} />
          </TouchableOpacity>
        )}
      />

      <View style={[st.fabWrap, { paddingBottom: Math.max(insets.bottom, 16), flexDirection: 'row', gap: 10 }]}>
        {canSurvey && (
          <TouchableOpacity style={[st.fab, { flex: 1 }]} onPress={() => navigation.navigate('NewHousehold')} accessibilityRole="button" accessibilityLabel="Nouveau ménage">
            <Ionicons name="add-circle" size={24} color={C.white} />
            <Text style={[st.fabTxt, canClaim && { fontSize: 15 }]}>Nouveau ménage</Text>
          </TouchableOpacity>
        )}
        {canClaim && (
          <TouchableOpacity style={[st.fab, { flex: 1, backgroundColor: C.teal }]} onPress={() => navigation.navigate('NewClaim')} accessibilityRole="button" accessibilityLabel="Nouvelle demande">
            <Ionicons name="document-text" size={22} color={C.white} />
            <Text style={[st.fabTxt, canSurvey && { fontSize: 15 }]}>Nouvelle demande</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Stat({ value, label, icon }: { value: number; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View style={st.stat}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.8)" />
      <Text style={st.statValue}>{value}</Text>
      <Text style={st.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: R.md, padding: 10 },
  statValue: { color: C.white, fontSize: 24, fontWeight: '800', marginTop: 4 },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  syncCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: R.lg, padding: 14, borderWidth: 1.5, borderColor: C.borderLight, ...SHADOW },
  syncIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  syncTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  syncSub: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  listTitle: { fontSize: 13, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: R.lg, padding: 14, borderWidth: 1, borderColor: C.borderLight },
  itemIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.primaryPale, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  itemSub: { fontSize: 13, color: C.textMuted },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.primaryPale, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  fabWrap: { position: 'absolute', left: 16, right: 16, bottom: 0 },
  fab: { height: 60, borderRadius: 30, backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, ...SHADOW, shadowOpacity: 0.2 },
  fabTxt: { color: C.white, fontSize: 18, fontWeight: '800' },
});
