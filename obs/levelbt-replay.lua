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
-- O QUE O REPLAY MOSTRA
--   O Replay Buffer do OBS grava a SAÍDA DO PROGRAMA — o que foi ao ar.
--   Então ele já mostra a câmera, ou a mídia, ou o que estiver na cena ao
--   vivo. Não existe aqui escolha de fonte: não é o script que grava.
--   Se a sua Fonte de Mídia aparece vazia, é porque o arquivo não chegou
--   nela — e é disso que o registro abaixo trata.
--
-- COMO USAR
--   1 · Ferramentas → Scripts → + → escolha este arquivo
--   2 · Em "Fonte de Mídia", escolha a fonte que fica na cena do replay
--   3 · Aperte "Carregar o último replay agora" para conferir
--
--   O Replay Buffer precisa estar LIGADO, senão não há o que salvar.
--
-- ONDE LER OS AVISOS
--   Ferramentas → Scripts → aba "Log do script". Cada etapa escreve ali.
-- ══════════════════════════════════════════════════════════════════

obs = obslua

fonte_midia    = ""
ultimo_arquivo = ""
tentativas     = 0

-- O arquivo demora um instante para ficar pronto depois de salvo. Em vez
-- de supor um tempo, tentamos algumas vezes e desistimos com elegância.
local MAX_TENTATIVAS = 15      -- 15 × 200ms = 3 segundos de paciência
local INTERVALO_MS   = 200

local function aviso(texto)
  obs.script_log(obs.LOG_WARNING, "Level BT: " .. texto)
end

local function nota(texto)
  obs.script_log(obs.LOG_INFO, "Level BT: " .. texto)
end

-- Põe o caminho na Fonte de Mídia. Devolve true se conseguiu.
local function entregar(caminho)
  if fonte_midia == nil or fonte_midia == "" then
    aviso("nenhuma Fonte de Midia escolhida. Abra as propriedades deste " ..
          "script e selecione a fonte que fica na cena do replay.")
    return false
  end

  local fonte = obs.obs_get_source_by_name(fonte_midia)
  if fonte == nil then
    aviso("nao achei fonte chamada '" .. fonte_midia .. "'. O nome mudou? " ..
          "Reabra as propriedades do script e escolha de novo.")
    return false
  end

  local tipo = obs.obs_source_get_id(fonte)
  local ok = false

  if tipo == "ffmpeg_source" then
    local ajustes = obs.obs_data_create()
    obs.obs_data_set_bool(ajustes, "is_local_file", true)
    obs.obs_data_set_string(ajustes, "local_file", caminho)
    obs.obs_data_set_bool(ajustes, "looping", false)       -- tocar UMA vez
    obs.obs_data_set_bool(ajustes, "restart_on_activate", true)
    obs.obs_source_update(fonte, ajustes)
    obs.obs_data_release(ajustes)
    ok = true

  elseif tipo == "vlc_source" then
    local ajustes = obs.obs_data_create()
    local lista = obs.obs_data_array_create()
    local item  = obs.obs_data_create()
    obs.obs_data_set_string(item, "value", caminho)
    obs.obs_data_array_push_back(lista, item)
    obs.obs_data_set_array(ajustes, "playlist", lista)
    obs.obs_data_set_string(ajustes, "loop", "false")
    obs.obs_source_update(fonte, ajustes)
    obs.obs_data_release(item)
    obs.obs_data_array_release(lista)
    obs.obs_data_release(ajustes)
    ok = true

  else
    aviso("'" .. fonte_midia .. "' e do tipo '" .. tostring(tipo) ..
          "', nao e uma Fonte de Midia. Crie uma fonte do tipo " ..
          "'Fonte de Midia' na cena do replay e escolha ela aqui.")
  end

  obs.obs_source_release(fonte)
  if ok then nota("carregado em '" .. fonte_midia .. "': " .. caminho) end
  return ok
