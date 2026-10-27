import { db, isCloudSqlConfigured } from "./index.ts";
import { users } from "./schema.ts";

export async function getOrCreateUser(uid: string, email: string, name?: string | null) {
  const fallbackUser = {
    id: `u-${uid}`,
    uid,
    email,
    name: name || null,
    role: "ADMINISTRADOR",
    active: true,
  };

  if (!db || !isCloudSqlConfigured) {
    return fallbackUser;
  }

  try {
    const result = await db
      .insert(users)
      .values({ uid, email, name: name || null })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email, ...(name ? { name } : {}) },
      })
      .returning();

    return result[0] || fallbackUser;
  } catch (error) {
    console.warn("[DB] getOrCreateUser fallback:", error);
    return fallbackUser;
  }
}

export async function getUsers() {
  if (!db || !isCloudSqlConfigured) {
    return [];
  }
  try {
    return await db.select().from(users);
  } catch (error) {
    console.warn("[DB] getUsers fallback:", error);
    return [];
  }
}
