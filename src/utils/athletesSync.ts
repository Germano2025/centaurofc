import { Athlete, Responsible, SoccerClass, MonthlyFee, AttendanceRecord, TrainingSession, AthleteDocument, AthleteHistoryEvent, ExtraRevenue, Negotiation } from '../types';

// ==================== ATHLETES ====================

export async function saveAthleteToServer(athlete: Athlete): Promise<boolean> {
  try {
    const res = await fetch('/api/athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(athlete),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SYNC] Could not post athlete to server API:', err);
    return false;
  }
}

export async function updateAthleteOnServer(id: string, updates: Partial<Athlete>): Promise<boolean> {
  try {
    const res = await fetch(`/api/athletes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[SYNC] Could not update athlete ${id} on server:`, err);
    return false;
  }
}

export async function deleteAthleteFromServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/athletes/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn(`[SYNC] Could not delete athlete ${id} from server:`, err);
    return false;
  }
}

export async function fetchServerAthletes(): Promise<Athlete[]> {
  try {
    const res = await fetch('/api/athletes');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.athletes || [];
    }
  } catch (err) {
    console.warn('[SYNC] Could not fetch athletes from server:', err);
  }
  return [];
}

export async function syncAthletesToServer(athletes: Athlete[]): Promise<boolean> {
  try {
    const res = await fetch('/api/athletes/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athletes }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SYNC] Could not sync athletes to server:', err);
    return false;
  }
}

// ==================== RESPONSIBLES ====================

export async function saveResponsibleToServer(responsible: Responsible): Promise<boolean> {
  try {
    const res = await fetch('/api/responsibles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responsible),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SYNC] Could not post responsible to server:', err);
    return false;
  }
}

export async function fetchServerResponsibles(): Promise<Responsible[]> {
  try {
    const res = await fetch('/api/responsibles');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.responsibles || [];
    }
  } catch (err) {
    console.warn('[SYNC] Could not fetch responsibles from server:', err);
  }
  return [];
}

// ==================== CLASSES ====================

export async function saveClassToServer(soccerClass: SoccerClass): Promise<boolean> {
  try {
    const res = await fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(soccerClass),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SYNC] Could not save class to server:', err);
    return false;
  }
}

export async function updateClassOnServer(id: string, updates: Partial<SoccerClass>): Promise<boolean> {
  try {
    const res = await fetch(`/api/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[SYNC] Could not update class ${id} on server:`, err);
    return false;
  }
}

export async function deleteClassFromServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/classes/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn(`[SYNC] Could not delete class ${id} from server:`, err);
    return false;
  }
}

export async function fetchServerClasses(): Promise<SoccerClass[]> {
  try {
    const res = await fetch('/api/classes');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.classes || [];
    }
  } catch (err) {
    console.warn('[SYNC] Could not fetch classes from server:', err);
  }
  return [];
}

export async function syncClassesToServer(classes: SoccerClass[]): Promise<boolean> {
  try {
    const res = await fetch('/api/classes/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classes }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SYNC] Could not sync classes to server:', err);
    return false;
  }
}

// ==================== MONTHLY FEES ====================

export async function saveMonthlyFeeToServer(fee: MonthlyFee): Promise<boolean> {
  try {
    const res = await fetch('/api/monthly-fees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fee),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SYNC] Could not post monthly fee to server:', err);
    return false;
  }
}

export async function updateMonthlyFeeOnServer(id: string, updates: Partial<MonthlyFee>): Promise<boolean> {
  try {
    const res = await fetch(`/api/monthly-fees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[SYNC] Could not update monthly fee ${id} on server:`, err);
    return false;
  }
}

export async function fetchServerMonthlyFees(): Promise<MonthlyFee[]> {
  try {
    const res = await fetch('/api/monthly-fees');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.monthlyFees || [];
    }
  } catch (err) {
    console.warn('[SYNC] Could not fetch monthly fees from server:', err);
  }
  return [];
}

