import { supabase } from './supabase';

export async function uploadImage(
  bucket: 'logos' | 'avatars' | 'client-photos',
  file: File,
  pathPrefix: string = '',
): Promise<string> {
  const ext = file.name.split('.').pop();
  const fileName = `${pathPrefix}${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

export async function deleteImage(bucket: string, publicUrl: string): Promise<void> {
  try {
    const url = new URL(publicUrl);
    const path = url.pathname.split(`/object/public/${bucket}/`)[1];
    if (path) await supabase.storage.from(bucket).remove([path]);
  } catch {
    // silently ignore invalid URLs
  }
}
