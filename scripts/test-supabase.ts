import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase Connection:');
console.log('URL:', url);
console.log('Anon Key Present:', Boolean(key));
console.log('Service Key Present:', Boolean(serviceKey));

if (!url || !key) {
  console.error('Missing URL or Anon Key!');
  process.exit(1);
}

const client = createClient(url, key);

async function run() {
  const tables = [
    'contaju_companies',
    'contaju_users',
    'contaju_chart_of_accounts',
    'contaju_bank_accounts',
    'contaju_counterparties',
    'contaju_services',
    'contaju_contracts',
    'contaju_sales',
    'contaju_financial_titles',
    'contaju_settlements',
    'contaju_financial_movements',
    'contaju_bank_statement_entries',
    'contaju_credit_cards',
    'contaju_credit_card_purchases',
    'contaju_period_closures',
    'contaju_audit_logs'
  ];

  console.log('\n--- Checking Tables ---');
  for (const tbl of tables) {
    try {
      const { data, error, count } = await client
        .from(tbl)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ Table [${tbl}]: Error: ${error.message} (code: ${error.code})`);
      } else {
        console.log(`✅ Table [${tbl}]: Found! Rows count: ${count ?? 'unknown'}`);
      }
    } catch (err: any) {
      console.log(`❌ Table [${tbl}]: Exception: ${err.message}`);
    }
  }

  // Se tiver service key, testa também com service key
  if (serviceKey) {
    console.log('\n--- Checking with Service Role Key ---');
    const adminClient = createClient(url, serviceKey);
    const { data: compData, error: compErr } = await adminClient.from('contaju_companies').select('*');
    if (compErr) {
      console.log('❌ Service Role Error:', compErr.message);
    } else {
      console.log('✅ Service Role Access OK! Companies in DB:', compData?.length);
    }

    const { data: titlesData, error: titlesErr } = await adminClient.from('contaju_financial_titles').select('id, description, original_amount');
    if (titlesErr) {
      console.log('❌ Titles Error:', titlesErr.message);
    } else {
      console.log('✅ Titles in DB:', titlesData?.length);
    }

    const { data: contractsData, error: contractsErr } = await adminClient.from('contaju_contracts').select('id, contract_number');
    if (contractsErr) {
      console.log('❌ Contracts Error:', contractsErr.message);
    } else {
      console.log('✅ Contracts in DB:', contractsData?.length);
    }
  }
}

run().catch(console.error);
