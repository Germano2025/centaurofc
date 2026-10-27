import { supabase, isSupabaseConfigured, supabaseProjectRef } from './supabase';

export const BUCKET_ATHLETE_PHOTOS = 'athlete-photos';
export const BUCKET_ATHLETE_DOCUMENTS = 'athlete-documents';

/**
 * Converte base64 dataURL para Blob/File para envio ao Supabase Storage
 */
export function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const match = parts[0].match(/:(.*?);/);
    const mimeType = match ? match[1] : 'application/octet-stream';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return { blob: new Blob([u8arr], { type: mimeType }), mimeType };
  } catch (err) {
    console.warn('Error converting dataUrl to Blob:', err);
    return null;
  }
}

/**
 * Faz upload de foto de atleta para o Supabase Storage (bucket athlete-photos)
 * Retorna a URL pública permanente do Supabase
 */
export async function uploadAthletePhoto(
  athleteId: string,
  fileOrDataUrl: File | string
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      success: false,
      error: 'Supabase não inicializado',
      url: typeof fileOrDataUrl === 'string' ? fileOrDataUrl : undefined,
    };
  }

  try {
    let fileBody: Blob | File;
    let fileExt = 'jpg';
    let contentType = 'image/jpeg';

    if (typeof fileOrDataUrl === 'string') {
      if (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://')) {
        return { success: true, url: fileOrDataUrl };
      }
      const converted = dataUrlToBlob(fileOrDataUrl);
      if (!converted) {
        return { success: false, error: 'Data URL inválida' };
      }
      fileBody = converted.blob;
      contentType = converted.mimeType;
      fileExt = converted.mimeType.split('/')[1] || 'jpg';
    } else {
      fileBody = fileOrDataUrl;
      contentType = fileOrDataUrl.type || 'image/jpeg';
      fileExt = fileOrDataUrl.name.split('.').pop() || 'jpg';
    }

    const cleanExt = fileExt.toLowerCase().replace(/[^a-z0-9]/g, '');
    const filePath = `athletes/${athleteId}_${Date.now()}.${cleanExt}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_ATHLETE_PHOTOS)
      .upload(filePath, fileBody, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.warn('[STORAGE] Upload athlete photo notice:', error.message);
      return { success: false, error: error.message };
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET_ATHLETE_PHOTOS)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicData?.publicUrl || `https://${supabaseProjectRef}.supabase.co/storage/v1/object/public/${BUCKET_ATHLETE_PHOTOS}/${data.path}`,
    };
  } catch (err: any) {
    console.warn('[STORAGE] Error uploading photo:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Faz upload de documento de atleta para o Supabase Storage (bucket athlete-documents)
 * Retorna a URL pública permanente do Supabase
 */
export async function uploadAthleteDocument(
  athleteId: string,
  fileName: string,
  fileOrDataUrl: File | string
): Promise<{ success: boolean; url?: string; error?: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      success: false,
      error: 'Supabase não inicializado',
      url: typeof fileOrDataUrl === 'string' ? fileOrDataUrl : undefined,
    };
  }

  try {
    let fileBody: Blob | File;
    let contentType = 'application/pdf';

    if (typeof fileOrDataUrl === 'string') {
      if (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://')) {
        return { success: true, url: fileOrDataUrl };
      }
      const converted = dataUrlToBlob(fileOrDataUrl);
      if (!converted) {
        return { success: false, error: 'Data URL inválida' };
      }
      fileBody = converted.blob;
      contentType = converted.mimeType;
    } else {
      fileBody = fileOrDataUrl;
      contentType = fileOrDataUrl.type || 'application/pdf';
    }

    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${athleteId}/${Date.now()}_${cleanFileName}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_ATHLETE_DOCUMENTS)
      .upload(filePath, fileBody, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.warn('[STORAGE] Upload document notice:', error.message);
      return { success: false, error: error.message };
    }

    const { data: publicData } = supabase.storage
      .from(BUCKET_ATHLETE_DOCUMENTS)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicData?.publicUrl || `https://${supabaseProjectRef}.supabase.co/storage/v1/object/public/${BUCKET_ATHLETE_DOCUMENTS}/${data.path}`,
    };
  } catch (err: any) {
    console.warn('[STORAGE] Error uploading document:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Verifica o status de existência dos buckets no Supabase Storage
 */
export async function checkStorageBucketsStatus(): Promise<{
  configured: boolean;
  photosBucketExists: boolean;
  documentsBucketExists: boolean;
  bucketsFound: string[];
  error?: string;
}> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      configured: false,
      photosBucketExists: false,
      documentsBucketExists: false,
      bucketsFound: [],
      error: 'Supabase não inicializado',
    };
  }

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      return {
        configured: true,
        photosBucketExists: false,
        documentsBucketExists: false,
        bucketsFound: [],
        error: error.message,
      };
    }

    const bucketNames = (buckets || []).map((b) => b.name);
    return {
      configured: true,
      photosBucketExists: bucketNames.includes(BUCKET_ATHLETE_PHOTOS),
      documentsBucketExists: bucketNames.includes(BUCKET_ATHLETE_DOCUMENTS),
      bucketsFound: bucketNames,
    };
  } catch (err: any) {
    return {
      configured: true,
      photosBucketExists: false,
      documentsBucketExists: false,
      bucketsFound: [],
      error: err?.message || String(err),
    };
  }
}

export const SUPABASE_STORAGE_SETUP_SQL = `-- ==============================================================================
-- CENTAURO - CRIAÇÃO DOS BUCKETS E POLÍTICAS DE STORAGE NO SUPABASE
-- Execute este script no SQL Editor do Supabase (supabase.com/dashboard)
-- ==============================================================================

-- 1. Criação dos buckets públicos no schema storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('athlete-photos', 'athlete-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('athlete-documents', 'athlete-documents', true, 20971520, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Políticas de RLS para o bucket 'athlete-photos'
DROP POLICY IF EXISTS "Public Select Athlete Photos" ON storage.objects;
CREATE POLICY "Public Select Athlete Photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'athlete-photos');

DROP POLICY IF EXISTS "Public Insert Athlete Photos" ON storage.objects;
CREATE POLICY "Public Insert Athlete Photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'athlete-photos');

DROP POLICY IF EXISTS "Public Update Athlete Photos" ON storage.objects;
CREATE POLICY "Public Update Athlete Photos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'athlete-photos');

DROP POLICY IF EXISTS "Public Delete Athlete Photos" ON storage.objects;
CREATE POLICY "Public Delete Athlete Photos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'athlete-photos');

-- 3. Políticas de RLS para o bucket 'athlete-documents'
DROP POLICY IF EXISTS "Public Select Athlete Docs" ON storage.objects;
CREATE POLICY "Public Select Athlete Docs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'athlete-documents');

DROP POLICY IF EXISTS "Public Insert Athlete Docs" ON storage.objects;
CREATE POLICY "Public Insert Athlete Docs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'athlete-documents');

DROP POLICY IF EXISTS "Public Update Athlete Docs" ON storage.objects;
CREATE POLICY "Public Update Athlete Docs"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'athlete-documents');

DROP POLICY IF EXISTS "Public Delete Athlete Docs" ON storage.objects;
CREATE POLICY "Public Delete Athlete Docs"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'athlete-documents');
`;