export async function syncMonthlyFeesToServer(monthlyFees: MonthlyFee[]): Promise<boolean> {
  try {
    const res = await fetch('/api/monthly-fees/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthlyFees }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SYNC] Could not sync monthly fees to server:', err);
    return false;
  }
}

// ==================== ATTENDANCES & SESSIONS ====================

export async function saveAttendanceToServer(attendance: AttendanceRecord): Promise<boolean> {
  try {
    const res = await fetch('/api/attendances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendance),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SYNC] Could not post attendance to server:', err);
    return false;
  }
}

export async function fetchServerAttendances(): Promise<AttendanceRecord[]> {
  try {
    const res = await fetch('/api/attendances');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.attendances || [];
    }
  } catch (err) {
    console.warn('[SYNC] Could not fetch attendances from server:', err);
  }
  return [];
}

export async function saveTrainingSessionToServer(session: TrainingSession): Promise<boolean> {
  try {
    const res = await fetch('/api/training-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SYNC] Could not post training session to server:', err);
    return false;
  }
}

export async function fetchServerTrainingSessions(): Promise<TrainingSession[]> {
  try {
    const res = await fetch('/api/training-sessions');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.trainingSessions || [];
    }
  } catch (err) {
    console.warn('[SYNC] Could not fetch training sessions from server:', err);
  }
  return [];
}

// ==================== DOCUMENTS & HISTORY ====================

export async function saveDocumentToServer(doc: AthleteDocument): Promise<boolean> {
  try {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(doc),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SYNC] Could not save document to server:', err);
    return false;
  }
}

export async function deleteDocumentFromServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/documents/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn(`[SYNC] Could not delete document ${id} from server:`, err);
    return false;
  }
}

export async function fetchServerDocuments(): Promise<AthleteDocument[]> {
  try {
    const res = await fetch('/api/documents');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.documents || [];
    }
  } catch (err) {
    console.warn('[SYNC] Could not fetch documents from server:', err);
  }
  return [];
}

export async function saveHistoryEventToServer(event: AthleteHistoryEvent): Promise<boolean> {
  try {
    const res = await fetch('/api/history-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SYNC] Could not post history event to server:', err);
    return false;
  }
}

export async function fetchServerHistoryEvents(): Promise<AthleteHistoryEvent[]> {
  try {
    const res = await fetch('/api/history-events');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.historyEvents || [];
    }
  } catch (err) {
    console.warn('[SYNC] Could not fetch history events from server:', err);
  }
  return [];
}

// ==================== EXTRA REVENUES & NEGOTIATIONS ====================

export async function saveExtraRevenueToServer(rev: ExtraRevenue): Promise<boolean> {
  try {
    const res = await fetch('/api/extra-revenues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rev),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SYNC] Could not post extra revenue to server:', err);
    return false;
  }
}

export async function deleteExtraRevenueFromServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/extra-revenues/${id}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.warn(`[SYNC] Could not delete extra revenue ${id} from server:`, err);
    return false;
  }
}

export async function fetchServerExtraRevenues(): Promise<ExtraRevenue[]> {
  try {
    const res = await fetch('/api/extra-revenues');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.extraRevenues || [];
    }
  } catch (err) {
    console.warn('[SYNC] Could not fetch extra revenues from server:', err);
  }
  return [];
}

export async function saveNegotiationToServer(neg: Negotiation): Promise<boolean> {
  try {
    const res = await fetch('/api/negotiations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(neg),
    });
    return res.ok;
  } catch (err) {
    console.warn('[SYNC] Could not post negotiation to server:', err);
    return false;
  }
}

export async function updateNegotiationOnServer(id: string, updates: Partial<Negotiation>): Promise<boolean> {
  try {
    const res = await fetch(`/api/negotiations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[SYNC] Could not update negotiation ${id} on server:`, err);
    return false;
  }
}

export async function fetchServerNegotiations(): Promise<Negotiation[]> {
  try {
    const res = await fetch('/api/negotiations');
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : data.negotiations || [];
    }
  } catch (err) {
    console.warn('[SYNC] Could not fetch negotiations from server:', err);
  }
  return [];
}
