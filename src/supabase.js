import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zzxibxrgnkkzodmbsglc.supabase.co'
const supabaseAnonKey  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6eGlieHJnbmtrem9kbWJzZ2xjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwOTE1MjUsImV4cCI6MjA3MzY2NzUyNX0.X2NhPr9w_O6sWSoSVHFO0fVcCBqcPTDxA6tlShEqpi0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)