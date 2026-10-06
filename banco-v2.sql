-- ══════════════════════════════════════════════════════════════════
-- LEVEL BT LIVE · ORDEM DAS GRAVAÇÕES
--
-- O QUE ISTO RESOLVE
--   Cada toque no celular manda o placar inteiro para cá. Essas mensagens
--   viajam pela internet e NÃO chegam necessariamente na ordem em que
--   saíram: a segunda pode passar a primeira. Quando isso acontece, o
--   placar da transmissão anda para trás por um instante.
--
--   Até aqui o banco aceitava tudo, sempre — a última a chegar vencia,
--   fosse ela a mais recente ou não.
--
-- COMO FUNCIONA AGORA
--   Todo placar carrega um número de ordem, o campo "v", que sobe a cada
--   mudança. O banco passa a recusar qualquer gravação com número MENOR
--   OU IGUAL ao que já está guardado. Mensagem atrasada não entra.
--
--   O navegador também tem uma fila que evita o problema na origem. Esta
--   guarda aqui é a segunda camada: protege do que a fila não enxerga —
--   duas abas abertas, um celular e um computador marcando ao mesmo
--   tempo, ou um reenvio automático do próprio navegador.
--
-- POR QUE O "v" NUNCA VOLTA PARA TRÁS
--   Dentro de uma mesma transmissão ele só sobe. Trocar de jogo pela fila
--   (trocarJogo) e retomar a transmissão salva PRESERVAM o número. Ele só
--   nasce em zero em novaPartida(), e essa só roda quando uma transmissão
--   nova acaba de ser criada — numa linha cujo payload ainda está vazio,
--   sem "v" nenhum para comparar. Por isso payload sem "v" é sempre
--   aceito: é a primeira gravação da vida daquela transmissão.
--
-- O QUE MUDA PARA QUEM CHAMA
--   bc_write devolvia true/false. Agora devolve um objeto:
--
--     {"ok":true,  "motivo":"gravado", "v":42}
--     {"ok":false, "motivo":"antigo",  "v":42}   ← chegou fora de ordem
--     {"ok":false, "motivo":"chave"}             ← chave de controle errada
--
--   "antigo" NÃO é erro: é o sistema funcionando. Quem chama deve tratar
--   como gravação desnecessária, sem alarme para o operador.
--
-- O QUE ESTA GUARDA NÃO FAZ
--   Ela cuida de ORDEM, não de segurança. Se alguém com a chave de
--   controle gravar um payload com "v" em texto ("v":"muitos"), a
--   comparação deixa de acontecer até um número voltar — o campo gravado
--   não é mais um número para comparar contra.
--
--   Isso é aceito de propósito: só escreve aqui quem já tem a chave de
--   controle, e quem tem a chave já pode gravar o placar que quiser. A
--   guarda não perde nada que ela prometesse ter. O placar do Level BT
--   sempre manda "v" numérico.
--
--   Testado contra o banco de verdade: payload nulo, array, "v" em texto,
--   negativo e gigante. Nenhum derruba a função.
--
-- Rode DEPOIS do banco.sql e do banco-obs.sql. É seguro rodar de novo.
-- ══════════════════════════════════════════════════════════════════


-- O tipo de retorno muda (boolean → jsonb), e o Postgres não deixa trocar
-- isso com "create or replace". Tem de derrubar a função antes.
drop function if exists bc_write(text, jsonb);

create or replace function bc_write(p_control_key text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id    uuid;
  v_novo  bigint;
  v_velho bigint;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    return jsonb_build_object('ok', false, 'motivo', 'payload');
  end if;

  -- Só conta como número de ordem se for mesmo um número. Texto, nulo ou
  -- campo ausente viram "não sei", e aí a comparação não acontece — o
  -- comportamento antigo, de aceitar, continua valendo.
  v_novo := case when jsonb_typeof(p_payload->'v') = 'number'
                 then floor((p_payload->>'v')::numeric)::bigint
                 else null end;

  -- "for update" segura a linha até o fim desta função. Duas gravações
  -- simultâneas da mesma transmissão passam a ser atendidas em fila, uma
  -- enxergando o resultado da outra. Sem isso, as duas poderiam ler o
  -- mesmo "v" velho e as duas se achariam mais novas.
  select b.id,
         case when jsonb_typeof(b.payload->'v') = 'number'
              then floor((b.payload->>'v')::numeric)::bigint
              else null end
    into v_id, v_velho
    from broadcasts b
   where b.control_key = p_control_key
   for update;

  if v_id is null then
    return jsonb_build_object('ok', false, 'motivo', 'chave');
  end if;

  if v_novo is not null and v_velho is not null and v_novo <= v_velho then
    return jsonb_build_object('ok', false, 'motivo', 'antigo', 'v', v_velho);
  end if;

  update broadcasts
     set payload = p_payload, updated_at = now()
   where id = v_id;

  return jsonb_build_object('ok', true, 'motivo', 'gravado',
                            'v', coalesce(v_novo, v_velho));
end;
$$;

grant execute on function bc_write(text, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════
-- CONFERÊNCIA
-- ══════════════════════════════════════════════════════════════════
--
-- Troque CHAVE pela control_key de uma transmissão de teste:
--
--   select bc_write('CHAVE', '{"t1":["A"],"t2":["B"],"v":10}'::jsonb);
--   → {"ok": true, "v": 10, "motivo": "gravado"}
--
--   select bc_write('CHAVE', '{"t1":["A"],"t2":["B"],"v":9}'::jsonb);
--   → {"ok": false, "v": 10, "motivo": "antigo"}      e o placar não mudou
--
--   select bc_write('CHAVE', '{"t1":["A"],"t2":["B"],"v":11}'::jsonb);
--   → {"ok": true, "v": 11, "motivo": "gravado"}
--
--   select bc_write('nao-existe', '{"v":1}'::jsonb);
--   → {"ok": false, "motivo": "chave"}
--
-- Se o painel disser que bc_write "não existe" logo depois de rodar isto,
-- é o cache da API. Rode:   notify pgrst, 'reload schema';
-- ══════════════════════════════════════════════════════════════════
