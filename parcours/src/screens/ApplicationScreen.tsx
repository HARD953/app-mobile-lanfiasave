import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RootStack } from '../navigation';
import { C, R } from '../theme';
import { Banner, BottomBar, Button, Card, Header, Pill } from '../ui';

const OUTCOME_ICON = { approved: 'checkmark-circle', rejected: 'close-circle', deferred: 'time' } as const;
const OUTCOME_COLOR = { approved: C.success, rejected: C.error, deferred: C.warning };

export default function ApplicationScreen({ route, navigation }: NativeStackScreenProps<RootStack, 'Application'>) {
  const a = route.params.application;
  const d = a.decision;
  const canAppeal = !!d && d.outcome !== 'approved' && d.can_appeal && (!a.appeal || !['open', 'under_review'].includes(a.appeal.status));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={a.program} subtitle={`Demande du ${new Date(a.submitted_at).toLocaleDateString('fr-FR')}`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}>
        {d && (
          <View style={[st.decision, { borderColor: OUTCOME_COLOR[d.outcome] }]}>
            <Ionicons name={OUTCOME_ICON[d.outcome]} size={44} color={OUTCOME_COLOR[d.outcome]} />
            <Text style={[st.decisionTitle, { color: OUTCOME_COLOR[d.outcome] }]}>Demande {d.outcome_label.toLowerCase()}</Text>
            <Text style={st.muted}>Décision du {new Date(d.date).toLocaleDateString('fr-FR')}</Text>
            <View style={st.motive}>
              <Text style={st.motiveLabel}>Pourquoi ?</Text>
              <Text style={st.motiveTxt}>{d.motive}</Text>
            </View>
          </View>
        )}

        {!!a.status_reason && <Banner tone="warning" text={a.status_reason} />}

        {a.appeal && (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color={C.primary} />
              <Text style={st.cardTitle}>Mon recours</Text>
              <Pill text={a.appeal.status_label} tone="info" />
            </View>
            {a.appeal.resolution ? (
              <Text style={st.body}>{a.appeal.resolution}</Text>
            ) : (
              <Text style={st.body}>Votre recours est en cours d’examen. Réponse prévue avant le {new Date(a.appeal.due_date).toLocaleDateString('fr-FR')}.</Text>
            )}
          </Card>
        )}

        <Card>
          <Text style={[st.cardTitle, { marginBottom: 12 }]}>Où en est ma demande ?</Text>
          {a.steps.map((s, i) => (
            <View key={s.code} style={st.step}>
              <View style={{ alignItems: 'center' }}>
                <View style={[st.stepDot, s.done && { backgroundColor: C.success, borderColor: C.success }, s.current && !s.done && { borderColor: C.gold, backgroundColor: C.white }]}>
                  {s.done ? <Ionicons name="checkmark" size={14} color={C.white} /> : s.current ? <View style={st.stepInner} /> : null}
                </View>
                {i < a.steps.length - 1 && <View style={[st.stepLine, s.done && { backgroundColor: C.success }]} />}
              </View>
              <Text style={[st.stepTxt, (s.done || s.current) && { color: C.text, fontWeight: '700' }]}>{s.label}</Text>
            </View>
          ))}
        </Card>

        {a.program_description ? (
          <Card>
            <Text style={[st.cardTitle, { marginBottom: 6 }]}>Le programme</Text>
            <Text style={st.body}>{a.program_description}</Text>
          </Card>
        ) : null}
      </ScrollView>
      {canAppeal && (
        <BottomBar>
          <Button title="Contester cette décision" icon="chatbox-ellipses-outline" variant="secondary" onPress={() => navigation.navigate('Appeal', { decisionId: d!.id, program: a.program })} style={{ flex: 1 }} />
        </BottomBar>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  decision: { backgroundColor: C.white, borderRadius: R.lg, borderWidth: 2, padding: 20, alignItems: 'center', gap: 4 },
  decisionTitle: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  muted: { fontSize: 14, color: C.textMuted },
  motive: { alignSelf: 'stretch', backgroundColor: C.surfaceAlt, borderRadius: R.md, padding: 14, marginTop: 12 },
  motiveLabel: { fontSize: 13, fontWeight: '700', color: C.textMuted, marginBottom: 4 },
  motiveTxt: { fontSize: 16, color: C.text, lineHeight: 23 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  body: { fontSize: 15, color: C.text, lineHeight: 22 },
  step: { flexDirection: 'row', gap: 14, minHeight: 48 },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.gold },
  stepLine: { width: 2, flex: 1, backgroundColor: C.border, marginVertical: 2 },
  stepTxt: { fontSize: 16, color: C.textMuted, paddingTop: 1 },
});
