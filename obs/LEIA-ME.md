# Peças soltas para o OBS

As animações do overlay, cada uma num endereço próprio, para você usar
como **Fonte de Navegador** independente do placar ao vivo.

Serve para quando você quer disparar uma cartela, uma vinheta ou a tela
de campeão **sem** depender do painel de controle — por atalho do OBS,
por cena, ou numa transmissão que nem tem placar.

```
gerar.js            monta o pecas.html a partir do index.html
pecas.html          as oito peças, escolhidas pelo endereço
levelbt-replay.lua  carrega o replay recém-salvo na Fonte de Mídia
```

O `levelbt-replay.lua` não tem a ver com as peças — é o script que faz o
replay completo funcionar. Está documentado no `COMANDO-OBS.md`.

## Como adicionar no OBS

**Fontes → + → Navegador**

| campo | valor |
|---|---|
| URL | `https://dlrds.github.io/levelbt-live/obs/pecas.html?peca=replay` |
| Largura | `1920` |
| Altura | `1080` |

E marque as duas caixas, que são o que faz a animação funcionar direito:

- ☑ **Desligar fonte quando não estiver visível**
- ☑ **Atualizar navegador quando a cena ficar ativa**

Sem a segunda, a animação toca uma vez só e nunca mais. Com ela, toda vez
que você corta para a cena a peça entra do zero.

## As oito peças

| `?peca=` | o que é | dura |
|---|---|---|
| `replay` | a cortina do medidor de nível varrendo a tela | 2,6 s e sai |
| `cartela` | abertura da partida: torneio, categoria, fase | fica |
| `selo` | GAME / SET / MATCH POINT | fica |
| `quebrou` | aviso de quebra de saque | fica |
| `patrocinio` | cartão do patrocinador | fica |
| `proximos` | resultados e próximos jogos | fica |
| `fim` | tela de campeão com o placar dos sets | fica |
| `stats` | as cinco estatísticas da partida, dupla contra dupla | fica |

As que "ficam" permanecem no ar até você trocar de cena — quem controla o
tempo é o OBS, não a página.

## Texto e dados pelo endereço

Nada é editado em código: tudo entra pela URL.

```
pecas.html?peca=cartela&torneio=COPA%20VERAO&cat=MISTA%20A&fase=FINAL&quadra=QUADRA%202

pecas.html?peca=selo&texto=MATCH%20POINT&sub=ANA/BIA%20SACA

pecas.html?peca=quebrou&perdeu=CRIS/DANI

pecas.html?peca=patrocinio&patrocinador=ARENA%20BEACH&logo=https://.../logo.png

pecas.html?peca=fim&venceu=Ana/Bia&perdeu=Cris/Dani&sets=6-4%203-6%2010-8
```

Espaço vira `%20` — ou simplesmente cole o endereço com espaços no campo
do OBS, que ele resolve sozinho.

### Próximos jogos

Cada jogo é `hora|contexto|dupla A|dupla B|placar`, separados por `;`.
Com placar vai para *já jogados*; sem placar, para *a seguir*.

```
pecas.html?peca=proximos&torneio=COPA%20VERAO
  &jogados=|OITAVAS|Ju/Tom|Lia/Vitor|6-2 6-4
  &fila=19:00|FINAL|Ana/Bia|Cris/Dani|
```

### Estatísticas

Cada número entra como `dupla de cima,dupla de baixo`. As porcentagens
são calculadas sozinhas a partir das frações:

```
pecas.html?peca=stats&a=Ana/Bia&b=Cris/Dani&torneio=COPA%20VERAO
  &saque=24/32,18/29     pontos vencidos / jogados no saque
  &devol=11/29,8/32      o mesmo, recebendo
  &bp=2/5,1/3            break points convertidos / que teve
  &seq=6,4               maior sequência de pontos seguidos
  &q=3,2                 quarentões vencidos
```

**Sem valor, aparece traço.** As outras peças têm um exemplo pronto para
você ver como ficam; esta não tem de propósito — um número de exemplo
esquecido no endereço seria uma estatística inventada indo ao ar.

Com o placar ao vivo rodando, você não precisa desta peça: o botão
**ESTATÍSTICAS** da mesa de corte mostra a mesma cartela com os números
calculados sozinhos. Ela existe para transmissão sem o placar do Level BT.

### Dois ajustes extras

- `&escala=0.6` — do tamanho de desenho para o tamanho do placar ao vivo
- `&espera=2` — segundos de atraso antes de entrar
- `&loop=1` — só no `replay`, repete sem parar (útil para conferir)

## Sobre transição de corte (stinger)

A vinheta de replay **não** serve como *Stinger* do OBS. Stinger exige
arquivo de vídeo, e isto aqui é página. Duas saídas:

**A mais simples:** ponha a `replay` como fonte numa cena e corte para
ela. O efeito é o mesmo — a cortina cobre o corte.

**Se precisar mesmo do stinger:** grave a peça. Abra a `replay` com
`&loop=1`, capture no OBS e exporte num formato com canal alfa (ProRes
4444 ou WebM/VP9 com alpha). Aí o arquivo vira stinger.

Eu não consigo gerar esse vídeo aqui — exigiria um navegador headless
que não roda neste ambiente. Mas o OBS que você já tem grava.

## Quando o visual do overlay mudar

O `pecas.html` é **gerado**, não escrito à mão: ele reaproveita o estilo e
a marcação do `index.html`. Depois de qualquer mexida no visual:

```bash
node obs/gerar.js
```

Se editar o `pecas.html` direto, a próxima geração apaga.
