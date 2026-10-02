import {
  emptyAvailability,
  type TimeRange,
  type WeeklyAvailability,
  type WeekdayIndex,
  type WorkingDay,
} from '@/types/availability';

/** DTO d'une plage horaire, en minutes depuis minuit, comme le modèle (A7). */
export interface TimeRangeDto {
  start_minutes: number;
  end_minutes: number;
}

/** DTO d'un jour ouvert. Les jours fermés sont absents de la liste. */
export interface WorkingDayDto {
  weekday: WeekdayIndex;
  start_minutes: number;
  end_minutes: number;
  breaks: TimeRangeDto[];
}

/** Enveloppe des disponibilités hebdomadaires renvoyée par l'API. */
export interface AvailabilityDto {
  days: WorkingDayDto[];
}

function mapRange(dto: TimeRangeDto): TimeRange {
  return { startMinutes: dto.start_minutes, endMinutes: dto.end_minutes };
}

function mapWorkingDay(dto: WorkingDayDto): WorkingDay {
  return {
    weekday: dto.weekday,
    startMinutes: dto.start_minutes,
    endMinutes: dto.end_minutes,
    breaks: (dto.breaks ?? []).map(mapRange),
  };
}

/**
 * Mappe les disponibilités renvoyées par l'API.
 *
 * Les jours fermés ne sont pas transmis : la semaine est donc reconstruite à
 * partir d'une semaine entièrement fermée, pour que l'application raisonne
 * toujours sur les sept jours comme le fait le reste du domaine.
 */
export function mapAvailabilityDto(dto: AvailabilityDto): WeeklyAvailability {
  const availability = emptyAvailability();

  for (const day of dto.days ?? []) {
    availability[day.weekday] = mapWorkingDay(day);
  }

  return availability;
}

/**
 * Sérialise les disponibilités vers l'API : seuls les jours ouverts sont
 * envoyés, ce qui évite d'avoir à distinguer « fermé » de « absent ».
 */
export function toAvailabilityPayload(availability: WeeklyAvailability): AvailabilityDto {
  const days = Object.values(availability).filter((day): day is WorkingDay => day !== null);

  return {
    days: days.map((day) => ({
      weekday: day.weekday,
      start_minutes: day.startMinutes,
      end_minutes: day.endMinutes,
      breaks: day.breaks.map((breakRange) => ({
        start_minutes: breakRange.startMinutes,
        end_minutes: breakRange.endMinutes,
      })),
    })),
  };
}
