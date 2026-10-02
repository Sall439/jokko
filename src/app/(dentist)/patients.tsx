import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Notice } from '@/components/ui/Notice';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';
import { PatientRow } from '@/components/domain/PatientRow';
import { usePractitioner } from '@/features/dentist/usePractitioner';
import { useTrackedPatients } from '@/features/dentist/useTrackedPatients';
import { Brand, Typography } from '@/constants/brand';

/**
 * Onglet « Patients » : annuaire des patients suivis par le praticien (B0).
 *
 * Ni dossier, ni antécédents, ni imagerie : seulement l'identité, le téléphone
 * et l'historique de rendez-vous, ce qui sert au moment de la consultation
 * (A3).
 */

const NO_SESSION = 'Votre compte n’est rattaché à aucune fiche praticien.';

export default function PatientsScreen() {
  const practitioner = usePractitioner();
  const tracked = useTrackedPatients(practitioner.dentistId);

  if (tracked.loading) {
    return (
      <Screen>
        <Skeleton height={70} variant="block" />
        <Skeleton height={70} variant="block" />
        <Skeleton height={70} variant="block" />
      </Screen>
    );
  }

  if (tracked.error) {
    return (
      <Screen>
        <ErrorState detail={tracked.error} onRetry={tracked.refresh} />
      </Screen>
    );
  }

  if (practitioner.unlinked) {
    return (
      <Screen>
        <Notice tone="danger" title="Compte non rattaché">
          {NO_SESSION}
        </Notice>
      </Screen>
    );
  }

  return (
    <Screen onRefresh={tracked.refresh} refreshing={tracked.refreshing}>
      {tracked.totalCount === 0 ? (
        <EmptyState
          icon="users"
          title="Aucun patient suivi"
          description="Les patients qui prendront rendez-vous avec vous apparaîtront ici."
        />
      ) : (
        <>
          <TextField
            label="Rechercher un patient"
            icon="search"
            placeholder="Nom, prénom ou téléphone"
            value={tracked.query}
            onChangeText={tracked.setQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />

          <Text style={styles.count}>
            {tracked.patients.length === tracked.totalCount
              ? `${tracked.totalCount} patient${tracked.totalCount > 1 ? 's' : ''}`
              : `${tracked.patients.length} sur ${tracked.totalCount} patients`}
          </Text>

          {tracked.patients.length === 0 ? (
            <EmptyState
              icon="search"
              title="Aucun résultat"
              description="Aucun patient ne correspond à cette recherche."
            />
          ) : (
            tracked.patients.map((patient) => <PatientRow key={patient.id} patient={patient} />)
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  count: { ...Typography.sm, color: Brand.colors.textMuted },
});
