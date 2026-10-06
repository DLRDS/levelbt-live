# Level BT Live

Placar de transmissão para torneios de beach tennis. Um celular marca o
ponto, o OBS mostra o placar na tela com as animações da marca.

É um produto **separado** do app Level BT: outro repositório, outro
endereço, outro banco. Os dois não conversam.

```
index.html     o produto inteiro — controle e overlay no mesmo arquivo
banco.sql      transmissões e painel        ← rode 1º
banco-obs.sql  o canal de volta do overlay  ← rode 2º
banco-v2.sql   a ordem das gravações        ← rode 3º
LOGOS.md       as logos, que se configuram pelo painel e não por SQL
GUIA-OBS.md    como ligar no OBS
COMANDO-OBS.md comandar o OBS pelo celular (replay, cenas)
testes/        node testes/placar.js
```

Os três arquivos de banco rodam **nessa ordem**, uma vez cada, no SQL
Editor do Supabase. Todos são seguros para rodar de novo.

## Como o arquivo funciona

Uma página, dois modos, decididos pelo endereço:

| endereço | o que abre |
|---|---|
| `index.html` | o painel de controle (celular ou computador) |
| `index.html?overlay=TOKEN` | a camada transparente 1920×1080 para o OBS |
| `index.html?overlay=demo` | uma partida fingida, que joga sozinha |

Cada transmissão nasce com duas chaves: o **token**, público, que vai na
URL do overlay e só lê; e a **chave de controle**, secreta, que fica no
aparelho de quem marca e só escreve. O OBS nunca consegue alterar o
placar, e quem marca nunca precisa de login.

## Para pôr de pé

**1.** Crie um projeto novo no Supabase. Não reaproveite o do app.

**2.** No SQL Editor, rode o `banco.sql` inteiro. Depois rode o comando
do PASSO 2, no fim do arquivo, e guarde a chave de painel que ele
devolver.

> O SQL Editor roda o arquivo como **uma transação só**. Se qualquer
> comando falhar, tudo é desfeito — inclusive o que já tinha passado.
> Um erro de "relation não existe" logo depois costuma ser isso.

**2a.** Rode o `banco-obs.sql` e depois o `banco-v2.sql`, nessa ordem.
O primeiro abre o canal de volta do overlay (sem ele, o painel não enxerga
o OBS). O segundo faz o banco recusar placar que chegue fora de ordem —
sem ele tudo funciona, só sem essa proteção.

**2b.** Siga o `LOGOS.md` para habilitar o envio de logos. São dois
cliques no painel; não dá para fazer por SQL.

**3.** Em Settings → API, copie a URL e a chave pública (`anon`). Abra o
`index.html` e troque as duas primeiras linhas da configuração:

```js
const SUPA_URL='COLE_AQUI_A_URL_DO_PROJETO';
const SUPA_KEY='COLE_AQUI_A_CHAVE_PUBLICA';
```

**4.** Publique no GitHub Pages (Settings → Pages → branch `main`).

**5.** Confira abrindo `.../index.html?overlay=demo`. Se a partida
começar a jogar sozinha, está tudo no lugar.

## Uma coisa sobre a chave pública

A chave `anon` fica visível no código da página. É assim que tem que ser
— o navegador precisa dela. O que protege os dados é o RLS: as tabelas
estão trancadas e todo acesso passa por funções que decidem o que cada
um pode ver. A chave sozinha não abre nada.

A exceção consciente é o balde de logos, que aceita envio sem login.
O `LOGOS.md` explica o porquê e o que limita o estrago.

## No dia do torneio

Abra o controle no celular ou no computador, monte a fila da quadra (ou
cole da planilha), e use **JOGAR** para trocar de partida. O link do OBS
é da quadra, não do jogo: ele fica igual do primeiro ao último jogo.

O botão no topo alterna entre **celular** e **computador** — ele escolhe
sozinho pelo tamanho da tela, e três cliques giram entre automático,
celular fixo e computador fixo.

### Preview da live

Cole o link da sua transmissão no YouTube e a caixa de preview mostra o
vídeo com o placar sobreposto, do jeito que está indo ao ar. O placar
ali não é uma imitação: é o próprio overlay rodando, o mesmo arquivo que
o OBS recebe, só encolhido para caber.

