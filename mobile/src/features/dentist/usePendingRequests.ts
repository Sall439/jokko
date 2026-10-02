import { useMemo } from 'react';

import { resolveForPractitionerList, sortPendingRequests } from '@/utils/practitioner';
import type { Appointment } from '@/types/appointment';
import type { Patient } from '@/types/patient';
import type { Service } from '@/types/service';

/**
 * Demandes de rendez-vous à valider (écran « En attente »).
 *
 * Une demande « en attente » occupe une place dans l'agenda (A8.5) : la
 * compter avant confirmation évite de laisser le patient dans le vide.
 */

export interface PendingRequest {
  id: string;
  patientName: string;
  patientPhone: string;
  serviceName: string;
  startAt: string;
  endAt: string;
  motif?: string;
  /** Ancienneté de la demande, pour repérer les demandes forgotten. */
  waitingHours: number;
}

type Params = {
  appointments: Appointment[];
  services: Service[];
  patients: Patient[];
  now: Date;
};

export function usePendingRequests({ appointments, services, patients, now }: Params) {
  return useMemo(() => {
    const resolved = resolveForPractitionerList(appointments, patients, services);
    const pending = sortPendingRequests(resolved);

    return {
      requests: pending.map((appointment): PendingRequest => ({
        id: appointment.id,
        patientName: appointment.patientName,
        patientPhone: appointment.patientPhone,
        serviceName: appointment.serviceName,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        motif: appointment.motif,
        waitingHours: Math.floor(
          (now.getTime() - new Date(appointment.createdAt).getTime()) / (60 * 60 * 1000),
        ),
      })),
      count: pending.length,
    };
  }, [appointments, now, patients, services]);
}
