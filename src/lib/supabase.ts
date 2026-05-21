import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://eeyiragtylotiwozbgqp.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVleWlyYWd0eWxvdGl3b3piZ3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzAyNzYsImV4cCI6MjA5NDk0NjI3Nn0.YB_alc7kt5l09eTfNH0x5q-ayBx-dHS1qE-yzHbRTFg';

export function getSupabaseClient() {
    if (typeof window === 'undefined') {
        return createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY);
    }
    
    let url = localStorage.getItem('supabase_url');
    let key = localStorage.getItem('supabase_key');
    
    if (!url || url === 'undefined' || url === 'null' || url.trim() === '') {
        url = DEFAULT_SUPABASE_URL;
    }
    if (!key || key === 'undefined' || key === 'null' || key.trim() === '') {
        key = DEFAULT_SUPABASE_KEY;
    }
    
    return createClient(url, key);
}
