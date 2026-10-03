-- ══════════════════════════════════════════════════════════════════
-- LEVEL BT LIVE · carregar o replay recém-salvo
--
-- POR QUE ISTO EXISTE
--   O OBS vem com o script instant-replay.lua, que faz quase isto. Mas
--   ele pendura TUDO num atalho de teclado próprio: o mesmo atalho salva
--   o buffer e carrega o arquivo. Quando o replay é salvo por fora —
--   como o nosso overlay faz, pelo comando do celular — o script não
--   fica sabendo e a Fonte de Mídia continua com o vídeo antigo.
--
--   Este aqui não tem atalho. Ele ouve o EVENTO de "replay salvo", venha
--   de onde vier: do nosso botão, do atalho do OBS, de qualquer lugar.
--
-- COMO USAR
--   1 · Ferramentas → Scripts → + → escolha este arquivo
--   2 · Em "Fonte de Mídia", escolha a fonte que fica na cena do replay
--   3 · Pronto. Não precisa configurar atalho nenhum.
--
--   O Replay Buffer precisa estar ligado, senão não há o que salvar.
-- ══════════════════════════════════════════════════════════════════

obs = obslua

fonte_midia  = ""
ultimo_arquivo = ""
tentativas   = 0

-- O arquivo demora um instante para ficar pronto depois de salvo. Em vez
-- de supor um tempo, tentamos algumas vezes e desistimos com elegância.
local MAX_TENTATIVAS = 15      -- 15 × 200ms = 3 segundos de paciência
local INTERVALO_MS   = 200

function carregar_replay()
  local buffer = obs.obs_frontend_get_replay_buffer_output()
  if buffer == nil then
    obs.remove_current_callback()
    return
  end

  -- pergunta ao buffer qual foi o último arquivo gravado
  local cd = obs.calldata_create()
  local ph = obs.obs_output_get_proc_handler(buffer)
  obs.proc_handler_call(ph, "get_last_replay", cd)
  local caminho = obs.calldata_string(cd, "path")
  obs.calldata_destroy(cd)
  obs.obs_output_release(buffer)

  -- ainda é o mesmo de antes: o novo não ficou pronto
  if caminho == nil or caminho == ultimo_arquivo then
    tentativas = tentativas + 1
    if tentativas >= MAX_TENTATIVAS then
      obs.script_log(obs.LOG_WARNING,
        "Level BT: o replay foi salvo mas o arquivo nao apareceu a tempo.")
      obs.remove_current_callback()
    end
    return
  end

  ultimo_arquivo = caminho

  local fonte = obs.obs_get_source_by_name(fonte_midia)
  if fonte == nil then
    obs.script_log(obs.LOG_WARNING,
      "Level BT: nao achei a Fonte de Midia chamada '" .. fonte_midia ..
      "'. Confira o nome nas propriedades do script.")
    obs.remove_current_callback()
    return
  end

  local ajustes = obs.obs_data_create()
  local tipo = obs.obs_source_get_id(fonte)

  if tipo == "ffmpeg_source" then
    obs.obs_data_set_string(ajustes, "local_file", caminho)
    obs.obs_data_set_bool(ajustes, "is_local_file", true)
    -- atualizar já reinicia a reprodução se a fonte estiver no ar
    obs.obs_source_update(fonte, ajustes)

  elseif tipo == "vlc_source" then
    local lista = obs.obs_data_array_create()
    local item  = obs.obs_data_create()
    obs.obs_data_set_string(item, "value", caminho)
    obs.obs_data_array_push_back(lista, item)
    obs.obs_data_set_array(ajustes, "playlist", lista)
    obs.obs_source_update(fonte, ajustes)
    obs.obs_data_release(item)
    obs.obs_data_array_release(lista)

  else
    obs.script_log(obs.LOG_WARNING,
      "Level BT: '" .. fonte_midia .. "' nao e uma Fonte de Midia.")
  end

  obs.obs_data_release(ajustes)
  obs.obs_source_release(fonte)
  obs.remove_current_callback()
end

-- É aqui que este script se diferencia do que vem com o OBS: ele reage
-- ao evento, não a um atalho. Qualquer coisa que salve o buffer dispara.
function ao_evento(evento)
  if evento == obs.OBS_FRONTEND_EVENT_REPLAY_BUFFER_SAVED then
    tentativas = 0
    obs.timer_remove(carregar_replay)
    obs.timer_add(carregar_replay, INTERVALO_MS)
  end
end

function script_description()
  return [[<b>Level BT · carregar o replay recém-salvo</b><br><br>
Sempre que o Replay Buffer salvar um arquivo — pelo botão do Level BT,
pelo atalho do OBS ou por qualquer outro caminho — este script carrega o
vídeo novo na Fonte de Mídia escolhida abaixo.<br><br>
Diferente do <i>instant-replay.lua</i> que vem com o OBS, este não depende
de atalho de teclado: ele ouve o evento.<br><br>
O Replay Buffer precisa estar ligado.]]
end

function script_properties()
  local props = obs.obs_properties_create()
  local lista = obs.obs_properties_add_list(props, "fonte", "Fonte de Mídia",
                  obs.OBS_COMBO_TYPE_EDITABLE, obs.OBS_COMBO_FORMAT_STRING)

  local fontes = obs.obs_enum_sources()
  if fontes ~= nil then
    for _, f in ipairs(fontes) do
      local tipo = obs.obs_source_get_id(f)
      if tipo == "ffmpeg_source" or tipo == "vlc_source" then
        local nome = obs.obs_source_get_name(f)
        obs.obs_property_list_add_string(lista, nome, nome)
      end
    end
  end
  obs.source_list_release(fontes)

  return props
end

function script_update(settings)
  fonte_midia = obs.obs_data_get_string(settings, "fonte")
end

function script_load(settings)
  obs.obs_frontend_add_event_callback(ao_evento)
end

function script_unload()
  obs.timer_remove(carregar_replay)
end
