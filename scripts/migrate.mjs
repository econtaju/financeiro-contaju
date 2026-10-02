import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.klqrydjoyxmxkshtyogp:[SUA_SENHA]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

async function runMigration() {
  console.log('🚀 Conectando diretamente ao PostgreSQL do Supabase via Pooler...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conexão estabelecida com sucesso!');

    const schemaPath = path.resolve(__dirname, '../supabase/schema.sql');
    console.log(`📄 Lendo arquivo de schema: ${schemaPath}`);
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('⚡ Executando migração do schema Contaju no banco de dados...');
    await client.query(sql);
    console.log('✅ Todas as definições de tabelas, índices e triggers foram executadas com sucesso!');

    // Notificar PostgREST para recarregar a API instantaneamente
    console.log('🔄 Notificando PostgREST para recarregar o cache do schema...');
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('✅ Notificação enviada!');

    // Listar tabelas criadas no schema public
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n📋 Tabelas presentes no schema public:');
    const contajuTables = [];
    const otherTables = [];

    res.rows.forEach(r => {
      if (r.table_name.startsWith('contaju_')) {
        contajuTables.push(r.table_name);
      } else {
        otherTables.push(r.table_name);
      }
    });

    console.log(`\n✨ Tabelas Contaju criadas (${contajuTables.length}):`);
    contajuTables.forEach(t => console.log(`  - [CONTAJU] ${t}`));

    console.log(`\n🔒 Tabelas de outros projetos preservadas intactas (${otherTables.length}):`);
    otherTables.forEach(t => console.log(`  - [EXTERNA] ${t}`));

  } catch (err) {
    console.error('❌ Erro durante a migração:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Conexão encerrada.');
  }
}

runMigration();
