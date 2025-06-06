import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sawufgyypmprtnuwvgnd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhd3VmZ3l5cG1wcnRudXd2Z25kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4NzQxMjcsImV4cCI6MjA2NDQ1MDEyN30.NNDNTPMc-RlyPaAlENrRfJo632LNu96Vq3ylP4E7sF0';

const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
