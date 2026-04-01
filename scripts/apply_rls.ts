import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Utilizando la password proveída por el usuario al inicio de la conversación de Supabase: CpqW1xaoGatixFoX
const connectionString = 'postgresql://postgres:CpqW1xaoGatixFoX@db.mirooulavrwfljykkgqw.supabase.co:5432/postgres';

const sql = postgres(connectionString, { ssl: 'require' });

async function applyRLS() {
    try {
        const sqlString = fs.readFileSync(path.join(process.cwd(), 'docs/supabase_rls_security_patch.sql'), 'utf-8');
        console.log("Iniciando conexión a Supabase y ejecutando políticas RLS...");
        
        // Ejecutar las policies (Múltiples statements)
        await sql.unsafe(sqlString);
        
        console.log("✅ PARCHE APLICADO COMPLETAMENTE. Bases de datos aseguradas.");
    } catch(e: any) {
        console.error("❌ Fallo crítico al aplicar RLS:", e.message || e);
    } finally {
        await sql.end();
    }
}

applyRLS();
