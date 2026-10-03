-- ══════════════════════════════════════════════════════════════════
-- LEVEL BT LIVE · CANAL DE VOLTA DO OVERLAY
--
-- O QUE ISTO RESOLVE
--   Até aqui a informação só ia numa direção: o celular escrevia o
--   placar, o overlay lia. Agora o overlay precisa CONTAR algo de volta
--   — se está rodando dentro do OBS, que permissão tem, quais cenas
--   existem — para o painel saber o que oferecer.
--
-- POR QUE UMA COLUNA À PARTE
--   O overlay só tem o token, que é público: quem souber o endereço do
--   OBS o conhece. Se ele pudesse escrever no payload, qualquer um com
--   esse endereço mexeria no placar ao vivo. Então o overlay escreve
--   numa coluna separada, que não encosta no jogo.
--
-- O QUE AINDA DÁ PARA FAZER DE ERRADO
--   Quem tiver o token consegue gravar informação falsa sobre o OBS.
--   O estrago é cosmético: o painel mostraria capacidade que não existe,
--   e o comando simplesmente não funcionaria. Nada do placar se perde.
--
--   O que NÃO dá: mandar tipo errado e derrubar a função, forjar a hora
--   do último contato, ou escrever campo que não está na lista. Testado
--   contra o banco de verdade.
--
-- Rode DEPOIS do banco.sql. É seguro rodar mais de uma vez.
-- ══════════════════════════════════════════════════════════════════

alter table broadcasts add column if not exists obs jsonb;

-- ── O overlay conta o que encontrou ───────────────────────────────
-- Só aceita as chaves que a gente usa, e cada uma com o tipo certo.
-- Assim não vira depósito de qualquer coisa que mandarem.
create or replace function bc_obs(p_token text, p_info jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_limpo jsonb;
  v_n int;
begin
  if p_info is null or jsonb_typeof(p_info) <> 'object' then
    return false;
  end if;

  v_limpo := jsonb_build_object(
    -- comparação de jsonb, sem cast: qualquer coisa que não seja true
    -- vira false. Com ::boolean direto, um "sim" derrubava a função
    -- inteira em vez de ser descartado.
    'dentro', (p_info->'dentro' = 'true'::jsonb),

    -- só converte se for mesmo um número, e prende entre 0 e 5
    'nivel',  case when jsonb_typeof(p_info->'nivel')='number'
                   then least(greatest(floor((p_info->>'nivel')::numeric)::int, 0), 5)
                   else 0 end,

    'versao', left(coalesce(p_info->>'versao',''), 40),

    'cenas',  coalesce(
                (select jsonb_agg(left(x,60))
                   from (select jsonb_array_elements_text(
                           case when jsonb_typeof(p_info->'cenas')='array'
                                then p_info->'cenas' else '[]'::jsonb end) as x
                         limit 40) t),
                '[]'::jsonb),

    'cena',   left(coalesce(p_info->>'cena',''), 60),

    -- a hora é sempre do servidor: não dá para forjar "visto agora"
    'em',     extract(epoch from now())::bigint
  );

  update broadcasts set obs = v_limpo where token = p_token;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

-- ── O painel recebe junto com o placar ────────────────────────────
-- Vem como "_obs" para ficar claro que não faz parte da partida: o
-- controle apaga esse campo antes de gravar de volta.
create or replace function bc_read(p_token text)
returns jsonb
language sql
security definer
set search_path = public, extensions
as $$
  select case
           when b.obs is null then b.payload
           else b.payload || jsonb_build_object('_obs', b.obs)
         end
    from broadcasts b
   where b.token = p_token;
$$;

grant execute on function bc_obs(text, jsonb) to anon, authenticated;
grant execute on function bc_read(text)       to anon, authenticated;

notify pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════
-- CONFERÊNCIA
-- ══════════════════════════════════════════════════════════════════
--
--   select bc_obs('UM_TOKEN', '{"dentro":true,"nivel":4,"cenas":["Quadra"]}'::jsonb);
--   select bc_read('UM_TOKEN');     -- deve trazer o campo _obs
--
-- Para ver o que cada overlay reportou:
--   select token, obs->>'dentro' as dentro, obs->>'nivel' as nivel,
--          to_timestamp((obs->>'em')::bigint) as visto
--     from broadcasts where obs is not null order by updated_at desc;
-- ══════════════════════════════════════════════════════════════════
