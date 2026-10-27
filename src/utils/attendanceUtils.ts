import { AttendanceRecord, Athlete, TrainingSession, AbsenceJustification } from '../types';

export interface WeeklyAbsenceAlert {
  athlete: Athlete;
  consecutiveAbsences: number;
  absenceCount: number;
  pendingCount: number;
  justifiedCount: number;
}

export function getAthletesWithWeeklyAbsences(
  athletesOrAttendances: Athlete[] | AttendanceRecord[],
  attendancesOrAthletes?: AttendanceRecord[] | Athlete[],
  trainingSessions?: TrainingSession[],
  absenceJustifications?: AbsenceJustification[]
): WeeklyAbsenceAlert[] {
  let athletes: Athlete[] = [];
  let attendances: AttendanceRecord[] = [];

  if (Array.isArray(athletesOrAttendances) && athletesOrAttendances.length > 0) {
    if ('status' in athletesOrAttendances[0]) {
      attendances = athletesOrAttendances as AttendanceRecord[];
      athletes = (attendancesOrAthletes as Athlete[]) || [];
    } else {
      athletes = athletesOrAttendances as Athlete[];
      attendances = (attendancesOrAthletes as AttendanceRecord[]) || [];
    }
  }

  const result: WeeklyAbsenceAlert[] = [];

  for (const athlete of athletes) {
    if (athlete.status !== 'ATIVO') continue;

    const athleteAttendances = attendances.filter((att) => att.athlete_id === athlete.id);
    const absentRecords = athleteAttendances.filter((att) => !att.present);
    const justifiedIds = new Set(
      (absenceJustifications || [])
        .filter((j) => j.athlete_id === athlete.id)
        .map((j) => j.id)
    );

    const justifiedCount = absentRecords.filter(
      (att) => att.justification_id && justifiedIds.has(att.justification_id)
    ).length;
    const pendingCount = absentRecords.length - justifiedCount;

    if (absentRecords.length >= 2) {
      result.push({
        athlete,
        consecutiveAbsences: absentRecords.length,
        absenceCount: absentRecords.length,
        pendingCount,
        justifiedCount,
      });
    }
  }

  return result;
}
