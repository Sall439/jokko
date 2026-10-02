import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { useAuth } from '@/features/auth/useAuth';
import { useBrandFonts } from '@/features/fonts/useBrandFonts';
import { ROLE_GROUP, getHomeRouteForRole, isMobileRole } from '@/utils/roles';

/** Écran de chargement affiché tant que les polices de la charte ne sont pas prêtes. */
function FontsGate({ children }: { children: React.ReactNode }) {
  const { loaded } = useBrandFonts();

  if (!loaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Brand.colors.primary} />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * Garde de navigation (A6.2) :
 * - non connecté  → toujours la page vitrine `/(auth)/landing` ;
 * - connecté sur `(auth)` ou sur l'espace d'un autre rôle → renvoyé vers SON espace.
 * Un dentiste ne peut donc jamais atteindre `(patient)`, même en éditant l'URL.
 */
function RootNavigator() {
  const { status, user, signOut } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const group = segments[0] as string | undefined;

  useEffect(() => {
    if (status === 'loading') return;

    // Non connecté : la vitrine est le seul écran autorisé.
    if (!user) {
      if (group !== '(auth)') router.replace('/(auth)/landing');
      return;
    }

    // Défense en profondeur : le service de connexion refuse déjà un compte
    // `admin` sans créer de session (A2). Si une session admin existait
    // malgré tout (session restaurée, API modifiée), on la déconnecte.
    if (!isMobileRole(user.role)) {
      void signOut();
      return;
    }

    // Connecté mais sur `(auth)` ou sur l'espace de l'autre rôle → son espace.
    if (group !== ROLE_GROUP[user.role]) {
      router.replace(getHomeRouteForRole(user.role) as Href);
    }
  }, [status, user, group, router, signOut]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Brand.colors.background },
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <FontsGate>
        <RootNavigator />
      </FontsGate>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Brand.spacing.lg,
    backgroundColor: Brand.colors.background,
  },
  loadingText: {
    fontFamily: Brand.fonts.body,
    fontSize: Brand.fontSize.body,
    color: Brand.colors.textMuted,
  },
});
