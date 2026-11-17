/**
 * « Nouvelle demande » (relais communautaire, agent) : ménage affecté par une activité minière, pétrolière ou
 * énergétique. Fonctionne sans réseau : le numéro de dossier est attribué tout de suite et inscrit sur le
 * récépissé papier, lu à voix haute dans la langue du ménage. Données minimales : ni ethnie, ni religion,
 * ni opinion, ni biométrie, ni diagnostic médical.
 */
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RootStack } from '../navigation';
import { useSession } from '../session';
import { claimReference, uuid } from '../store';
import { C, R } from '../theme';
import type { ClaimSubmission } from '../types';
import { Banner, BottomBar, Button, Card, Chips, Field, Header, Label, SectionTitle, Stepper, SwitchRow } from '../ui';
import { TerritoryPicker } from './NewHouseholdScreen';

const EMPTY = {
  name: '',
  sex: 'F' as 'F' | 'M',
  birthYear: '',
  phone: '',
  language: '',
  village: '',
  territory: null as string | null,
  size: 1 as number | null,
  womenHead: false,
  dependent: false,
  sector: 'mining',
  impacts: [] as string[],
  profile: null as string | null,
  incomeBefore: '',
  incomeAfter: '',
  description: '',
  assets: '',
  aid: '',
  noId: false,
  community: false,
  consentOperator: false,
  urgent: false,
  urgency: null as string | null,
};

