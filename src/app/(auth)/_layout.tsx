import { Stack } from 'expo-router';

import { Brand } from '@/constants/brand';

/**
 * Écrans hors session. Aucune présentation modale : la vitrine est l'écran
 * d'entrée, la garde de navigation (`src/app/_layout.tsx`) gère les allers-retours.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Brand.colors.background },
      }}
    >
      <Stack.Screen name="landing" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
