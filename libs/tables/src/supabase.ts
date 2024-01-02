import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mpfyhtnqsizmeoecfhga.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wZnlodG5xc2l6bWVvZWNmaGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwNDIyMDExNiwiZXhwIjoyMDE5Nzk2MTE2fQ.lekJcGl5iX0Wona_y0-Dsdq7NUiVBiIBawTtBlNP8bE';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
