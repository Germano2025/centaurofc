import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  getLeadsFromDb,
  saveLeadToDb,
  updateLeadInDb,
  deleteLeadFromDb,
  getTrialClassesFromDb,
  saveTrialClassToDb,
  deleteTrialClassFromDb,
} from './src/db/leads.ts';
import {
  getAthletesFromDb,
  saveAthleteToDb,
  updateAthleteInDb,
  deleteAthleteFromDb,
  bulkInsertAthletes,
  clearDatabaseDemo,
  getDatabaseStats,
} from './src/db/athletes.ts';
import {
  getClassesFromDb,
  saveClassToDb,
  updateClassInDb,
  deleteClassFromDb,
} from './src/db/classes.ts';
import { getOrCreateUser } from './src/db/users.ts';
import { requireAuth } from './src/middleware/auth.ts';
import { initialClasses, initialResponsibles } from './src/lib/mockData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

// Data directory for disk caching / redundancy
const DATA_DIR = path.join(process.cwd(), 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const ATHLETES_FILE = path.join(DATA_DIR, 'athletes.json');
const RESPONSIBLES_FILE = path.join(DATA_DIR, 'responsibles.json');
const CLASSES_FILE = path.join(DATA_DIR, 'classes.json');
const MONTHLY_FEES_FILE = path.join(DATA_DIR, 'monthly_fees.json');
const ATTENDANCES_FILE = path.join(DATA_DIR, 'attendances.json');
const TRAINING_SESSIONS_FILE = path.join(DATA_DIR, 'training_sessions.json');
const HISTORY_EVENTS_FILE = path.join(DATA_DIR, 'history_events.json');
const DOCUMENTS_FILE = path.join(DATA_DIR, 'documents.json');
const EXTRA_REVENUES_FILE = path.join(DATA_DIR, 'extra_revenues.json');
const NEGOTIATIONS_FILE = path.join(DATA_DIR, 'negotiations.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

// Helpers for Disk Cache
function loadJsonFromDisk(filePath: string): any[] {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return [];
}

function saveJsonToDisk(filePath: string, data: any[]) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
  }
}

let serverLeads: any[] = loadJsonFromDisk(LEADS_FILE);
let serverAthletes: any[] = loadJsonFromDisk(ATHLETES_FILE);
let serverResponsibles: any[] = loadJsonFromDisk(RESPONSIBLES_FILE);
let serverClasses: any[] = loadJsonFromDisk(CLASSES_FILE);
let serverMonthlyFees: any[] = loadJsonFromDisk(MONTHLY_FEES_FILE);
let serverAttendances: any[] = loadJsonFromDisk(ATTENDANCES_FILE);
let serverTrainingSessions: any[] = loadJsonFromDisk(TRAINING_SESSIONS_FILE);
let serverHistoryEvents: any[] = loadJsonFromDisk(HISTORY_EVENTS_FILE);
let serverDocuments: any[] = loadJsonFromDisk(DOCUMENTS_FILE);
let serverExtraRevenues: any[] = loadJsonFromDisk(EXTRA_REVENUES_FILE);
let serverNegotiations: any[] = loadJsonFromDisk(NEGOTIATIONS_FILE);

function mapDbLeadToClient(row: any) {
  return {
    id: row.id,
    athlete_name: row.athleteName,
    athlete_birth_date: row.athleteBirthDate,
    responsible_name: row.responsibleName,
    responsible_phone: row.responsiblePhone,
    responsible_email: row.responsibleEmail,
    responsible_relationship: row.responsibleRelationship,
    interest_class_name: row.interestClassName,
    source: row.source,
    stage: row.stage,
    notes: row.notes,
    entry_date: row.entryDate,
    last_activity_date: row.lastActivityDate,
    converted_athlete_id: row.convertedAthleteId,
    timeline: row.timeline || [],
    created_at: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
  };
}

function mapDbTrialClassToClient(row: any) {
  return {
    id: row.id,
    lead_id: row.leadId,
    athlete_name: row.athleteName,
    class_id: row.classId,
    class_name: row.className,
    class_date: row.classDate,
    class_time: row.classTime,
    location: row.location,
    status: row.status,
    feedback_decision: row.feedbackDecision,
    feedback_notes: row.feedbackNotes,
    cancellation_reason: row.cancellationReason,
    notes: row.notes,
    registered_by: row.registeredBy,
  };
}

function mapDbAthleteToClient(row: any) {
  return {
    id: row.id,
    name: row.name,
    birth_date: row.birthDate,
    category: row.category,
    current_class_id: row.classId,
    class_id: row.classId,
    class_name: row.className,
    status: row.status,
    financial_condition: row.financialCondition,
    custom_monthly_fee: row.monthlyFee ? Number(row.monthlyFee) : 150,
    photo_url: row.photoUrl,
    created_at: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
  };
}

