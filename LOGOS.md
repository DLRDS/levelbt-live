# Logos dos patrocinadores

Para você poder enviar a logo direto do celular, na página do placar.

**Isto não é SQL.** O Supabase deixou de permitir configurar o storage
pelo SQL Editor — `storage.objects` passou a ser propriedade da
plataforma, e qualquer `create policy` ali falha com *must be owner of
table objects*. Pior: como o SQL Editor roda o arquivo inteiro como uma
transação só, esse erro desfazia tudo que vinha antes no mesmo arquivo.
Por isso a configuração das logos saiu do `banco.sql` e virou isto aqui,
feito pelo painel.

São dois passos, uns dois minutos.

## 1 · Criar o balde

No painel do Supabase do projeto **levelbt-live**:

**Storage** → **New bucket**

- **Name:** `logos`
- **Public bucket:** ligado — tem que ser, o OBS busca a imagem sem login
- Abra as opções adicionais, se houver, e preencha:
  - **File size limit:** `2` MB
  - **Allowed MIME types:** `image/png, image/jpeg, image/webp`

Salve.

> **SVG fica de fora de propósito.** SVG é um documento que pode carregar
> script dentro; PNG e JPEG não. Se a lista de tipos permitir SVG,
> alguém pode subir um arquivo que não é só uma imagem.

## 2 · Permitir o envio

Ainda em **Storage**, abra **Policies** (ou a aba *Configuration →
Policies*, conforme a versão do painel) e crie uma política no balde
`logos`:

- **Policy name:** `logos envio`
- **Allowed operation:** `INSERT`
- **Target roles:** `anon` e `authenticated`
- Na expressão, deixe: `bucket_id = 'logos'`

Salve.

Leitura não precisa de política: balde público já é lido por qualquer um
pela URL pública, que é exatamente o que o OBS usa.

## Conferindo

No placar, abra **Patrocinadores** → **Escolher a logo** e envie um PNG.
Se aparecer *LOGO NO AR* e a imagem surgir na lista, está pronto.

Se der erro, a mensagem vem crua do Supabase — me mande o texto exato.

## O que isso abre, e o que não abre

O balde aceita envio **sem login**. Quem ler o código da página encontra
a chave pública e consegue subir imagens para lá. Isso é consciente, e o
que limita o estrago é:

- só entram imagens — png, jpeg e webp, nada de script ou HTML
- no máximo 2 MB por arquivo
- o balde é só de logos; nada do placar ou das transmissões passa por ele
- **nada entra no ar sozinho**: só aparece na transmissão a logo que você
  escolher na página do placar

Se um dia isso incomodar, o caminho é exigir login para enviar — aí o
operador do placar precisaria entrar com conta antes do torneio.
