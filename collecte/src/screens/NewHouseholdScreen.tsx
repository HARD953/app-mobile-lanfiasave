/**
 * Assistant « Nouveau ménage » : une étape par écran, un seul bouton principal, brouillon
 * sauvegardé à chaque modification (reprise après fermeture, batterie vide ou plantage).
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStack } from '../navigation';
import { useSession } from '../session';
import { deviceId, uuid } from '../store';
import { C, R } from '../theme';
import type { DraftMember, Question, Relation, Submission, Territory } from '../types';
import { Banner, BottomBar, Button, Card, Chips, Field, Header, Label, SectionTitle, Stepper, SwitchRow } from '../ui';

const DRAFT_KEY = 'lfs.draft';

/** Situations faciles à repérer sur le terrain (les situations sensibles sont qualifiées par un travailleur social). */
const SITUATIONS: { value: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'disability', label: 'Handicap', icon: 'accessibility-outline' },
  { value: 'pregnant_lactating', label: 'Enceinte / allaitante', icon: 'woman-outline' },
  { value: 'elderly_isolated', label: 'Personne âgée isolée', icon: 'walk-outline' },
  { value: 'orphan_ovc', label: 'Orphelin(e)', icon: 'heart-outline' },
  { value: 'out_of_school', label: 'Enfant non scolarisé', icon: 'school-outline' },
  { value: 'malnutrition', label: 'Malnutrition', icon: 'nutrition-outline' },
  { value: 'no_birth_certificate', label: 'Sans acte de naissance', icon: 'document-outline' },
  { value: 'homeless', label: 'Sans abri', icon: 'home-outline' },
];

const RELATIONS: { value: Relation; label: string }[] = [
  { value: 'head', label: 'Chef de ménage' },
  { value: 'spouse', label: 'Conjoint(e)' },
  { value: 'child', label: 'Enfant' },
  { value: 'parent', label: 'Parent' },
  { value: 'relative', label: 'Autre parent' },
  { value: 'other', label: 'Autre' },
];

type Draft = {
  client_uuid: string;
  step: number;
  territory: string | null;
  address: string;
  emergency: boolean;
  operation: string | null;
  gps: { latitude: number; longitude: number } | null;
  members: DraftMember[];
  answers: Record<string, unknown>;
};

const emptyDraft = (): Draft => ({
  client_uuid: uuid(),
  step: 0,
  territory: null,
  address: '',
  emergency: false,
  operation: null,
  gps: null,
  members: [],
  answers: {},
});