function mapDbClassToClient(row: any) {
  let scheduleDays = ['Segunda', 'Quarta', 'Sexta'];
  if (typeof row.scheduleDays === 'string') {
    scheduleDays = row.scheduleDays.split(',').map((s: string) => s.trim()).filter(Boolean);
  } else if (Array.isArray(row.scheduleDays)) {
    scheduleDays = row.scheduleDays;
  }
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    age_group: row.ageGroup || '',
    schedule_days: scheduleDays,
    schedule_time: row.scheduleTime || '08:00 - 09:30',
    capacity_recommended: row.capacityRecommended || 30,
    active: row.active ?? true,
    coach_name: row.coachName || '',
    location: row.location || 'Campo Principal',
    created_at: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
  };
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    database: process.env.SQL_DB_NAME ? 'connected' : 'local',
  });
});

// ==================== ATHLETES API ====================

app.get('/api/athletes', async (req, res) => {
  try {
    const dbRows = await getAthletesFromDb();
    if (dbRows && dbRows.length > 0) {
      const clientAthletes = dbRows.map(mapDbAthleteToClient);
      serverAthletes = clientAthletes;
      saveJsonToDisk(ATHLETES_FILE, serverAthletes);
      return res.json({ athletes: clientAthletes, count: clientAthletes.length, source: 'database' });
    }

    const diskAthletes = loadJsonFromDisk(ATHLETES_FILE);
    if (diskAthletes.length > 0) {
      for (const ath of diskAthletes) {
        await saveAthleteToDb(ath).catch(() => {});
      }
      return res.json({ athletes: diskAthletes, count: diskAthletes.length, source: 'seeded_to_db' });
    }

    return res.json({ athletes: [], count: 0 });
  } catch (err: any) {
    console.warn('[SERVER] Athletes query fallback to disk cache:', err?.message);
    serverAthletes = loadJsonFromDisk(ATHLETES_FILE);
    return res.json({ athletes: serverAthletes, count: serverAthletes.length, source: 'cache_fallback' });
  }
});

app.post('/api/athletes', async (req, res) => {
  try {
    const newAthlete = req.body;
    if (!newAthlete || !newAthlete.name) {
      return res.status(400).json({ error: 'Nome do atleta é obrigatório' });
    }

    const athleteToSave = {
      ...newAthlete,
      id: newAthlete.id || `a-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: newAthlete.status || 'ATIVO',
      created_at: newAthlete.created_at || new Date().toISOString(),
    };

    // Save to Database
    try {
      await saveAthleteToDb(athleteToSave);
    } catch (dbErr) {
      console.warn('[SERVER] DB save athlete warning, keeping in cache:', dbErr);
    }

    // Update disk cache
    serverAthletes = loadJsonFromDisk(ATHLETES_FILE);
    const existingIndex = serverAthletes.findIndex((a) => a.id === athleteToSave.id);
    if (existingIndex >= 0) {
      serverAthletes[existingIndex] = { ...serverAthletes[existingIndex], ...athleteToSave };
    } else {
      serverAthletes.unshift(athleteToSave);
    }
    saveJsonToDisk(ATHLETES_FILE, serverAthletes);

    res.status(201).json({ success: true, athlete: athleteToSave, count: serverAthletes.length });
  } catch (err: any) {
    console.error('Error saving athlete:', err);
    res.status(500).json({ error: 'Erro ao salvar atleta', message: err.message });
  }
});

app.put('/api/athletes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    try {
      await updateAthleteInDb(id, updates);
    } catch (dbErr) {
      console.warn('[SERVER] DB update athlete warning:', dbErr);
    }

    serverAthletes = loadJsonFromDisk(ATHLETES_FILE);
    const index = serverAthletes.findIndex((a) => a.id === id);
    if (index !== -1) {
      serverAthletes[index] = { ...serverAthletes[index], ...updates, updated_at: new Date().toISOString() };
      saveJsonToDisk(ATHLETES_FILE, serverAthletes);
      return res.json({ success: true, athlete: serverAthletes[index] });
    }

    res.json({ success: true, athlete: updates });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar atleta', message: err.message });
  }
});

app.delete('/api/athletes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID do atleta é obrigatório' });

    try {
      await deleteAthleteFromDb(id);
    } catch (dbErr) {
      console.warn('[SERVER] DB delete athlete warning:', dbErr);
    }

    serverAthletes = loadJsonFromDisk(ATHLETES_FILE);
    serverAthletes = serverAthletes.filter((a) => a.id !== id);
    saveJsonToDisk(ATHLETES_FILE, serverAthletes);

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao excluir atleta', message: err.message });
  }
});

app.post('/api/athletes/sync', async (req, res) => {
  try {
    const { athletes: clientAthletes } = req.body;
    if (!Array.isArray(clientAthletes)) {
      return res.status(400).json({ error: 'Array de atletas esperado' });
    }

    for (const ath of clientAthletes) {
      try {
        await saveAthleteToDb(ath);
      } catch {}
    }

    serverAthletes = loadJsonFromDisk(ATHLETES_FILE);
    const map = new Map<string, any>();
    for (const a of serverAthletes) {
      if (a.id) map.set(a.id, a);
    }
    for (const clientA of clientAthletes) {
      if (clientA.id) {
        if (!map.has(clientA.id)) {
          map.set(clientA.id, clientA);
        } else {
          const existing = map.get(clientA.id);
          map.set(clientA.id, { ...existing, ...clientA });
        }
      }
    }
    serverAthletes = Array.from(map.values());
    saveJsonToDisk(ATHLETES_FILE, serverAthletes);

    res.json({ success: true, count: serverAthletes.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro na sincronização de atletas', message: err.message });
  }
});

app.post('/api/athletes/bulk', async (req, res) => {
  try {
    const { athletes: athletesList } = req.body;
    if (!Array.isArray(athletesList)) {
      return res.status(400).json({ error: 'Array de atletas esperado' });
    }
    const inserted = await bulkInsertAthletes(athletesList);
    res.status(201).json({ success: true, count: inserted.length, athletes: inserted });
  } catch (err: any) {
    console.error('Bulk insert athletes error:', err);
    res.status(500).json({ error: 'Erro ao salvar atletas no banco', message: err.message });
  }
});

// ==================== RESPONSIBLES API ====================

app.get('/api/responsibles', (req, res) => {
  serverResponsibles = loadJsonFromDisk(RESPONSIBLES_FILE);
  res.json({ responsibles: serverResponsibles, count: serverResponsibles.length });
});

app.post('/api/responsibles', (req, res) => {
  try {
    const newResp = req.body;
    if (!newResp || !newResp.name) {
      return res.status(400).json({ error: 'Nome do responsável é obrigatório' });
    }
    const respToSave = {
      ...newResp,
      id: newResp.id || `r-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: newResp.created_at || new Date().toISOString(),
    };

    serverResponsibles = loadJsonFromDisk(RESPONSIBLES_FILE);
    const existingIdx = serverResponsibles.findIndex((r) => r.id === respToSave.id);
    if (existingIdx >= 0) {
      serverResponsibles[existingIdx] = { ...serverResponsibles[existingIdx], ...respToSave };
    } else {
      serverResponsibles.unshift(respToSave);
    }
    saveJsonToDisk(RESPONSIBLES_FILE, serverResponsibles);

    res.status(201).json({ success: true, responsible: respToSave });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar responsável', message: err.message });
  }
});

