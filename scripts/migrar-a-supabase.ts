/**
 * Sube una copia de seguridad de POS Moderno (.backup) a Supabase.
 *
 * Uso:
 *   npm run migrar:supabase -- --archivo copia.backup --negocio <uuid> [--dueno <uuid de auth.users>] [--prueba]
 *
 * Variables de entorno (solo para --prueba no hacen falta):
 *   SUPABASE_URL               https://<proyecto>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  llave service_role (Project Settings › API). Nunca la pongas en la app.
 *
 * Se puede correr varias veces: los ids son estables y se usa upsert, así que no duplica.
 */
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { parseBackup } from '../src/lib/backup';
import { isUuid, mapBackupToSupabase, TABLE_ORDER } from '../src/lib/supabaseMap';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const archivo = arg('archivo');
  const dryRun = process.argv.includes('--prueba');
  const negocio = arg('negocio') ?? randomUUID();
  const dueno = arg('dueno');
  if (!archivo) throw new Error('Falta --archivo <copia.backup>');
  if (!isUuid(negocio)) throw new Error('--negocio debe ser un UUID');
  if (dueno && !isUuid(dueno)) throw new Error('--dueno debe ser el UUID del usuario en auth.users');

  const file = parseBackup(await readFile(archivo, 'utf8'));
  const { rows, uploads } = await mapBackupToSupabase(file, negocio);

  console.log(`Negocio: ${file.data.settings.bizName} → ${negocio}`);
  for (const t of TABLE_ORDER) console.log(`  ${t.padEnd(16)} ${rows[t].length} filas`);
  console.log(`  ${'fotos'.padEnd(16)} ${uploads.length} archivos`);
  if (dryRun) {
    console.log('\nModo prueba: no se envió nada. Quita --prueba para subir los datos.');
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  const db = createClient(url, key, { auth: { persistSession: false } });

  for (const t of TABLE_ORDER) {
    const list = rows[t];
    for (let i = 0; i < list.length; i += 500) {
      const { error } = await db.from(t).upsert(list.slice(i, i + 500), { onConflict: 'id' });
      if (error) throw new Error(`Error en ${t}: ${error.message}`);
    }
    console.log(`✓ ${t}`);
  }

  if (dueno) {
    const { error } = await db.from('business_members').upsert({ business_id: negocio, user_id: dueno, role: 'owner' }, { onConflict: 'business_id,user_id' });
    if (error) throw new Error(`Error al asignar el dueño: ${error.message}`);
    console.log('✓ dueño asignado');
  } else {
    console.log('! Sin --dueno: nadie podrá ver el negocio hasta agregar una fila en business_members.');
  }

  for (const u of uploads) {
    const { error } = await db.storage.from('product-images').upload(u.path, Buffer.from(u.base64, 'base64'), { contentType: u.contentType, upsert: true });
    if (error) throw new Error(`Error al subir ${u.path}: ${error.message}`);
  }
  console.log(`✓ ${uploads.length} fotos subidas`);
  console.log('\nListo.');
}

main().catch((e) => {
  console.error(`\n✗ ${(e as Error).message}`);
  process.exit(1);
});
