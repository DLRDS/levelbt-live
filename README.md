# Level BT Live

Placar de transmissão para torneios de beach tennis. Um celular marca o
ponto, o OBS mostra o placar na tela com as animações da marca.

É um produto **separado** do app Level BT: outro repositório, outro
endereço, outro banco. Os dois não conversam.

```
index.html     o produto inteiro — controle e overlay no mesmo arquivo
banco.sql      transmissões e painel, para rodar uma vez no SQL Editor
LOGOS.md       as logos, que se configuram pelo painel e não por SQL
GUIA-OBS.md    como ligar no OBS
testes/        node testes/placar.js
```

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