app.put('/api/responsibles/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    serverResponsibles = loadJsonFromDisk(RESPONSIBLES_FILE);
    const idx = serverResponsibles.findIndex((r) => r.id === id);
    if (idx !== -1) {
      serverResponsibles[idx] = { ...serverResponsibles[idx], ...updates, updated_at: new Date().toISOString() };
      saveJsonToDisk(RESPONSIBLES_FILE, serverResponsibles);
      return res.json({ success: true, responsible: serverResponsibles[idx] });
    }
    res.json({ success: true, responsible: updates });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar responsável', message: err.message });
  }
});

app.delete('/api/responsibles/:id', (req, res) => {
  try {
    const { id } = req.params;
    serverResponsibles = loadJsonFromDisk(RESPONSIBLES_FILE);
    serverResponsibles = serverResponsibles.filter((r) => r.id !== id);
    saveJsonToDisk(RESPONSIBLES_FILE, serverResponsibles);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao excluir responsável', message: err.message });
  }
});

app.post('/api/responsibles/sync', (req, res) => {
  try {
    const { responsibles: clientList } = req.body;
    if (!Array.isArray(clientList)) {
      return res.status(400).json({ error: 'Array de responsáveis esperado' });
    }

    serverResponsibles = loadJsonFromDisk(RESPONSIBLES_FILE);
    const map = new Map<string, any>();
    for (const r of serverResponsibles) {
      if (r.id) map.set(r.id, r);
    }
    for (const cr of clientList) {
      if (cr.id) {
        if (!map.has(cr.id)) {
          map.set(cr.id, cr);
        } else {
          const existing = map.get(cr.id);
          map.set(cr.id, { ...existing, ...cr });
        }
      }
    }
    serverResponsibles = Array.from(map.values());
    saveJsonToDisk(RESPONSIBLES_FILE, serverResponsibles);

    res.json({ success: true, count: serverResponsibles.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao sincronizar responsáveis', message: err.message });
  }
});

// ==================== CLASSES API ====================

app.get('/api/classes', async (req, res) => {
  try {
    const dbRows = await getClassesFromDb();
    if (dbRows && dbRows.length > 0) {
      const clientClasses = dbRows.map(mapDbClassToClient);
      serverClasses = clientClasses;
      saveJsonToDisk(CLASSES_FILE, serverClasses);
      return res.json({ classes: clientClasses, count: clientClasses.length, source: 'database' });
    }

    const diskClasses = loadJsonFromDisk(CLASSES_FILE);
    if (diskClasses.length > 0) {
      for (const cls of diskClasses) {
        await saveClassToDb(cls).catch(() => {});
      }
      return res.json({ classes: diskClasses, count: diskClasses.length, source: 'disk' });
    }

    if (initialClasses && initialClasses.length > 0) {
      for (const cls of initialClasses) {
        await saveClassToDb(cls).catch(() => {});
      }
      serverClasses = initialClasses;
      saveJsonToDisk(CLASSES_FILE, serverClasses);
      return res.json({ classes: initialClasses, count: initialClasses.length, source: 'seeded_initial' });
    }

    return res.json({ classes: [], count: 0 });
  } catch (err: any) {
    serverClasses = loadJsonFromDisk(CLASSES_FILE);
    return res.json({ classes: serverClasses, count: serverClasses.length, source: 'cache_fallback' });
  }
});

app.post('/api/classes', async (req, res) => {
  try {
    const newClass = req.body;
    if (!newClass || !newClass.name) {
      return res.status(400).json({ error: 'Nome da turma é obrigatório' });
    }
    const classToSave = {
      ...newClass,
      id: newClass.id || `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: newClass.created_at || new Date().toISOString(),
    };

    try {
      await saveClassToDb(classToSave);
    } catch (dbErr) {
      console.warn('[SERVER] DB save class warning:', dbErr);
    }

    serverClasses = loadJsonFromDisk(CLASSES_FILE);
    const existingIndex = serverClasses.findIndex((c) => c.id === classToSave.id);
    if (existingIndex >= 0) {
      serverClasses[existingIndex] = { ...serverClasses[existingIndex], ...classToSave };
    } else {
      serverClasses.push(classToSave);
    }
    saveJsonToDisk(CLASSES_FILE, serverClasses);

    res.status(201).json({ success: true, soccerClass: classToSave });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar turma', message: err.message });
  }
});

app.put('/api/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    try {
      await updateClassInDb(id, updates);
    } catch (dbErr) {
      console.warn('[SERVER] DB update class warning:', dbErr);
    }

    serverClasses = loadJsonFromDisk(CLASSES_FILE);
    const index = serverClasses.findIndex((c) => c.id === id);
    if (index !== -1) {
      serverClasses[index] = { ...serverClasses[index], ...updates };
      saveJsonToDisk(CLASSES_FILE, serverClasses);
      return res.json({ success: true, soccerClass: serverClasses[index] });
    }

    res.json({ success: true, soccerClass: updates });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar turma', message: err.message });
  }
});

app.delete('/api/classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    try {
      await deleteClassFromDb(id);
    } catch (dbErr) {
      console.warn('[SERVER] DB delete class warning:', dbErr);
    }

    serverClasses = loadJsonFromDisk(CLASSES_FILE);
    serverClasses = serverClasses.filter((c) => c.id !== id);
    saveJsonToDisk(CLASSES_FILE, serverClasses);

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao excluir turma', message: err.message });
  }
});

app.post('/api/classes/sync', async (req, res) => {
  try {
    const { classes: clientClasses } = req.body;
    if (!Array.isArray(clientClasses)) {
      return res.status(400).json({ error: 'Array de turmas esperado' });
    }

    for (const c of clientClasses) {
      try {
        await saveClassToDb(c);
      } catch {}
    }

    serverClasses = loadJsonFromDisk(CLASSES_FILE);
    const map = new Map<string, any>();
    for (const c of serverClasses) {
      if (c.id) map.set(c.id, c);
    }
    for (const cc of clientClasses) {
      if (cc.id) {
        if (!map.has(cc.id)) {
          map.set(cc.id, cc);
        } else {
          const existing = map.get(cc.id);
          map.set(cc.id, { ...existing, ...cc });
        }
      }
    }
    serverClasses = Array.from(map.values());
    saveJsonToDisk(CLASSES_FILE, serverClasses);

    res.json({ success: true, count: serverClasses.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao sincronizar turmas', message: err.message });
  }
});

// ==================== FINANCIAL / MONTHLY FEES API ====================

app.get('/api/monthly-fees', (req, res) => {
  serverMonthlyFees = loadJsonFromDisk(MONTHLY_FEES_FILE);
  res.json({ monthlyFees: serverMonthlyFees, count: serverMonthlyFees.length });
});

app.post('/api/monthly-fees', (req, res) => {
  try {
    const newFee = req.body;
    if (!newFee || !newFee.athlete_id) {
      return res.status(400).json({ error: 'Dados da mensalidade incompletos' });
    }
    const feeToSave = {
      ...newFee,
      id: newFee.id || `mf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: newFee.created_at || new Date().toISOString(),
    };

    serverMonthlyFees = loadJsonFromDisk(MONTHLY_FEES_FILE);
    const existingIdx = serverMonthlyFees.findIndex((f) => f.id === feeToSave.id);
    if (existingIdx >= 0) {
      serverMonthlyFees[existingIdx] = { ...serverMonthlyFees[existingIdx], ...feeToSave };
    } else {
      serverMonthlyFees.unshift(feeToSave);
    }
    saveJsonToDisk(MONTHLY_FEES_FILE, serverMonthlyFees);

    res.status(201).json({ success: true, monthlyFee: feeToSave });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar mensalidade', message: err.message });
  }
});

app.put('/api/monthly-fees/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    serverMonthlyFees = loadJsonFromDisk(MONTHLY_FEES_FILE);
    const idx = serverMonthlyFees.findIndex((f) => f.id === id);
    if (idx !== -1) {
      serverMonthlyFees[idx] = { ...serverMonthlyFees[idx], ...updates, updated_at: new Date().toISOString() };
      saveJsonToDisk(MONTHLY_FEES_FILE, serverMonthlyFees);
      return res.json({ success: true, monthlyFee: serverMonthlyFees[idx] });
    }
    res.json({ success: true, monthlyFee: updates });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar mensalidade', message: err.message });
  }
});

