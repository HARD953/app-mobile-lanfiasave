import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ApiError, NetworkError, getServer, setServer } from '../api';
import { useSession } from '../session';
import { C, R } from '../theme';
import { Banner, Button, Field } from '../ui';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showServer, setShowServer] = useState(false);
  const [server, setServerValue] = useState('');

  useEffect(() => {
    getServer().then(setServerValue);
  }, []);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      if (showServer) await setServer(server);
      await login(username.trim(), password);
    } catch (e) {
      if (e instanceof NetworkError) setError('Serveur injoignable. Vérifiez la connexion internet ou l’adresse du serveur.');
      else if (e instanceof ApiError && e.status === 401) setError('Identifiant ou mot de passe incorrect.');
      else if (e instanceof ApiError && e.status === 429) setError('Trop de tentatives. Patientez une minute.');
      else setError(e instanceof Error ? e.message : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={[st.hero, { paddingTop: insets.top + 40 }]}>
          <Pressable onLongPress={() => setShowServer((v) => !v)} delayLongPress={800} accessibilityHint="Appui long : réglage du serveur">
            <View style={st.logo}>
              <Ionicons name="shield-checkmark" size={38} color={C.white} />
            </View>
          </Pressable>
          <Text style={st.brand}>LanfiaSave</Text>
          <Text style={st.app}>Collecte terrain</Text>
          <Text style={st.tagline}>Recensement des ménages, même hors connexion.</Text>
        </View>
        <View style={st.form}>
          <Text style={st.title}>Connexion</Text>
          {error && (
            <View style={{ marginBottom: 16 }}>
              <Banner tone="error" text={error} />
            </View>
          )}
          <Field label="Identifiant" icon="person-outline" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} textContentType="username" returnKeyType="next" />
          <Field label="Mot de passe" icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="password" returnKeyType="go" onSubmitEditing={submit} />
          {showServer && (
            <Field
              label="Adresse du serveur"
              hint="Fournie par votre superviseur"
              icon="server-outline"
              value={server}
              onChangeText={setServerValue}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          )}
          <Button title="Se connecter" icon="log-in-outline" onPress={submit} loading={loading} disabled={!username || !password} />
          <Text style={st.foot}>Après la connexion, le questionnaire et les communes sont téléchargés : vous pourrez ensuite travailler sans réseau.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: C.primaryDeep, paddingHorizontal: 24, paddingBottom: 48, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  logo: { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  brand: { color: C.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  app: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '600', marginTop: 2 },
  tagline: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 10, textAlign: 'center' },
  form: { marginTop: -24, marginHorizontal: 16, backgroundColor: C.white, borderRadius: R.xl, padding: 20, borderWidth: 1, borderColor: C.borderLight },
  title: { fontSize: 22, fontWeight: '800', color: C.text, marginBottom: 16 },
  foot: { color: C.textMuted, fontSize: 13, textAlign: 'center', marginTop: 16, lineHeight: 19 },
});
