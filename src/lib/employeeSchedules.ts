import fs from 'fs';
import path from 'path';
import { supabaseServer } from '@/lib/supabaseServer';

// Where an employee's working-days-and-hours schedule is kept: a local JSON file first (immediate disk
// persistence), merged with the `employee_working_schedules` row in page_settings. Shared by the employees
// route (which also writes it) and the self-service profile route.
export const SCHEDULES_FILE_PATH = path.join(process.cwd(), 'data', 'employee_schedules.json');

export async function getEmployeeWorkingSchedulesMap(): Promise<Record<string, any>> {
  let result: Record<string, any> = {};

  // 1. Try local JSON file first for immediate disk persistence
  try {
    if (fs.existsSync(SCHEDULES_FILE_PATH)) {
      const content = fs.readFileSync(SCHEDULES_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        result = { ...parsed };
      }
    }
  } catch (fileErr) {
    console.warn('Error reading employee_schedules.json:', fileErr);
  }

  // 2. Try Supabase page_settings and merge
  try {
    const { data } = await supabaseServer
      .from('page_settings')
      .select('value')
      .eq('key', 'employee_working_schedules')
      .maybeSingle();
    if (data?.value && typeof data.value === 'object') {
      result = { ...result, ...data.value };
    }
  } catch (err) {
    console.warn('Error reading employee_working_schedules from page_settings:', err);
  }

  return result;
}
