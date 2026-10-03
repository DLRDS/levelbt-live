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

## O que dá para comandar

| no painel | no OBS |
|---|---|
| **Salvar replay no OBS** | salva o Replay Buffer |
| **Trocar de cena** | muda a cena ativa |
| **VINHETA DE REPLAY** | salva o buffer **e** toca a cortina juntos |

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
