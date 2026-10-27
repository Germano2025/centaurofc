import {
  SoccerClass,
  Responsible,
  Athlete,
  MonthlyFee,
  ExtraRevenue,
  TrainingSession,
  AttendanceRecord,
  AbsenceJustification,
  TrialLead,
  TrialClass,
  SportEvent,
  GameMatch,
  MatchParticipant,
  MatchGoal,
  TechnicalEvaluation,
  AthleteHistoryEvent,
  AthleteDocument,
  Negotiation,
} from '../types';

export const initialClasses: SoccerClass[] = [
  {
    id: 'c-1',
    name: 'Sub-09 (Iniciação)',
    category: 'Sub-09',
    age_group: '7 a 9 anos',
    schedule_days: ['Terça', 'Quinta'],
    schedule_time: '08:00 - 09:30',
    capacity_recommended: 25,
    active: true,
    coach_name: 'Prof. Rafael',
    location: 'Campo Principal CT Caxangá',
    created_at: new Date().toISOString(),
  },
  {
    id: 'c-2',
    name: 'Sub-11 (Fundamentos)',
    category: 'Sub-11',
    age_group: '10 e 11 anos',
    schedule_days: ['Segunda', 'Quarta', 'Sexta'],
    schedule_time: '15:30 - 17:00',
    capacity_recommended: 30,
    active: true,
    coach_name: 'Prof. Gabriel',
    location: 'Campo Principal CT Caxangá',
    created_at: new Date().toISOString(),
  },
  {
    id: 'c-3',
    name: 'Sub-13 (Desenvolvimento)',
    category: 'Sub-13',
    age_group: '12 e 13 anos',
    schedule_days: ['Terça', 'Quinta'],
    schedule_time: '16:00 - 17:30',
    capacity_recommended: 30,
    active: true,
    coach_name: 'Prof. Gabriel',
    location: 'Campo Principal CT Caxangá',
    created_at: new Date().toISOString(),
  },
  {
    id: 'c-4',
    name: 'Sub-15 (Competição)',
    category: 'Sub-15',
    age_group: '14 e 15 anos',
    schedule_days: ['Segunda', 'Quarta', 'Sexta'],
    schedule_time: '17:00 - 18:30',
    capacity_recommended: 30,
    active: true,
    coach_name: 'Prof. Marcelo',
    location: 'Campo Principal CT Caxangá',
    created_at: new Date().toISOString(),
  },
];

export const initialResponsibles: Responsible[] = [];
export const initialAthletes: Athlete[] = [];
export const initialLeads: TrialLead[] = [];
export const initialTrialClasses: TrialClass[] = [];
export const initialMonthlyFees: MonthlyFee[] = [];
export const initialExtraRevenues: ExtraRevenue[] = [];
export const initialNegotiations: Negotiation[] = [];
export const initialTrainingSessions: TrainingSession[] = [];
export const initialAttendances: AttendanceRecord[] = [];
export const initialAbsenceJustifications: AbsenceJustification[] = [];
export const initialEvents: SportEvent[] = [];
export const initialMatches: GameMatch[] = [];
export const initialMatchParticipants: MatchParticipant[] = [];
export const initialMatchGoals: MatchGoal[] = [];
export const initialEvaluations: TechnicalEvaluation[] = [];
export const initialHistoryEvents: AthleteHistoryEvent[] = [];
export const initialDocuments: AthleteDocument[] = [];
