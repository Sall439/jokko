import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Brand } from '@/constants/brand';

/** Écran d'attente : la garde de navigation (_layout.tsx) redirige selon la session et le rôle. */
export default function IndexScreen() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Brand.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.colors.background,
  },
});