export default function NewHouseholdScreen({ navigation }: NativeStackScreenProps<RootStack, 'NewHousehold'>) {
  const { pack, enqueue } = useSession();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [memberForm, setMemberForm] = useState<DraftMember | null>(null);
  const [saving, setSaving] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const sections = pack?.questionnaire.definition.sections ?? [];
  // Étapes : 0 lieu · 1 membres · 2..n rubriques du questionnaire · n+1 récapitulatif
  const totalSteps = sections.length + 3;

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) return setDraft(emptyDraft());
      const saved: Draft = JSON.parse(raw);
      Alert.alert('Reprendre la saisie ?', 'Un ménage était en cours de saisie sur ce téléphone.', [
        { text: 'Recommencer', style: 'destructive', onPress: () => setDraft(emptyDraft()) },
        { text: 'Reprendre', onPress: () => setDraft(saved) },
      ]);
    })();
  }, []);

  useEffect(() => {
    if (draft) AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const territory = useMemo(() => pack?.territories.find((t) => t.id === draft?.territory), [pack, draft?.territory]);
  const operations = pack?.operations ?? [];
  const head = draft?.members.find((m) => m.relation === 'head');

  if (!pack || !draft) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title="Nouveau ménage" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={C.primary} style={{ marginTop: 48 }} />
      </View>
    );
  }

  const update = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const goTo = (step: number) => {
    update({ step });
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const stepValid = (() => {
    if (draft.step === 0) return !!draft.territory;
    if (draft.step === 1) return draft.members.length > 0 && draft.members.filter((m) => m.relation === 'head').length === 1;
    return true;
  })();

  const stepTitle =
    draft.step === 0 ? 'Lieu du ménage' : draft.step === 1 ? 'Membres du ménage' : draft.step === totalSteps - 1 ? 'Vérifier et enregistrer' : sections[draft.step - 2].title;

  async function leave() {
    Alert.alert('Quitter la saisie ?', 'Le brouillon est conservé sur ce téléphone, vous pourrez le reprendre.', [
      { text: 'Continuer la saisie', style: 'cancel' },
      { text: 'Quitter', onPress: () => navigation.goBack() },
    ]);
  }

  async function captureGps() {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Position non autorisée', 'Vous pouvez continuer sans position GPS.');
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      update({ gps: { latitude: Number(pos.coords.latitude.toFixed(6)), longitude: Number(pos.coords.longitude.toFixed(6)) } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Position indisponible', 'Réessayez à l’extérieur, ou continuez sans GPS.');
    }
  }

  async function save() {
    if (!head || !pack || !draft) return;
    setSaving(true);
    const submission: Submission = {
      client_uuid: draft.client_uuid,
      createdAt: new Date().toISOString(),
      status: 'pending',
      attempts: 0,
      payload: {
        client_uuid: draft.client_uuid,
        organization: pack.organizationId,
        questionnaire: pack.questionnaire.id,
        territory: draft.territory,
        address_description: draft.address,
        gps_consent: !!draft.gps,
        latitude: draft.gps?.latitude ?? null,
        longitude: draft.gps?.longitude ?? null,
        emergency: draft.emergency,
        operation: draft.operation,
        collected_at: new Date().toISOString(),
        device_id: await deviceId(),
        members: draft.members.map((m) => ({
          ...m,
          vulnerabilities: m.vulnerabilities ?? [],
          answers: m.relation === 'head' ? cleanAnswers(draft.answers, sections) : {},
        })),
      },
      summary: {
        headName: `${head.first_name} ${head.last_name}`.trim(),
        territoryName: territory?.name ?? '—',
        membersCount: draft.members.length,
        operationTitle: operations.find((o) => o.id === draft.operation)?.title,
      },
    };
    await enqueue(submission);
    await AsyncStorage.removeItem(DRAFT_KEY);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    navigation.replace('SubmissionDetail', { id: submission.client_uuid });
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={stepTitle} subtitle={`Étape ${draft.step + 1} sur ${totalSteps}`} onBack={draft.step === 0 ? leave : () => goTo(draft.step - 1)} right={<TouchableOpacity onPress={leave} hitSlop={10} accessibilityLabel="Fermer"><Ionicons name="close" size={26} color={C.white} /></TouchableOpacity>}>
        <View style={st.progress}>
          <View style={[st.progressFill, { width: `${((draft.step + 1) / totalSteps) * 100}%` }]} />
        </View>
      </Header>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          {draft.step === 0 && (
            <>
              <Card>
                <SectionTitle icon="location-outline" title="Où se trouve le ménage ?" />
                <TerritoryPicker territories={pack.territories} value={draft.territory} onChange={(t) => update({ territory: t })} />
                <Field label="Repère / description du lieu" placeholder="Ex. derrière l’école, maison bleue" value={draft.address} onChangeText={(t) => update({ address: t })} />
              </Card>
              <Card>
                <SwitchRow icon="navigate-outline" label="Enregistrer la position GPS" hint={draft.gps ? `${draft.gps.latitude}, ${draft.gps.longitude}` : 'Seulement avec l’accord de la personne'} value={!!draft.gps} onChange={(on) => (on ? captureGps() : update({ gps: null }))} />
                <SwitchRow icon="warning-outline" label="Situation d’urgence" hint="Inondation, déguerpissement, déplacement…" value={draft.emergency} onChange={(v) => update({ emergency: v })} />
              </Card>
              {operations.length > 0 && (
                <Card>
                  <SectionTitle icon="alert-circle-outline" title="Ménage touché par une opération ?" hint="Déguerpissement, sinistre, site minier… Un dossier de suivi sera ouvert pour chaque membre." />
                  <Pressable onPress={() => update({ operation: null })} style={[st.opRow, !draft.operation && st.opRowOn]} accessibilityRole="radio" accessibilityState={{ selected: !draft.operation }}>
                    <Ionicons name={!draft.operation ? 'radio-button-on' : 'radio-button-off'} size={22} color={!draft.operation ? C.primary : C.textSoft} />
                    <Text style={st.opTitle}>Non, aucune</Text>
                  </Pressable>
                  {operations.map((o) => {
                    const on = draft.operation === o.id;
                    return (
                      <Pressable key={o.id} onPress={() => update({ operation: o.id, emergency: true })} style={[st.opRow, on && st.opRowOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                        <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? C.primary : C.textSoft} />
                        <View style={{ flex: 1 }}>
                          <Text style={st.opTitle}>{o.title}</Text>
                          <Text style={st.memberSub}>{o.kind_label}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </Card>
              )}
            </>
          )}

          {draft.step === 1 && (
            <>
              <Banner tone="info" text="Aucune pièce d’identité n’est obligatoire. Commencez par le chef de ménage." />
              {draft.members.map((m) => (
                <Pressable key={m.client_uuid} onPress={() => setMemberForm(m)} style={st.member}>
                  <View style={[st.memberIcon, m.relation === 'head' && { backgroundColor: C.primary }]}>
                    <Ionicons name={m.relation === 'head' ? 'star' : 'person'} size={18} color={m.relation === 'head' ? C.white : C.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.memberName}>
                      {m.first_name} {m.last_name}
                    </Text>
                    <Text style={st.memberSub}>
                      {RELATIONS.find((r) => r.value === m.relation)?.label} · {m.sex === 'F' ? 'Femme' : m.sex === 'M' ? 'Homme' : 'Sexe non déclaré'}
                      {m.estimated_age !== null ? ` · ${m.estimated_age} ans` : ''}
                    </Text>
                  </View>
                  <Ionicons name="create-outline" size={20} color={C.textSoft} />
                </Pressable>
              ))}
              <Button
                title={draft.members.length ? 'Ajouter une personne' : 'Ajouter le chef de ménage'}
                icon="person-add-outline"
                variant="secondary"
                onPress={() =>
                  setMemberForm({ client_uuid: uuid(), first_name: '', last_name: '', sex: 'U', estimated_age: null, phone: '', relation: head ? 'child' : 'head', has_identity_document: false, vulnerabilities: [] })
                }
              />
            </>
          )}

          {draft.step >= 2 && draft.step < totalSteps - 1 && (
            <Card>
              <Text style={st.forWho}>Réponses de {head?.first_name ?? 'la personne'}</Text>
              {sections[draft.step - 2].questions
                .filter((q) => isVisible(q, draft.answers))
                .map((q) => (
                  <QuestionInput key={q.code} q={q} value={draft.answers[q.code]} special={pack.questionnaire.definition.special_values} onChange={(v) => update({ answers: setAnswer(draft.answers, q.code, v) })} />
                ))}
            </Card>
          )}

          {draft.step === totalSteps - 1 && (
            <>
              <Card>
                <SectionTitle icon="home-outline" title="Ménage" />
                <Row label="Commune" value={territory?.name ?? '—'} />
                <Row label="Repère" value={draft.address || '—'} />
                <Row label="GPS" value={draft.gps ? 'Enregistré' : 'Non'} />
                <Row label="Urgence" value={draft.emergency ? 'Oui' : 'Non'} />
                {draft.operation && <Row label="Opération" value={operations.find((o) => o.id === draft.operation)?.title ?? '—'} />}
                <Row label="Personnes" value={String(draft.members.length)} />
              </Card>
              <Card>
                <SectionTitle icon="clipboard-outline" title="Questionnaire" />
                {sections.map((s, i) => {
                  const answered = s.questions.filter((q) => draft.answers[q.code] !== undefined).length;
                  const visible = s.questions.filter((q) => isVisible(q, draft.answers)).length;
                  return (
                    <TouchableOpacity key={s.code} style={st.recapRow} onPress={() => goTo(i + 2)}>
                      <Text style={{ flex: 1, color: C.text, fontSize: 15 }}>{s.title}</Text>
                      <Text style={{ color: answered === visible ? C.success : C.warning, fontWeight: '700' }}>
                        {answered}/{visible}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={C.textSoft} />
                    </TouchableOpacity>
                  );
                })}
              </Card>
              <Banner tone="info" text="Les questions sans réponse restent « non renseignées » : rien n’est inventé." />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomBar>
        {draft.step < totalSteps - 1 ? (
          <Button title="Continuer" icon="arrow-forward" onPress={() => goTo(draft.step + 1)} disabled={!stepValid} style={{ flex: 1 }} />
        ) : (
          <Button title="Enregistrer le ménage" icon="checkmark-circle" variant="success" onPress={save} loading={saving} style={{ flex: 1 }} />
        )}
      </BottomBar>

      <MemberSheet
        member={memberForm}
        hasHead={!!head && head.client_uuid !== memberForm?.client_uuid}
        onClose={() => setMemberForm(null)}
        onDelete={(id) => {
          update({ members: draft.members.filter((m) => m.client_uuid !== id) });
          setMemberForm(null);
        }}
        onSave={(m) => {
          const exists = draft.members.some((x) => x.client_uuid === m.client_uuid);
          const members = exists ? draft.members.map((x) => (x.client_uuid === m.client_uuid ? m : x)) : [...draft.members, m];
          update({ members: members.sort((a, b) => Number(b.relation === 'head') - Number(a.relation === 'head')) });
          setMemberForm(null);
        }}
      />
    </View>
  );
}

function isVisible(q: Question, answers: Record<string, unknown>) {
  if (!q.show_if) return true;
  return Object.entries(q.show_if).every(([k, v]) => answers[k] === v);
}

function setAnswer(answers: Record<string, unknown>, code: string, value: unknown) {
  const next = { ...answers };
  if (value === null || value === undefined || value === '') delete next[code];
  else next[code] = value;
  return next;
}

function cleanAnswers(answers: Record<string, unknown>, sections: { questions: Question[] }[]) {
  const out: Record<string, unknown> = {};
  for (const s of sections) for (const q of s.questions) if (isVisible(q, answers) && answers[q.code] !== undefined) out[q.code] = answers[q.code];
  return out;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.recapRow}>
      <Text style={{ flex: 1, color: C.textMuted, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: C.text, fontSize: 15, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function QuestionInput({ q, value, special, onChange }: { q: Question; value: unknown; special: Record<string, string>; onChange: (v: unknown) => void }) {
  const isSpecial = typeof value === 'string' && value in special;
  return (
    <View style={st.question}>
      {q.type === 'single' && (
        <Chips label={q.label} hint={q.hint} required={q.required} options={q.options ?? []} value={isSpecial ? null : (value as string)} onChange={onChange} />
      )}
      {q.type === 'number' && (
        <Stepper label={q.label} value={typeof value === 'number' ? value : null} onChange={onChange} />
      )}
      {q.type === 'text' && <Field label={q.label} hint={q.hint} value={isSpecial ? '' : ((value as string) ?? '')} onChangeText={onChange} />}
      {q.sensitive && <Text style={st.sensitive}>Information sensible — ne la demandez que si la personne est d’accord.</Text>}
      <View style={st.specialRow}>
        {['__unknown__', '__refused__', '__na__'].map((k) => {
          const on = value === k;
          return (
            <Pressable key={k} onPress={() => onChange(on ? null : k)} style={[st.special, on && st.specialOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
              <Text style={[st.specialTxt, on && { color: C.white }]}>{special[k]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TerritoryPicker({ territories, value, onChange }: { territories: Territory[]; value: string | null; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const insets = useSafeAreaInsets();
  const selected = territories.find((t) => t.id === value);
  const list = territories.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Label text="Commune / localité" required />
      <TouchableOpacity style={[st.select, !!selected && { borderColor: C.primary }]} onPress={() => setOpen(true)} accessibilityRole="button">
        <Ionicons name="map-outline" size={18} color={selected ? C.primary : C.textSoft} />
        <Text style={[{ flex: 1, fontSize: 16 }, { color: selected ? C.text : C.textSoft, fontWeight: selected ? '600' : '400' }]}>{selected ? selected.name : 'Choisir dans la liste'}</Text>
        <Ionicons name="chevron-down" size={18} color={C.textSoft} />
      </TouchableOpacity>
      <View style={{ height: 16 }} />
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: C.bg }}>
          <Header title="Choisir la localité" onBack={() => setOpen(false)} />
          <View style={{ padding: 16, paddingBottom: 0 }}>
            <Field icon="search" placeholder="Rechercher" value={q} onChangeText={setQ} autoFocus />
          </View>
          <FlatList
            data={list}
            keyExtractor={(t) => t.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={st.option}
                onPress={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: C.text }}>{item.name}</Text>
                  {item.parent_name && <Text style={{ color: C.textMuted, fontSize: 13 }}>{item.parent_name}</Text>}
                </View>
                {item.id === value && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={{ textAlign: 'center', color: C.textMuted, marginTop: 24 }}>Aucune localité trouvée.</Text>}
          />
        </View>
      </Modal>
    </>
  );
}

function MemberSheet({
  member,
  hasHead,
  onClose,
  onSave,
  onDelete,
}: {
  member: DraftMember | null;
  hasHead: boolean;
  onClose: () => void;
  onSave: (m: DraftMember) => void;
  onDelete: (id: string) => void;
}) {
  const [m, setM] = useState<DraftMember | null>(member);
  const [prev, setPrev] = useState(member);
  if (member !== prev) {
    setPrev(member);
    setM(member);
  }
  const insets = useSafeAreaInsets();
  if (!m) return null;
  const relations = RELATIONS.filter((r) => r.value !== 'head' || !hasHead);
  const valid = m.first_name.trim().length > 0;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Header title={m.first_name ? `${m.first_name} ${m.last_name}` : 'Nouvelle personne'} onBack={onClose} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
            <Card>
              <Chips label="Lien avec le chef de ménage" required options={relations} value={m.relation} onChange={(v) => v && setM({ ...m, relation: v })} />
              {/* Pas de correction automatique : elle déforme les noms propres (ex. « Awa » → « A »). */}
              <Field label="Prénom(s)" required value={m.first_name} onChangeText={(t) => setM({ ...m, first_name: t })} autoCapitalize="words" autoCorrect={false} spellCheck={false} autoComplete="off" textContentType="none" />
              <Field label="Nom" value={m.last_name} onChangeText={(t) => setM({ ...m, last_name: t })} autoCapitalize="words" autoCorrect={false} spellCheck={false} autoComplete="off" textContentType="none" />
              <Chips
                label="Sexe"
                options={[
                  { value: 'F', label: 'Femme', icon: 'female' },
                  { value: 'M', label: 'Homme', icon: 'male' },
                  { value: 'U', label: 'Non déclaré' },
                ]}
                value={m.sex}
                onChange={(v) => setM({ ...m, sex: (v ?? 'U') as DraftMember['sex'] })}
              />
              <Field
                label="Âge en années"
                hint="Estimez-le si la personne ne le connaît pas. Laissez vide si impossible."
                icon="calendar-outline"
                keyboardType="number-pad"
                maxLength={3}
                value={m.estimated_age === null ? '' : String(m.estimated_age)}
                onChangeText={(t) => {
                  const digits = t.replace(/[^0-9]/g, '');
                  setM({ ...m, estimated_age: digits ? Math.min(120, Number(digits)) : null });
                }}
              />
              <Field label="Téléphone" hint="Facultatif" icon="call-outline" keyboardType="phone-pad" value={m.phone} onChangeText={(t) => setM({ ...m, phone: t.replace(/[^0-9+ ]/g, '') })} />
              <SwitchRow icon="card-outline" label="Possède une pièce d’identité" value={m.has_identity_document} onChange={(v) => setM({ ...m, has_identity_document: v })} />
            </Card>
            <Card>
              <Label text="Situations particulières" hint="Touchez tout ce qui s’applique. Un travailleur social confirmera." />
              <View style={st.multi}>
                {SITUATIONS.map((o) => {
                  const on = (m.vulnerabilities ?? []).includes(o.value);
                  return (
                    <Pressable
                      key={o.value}
                      onPress={() => setM({ ...m, vulnerabilities: on ? m.vulnerabilities.filter((x) => x !== o.value) : [...(m.vulnerabilities ?? []), o.value] })}
                      style={[st.multiChip, on && st.multiChipOn]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                    >
                      <Ionicons name={on ? 'checkmark-circle' : o.icon} size={18} color={on ? C.white : C.textMuted} />
                      <Text style={[st.multiTxt, on && { color: C.white }]}>{o.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
        <View style={[{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: C.white, flexDirection: 'row', gap: 10 }]}>
          {member && member.first_name !== '' && <Button title="Retirer" icon="trash-outline" variant="secondary" onPress={() => onDelete(m.client_uuid)} />}
          <Button title="Valider" icon="checkmark" onPress={() => onSave({ ...m, first_name: m.first_name.trim(), last_name: m.last_name.trim() })} disabled={!valid} style={{ flex: 1 }} />
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  progress: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 12, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: C.gold },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderRadius: R.lg, padding: 14, borderWidth: 1, borderColor: C.borderLight },
  memberIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primaryPale, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontSize: 16, fontWeight: '700', color: C.text },
  memberSub: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  forWho: { fontSize: 13, color: C.textMuted, fontWeight: '600', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  question: { borderBottomWidth: 1, borderBottomColor: C.borderLight, paddingBottom: 10, marginBottom: 16 },
  sensitive: { fontSize: 12, color: C.warning, marginTop: -8, marginBottom: 10 },
  specialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -6 },
  special: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.borderLight },
  specialOn: { backgroundColor: C.textMuted, borderColor: C.textMuted },
  specialTxt: { fontSize: 12.5, color: C.textMuted, fontWeight: '600' },
  opRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, marginBottom: 8, backgroundColor: C.white },
  opRowOn: { borderColor: C.primary, backgroundColor: C.primaryPale2 },
  opTitle: { fontSize: 15.5, fontWeight: '600', color: C.text },
  multi: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  multiChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  multiChipOn: { backgroundColor: C.teal, borderColor: C.teal },
  multiTxt: { fontSize: 14.5, color: C.text, fontWeight: '500' },
  recapRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.borderLight },
  select: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, paddingHorizontal: 14 },
  option: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderRadius: R.md, padding: 16, marginBottom: 8, borderWidth: 1, borderColor: C.borderLight },
});
