import {
  UNKNOWN_DENTIST_NAME,
  UNKNOWN_PATIENT_NAME,
  UNKNOWN_SERVICE_NAME,
  resolveAppointment,
  resolveAppointments,
} from '@/utils/appointment-references';
import type { AppointmentReferences } from '@/utils/appointment-references';
import type { Appointment } from '@/types/appointment';
import type { Dentist } from '@/types/dentist';
import type { Service } from '@/types/service';

/**
 * Résolution des libellés d'un rendez-vous : un service REST renvoie des
 * identifiants, un écran a besoin de textes. Toute la logique de résolution
 * est ici, jamais dans un écran (A5).
 */

const SERVICES: Service[] = [
  {
    id: 'service-detartrage',
    name: 'Détartrage',
    category: 'Prevention',
    description: 'Nettoyage complet des dents.',
    durationMinutes: 30,
    priceFcfa: 25000,
  },
  {
    id: 'service-consultation',
    name: 'Consultation',
    category: 'Urgence',
    description: 'Examen clinique et diagnostic.',
    durationMinutes: 30,
    priceFcfa: 15000,
  },
];

const DENTISTS: Dentist[] = [
  {
    id: 'dentist-ndiaye',
    firstName: 'Aminata',
    lastName: 'Ndiaye',
    specialty: 'Dentiste généraliste',
    rating: 4.8,
  },
  {
    id: 'dentist-fall',
    firstName: 'Ousmane',
    lastName: 'Fall',
    specialty: 'Chirurgien-dentiste',
    rating: 4.6,
  },
];

const REFERENCES: AppointmentReferences = {
  services: SERVICES,
  dentists: DENTISTS,
  patients: [{ id: 'patient-moussa', firstName: 'Moussa', lastName: 'Diop' }],
};

/** Lundi 5 octobre 2026 à 09:00. */
const START = new Date(2026, 9, 5, 9, 0, 0, 0);

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'rdv-1',
    patientId: 'patient-moussa',
    dentistId: 'dentist-ndiaye',
    serviceId: 'service-detartrage',
    startAt: START.toISOString(),
    endAt: new Date(2026, 9, 5, 9, 30).toISOString(),
    status: 'en_attente',
    createdAt: START.toISOString(),
    updatedAt: START.toISOString(),
    ...overrides,
  };
}

describe('resolveAppointment', () => {
  it('résout les trois libellés', () => {
    const resolved = resolveAppointment(appointment(), REFERENCES);

    expect(resolved.serviceName).toBe('Détartrage');
    expect(resolved.dentistName).toBe('Dr. Aminata Ndiaye');
    expect(resolved.patientName).toBe('Moussa Diop');
  });

  it('conserve tous les champs d’origine', () => {
    const source = appointment({ motif: 'douleur' });
    const resolved = resolveAppointment(source, REFERENCES);

    expect(resolved).toMatchObject({
      id: source.id,
      status: source.status,
      startAt: source.startAt,
      endAt: source.endAt,
      motif: 'douleur',
    });
  });

  it('ne signale aucun soin manquant quand tout est résolu', () => {
    expect(resolveAppointment(appointment(), REFERENCES).serviceMissing).toBe(false);
  });

  it('retombe sur un libellé neutre si le soin a disparu du catalogue', () => {
    // Le catalogue a pu changer côté API : l'écran doit le dire, pas planter.
    const resolved = resolveAppointment(appointment({ serviceId: 'service-supprime' }), REFERENCES);

    expect(resolved.serviceName).toBe(UNKNOWN_SERVICE_NAME);
    expect(resolved.serviceMissing).toBe(true);
  });

  it('retombe sur un libellé neutre si le praticien a disparu', () => {
    const resolved = resolveAppointment(appointment({ dentistId: 'dentist-inconnu' }), REFERENCES);

    expect(resolved.dentistName).toBe(UNKNOWN_DENTIST_NAME);
  });

  it('retombe sur un libellé neutre si le patient n’est pas dans les références', () => {
    const resolved = resolveAppointment(appointment({ patientId: 'patient-inconnu' }), REFERENCES);

    expect(resolved.patientName).toBe(UNKNOWN_PATIENT_NAME);
  });

  it('ne lève jamais, même avec des références vides', () => {
    const resolved = resolveAppointment(appointment(), {
      services: [],
      dentists: [],
      patients: [],
    });

    expect(resolved.serviceName).toBe(UNKNOWN_SERVICE_NAME);
    expect(resolved.dentistName).toBe(UNKNOWN_DENTIST_NAME);
    expect(resolved.patientName).toBe(UNKNOWN_PATIENT_NAME);
    expect(resolved.serviceMissing).toBe(true);
  });

  it('choisit le bon soin quand plusieurs soins partagent la même catégorie', () => {
    const resolved = resolveAppointment(
      appointment({ serviceId: 'service-consultation' }),
      REFERENCES,
    );

    expect(resolved.serviceName).toBe('Consultation');
    expect(resolved.serviceMissing).toBe(false);
  });
});

describe('resolveAppointments', () => {
  it('résout une liste entière', () => {
    const list = [
      appointment({ id: 'rdv-1' }),
      appointment({ id: 'rdv-2', serviceId: 'service-consultation', dentistId: 'dentist-fall' }),
    ];

    expect(resolveAppointments(list, REFERENCES).map((item) => item.serviceName)).toEqual([
      'Détartrage',
      'Consultation',
    ]);
  });

  it('renvoie une liste vide pour une entrée vide', () => {
    expect(resolveAppointments([], REFERENCES)).toEqual([]);
  });

  it('conserve l’ordre de la liste source', () => {
    const list = [
      appointment({ id: 'rdv-b' }),
      appointment({ id: 'rdv-a' }),
      appointment({ id: 'rdv-c' }),
    ];

    expect(resolveAppointments(list, REFERENCES).map((item) => item.id)).toEqual([
      'rdv-b',
      'rdv-a',
      'rdv-c',
    ]);
  });
});
