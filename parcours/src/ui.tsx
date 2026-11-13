/**
 * Briques d'interface pensées pour le pouce et le soleil (inspirées de LanfiaLink Terrain) :
 * libellés au-dessus des champs, champs hauts (52 px), choix en grosses pastilles,
 * un seul bouton principal par écran, toujours visible.
 */
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R, SHADOW } from './theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Header({
  title,
  subtitle,
  onBack,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="light" />
      <View style={s.headerRow}>
        {onBack && (
          <TouchableOpacity onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour">
            <Ionicons name="chevron-back" size={26} color={C.white} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          {!!subtitle && (
            <Text style={s.headerSub} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function HeaderButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.headerBtn} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
      <Ionicons name={icon} size={20} color={C.white} />
    </TouchableOpacity>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ icon, title, hint }: { icon?: IconName; title: string; hint?: string }) {
  return (
    <View style={s.sectionHead}>
      {icon && (
        <View style={s.sectionIcon}>
          <Ionicons name={icon} size={16} color={C.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {!!hint && <Text style={s.hint}>{hint}</Text>}
      </View>
    </View>
  );
}

export function Label({ text, required, hint }: { text: string; required?: boolean; hint?: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={s.label}>
        {text}
        {required && <Text style={{ color: C.error }}> *</Text>}
      </Text>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  icon,
  style,
  ...input
}: TextInputProps & { label?: string; required?: boolean; hint?: string; error?: string | null; icon?: IconName }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: 16 }, style as ViewStyle]}>
      {!!label && <Label text={label} required={required} hint={hint} />}
      <View style={[s.inputBox, focused && s.inputFocused, !!error && s.inputError, input.multiline && { height: 96, alignItems: 'flex-start' }]}>
        {icon && <Ionicons name={icon} size={18} color={focused ? C.primary : C.textSoft} style={input.multiline ? { marginTop: 14 } : undefined} />}
        <TextInput
          {...input}
          placeholderTextColor={C.textSoft}
          style={[s.input, input.multiline && { paddingTop: 14, textAlignVertical: 'top' }]}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
        />
      </View>
      {!!error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

export function Chips<T extends string | number>({
  label,
  required,
  hint,
  options,
  value,
  onChange,
  color = C.primary,
}: {
  label?: string;
  required?: boolean;
  hint?: string;
  options: { value: T; label: string; icon?: IconName }[];
  value: T | null | undefined;
  onChange: (v: T | null) => void;
  color?: string;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      {!!label && <Label text={label} required={required} hint={hint} />}
      <View style={s.chips}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <Pressable
              key={String(o.value)}
              onPress={() => onChange(on ? null : o.value)}
              style={[s.chip, on && { backgroundColor: color, borderColor: color }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
            >
              {o.icon && <Ionicons name={o.icon} size={16} color={on ? C.white : C.textMuted} />}
              <Text style={[s.chipTxt, on && { color: C.white, fontWeight: '700' }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Stepper({ label, value, onChange, min = 0, max = 99 }: { label: string; value: number | null; onChange: (v: number) => void; min?: number; max?: number }) {
  const v = value ?? 0;
  return (
    <View style={{ marginBottom: 18 }}>
      <Label text={label} />
      <View style={s.stepper}>
        <TouchableOpacity style={s.stepBtn} onPress={() => onChange(Math.max(min, v - 1))} accessibilityLabel="Moins">
          <Ionicons name="remove" size={24} color={C.primary} />
        </TouchableOpacity>
        <Text style={[s.stepValue, value === null && { color: C.textSoft }]}>{value === null ? '—' : v}</Text>
        <TouchableOpacity style={s.stepBtn} onPress={() => onChange(Math.min(max, value === null ? min : v + 1))} accessibilityLabel="Plus">
          <Ionicons name="add" size={24} color={C.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function SwitchRow({ icon, label, hint, value, onChange }: { icon: IconName; label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={[s.switchRow, value && { borderColor: C.success, backgroundColor: C.successPale }]} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={[s.sectionIcon, value && { backgroundColor: C.white }]}>
        <Ionicons name={icon} size={16} color={value ? C.success : C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.label}>{label}</Text>
        {!!hint && <Text style={s.hint}>{hint}</Text>}
      </View>
      <Ionicons name={value ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={value ? C.success : C.textSoft} />
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  icon,
  variant = 'primary',
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const bg = { primary: C.primary, secondary: C.white, ghost: 'transparent', danger: C.error, success: C.success }[variant];
  const fg = variant === 'secondary' || variant === 'ghost' ? C.primary : C.white;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[s.btn, { backgroundColor: bg }, variant === 'secondary' && { borderWidth: 1.5, borderColor: C.border }, (disabled || loading) && { opacity: 0.5 }, style]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon && <Ionicons name={icon} size={20} color={fg} />}
      <Text style={[s.btnTxt, { color: fg }]}>{title}</Text>
    </TouchableOpacity>
  );
}

export function BottomBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[s.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>{children}</View>;
}

export function Banner({ tone = 'info', icon, text }: { tone?: 'info' | 'success' | 'warning' | 'error'; icon?: IconName; text: string }) {
  const map = {
    info: [C.primaryPale, C.primaryDeep, 'information-circle'],
    success: [C.successPale, C.success, 'checkmark-circle'],
    warning: [C.warningPale, C.warning, 'warning'],
    error: [C.errorPale, C.error, 'alert-circle'],
  } as const;
  const [bg, fg, defIcon] = map[tone];
  return (
    <View style={[s.banner, { backgroundColor: bg }]}>
      <Ionicons name={icon ?? defIcon} size={18} color={fg} />
      <Text style={[s.bannerTxt, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function Pill({ text, tone = 'info' }: { text: string; tone?: 'info' | 'success' | 'warning' | 'error' | 'neutral' }) {
  const map = {
    info: [C.primaryPale, C.primaryDeep],
    success: [C.successPale, C.success],
    warning: [C.warningPale, C.warning],
    error: [C.errorPale, C.error],
    neutral: [C.borderLight, C.textMuted],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Text style={[s.pillTxt, { color: fg }]}>{text}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  header: { backgroundColor: C.primaryDeep, paddingHorizontal: 16, paddingBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  headerTitle: { color: C.white, fontSize: 21, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.78)', fontSize: 13, marginTop: 1 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: 16, borderWidth: 1, borderColor: C.borderLight, ...SHADOW },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.primaryPale, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  label: { fontSize: 15, fontWeight: '600', color: C.text },
  hint: { fontSize: 12.5, color: C.textMuted, marginTop: 2 },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, paddingHorizontal: 14 },
  inputFocused: { borderColor: C.primary },
  inputError: { borderColor: C.error },
  input: { flex: 1, fontSize: 16, color: C.text, height: '100%' },
  error: { color: C.error, fontSize: 12.5, marginTop: 5, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  chipTxt: { fontSize: 15, color: C.text, fontWeight: '500' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.primaryPale, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 26, fontWeight: '800', color: C.text, minWidth: 48, textAlign: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.md, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, marginBottom: 12 },
  btn: { height: 56, borderRadius: R.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 18 },
  btnTxt: { fontSize: 17, fontWeight: '700' },
  bottomBar: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.borderLight, flexDirection: 'row', gap: 10 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: R.md },
  bannerTxt: { flex: 1, fontSize: 14, fontWeight: '600' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  pillTxt: { fontSize: 12, fontWeight: '700' },
});