function MultiChips({ options, value, onChange }: { options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <View style={st.chips}>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
            style={[st.chip, on && { backgroundColor: C.primary, borderColor: C.primary }]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
          >
            {on && <Ionicons name="checkmark" size={16} color={C.white} />}
            <Text style={[st.chipTxt, on && { color: C.white, fontWeight: '700' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function NewClaimScreen({ navigation }: NativeStackScreenProps<RootStack, 'NewClaim'>) {
  const { pack, enqueueClaim } = useSession();
  const [f, setF] = useState(EMPTY);
  const [done, setDone] = useState<ClaimSubmission | null>(null);
  const meta = pack?.claimsMeta;
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setF((x) => ({ ...x, [k]: v }));
  const territoryName = pack?.territories.find((t) => t.id === f.territory)?.name ?? '';
  const ready = f.name.trim().length > 1 && f.impacts.length > 0 && (!f.urgent || !!f.urgency);

  async function save() {
    if (!pack) return;
    const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(/\s/g, '')));
    const item: ClaimSubmission = {
      client_uuid: uuid(),
      reference: claimReference(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      attempts: 0,
      payload: {
        organization: pack.organizationId,
        claimant_name: f.name.trim(),
        claimant_sex: f.sex,
        claimant_birth_year: num(f.birthYear),
        claimant_phone: f.phone.trim(),
        language: f.language.trim(),
        village: f.village.trim() || territoryName,
        territory: f.territory,
        household_size: f.size ?? 1,
        women_head: f.womenHead,
        has_dependent_person: f.dependent,
        channel: 'relay',
        sector: f.sector,
        impacts: f.impacts,
        profile: f.profile ?? '',
        sources: ['relay', ...(f.community ? ['community'] : [])],
        description: f.description.trim(),
        assets_lost: f.assets.trim(),
        income_before: num(f.incomeBefore),
        income_after: num(f.incomeAfter),
        aid_received: f.aid.trim(),
        no_identity_document: f.noId,
        community_validated: f.community,
        consent_operator_contact: f.consentOperator,
        urgent: f.urgent,
        urgency_reason: f.urgent ? f.urgency ?? '' : '',
      },
      summary: { name: f.name.trim(), village: f.village.trim() || territoryName, impacts: f.impacts, urgent: f.urgent },
    };
    await enqueueClaim(item);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setDone(item);
  }

  if (done) {
    const decision = new Date(new Date(done.createdAt).getTime() + 30 * 86400000).toLocaleDateString('fr-FR');
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title="Récépissé" subtitle="À remettre et lire à voix haute" />
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <Ionicons name="document-text-outline" size={36} color={C.primary} />
            <Text style={st.refLabel}>Numéro de dossier</Text>
            <Text style={st.ref} selectable>{done.reference}</Text>
            <Text style={st.refName}>{done.summary.name}</Text>
          </Card>
          <Banner tone="info" icon="megaphone-outline" text={`Écrivez ce numéro sur le récépissé papier et lisez-le au ménage${f.language ? ` en ${f.language}` : ''}.`} />
          <Card>
            <Text style={st.p}>• Une décision motivée sera rendue au plus tard le {decision}.</Text>
            {done.summary.urgent && <Text style={st.p}>• La situation est signalée comme urgente : une mesure doit être prise sous 72 heures.</Text>}
            <Text style={st.p}>• La décision pourra être contestée pendant 30 jours.</Text>
            <Text style={st.p}>• Aucune somme ne peut être demandée pour cette démarche.</Text>
            <Text style={st.p}>• Suivi : auprès du relais, à la permanence, ou par SMS « SUIVI {done.reference} ».</Text>
          </Card>
          <Banner tone="success" icon="cloud-upload-outline" text="La demande sera envoyée automatiquement dès que le réseau sera disponible." />
        </ScrollView>
        <BottomBar>
          <Button title="Terminé" icon="checkmark" onPress={() => navigation.goBack()} />
        </BottomBar>
      </View>
    );
  }

  const impacts = meta?.impacts.filter((i) => i.sectors.includes(f.sector)) ?? [];
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Nouvelle demande" subtitle="Ménage affecté par une activité" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }} keyboardShouldPersistTaps="handled">
        {!meta && <Banner tone="warning" text="Référentiel non téléchargé : ouvrez Réglages et mettez à jour le pack terrain." />}
        <Card>
          <SectionTitle icon="person-outline" title="Le ménage" hint="Seulement ce qui sert à examiner la demande." />
          <Field label="Nom et prénom" required value={f.name} onChangeText={(v) => set('name', v)} />
          <Chips label="Sexe" options={[{ value: 'F', label: 'Femme' }, { value: 'M', label: 'Homme' }]} value={f.sex} onChange={(v) => v && set('sex', v as 'F' | 'M')} />
          <Field label="Année de naissance" keyboardType="number-pad" value={f.birthYear} onChangeText={(v) => set('birthYear', v)} />
          <Stepper label="Personnes dans le ménage" value={f.size} onChange={(v) => set('size', v)} min={1} max={30} />
          {pack && <TerritoryPicker territories={pack.territories} value={f.territory} onChange={(id) => set('territory', id)} />}
          <Field label="Village" value={f.village} onChangeText={(v) => set('village', v)} />
          <Field label="Téléphone (facultatif)" hint="Avec l'accord de la personne" keyboardType="phone-pad" value={f.phone} onChangeText={(v) => set('phone', v)} />
          <Field label="Langue du ménage" hint="Pour lire le récépissé" value={f.language} onChangeText={(v) => set('language', v)} />
          <View style={{ gap: 10 }}>
            <SwitchRow icon="woman-outline" label="Femme cheffe de ménage" value={f.womenHead} onChange={(v) => set('womenHead', v)} />
            <SwitchRow icon="accessibility-outline" label="Personne dépendante dans le ménage" hint="Aucun diagnostic n'est noté" value={f.dependent} onChange={(v) => set('dependent', v)} />
          </View>
        </Card>

        <Card>
          <SectionTitle icon="warning-outline" title="Ce qui a été perdu" />
          <Chips label="Secteur" options={meta?.sectors ?? []} value={f.sector} onChange={(v) => v && setF((x) => ({ ...x, sector: v, impacts: [] }))} />
          <Label text="Impacts" required />
          <MultiChips options={impacts} value={f.impacts} onChange={(v) => set('impacts', v)} />
          {!!meta?.watch_list[f.sector] && <Text style={st.hint}>À repérer : {meta.watch_list[f.sector]}.</Text>}
          <Chips label="Profil du ménage" options={meta?.profiles ?? []} value={f.profile} onChange={(v) => set('profile', v)} />
          <Field label="Revenu mensuel avant (FCFA)" keyboardType="number-pad" value={f.incomeBefore} onChangeText={(v) => set('incomeBefore', v)} />
          <Field label="Revenu mensuel maintenant (FCFA)" keyboardType="number-pad" value={f.incomeAfter} onChangeText={(v) => set('incomeAfter', v)} />
          <Field label="Biens ou accès perdus" value={f.assets} onChangeText={(v) => set('assets', v)} />
          <Field label="Ce que dit le ménage" multiline value={f.description} onChangeText={(v) => set('description', v)} />
          <Field label="Aides ou indemnités déjà reçues" value={f.aid} onChangeText={(v) => set('aid', v)} />
        </Card>

        <Card>
          <SectionTitle icon="shield-checkmark-outline" title="Identité et accord" />
          <View style={{ gap: 10 }}>
            <SwitchRow icon="card-outline" label="Pas de pièce d'identité" hint="N'empêche jamais l'enregistrement" value={f.noId} onChange={(v) => set('noId', v)} />
            {f.noId && <SwitchRow icon="people-outline" label="Validation communautaire faite" hint="Devant le chef de village et des témoins" value={f.community} onChange={(v) => set('community', v)} />}
            <SwitchRow icon="share-outline" label="Accepte que l'exploitant reçoive ses coordonnées" value={f.consentOperator} onChange={(v) => set('consentOperator', v)} />
            <SwitchRow icon="alert-circle-outline" label="Urgence (eau, nourriture, santé, sécurité)" hint="Mesure sous 72 heures" value={f.urgent} onChange={(v) => set('urgent', v)} />
          </View>
          {f.urgent && <View style={{ marginTop: 14 }}><Chips label="Motif de l'urgence" required options={meta?.urgency_reasons ?? []} value={f.urgency} onChange={(v) => set('urgency', v)} color={C.error} /></View>}
        </Card>
      </ScrollView>
      <BottomBar>
        <Button title="Enregistrer et donner le numéro" icon="document-text-outline" onPress={save} disabled={!ready} />
      </BottomBar>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  chipTxt: { fontSize: 14, color: C.text },
  hint: { fontSize: 13, color: C.textMuted, marginBottom: 14 },
  refLabel: { fontSize: 13, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 10 },
  ref: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: 2, marginTop: 6, fontVariant: ['tabular-nums'] },
  refName: { fontSize: 16, color: C.textMuted, marginTop: 6 },
  p: { fontSize: 15, color: C.text, lineHeight: 22, marginBottom: 6 },
});
