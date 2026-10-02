import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://klqrydjoyxmxkshtyogp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sua_supabase_anon_key';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sua_supabase_service_role_key';

async function testSupabaseClient() {
  console.log('🔍 Testando cliente Supabase com Anon Key...');
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data: companiesAnon, error: errAnon } = await supabaseAnon
    .from('contaju_companies')
    .select('*')
    .limit(5);

  if (errAnon) {
    console.error('❌ Erro com Anon Key:', errAnon);
  } else {
    console.log(`✅ Sucesso com Anon Key! Retorno de contaju_companies: ${companiesAnon.length} registros.`);
  }

  console.log('\n🔍 Testando cliente Supabase com Service Role Key...');
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const { data: accountsAdmin, error: errAdmin } = await supabaseAdmin
    .from('contaju_bank_accounts')
    .select('*')
    .limit(5);

  if (errAdmin) {
    console.error('❌ Erro com Service Key:', errAdmin);
  } else {
    console.log(`✅ Sucesso com Service Key! Retorno de contaju_bank_accounts: ${accountsAdmin.length} registros.`);
  }
}

testSupabaseClient();
