import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const envPath = join(process.cwd(), 'playwright/.auth/stack-env.json');
const envVars = JSON.parse(readFileSync(envPath, 'utf-8'));

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'items' });
  if (error) {
    // If RPC doesn't exist, try a simple select
    const { data: item, error: selectError } = await supabase.from('items').select('*').limit(1);
    if (selectError) {
      console.error('Error fetching items:', selectError);
    } else {
      console.log('Item columns:', Object.keys(item[0] || {}));
    }
  } else {
    console.log('Columns:', data);
  }
}

checkSchema();
