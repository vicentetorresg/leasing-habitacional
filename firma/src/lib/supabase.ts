import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://evuxdhvvarfxredghvpu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2dXhkaHZ2YXJmeHJlZGdodnB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NjQ4NzMsImV4cCI6MjA5NjI0MDg3M30.9Rv6MNHeNwb2-2shyaP9f2aUSrbDN_0syN7PTp6mLUs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
export { SUPABASE_URL, SUPABASE_KEY };
