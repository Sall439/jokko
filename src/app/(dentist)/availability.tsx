import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Notice } from '@/components/ui/Notice';
import { Skeleton } from '@/components/ui/Skeleton';
import { WorkingDayEditor } from '@/components/domain/WorkingDayEditor';
import { useAvailabilityEditor } from '@/features/dentist/useAvailabilityEditor';
import { usePractitioner } from '@/features/dentist/usePractitioner';
import { WEEKDAY_INDEXES } from '@/types/availability';
import { problemForDay, summarizeWeek } from '@/utils/availability-draft';
import { Brand, Typography } from '@/constants/brand';

/**
 * Onglet « Disponibilités » : plages de travail hebdomadaires (A8.2).
 *
 * Le praticien déclare les jours où il consulte et les pauses. Rien n'est
 * appliqué tant qu'il n'a pas enregistré : ces plages déterminent les créneaux
 * proposés aux patients, une erreur d'appui se verrait immédiatement.
 */

const NO_SESSION = 'Votre compte n’est rattaché à aucune fiche praticien.';

export default function AvailabilityScreen() {
  const practitioner = usePractitioner();
  const editor = useAvailabilityEditor(practitioner.dentistId);

  if (editor.loading) {
    return (
      <Screen>
        <Skeleton height={120} variant="block" />
        <Skeleton height={120} variant="block" />
        <Skeleton height={120} variant="block" />
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

  if (editor.error) {
    return (
      <Screen>
        <ErrorState detail={editor.error} onRetry={editor.reload} retrying={editor.loading} />
      </Screen>
    );
  }

  const draft = editor.draft;

  return (
    <Screen footer={<Footer editor={editor} />}>
      {editor.saved ? (
        <Notice tone="success">Vos disponibilités ont bien été enregistrées.</Notice>
      ) : null}

      {editor.dirty && !editor.saved ? (
        <Notice tone="warning">
          Modifications non enregistrées. Les patients voient encore votre planning précédent.
        </Notice>
      ) : null}

      {draft ? (
        <>
          <Text style={styles.summary}>{summarizeWeek(draft)}</Text>

          {WEEKDAY_INDEXES.map((weekday) => (
            <WorkingDayEditor
              key={weekday}
              weekday={weekday}
              day={draft[weekday]}
              problem={problemForDay(editor.problems, weekday)}
              onToggle={editor.onToggleDay}
              onChangeStart={(day, minutes) =>
                editor.onSetHours(day, minutes, draft[day]?.endMinutes ?? minutes)
              }
              onChangeEnd={(day, minutes) =>
                editor.onSetHours(day, draft[day]?.startMinutes ?? minutes, minutes)
              }
              onAddBreak={editor.onAddBreak}
              onChangeBreak={editor.onSetBreak}
              onRemoveBreak={editor.onRemoveBreak}
            />
          ))}

          {editor.problems
            .filter((problem) => problem.weekday === null)
            .map((problem) => (
              <Text key={problem.message} style={styles.globalProblem}>
                • {problem.message}
              </Text>
            ))}
        </>
      ) : null}
    </Screen>
  );
}

type Editor = ReturnType<typeof useAvailabilityEditor>;

function Footer({ editor }: { editor: Editor }) {
  return (
    <>
      <Button
        label="Annuler les modifications"
        variant="outline"
        icon="rotate-ccw"
        onPress={editor.onDiscard}
        disabled={!editor.dirty}
      />
      <Button
        label="Enregistrer"
        icon="check"
        onPress={() => void editor.save()}
        disabled={!editor.canSave}
        loading={editor.saving}
      />
    </>
  );
}

const styles = StyleSheet.create({
  summary: { ...Typography.h3, color: Brand.colors.primaryDark },
  globalProblem: { ...Typography.sm, color: Brand.colors.danger },
});
