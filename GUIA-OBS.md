# Level BT · Placar de transmissão — guia de instalação

Tudo que precisa ser feito, na ordem. São três partes: **Supabase**, **GitHub** e **OBS**.

---

## PARTE 1 · SUPABASE (uma vez só)

O overlay roda dentro do OBS sem login nenhum. Para ele conseguir ler o placar sem
que a gente abra o banco para o mundo, existe um caminho controlado: uma tabela
trancada e três funções.

### O que fazer

1. Entre no painel do Supabase e abra o projeto do Level BT.
2. No menu da esquerda, clique em **SQL Editor**.
3. Clique em **New query**.
4. Abra o arquivo `placar-supabase.sql` (está na pasta do projeto), copie **todo** o
   conteúdo e cole no editor.
5. Clique em **Run**.

Deve aparecer *Success. No rows returned*. É o esperado.

### Como conferir que deu certo

Ainda no SQL Editor, rode:

```sql
select * from bc_create();
```

Tem que voltar uma linha com duas colunas, `token` e `control_key`, preenchidas com
códigos aleatórios. Se voltou, está funcionando.

Para limpar esse teste:

```sql
delete from broadcasts where payload = '{}'::jsonb;
```

### O que foi criado

| Item | Para que serve |
|---|---|
| tabela `broadcasts` | guarda o placar de cada transmissão · fica **trancada**, ninguém acessa direto |
| `bc_create()` | cria uma transmissão e devolve as duas chaves |
| `bc_read(token)` | o overlay do OBS usa · devolve **só** o placar daquela partida |
| `bc_write(control_key, payload)` | o celular usa para atualizar o placar |

São duas chaves porque elas têm papéis diferentes: o **token** é público e só lê;
a **control_key** é secreta e fica no celular de quem marca o ponto.

---

## PARTE 2 · GITHUB (publicar os arquivos)

No terminal do Mac:

```bash
cd ~/games-for-evolution
rm -f .git/index.lock
git add placar.html placar-supabase.sql GUIA-PLACAR-OBS.md
git commit -m "Placar de transmissao com overlay para OBS"
git push
```

Espere de 30 segundos a 2 minutos. Acompanhe em **GitHub → aba Actions** até ficar
verde. Se ficar preso em *"Ready to deploy"*, abra o run e veja se há um botão
**"Review deployments"** para aprovar.

### Os endereços depois do deploy

| O quê | Endereço |
|---|---|
| Controle (celular) | `https://dlrds.github.io/games-for-evolution/placar.html` |
| Demonstração (OBS) | `https://dlrds.github.io/games-for-evolution/placar.html?overlay=demo` |
| Overlay real (OBS) | o link que o app gera, com `?overlay=SEU_TOKEN` |

---

## PARTE 3 · OBS

### Adicionar o overlay

1. Na janela **Fontes**, clique em **+**
2. Escolha **Navegador** (*Browser*)
3. Dê um nome, por exemplo `Placar Level BT`, e confirme
4. Preencha:

| Campo | Valor |
|---|---|
| URL | o endereço do overlay (comece pela demonstração) |
| Largura | **1920** |
| Altura | **1080** |
| CSS personalizado | deixe como está — o padrão do OBS já deixa o fundo transparente |
| Desligar fonte quando não estiver visível | **marcar** |
| Atualizar navegador quando a cena ficar ativa | **marcar** |

5. Clique em **OK**

O placar aparece já transparente. Coloque a câmera ou uma imagem numa camada
**abaixo** dele na lista de fontes.

> A ordem importa: no OBS, o que está **em cima** na lista aparece **na frente**.

### Ajustar posição

O overlay já vem posicionado para 1920×1080. Se a sua cena tiver outra resolução,
selecione a fonte no palco e use **Ctrl+F** (ou clique direito → *Transformar →
Ajustar à tela*).

---

## ORDEM DE TESTE (importante)

Faça nesta sequência. Cada etapa isola um problema diferente.

### 1. Demonstração no navegador
Abra no computador:
`https://dlrds.github.io/games-for-evolution/placar.html?overlay=demo`

Você deve ver, em cima de um fundo preto: a cartela de abertura, depois o placar
correndo sozinho, quebra de saque, match point e a cartela do vencedor. Reinicia
sozinho depois.

**Se falhar aqui:** é problema da página, não do OBS. Me avise.

### 2. Demonstração dentro do OBS
Mesma URL, agora como fonte Navegador. Confirme que o fundo é transparente e que
as animações rodam.

**Se falhar aqui:** é o OBS. Cheque largura/altura e se o computador está com internet
(as fontes vêm do Google Fonts).

### 3. Placar real, com o celular
No celular, abra `placar.html`, preencha os nomes, toque em **Gerar placar e link do OBS**,
copie a URL e troque no OBS. Marque alguns pontos no celular e veja se muda na tela.

**Se falhar aqui:** é o Supabase. Confira se o SQL da Parte 1 rodou.

Faça esse teste **antes do dia do torneio**, não na hora.

---

## COMO USAR NO DIA

1. No celular: abra `placar.html`, preencha as duas duplas, torneio, categoria, fase e
   quadra. Escolha games (4 ou 6), tiebreak (7 ou 10) e sets (1 ou 3).
2. Toque em **Gerar placar e link do OBS** e copie o link.
3. No OBS, cole o link na fonte Navegador.
4. Toque em **Mostrar cartela da partida** para a abertura entrar na tela (fica 9 segundos).
5. Durante o jogo, toque no bloco da dupla que fez o ponto. Só isso.

Os botões extras: **Desfazer** volta um ponto, **Trocar saque** corrige quem está
sacando, **Encerrar partida** força o fim.

O placar sincroniza sozinho, com atraso de menos de 1 segundo.

---

## SE DER PROBLEMA

**O placar não aparece no OBS**
Confirme a URL (tem que ter `?overlay=` com o token). Clique direito na fonte →
*Atualizar*. Verifique se a fonte está acima da câmera na lista.

**Aparece um fundo preto em vez de transparente**
No CSS personalizado da fonte, confirme que está o padrão do OBS:
`body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }`

**As fontes saem erradas (sem a Archivo Black)**
O computador do OBS precisa de internet — as fontes vêm do Google Fonts.

**"Não consegui criar a transmissão"** ao gerar o placar
O SQL da Parte 1 não rodou, ou rodou com erro. Volte e refaça.

**O placar trava e não atualiza**
Cheque a internet do celular. A mensagem embaixo do marcador mostra a hora da última
sincronização — se ela parou de avançar, é conexão.

**Perdi o link do overlay**
No celular, dentro do marcador, toque em **Ver link do OBS**. Enquanto não recarregar
a página, o link continua lá.

---

## LIMITAÇÕES CONHECIDAS

- Se recarregar a página do celular no meio do jogo, o placar em andamento se perde.
  Evite fechar o navegador durante a partida.
- Chaveamento, tela de campeão e o formato vertical 9:16 ainda não foram feitos.
- A sincronização é por consulta a cada 0,9 segundo — imperceptível na transmissão,
  mas não é instantânea.
