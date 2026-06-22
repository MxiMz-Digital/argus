// Fixture: triggers S1:no-select-star
import { createClient } from '@/lib/supabase/server'

export async function getAll() {
  const supabase = createClient()
  const { data } = await supabase.from('associations').select('*')
  return data
}
