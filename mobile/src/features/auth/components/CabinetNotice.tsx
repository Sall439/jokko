import { StyleSheet, Text, View } from 'react-native';

import { CABINET_RULES } from '@/constants/cabinet-rules';
import { Brand, Typography } from '@/constants/brand';

/** Rappel des règles du cabinet (B0), repris sur la vitrine avant inscription. */
export function CabinetNotice() {
  return (
    <View style={styles.notice}>
      <Text style={styles.title}>Avant votre rendez-vous</Text>
      {CABINET_RULES.map((rule) => (
        <View key={rule.title} style={styles.rule}>
          <Text style={styles.ruleTitle}>{rule.title}</Text>
          <Text style={styles.ruleText}>{rule.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: Brand.colors.primarySoft,
    borderRadius: Brand.radius.md,
    padding: Brand.spacing.lg,
    gap: Brand.spacing.sm,
  },
  title: { ...Typography.smStrong, color: Brand.colors.primaryDark },
  rule: { gap: 2 },
  ruleTitle: { ...Typography.xs, color: Brand.colors.primary },
  ruleText: { ...Typography.sm, color: Brand.colors.text },
});
