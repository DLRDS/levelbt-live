# Comandar o OBS pelo celular

Dá para apertar REPLAY na beira da quadra e o OBS salvar os últimos
segundos, trocar de cena, começar a gravar — sem ninguém no computador.

## Por que isso funciona

A página de controle está em HTTPS, e navegador **proíbe** página HTTPS
falar com `ws://localhost`. Então o caminho óbvio — controle conversando
direto com o OBS por WebSocket — está fechado, sem contorno.

Mas o **overlay já está dentro do OBS**. Ele é uma fonte de navegador, e
o OBS entrega a toda fonte de navegador um objeto `window.obsstudio` com
comandos. Não passa por rede nenhuma.

Então a corrente é:

```
celular  →  Supabase  →  overlay (dentro do OBS)  →  OBS
```

O celular deixa um recado no placar; o overlay lê e repassa. O atraso é
de até um segundo, que é o tempo de o overlay reler.

## Para ligar

**1.** Rode o `banco-obs.sql` no SQL Editor do Supabase.

**2.** No OBS, clique com o botão direito na fonte do overlay →
**Propriedades**. Procure **Controle da página** (ou *Page permissions*)
e escolha **Acesso avançado**.

**3.** Volte ao painel de controle. Em **Comando do OBS** deve aparecer
`PRONTO · NÍVEL 4` e os botões.

Se aparecer `SEM PERMISSÃO`, o passo 2 não pegou. Se aparecer
`PROCURANDO…`, a fonte do overlay não está numa cena ativa — o OBS só
executa a página quando ela está visível.

## Replay completo, num botão

É a coreografia inteira: a cortina entra, o OBS corta para o replay com a
tela coberta, o clipe passa, a cortina volta e a transmissão ao vivo
retorna. Você aperta uma vez e não toca em mais nada.

### Antes, duas coisas no OBS

**1 · Ligue o Replay Buffer.** Configurações → Saída → marque *Habilitar
buffer de repetição* e escolha quantos segundos guardar (15 dá folga).
Depois ligue o buffer na janela principal.

> Os arquivos vão para a mesma pasta da gravação — Configurações → Saída
> → *Caminho de gravação*. É lá que o replay aparece.

**2 · Crie a cena do replay** com uma **Fonte de Mídia** dentro. Pode
deixá-la vazia; quem vai preencher é o script do passo seguinte. Nas
propriedades dela, marque *Reiniciar a reprodução quando a fonte ficar
ativa*.

**3 · Ligue o `obs/levelbt-replay.lua`.** Ferramentas → Scripts → `+` →
escolha o arquivo em `obs/levelbt-replay.lua` deste repositório. Em
**Fonte de Mídia**, escolha a fonte que você acabou de criar.

> **Por que não o `instant-replay.lua` que vem com o OBS?** Porque ele
> pendura tudo num atalho de teclado próprio: o mesmo atalho salva o
> buffer *e* carrega o arquivo. Quando o replay é salvo por fora — que é
> o que o nosso botão faz — ele não fica sabendo, e a Fonte de Mídia
> continua com o vídeo anterior. Foi exatamente isso que fez as animações
> rodarem certinho sem nenhum replay aparecer.
>
> O nosso script não registra atalho: ele ouve o **evento** de replay
> salvo, venha de onde vier. Funciona com o botão do Level BT, com o
> atalho do OBS, com qualquer coisa.

### Depois, no painel

Em **Comando do OBS**, escolha a **cena do replay**, a **cena ao vivo** e
quantos segundos: 5, 10 ou 15. O botão muda de *VINHETA DE REPLAY* para
**REPLAY COMPLETO · 10s**.

### O que acontece quando você aperta

```
0,0s   o OBS salva o buffer
0,7s   a cortina entra
1,9s   com a tela coberta, corta para a cena do replay
       (o placar some e entra o selo REPLAY)
 +D    a cortina entra de novo
+1,2s  com a tela coberta, volta para a cena ao vivo
```

Nenhum desses tempos é chute. A cortina cobre a tela entre 0,78 s e
1,72 s da animação, e o corte acontece no meio dessa janela — é isso que
torna a troca invisível. E a cortina só começa 0,7 s depois do pedido de
salvamento, para dar ao OBS tempo de fechar o arquivo e ao script tempo
de carregá-lo: assim o corte cai ~1,9 s depois de você apertar.

Se na sua máquina o vídeo ainda entrar atrasado, são duas constantes no
`index.html`: `PRE_SALVA_MS` (a folga) e `COBERTO_MS` (o instante do
corte).

O placar sai durante o replay de propósito — ele mostraria o estado de
agora sobre uma imagem de segundos atrás.

### Se faltar alguma coisa

Sem as duas cenas escolhidas, o botão volta a ser só a vinheta: salva o
buffer e toca a cortina, sem cortar. Sem OBS, toca só a cortina. Nunca
promete o que não consegue entregar.

> **O overlay precisa estar nas duas cenas.** Ele é quem conduz a
> coreografia; se sair do ar no meio, a cortina não volta. E nessa fonte
> **não** marque *Atualizar o navegador quando a cena se tornar ativa* —
> isso reiniciaria a página no meio do replay.

## O que dá para comandar

| no painel | no OBS |
|---|---|
| **Salvar replay no OBS** | salva o Replay Buffer |
| **Trocar de cena** | muda a cena ativa |
| **VINHETA DE REPLAY** | salva o buffer **e** toca a cortina juntos |
| **REPLAY COMPLETO** | a coreografia inteira, descrita acima |

As cenas são lidas do seu OBS — a lista aparece sozinha, com a que está
no ar marcada.

> O Replay Buffer precisa estar **ligado** no OBS antes. Se estiver
> desligado, o comando não faz nada e o OBS não avisa.

## O que isso abre, e por que é você quem decide

Permissão avançada deixa a página **mandar no seu OBS**. É por isso que o
OBS pede que você ligue à mão, fonte por fonte — não existe jeito de uma
página se autoconceder isso.

Conceda só para o overlay do Level BT, que é código seu, publicado no seu
repositório. Nunca para fonte de navegador de terceiro.

O recado que o celular deixa é um campo no placar, e qualquer um com a
chave de controle pode escrevê-lo. Ou seja: **quem controla o placar
passa a controlar também essas três ações do OBS.** Se um dia você
entregar o controle para outra pessoa marcar os pontos, ela ganha isso
junto. Dá para separar depois, se incomodar.

## Quando o OBS não está lá

Tudo continua funcionando como antes. O overlay roda normal no navegador,
a cortina de replay toca, o painel esconde os comandos. A ponte é um
acréscimo, não uma dependência — nada do placar precisa dela.

## O caminho de volta

O overlay precisa contar ao painel o que encontrou. Como ele só tem o
token público, não pode escrever no placar — escreveria por cima do jogo.
Então o `banco-obs.sql` cria uma coluna à parte e uma função `bc_obs` que
só aceita essas informações, e nada mais.
