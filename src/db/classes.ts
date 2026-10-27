import { db, isCloudSqlConfigured } from "./index.ts";
import { soccerClasses } from "./schema.ts";
import { eq } from "drizzle-orm";

export async function getClassesFromDb() {
  if (!db || !isCloudSqlConfigured) {
    return [];
  }
  try {
    const rows = await db.select().from(soccerClasses);
    return rows;
  } catch (error) {
    console.warn("[DB] getClassesFromDb fallback:", error);
    return [];
  }
}

export async function saveClassToDb(c: any) {
  const record = {
    id: c.id || `c-${Date.now()}`,
    name: c.name,
    category: c.category || "Geral",
    ageGroup: c.age_group || c.ageGroup || null,
    scheduleDays: Array.isArray(c.schedule_days) ? c.schedule_days.join(", ") : (c.schedule_days || c.scheduleDays || null),
    scheduleTime: c.schedule_time || c.scheduleTime || null,
    capacityRecommended: c.capacity_recommended ?? c.capacityRecommended ?? 30,
    active: c.active !== undefined ? Boolean(c.active) : true,
    coachName: c.coach_name || c.coachName || null,
    location: c.location || null,
  };

  if (!db || !isCloudSqlConfigured) {
    return record;
  }

  try {
    const inserted = await db
      .insert(soccerClasses)
      .values(record)
      .onConflictDoUpdate({
        target: soccerClasses.id,
        set: {
          name: record.name,
          category: record.category,
          ageGroup: record.ageGroup,
          scheduleDays: record.scheduleDays,
          scheduleTime: record.scheduleTime,
          capacityRecommended: record.capacityRecommended,
          active: record.active,
          coachName: record.coachName,
          location: record.location,
        },
      })
      .returning();

    return inserted[0] || record;
  } catch (error) {
    console.warn("[DB] saveClassToDb fallback:", error);
    return record;
  }
}

export async function updateClassInDb(id: string, updates: any) {
  if (!db || !isCloudSqlConfigured) {
    return updates;
  }
  try {
    const setPayload: any = {};
    if (updates.name !== undefined) setPayload.name = updates.name;
    if (updates.category !== undefined) setPayload.category = updates.category;
    if (updates.age_group !== undefined || updates.ageGroup !== undefined) {
      setPayload.ageGroup = updates.age_group || updates.ageGroup;
    }
    if (updates.schedule_days !== undefined || updates.scheduleDays !== undefined) {
      const days = updates.schedule_days || updates.scheduleDays;
      setPayload.scheduleDays = Array.isArray(days) ? days.join(", ") : days;
    }
    if (updates.schedule_time !== undefined || updates.scheduleTime !== undefined) {
      setPayload.scheduleTime = updates.schedule_time || updates.scheduleTime;
    }
    if (updates.capacity_recommended !== undefined || updates.capacityRecommended !== undefined) {
      setPayload.capacityRecommended = updates.capacity_recommended ?? updates.capacityRecommended;
    }
    if (updates.active !== undefined) setPayload.active = Boolean(updates.active);
    if (updates.coach_name !== undefined || updates.coachName !== undefined) {
      setPayload.coachName = updates.coach_name || updates.coachName;
    }
    if (updates.location !== undefined) setPayload.location = updates.location;

    const res = await db.update(soccerClasses).set(setPayload).where(eq(soccerClasses.id, id)).returning();
    return res[0];
  } catch (error) {
    console.warn("[DB] updateClassInDb fallback:", error);
    return updates;
  }
}

export async function deleteClassFromDb(id: string) {
  if (!db || !isCloudSqlConfigured) {
    return { success: true, id };
  }
  try {
    await db.delete(soccerClasses).where(eq(soccerClasses.id, id));
    return { success: true, id };
  } catch (error) {
    console.warn("[DB] deleteClassFromDb fallback:", error);
    return { success: true, id };
  }
}