Serve para conferir se o placar está bem posicionado sobre a imagem real
da quadra, sem precisar sair da tela de controle.

> Se o vídeo não aparecer, o canal pode ter o embed desativado. Nesse
> caso o placar continua indo ao ar normalmente — só o preview aqui
> dentro é que não funciona.

### Formatos de partida

Seguem a ITF (Rules of Beach Tennis 2025):

| opção | o que é |
|---|---|
| **1 SET** | um set só decide |
| **2 SETS** | até 2 sets; empatando em 1 a 1, um match tiebreak até 10 decide — é o formato padrão da ITF |
| **3 SETS** | melhor de 3 sets inteiros, o terceiro é set normal |

Em todos: set de 6 games com 2 de vantagem (ou 4, no set curto), tiebreak
em 6—6 até 7 pontos, e **ponto de ouro obrigatório** em 40—40. No beach
tennis não existe vantagem — a regra 8 da ITF chama de *deciding point*,
e por aqui é o quarentão.

### Tamanho do placar

Fixo em 60%, que é a proporção que deixa a quadra respirar sem perder a
leitura. Não há controle na tela de propósito: é decisão de produto, não
de operação. Se um dia precisar mudar, é uma linha no CSS — `--esc`.

### Quando a internet pisca

O celular não desiste. Se um envio falha, ele tenta de novo sozinho —
1s, 2s, 4s, 8s e daí de 10 em 10 segundos, sem parar. Cada tentativa
manda o placar **de agora**, não o que falhou: se a conexão voltar depois
de três pontos, chega o placar correto de uma vez, não três mensagens
atrasadas.

A linha embaixo do painel conta o que está acontecendo:

| o que aparece | o que significa |
|---|---|
| `Sincronizado · 14:32:07` | tudo certo |
| `Sem conexão · tentando de novo (3ª vez)` | está fora, mas insistindo |
| `Sincronizado de novo · 14:32:19` | voltou — some sozinho em 6s |
| `Chave de controle não confere` | este aparelho não consegue marcar |

### DESFAZER depois de recarregar

A pilha do DESFAZER fica gravada no próprio aparelho, separada por
transmissão. Celular bloqueado, aba descarregada ou um F5 sem querer: ao
retomar a partida, o DESFAZER volta habilitado com as últimas 200
mudanças. Duas quadras abertas no mesmo celular não se misturam.

Trocar de jogo pela fila limpa a pilha de propósito — voltar para o placar
do jogo anterior não faria sentido.

### Como o placar chega ao OBS

O controle grava no banco e **toca uma campainha** pelo Realtime do
Supabase. O overlay ouve, vai buscar o placar no banco e desenha.

```
celular marca  →  grava no banco  →  toca a campainha
                                          ↓
                      overlay ouve  →  lê o banco  →  tela
```

A campainha **não carrega o placar** — carrega só o aviso. O canal é
aberto, e quem souber o token (ele está na URL do OBS) poderia tocar uma
campainha falsa. Com ela vazia, o pior que isso causa é o overlay conferir
o banco à toa; o que vai ao ar vem sempre do `bc_read`, que continua
trancado. Há um teto de uma leitura a cada 0,3 s para nem isso incomodar.

Por isso **nenhuma tabela foi destrancada** nesta parte. O caminho óbvio
seria o *Postgres Changes*, que exigiria `grant select on broadcasts to
anon` — e a tabela guarda a chave de controle de todas as transmissões.

Se a campainha cair, o overlay continua perguntando ao banco a cada 5
segundos, como antes fazia a cada 0,9. O painel mostra qual dos dois está
valendo:

| no painel | o que significa |
|---|---|
| `TEMPO REAL · O PLACAR APARECE NA HORA` | campainha funcionando |
| `RESERVA · O PLACAR APARECE EM ATÉ 5 SEGUNDOS` | caiu, mas nada parou |

De 20 em 20 segundos um vigia tenta levantar a campainha caída.

Medido no projeto de verdade, pelo navegador: a campainha chega em **20 a
90 ms**, a leitura do banco leva **~130 ms**. O ponto aparece na tela em
cerca de 0,2 s, contra até 0,9 s antes — e as perguntas ao banco caem de
~4.000 para ~720 por hora de transmissão.
