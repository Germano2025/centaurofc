import { db, isCloudSqlConfigured } from "./index.ts";
import { leads, trialClasses } from "./schema.ts";
import { eq, desc } from "drizzle-orm";

export async function getLeadsFromDb() {
  if (!db || !isCloudSqlConfigured) {
    return [];
  }
  try {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  } catch (error) {
    console.warn("[DB] getLeadsFromDb fallback:", error);
    return [];
  }
}

export async function saveLeadToDb(leadData: any) {
  const record = {
    id: leadData.id,
    athleteName: leadData.athlete_name || leadData.athleteName,
    athleteBirthDate: leadData.athlete_birth_date || leadData.athleteBirthDate || null,
    responsibleName: leadData.responsible_name || leadData.responsibleName,
    responsiblePhone: leadData.responsible_phone || leadData.responsiblePhone,
    responsibleEmail: leadData.responsible_email || leadData.responsibleEmail || null,
    responsibleRelationship: leadData.responsible_relationship || leadData.responsibleRelationship || null,
    interestClassName: leadData.interest_class_name || leadData.interestClassName || null,
    source: leadData.source || "FORMULARIO_EXTERNO",
    stage: leadData.stage || "NOVO",
    notes: leadData.notes || null,
    entryDate: leadData.entry_date || leadData.entryDate || new Date().toISOString().split("T")[0],
    lastActivityDate: leadData.last_activity_date || leadData.lastActivityDate || new Date().toISOString().split("T")[0],
    convertedAthleteId: leadData.converted_athlete_id || leadData.convertedAthleteId || null,
    timeline: leadData.timeline || [],
  };

  if (!db || !isCloudSqlConfigured) {
    return record;
  }

  try {
    const inserted = await db
      .insert(leads)
      .values(record)
      .onConflictDoUpdate({
        target: leads.id,
        set: {
          athleteName: record.athleteName,
          athleteBirthDate: record.athleteBirthDate,
          responsibleName: record.responsibleName,
          responsiblePhone: record.responsiblePhone,
          responsibleEmail: record.responsibleEmail,
          responsibleRelationship: record.responsibleRelationship,
          interestClassName: record.interestClassName,
          source: record.source,
          stage: record.stage,
          notes: record.notes,
          lastActivityDate: record.lastActivityDate,
          convertedAthleteId: record.convertedAthleteId,
          timeline: record.timeline,
          updatedAt: new Date(),
        },
      })
      .returning();

    return inserted[0] || record;
  } catch (error) {
    console.warn("[DB] saveLeadToDb fallback:", error);
    return record;
  }
}

export async function updateLeadInDb(id: string, updates: any) {
  if (!db || !isCloudSqlConfigured) {
    return updates;
  }
  try {
    const formattedUpdates: any = { updatedAt: new Date() };
    if (updates.athlete_name !== undefined) formattedUpdates.athleteName = updates.athlete_name;
    if (updates.athleteName !== undefined) formattedUpdates.athleteName = updates.athleteName;
    if (updates.stage !== undefined) formattedUpdates.stage = updates.stage;
    if (updates.notes !== undefined) formattedUpdates.notes = updates.notes;
    if (updates.responsible_name !== undefined) formattedUpdates.responsibleName = updates.responsible_name;
    if (updates.responsible_phone !== undefined) formattedUpdates.responsiblePhone = updates.responsible_phone;
    if (updates.timeline !== undefined) formattedUpdates.timeline = updates.timeline;
    if (updates.last_activity_date !== undefined) formattedUpdates.lastActivityDate = updates.last_activity_date;
    if (updates.converted_athlete_id !== undefined) formattedUpdates.convertedAthleteId = updates.converted_athlete_id;

    const result = await db.update(leads).set(formattedUpdates).where(eq(leads.id, id)).returning();
    return result[0] || updates;
  } catch (error) {
    console.warn("[DB] updateLeadInDb fallback:", error);
    return updates;
  }
}

export async function getTrialClassesFromDb() {
  if (!db || !isCloudSqlConfigured) {
    return [];
  }
  try {
    return await db.select().from(trialClasses).orderBy(desc(trialClasses.createdAt));
  } catch (error) {
    console.warn("[DB] getTrialClassesFromDb fallback:", error);
    return [];
  }
}

export async function saveTrialClassToDb(tc: any) {
  const record = {
    id: tc.id,
    leadId: tc.lead_id || tc.leadId || null,
    athleteName: tc.athlete_name || tc.athleteName,
    classId: tc.class_id || tc.classId || null,
    className: tc.class_name || tc.className || null,
    classDate: tc.class_date || tc.classDate,
    classTime: tc.class_time || tc.classTime || null,
    location: tc.location || null,
    status: tc.status || "AGENDADA",
    feedbackDecision: tc.feedback_decision || tc.feedbackDecision || null,
    feedbackNotes: tc.feedback_notes || tc.feedbackNotes || null,
    cancellationReason: tc.cancellation_reason || tc.cancellationReason || null,
    notes: tc.notes || null,
    registeredBy: tc.registered_by || tc.registeredBy || null,
  };

  if (!db || !isCloudSqlConfigured) {
    return record;
  }

  try {
    const inserted = await db
      .insert(trialClasses)
      .values(record)
      .onConflictDoUpdate({
        target: trialClasses.id,
        set: {
          leadId: record.leadId,
          athleteName: record.athleteName,
          classId: record.classId,
          className: record.className,
          classDate: record.classDate,
          classTime: record.classTime,
          location: record.location,
          status: record.status,
          feedbackDecision: record.feedbackDecision,
          feedbackNotes: record.feedbackNotes,
          cancellationReason: record.cancellationReason,
          notes: record.notes,
          registeredBy: record.registeredBy,
        },
      })
      .returning();

    return inserted[0] || record;
  } catch (error) {
    console.warn("[DB] saveTrialClassToDb fallback:", error);
    return record;
  }
}

export async function deleteLeadFromDb(id: string) {
  if (!db || !isCloudSqlConfigured) {
    return { id };
  }
  try {
    await db.delete(trialClasses).where(eq(trialClasses.leadId, id));
    const result = await db.delete(leads).where(eq(leads.id, id)).returning();
    return result[0] || { id };
  } catch (error) {
    console.warn("[DB] deleteLeadFromDb fallback:", error);
    return { id };
  }
}

export async function deleteTrialClassFromDb(id: string) {
  if (!db || !isCloudSqlConfigured) {
    return { id };
  }
  try {
    const result = await db.delete(trialClasses).where(eq(trialClasses.id, id)).returning();
    return result[0] || { id };
  } catch (error) {
    console.warn("[DB] deleteTrialClassFromDb fallback:", error);
    return { id };
  }
}
