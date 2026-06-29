import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'https://vgqewdwjonkukkdgvboy.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZncWV3ZHdqb25rdWtrZGd2Ym95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2Nzc0MTAsImV4cCI6MjA5ODI1MzQxMH0.PmrrzYvCkeOPnDanrKOMXbUwM_IXzPx7YaD1-oqukrE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
