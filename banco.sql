-- ══════════════════════════════════════════════════════════════════
-- LEVEL BT LIVE · BANCO COMPLETO
--
-- Este é o banco DA TRANSMISSÃO. Não é o mesmo do app Level BT —
-- são dois projetos separados no Supabase, de propósito.
--
-- Rode este arquivo UMA VEZ, inteiro, no SQL Editor do projeto novo.
-- Ele cria tudo: transmissões, logos de patrocinador e o painel.
-- É seguro rodar de novo se precisar.
--
-- Depois de rodar, vá ao PASSO 2 no fim do arquivo.
-- ══════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;


-- ══════════════════════════════════════════════════════════════════
-- 1 · TRANSMISSÕES
--
-- Cada transmissão tem DUAS chaves:
--   token       = pública  → vai na URL do overlay (só lê)
--   control_key = secreta  → fica no aparelho de quem marca (só escreve)
--
-- A tabela fica trancada: ninguém acessa direto, só pelas funções.
-- ══════════════════════════════════════════════════════════════════

create table if not exists broadcasts (
  id           uuid primary key default gen_random_uuid(),
  token        text unique not null,
  control_key  text unique not null,
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table broadcasts enable row level security;   -- sem policy = fechado

create index if not exists broadcasts_token_idx       on broadcasts (token);
create index if not exists broadcasts_control_key_idx on broadcasts (control_key);

-- ── Criar uma transmissão ─────────────────────────────────────────
-- search_path inclui "extensions" porque é lá que o Supabase instala
-- o pgcrypto. Sem isso, gen_random_bytes não é encontrado em tempo
-- de execução, mesmo a função existindo.
create or replace function bc_create()
returns table (token text, control_key text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text := encode(gen_random_bytes(6), 'hex');   -- 12 caracteres
  v_key   text := encode(gen_random_bytes(16), 'hex');  -- 32 caracteres
begin
  insert into broadcasts (token, control_key) values (v_token, v_key);
  return query select v_token, v_key;
end;
$$;

-- ── Ler o placar (o overlay do OBS, sem login) ────────────────────
create or replace function bc_read(p_token text)
returns jsonb
language sql
security definer
set search_path = public, extensions
as $$
  select payload from broadcasts where token = p_token;
$$;

-- ── Escrever o placar (quem tem a chave de controle) ──────────────
create or replace function bc_write(p_control_key text, p_payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_n int;
begin
  update broadcasts
     set payload = p_payload, updated_at = now()
   where control_key = p_control_key;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

grant execute on function bc_create()           to anon, authenticated;
grant execute on function bc_read(text)         to anon, authenticated;
grant execute on function bc_write(text, jsonb) to anon, authenticated;


-- ══════════════════════════════════════════════════════════════════
-- 2 · LOGOS DOS PATROCINADORES
--
-- ⚠ LEIA ANTES
-- Este balde é PÚBLICO para leitura — tem que ser, o OBS busca a
-- imagem sem login — e aceita ENVIO SEM LOGIN. Ou seja: quem ler o
-- código da página encontra a chave pública e consegue enviar imagens
-- para cá.
--
-- O que limita o estrago: só imagens (png, jpeg, webp), 2 MB por
-- arquivo, balde isolado, e nada entra no ar sozinho — só aparece a
-- logo que você escolher na página do placar.
--
-- SVG ficou de fora de propósito: é um documento que pode carregar
-- script dentro. PNG e JPEG não.
-- ══════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152,
        array['image/png','image/jpeg','image/webp'])
on conflict (id) do update
  set public             = true,
      file_size_limit    = 2097152,
      allowed_mime_types = array['image/png','image/jpeg','image/webp'];

drop policy if exists "logos leitura publica" on storage.objects;
create policy "logos leitura publica"
  on storage.objects for select
  using (bucket_id = 'logos');

drop policy if exists "logos envio" on storage.objects;
create policy "logos envio"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'logos');


-- ══════════════════════════════════════════════════════════════════
-- 3 · PAINEL
--
-- Dá ao dono da plataforma a visão que o RLS esconde: quais
-- transmissões existem e quais estão no ar agora. Protegido por uma
-- chave secreta — sem ela, a função não devolve nada.
--
-- Esta chave é DESTE banco. A do app é outra.
-- ══════════════════════════════════════════════════════════════════

create table if not exists admin_keys (
  key        text primary key,
  nome       text,
  created_at timestamptz not null default now()
);
alter table admin_keys enable row level security;   -- ninguém lê direto

create or replace function admin_lives(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  v_ok boolean;
  v_ls jsonb := '[]'::jsonb;
  v_tot int := 0;
  v_ar  int := 0;
begin
  select exists(select 1 from admin_keys where key = p_key) into v_ok;
  if not v_ok then
    return jsonb_build_object('erro','chave invalida');
  end if;

  select coalesce(jsonb_agg(x order by x->>'atualizado' desc), '[]'::jsonb)
    into v_ls
  from (
    select jsonb_build_object(
      'token',      b.token,
      'criado_em',  b.created_at,
      'atualizado', b.updated_at,
      'torneio',    b.payload->>'torneio',
      'quadra',     b.payload->>'quadra',
      'categoria',  b.payload->>'cat',
      'fase',       b.payload->>'fase',
      'dupla_a',    b.payload->'t1',
      'dupla_b',    b.payload->'t2',
      'status',     coalesce(b.payload->>'status','vazio'),
      'sets',       coalesce(b.payload->>'s1','0') || '-' || coalesce(b.payload->>'s2','0'),
      'games',      coalesce(b.payload->>'g1','0') || '-' || coalesce(b.payload->>'g2','0'),
      'jogados',    coalesce(jsonb_array_length(b.payload->'agenda'), 0),
      'no_ar',      (b.updated_at > now() - interval '3 minutes')
    ) as x
    from broadcasts b
    where b.payload ? 't1'
    order by b.updated_at desc
    limit 60
  ) t;

  select count(*) into v_tot from broadcasts where payload ? 't1';
  select count(*) into v_ar  from broadcasts
   where payload ? 't1' and updated_at > now() - interval '3 minutes';

  return jsonb_build_object(
    'totais', jsonb_build_object('transmissoes', v_tot, 'no_ar', v_ar),
    'transmissoes', v_ls
  );
end;
$fn$;

grant execute on function admin_lives(text) to anon, authenticated;

notify pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════
-- PASSO 2 · CRIE A SUA CHAVE DE PAINEL
-- Rode SÓ o comando abaixo, numa query nova, e guarde o que ele
-- devolver no seu gerenciador de senhas.
-- ══════════════════════════════════════════════════════════════════
--
--   insert into admin_keys (key, nome)
--   values (encode(gen_random_bytes(16),'hex'), 'Daniel')
--   returning key;
--
--
-- CONFERÊNCIA · tudo no lugar?
--
--   select * from bc_create();          -- deve devolver duas chaves
--   select admin_lives('SUA_CHAVE');    -- deve devolver um JSON
--
--   select id, public, file_size_limit, allowed_mime_types
--     from storage.buckets where id = 'logos';
--
-- Se o app disser que uma função "não existe" mas ela aparece aqui,
-- é o cache da API. Rode:   notify pgrst, 'reload schema';
-- ══════════════════════════════════════════════════════════════════