end

-- Pergunta ao buffer qual foi o último arquivo. Devolve nil com motivo.
local function ultimo_replay()
  local buffer = obs.obs_frontend_get_replay_buffer_output()
  if buffer == nil then
    return nil, "o Replay Buffer nao existe nesta sessao do OBS. " ..
                "Configuracoes -> Saida -> marque 'Habilitar buffer de " ..
                "repeticao', aplique, e ligue o buffer na janela principal."
  end

  local cd = obs.calldata_create()
  local ph = obs.obs_output_get_proc_handler(buffer)
  obs.proc_handler_call(ph, "get_last_replay", cd)
  local caminho = obs.calldata_string(cd, "path")
  obs.calldata_destroy(cd)
  obs.obs_output_release(buffer)

  if caminho == nil or caminho == "" then
    return nil, "o buffer nao tem nenhum replay salvo ainda. Ele esta " ..
                "LIGADO? (botao 'Iniciar buffer de repeticao')"
  end
  return caminho, nil
end

function carregar_replay()
  local caminho, motivo = ultimo_replay()

  if caminho == nil then
    -- sem buffer é definitivo: não vale insistir
    aviso(motivo)
    obs.remove_current_callback()
    return
  end

  -- ainda é o mesmo de antes: o novo não ficou pronto
  if caminho == ultimo_arquivo then
    tentativas = tentativas + 1
    if tentativas >= MAX_TENTATIVAS then
      aviso("o replay foi salvo mas o arquivo novo nao apareceu em " ..
            (MAX_TENTATIVAS * INTERVALO_MS / 1000) .. "s. Ultimo conhecido: " ..
            caminho)
      obs.remove_current_callback()
    end
    return
  end

  ultimo_arquivo = caminho
  entregar(caminho)
  obs.remove_current_callback()
end

-- É aqui que este script se diferencia do que vem com o OBS: ele reage
-- ao evento, não a um atalho. Qualquer coisa que salve o buffer dispara.
function ao_evento(evento)
  if evento == obs.OBS_FRONTEND_EVENT_REPLAY_BUFFER_SAVED then
    nota("o OBS salvou um replay. Procurando o arquivo...")
    tentativas = 0
    obs.timer_remove(carregar_replay)
    obs.timer_add(carregar_replay, INTERVALO_MS)
  end
end

-- Botão de conferência: não espera evento nenhum, pega o que já existe.
-- Serve para separar "o buffer não salva" de "o script não entrega".
function botao_agora()
  local caminho, motivo = ultimo_replay()
  if caminho == nil then aviso(motivo); return false end
  nota("ultimo replay no buffer: " .. caminho)
  ultimo_arquivo = caminho
  entregar(caminho)
  return false
end

function script_description()
  return [[<b>Level BT · carregar o replay recém-salvo</b><br><br>
Sempre que o Replay Buffer salvar um arquivo — pelo botão do Level BT,
pelo atalho do OBS ou por qualquer outro caminho — este script carrega o
vídeo novo na Fonte de Mídia escolhida abaixo.<br><br>
Diferente do <i>instant-replay.lua</i> que vem com o OBS, este não depende
de atalho de teclado: ele ouve o evento.<br><br>
<b>O Replay Buffer precisa estar ligado.</b> Se a fonte aparecer vazia,
aperte o botão de conferência e leia a aba <i>Log do script</i>.]]
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

  obs.obs_properties_add_button(props, "agora",
    "Carregar o último replay agora", botao_agora)

  return props
end

function script_update(settings)
  fonte_midia = obs.obs_data_get_string(settings, "fonte")
end

function script_load(settings)
  obs.obs_frontend_add_event_callback(ao_evento)
  nota("script carregado. Ouvindo o evento de replay salvo.")
end

function script_unload()
  obs.timer_remove(carregar_replay)
  obs.obs_frontend_remove_event_callback(ao_evento)
end
