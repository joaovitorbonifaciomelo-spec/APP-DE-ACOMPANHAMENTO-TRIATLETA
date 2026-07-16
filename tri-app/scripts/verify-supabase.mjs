// Verificação de ponta a ponta do Supabase usando o mesmo .env do app:
// signup (autoconfirm) -> insert -> select -> delete -> RLS anônimo.
// Rodar de dentro de tri-app:  node scripts/verify-supabase.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const URL_ = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_ || !ANON) throw new Error('.env sem URL/anon key');

let failed = false;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failed = true;
};

const email = `claude-e2e-${Date.now()}@example.com`;
const password = `T3st!${Math.random().toString(36).slice(2, 12)}`;
const supa = createClient(URL_, ANON, { auth: { persistSession: false } });

// 1. signup com sessão imediata (autoconfirm)
const su = await supa.auth.signUp({ email, password });
check('signup com autoconfirm retorna sessão', !su.error && !!su.data.session, su.error?.message);

// 2. insert respeitando RLS (user_id = auth.uid() por default)
const ins = await supa.from('exercises').insert({ name: '__e2e_test__', muscle_group: 'test' }).select('id,user_id').single();
check('insert em exercises (RLS own rows)', !ins.error && ins.data?.id != null, ins.error?.message);

// 3. select devolve a própria linha
const sel = await supa.from('exercises').select('id,name').eq('name', '__e2e_test__');
check('select devolve a linha própria', !sel.error && sel.data?.length === 1, sel.error?.message);

// 4. delete
const del = await supa.from('exercises').delete().eq('id', ins.data?.id ?? -1);
check('delete da linha própria', !del.error, del.error?.message);

// 5. cliente anônimo (sem login) não vê nada
const anonClient = createClient(URL_, ANON, { auth: { persistSession: false } });
const anonSel = await anonClient.from('exercises').select('id');
check('RLS bloqueia leitura sem login', !anonSel.error && anonSel.data?.length === 0,
  anonSel.error?.message ?? `linhas visíveis: ${anonSel.data?.length}`);

await supa.auth.signOut();
console.log(failed ? '\nRESULTADO: FALHOU' : '\nRESULTADO: TUDO OK');
console.log(`(usuário de teste ${email} — remover depois)`);
process.exit(failed ? 1 : 0);
