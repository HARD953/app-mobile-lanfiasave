/**
 * Connexion bénéficiaire : code dossier (inscrit sur la fiche remise par l'agent) + code PIN à 6 chiffres
 * saisi sur un grand pavé numérique. Pas d'e-mail, pas de mot de passe complexe.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, NetworkError } from '../api';
import { useSession } from '../session';
import { C, R } from '../theme';
import { Banner, Button, Field } from '../ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useSession();
  const [step, setStep] = useState<'code' | 'pin'>('code');
  const [code, setCode] = useState('');
  const [pin, setPinState] = useState('');
  // Référence synchrone : des appuis rapides successifs ne doivent perdre aucun chiffre.
  const pinRef = useRef('');
  const setPin = (v: string) => {
    pinRef.current = v;
    setPinState(v);
  };
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(fullPin: string) {
    setLoading(true);
    setError(null);
    try {
      await login(code.trim().toUpperCase(), fullPin);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (e instanceof NetworkError) setError('Pas de connexion internet. Réessayez plus tard.');
      else if (e instanceof ApiError && e.status === 429) setError('Trop d’essais. Attendez une minute.');
      else setError('Code dossier ou code PIN incorrect.');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  function press(k: string) {
    if (loading) return;
    Haptics.selectionAsync();
    const current = pinRef.current;
    if (k === 'del') return setPin(current.slice(0, -1));
    if (!k || current.length >= 6) return;
    const next = current + k;
    setPin(next);
    if (next.length === 6) submit(next);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[st.hero, { paddingTop: insets.top + 32 }]}>
          <View style={st.logo}>
            <Ionicons name="shield-checkmark" size={36} color={C.white} />
          </View>
          <Text style={st.brand}>Mon Parcours</Text>
          <Text style={st.tagline}>Suivez votre dossier LanfiaSave</Text>
        </View>

        <View style={st.card}>
          {error && (
            <View style={{ marginBottom: 14 }}>
              <Banner tone="error" text={error} />
            </View>
          )}
          {step === 'code' ? (
            <>
              <Text style={st.title}>Votre code dossier</Text>
              <Text style={st.help}>Il est écrit sur la fiche remise par l’agent. Exemple : LFS-ACDE-FGHJ</Text>
              <Field icon="card-outline" placeholder="LFS-XXXX-XXXX" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" autoCorrect={false} spellCheck={false} returnKeyType="next" onSubmitEditing={() => code.length >= 6 && setStep('pin')} style={{ marginTop: 12 }} />
              <Button title="Continuer" icon="arrow-forward" onPress={() => setStep('pin')} disabled={code.trim().length < 6} />
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => { setStep('code'); setPin(''); setError(null); }} style={st.codeChip} accessibilityLabel="Modifier le code dossier">
                <Ionicons name="card-outline" size={16} color={C.primary} />
                <Text style={st.codeChipTxt}>{code}</Text>
                <Ionicons name="pencil" size={14} color={C.textMuted} />
              </TouchableOpacity>
              <Text style={[st.title, { textAlign: 'center' }]}>Code PIN</Text>
              <Text style={[st.help, { textAlign: 'center' }]}>6 chiffres</Text>
              <View style={st.dots} accessibilityLabel={`${pin.length} chiffres saisis sur 6`}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <View key={i} style={[st.dot, i < pin.length && st.dotOn]} />
                ))}
              </View>
              <View style={st.pad}>
                {KEYS.map((k, i) => (
                  <Pressable
                    key={i}
                    onPress={() => press(k)}
                    disabled={!k}
                    style={({ pressed }) => [st.key, !k && { backgroundColor: 'transparent' }, pressed && { backgroundColor: C.primaryPale }]}
                    accessibilityRole="button"
                    accessibilityLabel={k === 'del' ? 'Effacer' : k}
                  >
                    {k === 'del' ? <Ionicons name="backspace-outline" size={26} color={C.text} /> : <Text style={st.keyTxt}>{k}</Text>}
                  </Pressable>
                ))}
              </View>
              {loading && <Text style={[st.help, { textAlign: 'center', marginTop: 8 }]}>Vérification…</Text>}
            </>
          )}
        </View>
        <Text style={st.foot}>Code oublié ? Rapprochez-vous de votre agent ou de votre travailleur social.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: C.primaryDeep, alignItems: 'center', paddingBottom: 44, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  logo: { width: 68, height: 68, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brand: { color: C.white, fontSize: 28, fontWeight: '800' },
  tagline: { color: 'rgba(255,255,255,0.8)', fontSize: 15, marginTop: 4 },
  card: { marginTop: -22, marginHorizontal: 16, backgroundColor: C.white, borderRadius: R.xl, padding: 20, borderWidth: 1, borderColor: C.borderLight },
  title: { fontSize: 21, fontWeight: '800', color: C.text },
  help: { fontSize: 14, color: C.textMuted, marginTop: 4 },
  codeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: C.primaryPale, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 14 },
  codeChipTxt: { fontWeight: '700', color: C.primaryDeep, letterSpacing: 0.5 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginVertical: 20 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: C.border },
  dotOn: { backgroundColor: C.primary, borderColor: C.primary },
  pad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  key: { width: '31%', height: 64, borderRadius: R.lg, backgroundColor: C.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  keyTxt: { fontSize: 28, fontWeight: '600', color: C.text },
  foot: { textAlign: 'center', color: C.textMuted, fontSize: 13, marginHorizontal: 32, marginVertical: 20, lineHeight: 19 },
});
