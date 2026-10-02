import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Brand, Typography } from '@/constants/brand';
import { useAuth } from '@/features/auth/useAuth';
import { ROLE_LABEL } from '@/utils/roles';
import { getDisplayName, getInitials } from '@/utils/user';

/**
 * Bandeau turquoise foncé commun aux deux espaces (A5) : avatar, libellé de
 * l'espace, nom, cloche, puis la ligne
 * « Cabinet Dentaire JokkoDentiste · Anti-chevauchement actif ».
 *
 * Ce composant lit la session ; il ne reçoit pas d_props métier. Un composant
 * `ui/` resterait pur.
 */
export function ScreenHeader() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <View style={[styles.header, { paddingTop: insets.top + Brand.spacing.md }]}>
      <View style={styles.row}>
        <Avatar initials={getInitials(user)} size="md" />

        <View style={styles.identity}>
          <Text style={styles.role} numberOfLines={1}>
            {ROLE_LABEL[user.role]}
          </Text>
          <Text style={styles.name} numberOfLines={1}>
            {getDisplayName(user)}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Feather name="bell" size={18} color={Brand.colors.onPrimary} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          <Feather name="log-out" size={18} color={Brand.colors.onPrimary} />
        </Pressable>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.info} numberOfLines={1}>
          Cabinet Dentaire JokkoDentiste
        </Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.info} numberOfLines={1}>
          Anti-chevauchement actif
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Brand.colors.primaryDark,
    paddingHorizontal: Brand.spacing.lg,
    paddingBottom: Brand.spacing.md,
    gap: Brand.spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Brand.spacing.md },
  identity: { flex: 1, gap: 2 },
  role: { ...Typography.xs, color: Brand.colors.overlays.onPrimaryMuted },
  name: { ...Typography.bodyStrong, color: Brand.colors.onPrimary },
  iconBtn: {
    width: Brand.hitTarget,
    height: Brand.hitTarget,
    borderRadius: Brand.hitTarget / 2,
    backgroundColor: Brand.colors.overlays.onPrimaryChip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Brand.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Brand.colors.overlays.onPrimaryHairline,
    paddingTop: Brand.spacing.sm,
  },
  info: { ...Typography.xs, color: Brand.colors.overlays.onPrimaryFaint, flexShrink: 1 },
  dot: { ...Typography.xs, color: Brand.colors.overlays.onPrimaryMuted },
});
