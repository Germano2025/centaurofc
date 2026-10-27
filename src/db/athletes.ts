import { db, isCloudSqlConfigured } from "./index.ts";
import { athletes, soccerClasses, leads, trialClasses } from "./schema.ts";
import { sql, eq } from "drizzle-orm";

export async function getAthletesFromDb() {
  if (!db || !isCloudSqlConfigured) {
    return [];
  }
  try {
    const rows = await db.select().from(athletes);
    return rows;
  } catch (error) {
    console.warn("[DB] getAthletesFromDb fallback:", error);
    return [];
  }
}

export async function saveAthleteToDb(a: any) {
  const record = {
    id: a.id || `ath-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    name: a.name,
    birthDate: a.birth_date || a.birthDate,
    category: a.category || null,
    classId: a.current_class_id || a.class_id || a.classId || null,
    className: a.class_name || a.current_class_name || a.className || null,
    status: a.status || "ATIVO",
    financialCondition: a.financial_condition || a.financialCondition || "PAGANTE_SEM_DESCONTO",
    monthlyFee: String(a.monthly_fee ?? a.custom_monthly_fee ?? "150.00"),
    photoUrl: a.photo_url || a.photoUrl || null,
  };

  if (!db || !isCloudSqlConfigured) {
    return record;
  }

  try {
    const inserted = await db
      .insert(athletes)
      .values(record)
      .onConflictDoUpdate({
        target: athletes.id,
        set: {
          name: record.name,
          birthDate: record.birthDate,
          category: record.category,
          classId: record.classId,
          className: record.className,
          status: record.status,
          financialCondition: record.financialCondition,
          monthlyFee: record.monthlyFee,
          photoUrl: record.photoUrl,
        },
      })
      .returning();

    return inserted[0] || record;
  } catch (error) {
    console.warn("[DB] saveAthleteToDb warning:", error);
    return record;
  }
}

export async function updateAthleteInDb(id: string, updates: any) {
  if (!db || !isCloudSqlConfigured) {
    return true;
  }
  try {
    const setPayload: any = {};
    if (updates.name !== undefined) setPayload.name = updates.name;
    if (updates.birth_date !== undefined || updates.birthDate !== undefined) {
      setPayload.birthDate = updates.birth_date || updates.birthDate;
    }
    if (updates.category !== undefined) setPayload.category = updates.category;
    if (updates.current_class_id !== undefined || updates.class_id !== undefined || updates.classId !== undefined) {
      setPayload.classId = updates.current_class_id || updates.class_id || updates.classId;
    }
    if (updates.class_name !== undefined || updates.className !== undefined) {
      setPayload.className = updates.class_name || updates.className;
    }
    if (updates.status !== undefined) setPayload.status = updates.status;
    if (updates.financial_condition !== undefined || updates.financialCondition !== undefined) {
      setPayload.financialCondition = updates.financial_condition || updates.financialCondition;
    }
    if (updates.monthly_fee !== undefined || updates.custom_monthly_fee !== undefined) {
      setPayload.monthlyFee = String(updates.monthly_fee ?? updates.custom_monthly_fee ?? "150.00");
    }
    if (updates.photo_url !== undefined || updates.photoUrl !== undefined) {
      setPayload.photoUrl = updates.photo_url || updates.photoUrl;
    }

    if (Object.keys(setPayload).length > 0) {
      await db.update(athletes).set(setPayload).where(eq(athletes.id, id));
    }
    return true;
  } catch (error) {
    console.warn("[DB] updateAthleteInDb warning:", error);
    return true;
  }
}

export async function deleteAthleteFromDb(id: string) {
  if (!db || !isCloudSqlConfigured) {
    return true;
  }
  try {
    await db.delete(athletes).where(eq(athletes.id, id));
    return true;
  } catch (error) {
    console.warn("[DB] deleteAthleteFromDb warning:", error);
    return true;
  }
}

export async function bulkInsertAthletes(athletesList: any[]) {
  if (!db || !isCloudSqlConfigured) {
    return athletesList;
  }
  try {
    const results = [];
    for (const a of athletesList) {
      const record = {
        id: a.id || `ath-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        name: a.name,
        birthDate: a.birth_date || a.birthDate,
        category: a.category || null,
        classId: a.current_class_id || a.class_id || a.classId || null,
        className: a.class_name || a.current_class_name || a.className || null,
        status: a.status || "ATIVO",
        financialCondition: a.financial_condition || a.financialCondition || "PAGANTE_SEM_DESCONTO",
        monthlyFee: String(a.monthly_fee ?? a.custom_monthly_fee ?? "150.00"),
        photoUrl: a.photo_url || null,
      };

      const inserted = await db
        .insert(athletes)
        .values(record)
        .onConflictDoUpdate({
          target: athletes.id,
          set: {
            name: record.name,
            birthDate: record.birthDate,
            category: record.category,
            classId: record.classId,
            className: record.className,
            status: record.status,
            financialCondition: record.financialCondition,
            monthlyFee: record.monthlyFee,
            photoUrl: record.photoUrl,
          },
        })
        .returning();

      results.push(inserted[0]);
    }
    return results;
  } catch (error) {
    console.warn("Database bulk insert athletes fallback:", error);
    return athletesList;
  }
}

export async function clearDatabaseDemo(keepClasses = true) {
  if (!db || !isCloudSqlConfigured) {
    return { success: true };
  }
  try {
    await db.delete(trialClasses).where(sql`id IN ('tc-1', 'tc-2', 'tc-3')`);
    await db.delete(leads).where(sql`id IN ('l-1', 'l-2', 'l-3', 'l-4', 'l-5', 'l-6')`);
    await db.delete(athletes).where(sql`id LIKE 'ath-%' OR id LIKE 'a-%'`);
    if (!keepClasses) {
      await db.delete(soccerClasses);
    }
    return { success: true };
  } catch (error) {
    console.warn("Database clear fallback:", error);
    return { success: true };
  }
}

export async function getDatabaseStats() {
  if (!db || !isCloudSqlConfigured) {
    return {
      athletes: 0,
      leads: 0,
      trialClasses: 0,
      classes: 0,
    };
  }
  try {
    const [athCount] = await db.select({ count: sql`count(*)::int` }).from(athletes);
    const [leadsCount] = await db.select({ count: sql`count(*)::int` }).from(leads);
    const [trialCount] = await db.select({ count: sql`count(*)::int` }).from(trialClasses);
    const [classCount] = await db.select({ count: sql`count(*)::int` }).from(soccerClasses);
    return {
      athletes: athCount?.count || 0,
      leads: leadsCount?.count || 0,
      trialClasses: trialCount?.count || 0,
      classes: classCount?.count || 0,
    };
  } catch (error) {
    return {
      athletes: 0,
      leads: 0,
      trialClasses: 0,
      classes: 0,
    };
  }
}
