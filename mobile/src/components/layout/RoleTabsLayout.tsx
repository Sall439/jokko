import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { Brand, Typography } from '@/constants/brand';
import type { RoleTab } from '@/constants/role-tabs';

/**
 * Barre d'onglets partagée par les deux espaces. Le contenu de chaque onglet
 * est rendu par l'écran du dossier (écran mince, sans en-tête).
 */
export function RoleTabsLayout({ tabs }: { tabs: RoleTab[] }) {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.colors.primary,
        tabBarInactiveTintColor: Brand.colors.textMuted,
        tabBarStyle: {
          backgroundColor: Brand.colors.surface,
          borderTopColor: Brand.colors.border,
          height: 64,
          paddingTop: Brand.spacing.sm,
        },
        tabBarLabelStyle: { ...Typography.xs, fontSize: 11 },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => <Feather name={tab.icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