app.delete('/api/monthly-fees/:id', (req, res) => {
  try {
    const { id } = req.params;
    serverMonthlyFees = loadJsonFromDisk(MONTHLY_FEES_FILE);
    serverMonthlyFees = serverMonthlyFees.filter((f) => f.id !== id);
    saveJsonToDisk(MONTHLY_FEES_FILE, serverMonthlyFees);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao excluir mensalidade', message: err.message });
  }
});

app.post('/api/monthly-fees/sync', (req, res) => {
  try {
    const { monthlyFees: clientFees } = req.body;
    if (!Array.isArray(clientFees)) {
      return res.status(400).json({ error: 'Array de mensalidades esperado' });
    }
    serverMonthlyFees = loadJsonFromDisk(MONTHLY_FEES_FILE);
    const map = new Map<string, any>();
    for (const f of serverMonthlyFees) {
      if (f.id) map.set(f.id, f);
    }
    for (const cf of clientFees) {
      if (cf.id) {
        if (!map.has(cf.id)) {
          map.set(cf.id, cf);
        } else {
          const existing = map.get(cf.id);
          map.set(cf.id, { ...existing, ...cf });
        }
      }
    }
    serverMonthlyFees = Array.from(map.values());
    saveJsonToDisk(MONTHLY_FEES_FILE, serverMonthlyFees);
    res.json({ success: true, count: serverMonthlyFees.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao sincronizar mensalidades', message: err.message });
  }
});

// ==================== ATTENDANCES & TRAINING SESSIONS ====================

app.get('/api/attendances', (req, res) => {
  serverAttendances = loadJsonFromDisk(ATTENDANCES_FILE);
  res.json({ attendances: serverAttendances, count: serverAttendances.length });
});

app.post('/api/attendances', (req, res) => {
  try {
    const att = req.body;
    const attToSave = {
      ...att,
      id: att.id || `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: att.created_at || new Date().toISOString(),
    };
    serverAttendances = loadJsonFromDisk(ATTENDANCES_FILE);
    serverAttendances.unshift(attToSave);
    saveJsonToDisk(ATTENDANCES_FILE, serverAttendances);
    res.status(201).json({ success: true, attendance: attToSave });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar chamada', message: err.message });
  }
});

app.get('/api/training-sessions', (req, res) => {
  serverTrainingSessions = loadJsonFromDisk(TRAINING_SESSIONS_FILE);
  res.json({ trainingSessions: serverTrainingSessions, count: serverTrainingSessions.length });
});

app.post('/api/training-sessions', (req, res) => {
  try {
    const session = req.body;
    const sessionToSave = {
      ...session,
      id: session.id || `ts-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: session.created_at || new Date().toISOString(),
    };
    serverTrainingSessions = loadJsonFromDisk(TRAINING_SESSIONS_FILE);
    serverTrainingSessions.unshift(sessionToSave);
    saveJsonToDisk(TRAINING_SESSIONS_FILE, serverTrainingSessions);
    res.status(201).json({ success: true, trainingSession: sessionToSave });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar treino', message: err.message });
  }
});

// ==================== DOCUMENTS & HISTORY ====================

app.get('/api/documents', (req, res) => {
  serverDocuments = loadJsonFromDisk(DOCUMENTS_FILE);
  res.json({ documents: serverDocuments, count: serverDocuments.length });
});

app.post('/api/documents', (req, res) => {
  try {
    const doc = req.body;
    const docToSave = {
      ...doc,
      id: doc.id || `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      uploaded_at: doc.uploaded_at || new Date().toISOString(),
    };
    serverDocuments = loadJsonFromDisk(DOCUMENTS_FILE);
    serverDocuments.unshift(docToSave);
    saveJsonToDisk(DOCUMENTS_FILE, serverDocuments);
    res.status(201).json({ success: true, document: docToSave });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar documento', message: err.message });
  }
});

app.delete('/api/documents/:id', (req, res) => {
  try {
    const { id } = req.params;
    serverDocuments = loadJsonFromDisk(DOCUMENTS_FILE);
    serverDocuments = serverDocuments.filter((d) => d.id !== id);
    saveJsonToDisk(DOCUMENTS_FILE, serverDocuments);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao excluir documento', message: err.message });
  }
});

app.get('/api/history-events', (req, res) => {
  serverHistoryEvents = loadJsonFromDisk(HISTORY_EVENTS_FILE);
  res.json({ historyEvents: serverHistoryEvents, count: serverHistoryEvents.length });
});

app.post('/api/history-events', (req, res) => {
  try {
    const event = req.body;
    const eventToSave = {
      ...event,
      id: event.id || `h-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: event.created_at || new Date().toISOString(),
    };
    serverHistoryEvents = loadJsonFromDisk(HISTORY_EVENTS_FILE);
    serverHistoryEvents.unshift(eventToSave);
    saveJsonToDisk(HISTORY_EVENTS_FILE, serverHistoryEvents);
    res.status(201).json({ success: true, historyEvent: eventToSave });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar evento', message: err.message });
  }
});

// ==================== EXTRA REVENUES & NEGOTIATIONS ====================

app.get('/api/extra-revenues', (req, res) => {
  serverExtraRevenues = loadJsonFromDisk(EXTRA_REVENUES_FILE);
  res.json({ extraRevenues: serverExtraRevenues, count: serverExtraRevenues.length });
});

app.post('/api/extra-revenues', (req, res) => {
  try {
    const rev = req.body;
    const revToSave = {
      ...rev,
      id: rev.id || `er-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: rev.created_at || new Date().toISOString(),
    };
    serverExtraRevenues = loadJsonFromDisk(EXTRA_REVENUES_FILE);
    serverExtraRevenues.unshift(revToSave);
    saveJsonToDisk(EXTRA_REVENUES_FILE, serverExtraRevenues);
    res.status(201).json({ success: true, extraRevenue: revToSave });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar receita extra', message: err.message });
  }
});

app.delete('/api/extra-revenues/:id', (req, res) => {
  try {
    const { id } = req.params;
    serverExtraRevenues = loadJsonFromDisk(EXTRA_REVENUES_FILE);
    serverExtraRevenues = serverExtraRevenues.filter((r) => r.id !== id);
    saveJsonToDisk(EXTRA_REVENUES_FILE, serverExtraRevenues);
    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao excluir receita extra', message: err.message });
  }
});

app.put('/api/extra-revenues/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    serverExtraRevenues = loadJsonFromDisk(EXTRA_REVENUES_FILE);
    const idx = serverExtraRevenues.findIndex((r) => r.id === id);
    if (idx !== -1) {
      serverExtraRevenues[idx] = { ...serverExtraRevenues[idx], ...updates, updated_at: new Date().toISOString() };
      saveJsonToDisk(EXTRA_REVENUES_FILE, serverExtraRevenues);
      return res.json({ success: true, extraRevenue: serverExtraRevenues[idx] });
    }
    res.json({ success: true, extraRevenue: updates });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar receita extra', message: err.message });
  }
});

app.get('/api/negotiations', (req, res) => {
  serverNegotiations = loadJsonFromDisk(NEGOTIATIONS_FILE);
  res.json({ negotiations: serverNegotiations, count: serverNegotiations.length });
});

app.post('/api/negotiations', (req, res) => {
  try {
    const neg = req.body;
    const negToSave = {
      ...neg,
      id: neg.id || `neg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      created_at: neg.created_at || new Date().toISOString(),
    };
    serverNegotiations = loadJsonFromDisk(NEGOTIATIONS_FILE);
    serverNegotiations.unshift(negToSave);
    saveJsonToDisk(NEGOTIATIONS_FILE, serverNegotiations);
    res.status(201).json({ success: true, negotiation: negToSave });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar negociação', message: err.message });
  }
});

app.put('/api/negotiations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    serverNegotiations = loadJsonFromDisk(NEGOTIATIONS_FILE);
    const idx = serverNegotiations.findIndex((n) => n.id === id);
    if (idx !== -1) {
      serverNegotiations[idx] = { ...serverNegotiations[idx], ...updates, updated_at: new Date().toISOString() };
      saveJsonToDisk(NEGOTIATIONS_FILE, serverNegotiations);
      return res.json({ success: true, negotiation: serverNegotiations[idx] });
    }
    res.json({ success: true, negotiation: updates });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar negociação', message: err.message });
  }
});

