import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Brand, Typography } from '@/constants/brand';
import type { FeatherIconName } from '@/types/ui';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  icon?: FeatherIconName;
  /** Mot de passe : masque le texte avec bouton afficher/masquer. */
  secure?: boolean;
  /** Aide sous le champ, en gris. Masquée si une erreur est affichée. */
  helper?: string;
};

export function TextField({
  label,
  error,
  icon,
  secure = false,
  helper,
  multiline,
  ...inputProps
}: Props) {
  const [hidden, setHidden] = useState(secure);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.box,
          multiline && styles.boxMultiline,
          focused && styles.boxFocused,
          !!error && styles.boxError,
        ]}
      >
        {icon ? <Feather name={icon} size={18} color={Brand.colors.textMuted} /> : null}
        <TextInput
          {...inputProps}
          multiline={multiline}
          accessibilityLabel={label}
          secureTextEntry={hidden}
          placeholderTextColor={Brand.colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Afficher le mot de passe' : 'Masquer le mot de passe'}
            onPress={() => setHidden((h) => !h)}
            hitSlop={8}
          >
            <Feather name={hidden ? 'eye' : 'eye-off'} size={18} color={Brand.colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!error && helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: Brand.spacing.xs },
  label: { ...Typography.smStrong, color: Brand.colors.text },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Brand.spacing.md,
    minHeight: Brand.controlHeight,
    paddingHorizontal: Brand.spacing.md,
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.sm,
    borderWidth: 1.5,
    borderColor: Brand.colors.border,
  },
  boxMultiline: { alignItems: 'flex-start' },
  boxFocused: { borderColor: Brand.colors.primary },
  boxError: { borderColor: Brand.colors.danger },
  input: {
    ...Typography.body,
    flex: 1,
    paddingVertical: Brand.spacing.sm,
    color: Brand.colors.text,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  error: { ...Typography.xs, color: Brand.colors.danger },
  helper: { ...Typography.xs, color: Brand.colors.textMuted },
});
