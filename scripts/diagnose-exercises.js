const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    const { data, error } = await supabase
      .from('exercicios_biblioteca')
      .select('*')
      .limit(1);

    if (error) {
      console.error("Error fetching rows:", error);
    } else {
      console.log("Success! Columns in exercicios_biblioteca:", data.length > 0 ? Object.keys(data[0]) : "No rows found to determine columns");
    }

    // Also run direct SQL to get schema details
    const { data: cols, error: colError } = await supabase.rpc('get_table_columns_diagnose'); 
    // If RPC doesn't exist, we can fetch from a system table or execute something
    console.log("Checking columns via public select...");
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

run();