// ==================== LEADS API ====================

app.get('/api/leads', async (req, res) => {
  try {
    const dbRows = await getLeadsFromDb();
    if (dbRows && dbRows.length > 0) {
      const clientLeads = dbRows.map(mapDbLeadToClient);
      serverLeads = clientLeads;
      saveJsonToDisk(LEADS_FILE, serverLeads);
      return res.json({ leads: clientLeads, count: clientLeads.length, source: 'database' });
    }

    const diskLeads = loadJsonFromDisk(LEADS_FILE);
    if (diskLeads.length > 0) {
      for (const lead of diskLeads) {
        await saveLeadToDb(lead).catch(() => {});
      }
      return res.json({ leads: diskLeads, count: diskLeads.length, source: 'seeded_to_db' });
    }

    return res.json({ leads: [], count: 0 });
  } catch (err: any) {
    console.warn('[SERVER] Database query fallback to disk cache:', err?.message);
    serverLeads = loadJsonFromDisk(LEADS_FILE);
    return res.json({ leads: serverLeads, count: serverLeads.length, source: 'cache_fallback' });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const newLead = req.body;
    if (!newLead || !newLead.athlete_name) {
      return res.status(400).json({ error: 'Nome do atleta é obrigatório' });
    }

    const leadToSave = {
      ...newLead,
      id: newLead.id || `l-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      stage: newLead.stage || 'NOVO',
      source: newLead.source || 'FORMULARIO_EXTERNO',
      entry_date: newLead.entry_date || new Date().toISOString().split('T')[0],
      last_activity_date: newLead.last_activity_date || new Date().toISOString().split('T')[0],
      created_at: newLead.created_at || new Date().toISOString(),
    };

    try {
      await saveLeadToDb(leadToSave);
    } catch (dbErr) {
      console.warn('[SERVER] DB save warning, keeping in cache:', dbErr);
    }

    serverLeads = loadJsonFromDisk(LEADS_FILE);
    const existingIndex = serverLeads.findIndex((l) => l.id === leadToSave.id);
    if (existingIndex >= 0) {
      serverLeads[existingIndex] = { ...serverLeads[existingIndex], ...leadToSave };
    } else {
      serverLeads.unshift(leadToSave);
    }
    saveJsonToDisk(LEADS_FILE, serverLeads);

    res.status(201).json({ success: true, lead: leadToSave, count: serverLeads.length });
  } catch (err: any) {
    console.error('Error saving lead:', err);
    res.status(500).json({ error: 'Erro ao salvar lead', message: err.message });
  }
});

app.put('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    try {
      await updateLeadInDb(id, updates);
    } catch (dbErr) {
      console.warn('[SERVER] DB update warning:', dbErr);
    }

    serverLeads = loadJsonFromDisk(LEADS_FILE);
    const index = serverLeads.findIndex((l) => l.id === id);
    if (index !== -1) {
      serverLeads[index] = { ...serverLeads[index], ...updates, updated_at: new Date().toISOString() };
      saveJsonToDisk(LEADS_FILE, serverLeads);
      return res.json({ success: true, lead: serverLeads[index] });
    }

    res.json({ success: true, lead: updates });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao atualizar lead', message: err.message });
  }
});

app.post('/api/leads/sync', async (req, res) => {
  try {
    const { leads: clientLeads } = req.body;
    if (!Array.isArray(clientLeads)) {
      return res.status(400).json({ error: 'Array de leads esperado' });
    }

    for (const lead of clientLeads) {
      try {
        await saveLeadToDb(lead);
      } catch {}
    }

    serverLeads = loadJsonFromDisk(LEADS_FILE);
    const map = new Map<string, any>();
    for (const lead of serverLeads) {
      if (lead.id) map.set(lead.id, lead);
    }
    for (const clientLead of clientLeads) {
      if (clientLead.id) {
        if (!map.has(clientLead.id)) {
          map.set(clientLead.id, clientLead);
        } else {
          const existing = map.get(clientLead.id);
          map.set(clientLead.id, { ...existing, ...clientLead });
        }
      }
    }
    serverLeads = Array.from(map.values());
    saveJsonToDisk(LEADS_FILE, serverLeads);

    res.json({ success: true, count: serverLeads.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro na sincronização', message: err.message });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID do interessado é obrigatório' });

    try {
      await deleteLeadFromDb(id);
    } catch (dbErr) {
      console.warn('[SERVER] DB delete lead warning:', dbErr);
    }

    serverLeads = loadJsonFromDisk(LEADS_FILE);
    serverLeads = serverLeads.filter((l) => l.id !== id);
    saveJsonToDisk(LEADS_FILE, serverLeads);

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao excluir interessado', message: err.message });
  }
});

// ==================== TRIAL CLASSES API ====================

app.get('/api/trial-classes', async (req, res) => {
  try {
    const rows = await getTrialClassesFromDb();
    if (rows && rows.length > 0) {
      const mapped = rows.map(mapDbTrialClassToClient);
      return res.json({ trialClasses: mapped, count: mapped.length, source: 'database' });
    }
    return res.json({ trialClasses: [], count: 0, source: 'database' });
  } catch (err: any) {
    res.json({ trialClasses: [], count: 0, error: err.message });
  }
});

app.delete('/api/trial-classes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'ID da aula é obrigatório' });

    try {
      await deleteTrialClassFromDb(id);
    } catch (dbErr) {
      console.warn('[SERVER] DB delete trial class warning:', dbErr);
    }

    res.json({ success: true, id });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao excluir aula', message: err.message });
  }
});

app.post('/api/trial-classes', async (req, res) => {
  try {
    const tc = req.body;
    const saved = await saveTrialClassToDb(tc);
    res.status(201).json({ success: true, trialClass: mapDbTrialClassToClient(saved) });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar aula experimental', message: err.message });
  }
});

// ==================== AUTH / USERS ====================

app.post('/api/users/sync', requireAuth, async (req: any, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { name, email } = req.body;
    const userEmail = email || req.user.email || 'user@example.com';
    const userName = name || req.user.name || null;
    const userRecord = await getOrCreateUser(req.user.uid, userEmail, userName);
    res.json({ success: true, user: userRecord });
  } catch (err: any) {
    console.error('Failed to sync user:', err);
    res.status(500).json({ error: err.message || 'Failed to sync user' });
  }
});

// ==================== GITHUB INTEGRATION ====================

const GITHUB_TOKEN_FILE = path.join(process.cwd(), '.github_token');

app.get('/api/github/status', (req, res) => {
  const hasToken =
    Boolean(process.env.GITHUB_TOKEN) ||
    (fs.existsSync(GITHUB_TOKEN_FILE) && fs.readFileSync(GITHUB_TOKEN_FILE, 'utf-8').trim().length > 0);

  exec('git log -1 --pretty=format:"%h - %s (%cd)" --date=relative', (err, stdout) => {
    const lastCommit = err ? 'Nenhum commit recente' : stdout.trim();
    exec('git branch --show-current', (bErr, bStdout) => {
      const branch = bErr ? 'main' : bStdout.trim() || 'main';
      res.json({
        connected: true,
        repository: 'https://github.com/Germano2025/centaurofc.git',
        branch,
        lastCommit,
        hasToken,
      });
    });
  });
});

app.post('/api/github/token', (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token inválido' });
    }
    fs.writeFileSync(GITHUB_TOKEN_FILE, token.trim(), 'utf-8');
    res.json({ success: true, message: 'Token do GitHub configurado com sucesso!' });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao salvar token', message: err.message });
  }
});

app.post('/api/github/sync', (req, res) => {
  const { message } = req.body || {};
  const commitMsg = message && typeof message === 'string' && message.trim().length > 0
    ? message.trim().replace(/"/g, '\\"')
    : `Atualização Centauro Gestão - ${new Date().toLocaleString('pt-BR')}`;

  const scriptPath = path.join(process.cwd(), 'scripts', 'sync-github.sh');
  exec(`bash "${scriptPath}" "${commitMsg}"`, (error, stdout, stderr) => {
    if (error) {
      console.warn('[GITHUB SYNC]', stdout || stderr || error.message);
      return res.status(200).json({
        success: false,
        error: error.message,
        details: stdout || stderr || 'Falha ao sincronizar com o GitHub. Verifique as permissões do token.',
      });
    }
    res.json({
      success: true,
      message: 'Repositório GitHub sincronizado com sucesso!',
      output: stdout,
    });
  });
});

// ==================== DATABASE MAINTENANCE ====================

app.post('/api/database/clear-demo', async (req, res) => {
  try {
    const { keepClasses = true } = req.body || {};
    await clearDatabaseDemo(keepClasses);
    serverLeads = [];
    serverAthletes = [];
    serverResponsibles = [];
    serverMonthlyFees = [];
    serverExtraRevenues = [];
    serverNegotiations = [];
    serverAttendances = [];
    serverTrainingSessions = [];
    serverHistoryEvents = [];
    serverDocuments = [];
    saveJsonToDisk(LEADS_FILE, []);
    saveJsonToDisk(ATHLETES_FILE, []);
    saveJsonToDisk(RESPONSIBLES_FILE, []);
    saveJsonToDisk(MONTHLY_FEES_FILE, []);
    saveJsonToDisk(EXTRA_REVENUES_FILE, []);
    saveJsonToDisk(NEGOTIATIONS_FILE, []);
    saveJsonToDisk(ATTENDANCES_FILE, []);
    saveJsonToDisk(TRAINING_SESSIONS_FILE, []);
    saveJsonToDisk(HISTORY_EVENTS_FILE, []);
    saveJsonToDisk(DOCUMENTS_FILE, []);
    if (!keepClasses) {
      serverClasses = [];
      saveJsonToDisk(CLASSES_FILE, []);
    }
    res.json({
      success: true,
      message: 'Dados de demonstração removidos com sucesso do banco de dados e arquivos locais.',
    });
  } catch (err: any) {
    console.error('Clear demo error:', err);
    res.status(500).json({ error: 'Erro ao limpar dados de demonstração', message: err.message });
  }
});

app.get('/api/database/stats', async (req, res) => {
  try {
    const stats = await getDatabaseStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.json({ success: false, stats: { athletes: 0, leads: 0, trialClasses: 0, classes: 0 } });
  }
});

// ==================== START SERVER ====================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CENTAURO SERVER] Rodando na porta ${PORT} com armazenamento local persistente (JSON)`);
  });
}

startServer();
