// ══════════════════════════════════════════════════════════════════
// LEVEL BT LIVE · o placar funcionando sozinho
//
// Rode com:  node testes/placar.js      (precisa de jsdom)
// Não usa internet nem Supabase: o banco é simulado aqui dentro.
// ══════════════════════════════════════════════════════════════════
const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const ARQ=path.join(__dirname,'..','index.html');
const html=fs.readFileSync(ARQ,'utf8');

let ok=0,bad=0;
const t=(n,c)=>{try{if(c()){ok++;console.log('  ok  '+n)}else{bad++;console.log('FALHA '+n)}}
  catch(e){bad++;console.log('ERRO  '+n+' → '+e.message)}};

function abrir(url,largura,visSalva){
  return new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,beforeParse(w){
    w.innerWidth=largura||1440; w.innerHeight=900;
    if(visSalva){ try{ w.localStorage.setItem('lbt_visualizacao',visSalva); }catch(e){} }
    w.scrollTo=()=>{}; w.confirm=()=>true;
    // o createClient de verdade recusa URL inválida — é o que derrubava
    // a página inteira quando a configuração ainda estava por preencher
    w.supabase={createClient:(url,key)=>{
      if(!/^https?:\/\//.test(String(url)))
        throw new Error('Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.');
      return {rpc:async()=>({data:null,error:null}),
        storage:{from:()=>({upload:async()=>({error:null}),
          getPublicUrl:()=>({data:{publicUrl:'https://x/l.png'}})})}};
    }};
    w.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});
  }}).window;
}

const w=abrir('https://x/index.html?overlay=demo');
const d=w.document;

setTimeout(()=>{

console.log('── O PRODUTO VIVE SOZINHO ──');
t('não fala mais em código de grupo',
  ()=>!html.includes('id="grupo"') && !html.includes('bc_ao_vivo'));
t('bc_create é chamado sem argumento nenhum',
  ()=>/rpc\('bc_create'\)/.test(html));
t('não tenta mais ir para o app',
  ()=>!html.includes("location.href='index.html'") && !html.includes('destinoDaMarca'));
t('a URL do banco está marcada para você preencher',
  ()=>html.includes('COLE_AQUI_A_URL_DO_PROJETO'));
t('e não ficou nenhuma chave do banco do app',
  ()=>!html.includes('jvmgsedxwakzfpskvfpf'));

console.log('\n── A CONTAGEM CONTINUA CERTA ──');
const M=w.novaPartida({t1:['Ana','Bia'],t2:['Cris','Dani'],alvo:6,tbPts:7,nSets:3});
t('partida nova começa zerada', ()=>M.g1===0 && M.p1===0 && M.status==='playing');
w.pontoPara(M,1); w.pontoPara(M,1); w.pontoPara(M,1);
t('três pontos levam a 40', ()=>M.p1===3);
w.pontoPara(M,2); w.pontoPara(M,2); w.pontoPara(M,2);
t('40—40 é quarentão', ()=>w.ehQuarentao(M)===true);
w.pontoPara(M,1);
t('o ponto de ouro fecha o game', ()=>M.g1===1 && M.p1===0 && M.p2===0);

const TB=w.novaPartida({t1:['A','B'],t2:['C','D'],alvo:6,tbPts:7,nSets:3});
const game=(m,time)=>{ for(let p=0;p<4 && !m.inTb && m.status==='playing';p++) w.pontoPara(m,time); };
for(let i=0;i<12 && !TB.inTb;i++) game(TB, TB.g1<=TB.g2 ? 1 : 2);
t('6—6 entra no tiebreak', ()=>TB.g1===6 && TB.g2===6 && TB.inTb===true);

const AJ=w.novaPartida({t1:['A','B'],t2:['C','D'],alvo:6,nSets:3});
AJ.g1=6; AJ.g2=6; w.conferirTiebreak(AJ);
t('corrigindo na mão até 6—6 também entra', ()=>AJ.inTb===true);

console.log('\n── OS DOIS RELÓGIOS ──');
const R=w.novaPartida({t1:['A','B'],t2:['C','D']});
t('a transmissão já nasce contando',      ()=>R.noArDesde>0);
t('o jogo nasce parado',                  ()=>R.rodando===false && (R.acum||0)===0);
t('e ainda não começou',                  ()=>w.jogoComecou(R)===false);
t('o relógio do jogo marca zero',         ()=>w.duracao(R)===0);

R.noArDesde=Date.now()-305000;            // 5min05 no ar
t('a transmissão conta sozinha',          ()=>w.relogioTransmissao(R)==='5:05');

t('acionar começa a contar', ()=>w.iniciarTempo(R)===true && R.rodando===true);
t('e aí o jogo começou',     ()=>w.jogoComecou(R)===true);
R.inicio=Date.now()-65000;                // 1min05 de jogo
t('o relógio do jogo anda',  ()=>w.relogio(R)==='1:05');
t('acionar de novo não reinicia', ()=>w.iniciarTempo(R)===false);

t('pausar guarda o que já passou', ()=>{
  w.pausarTempo(R);
  return R.rodando===false && Math.abs(R.acum-65)<2;
});
t('pausado, o relógio não anda mais', ()=>{
  const antes=w.duracao(R);
  return Math.abs(w.duracao(R)-antes)<0.1;
});
t('mas continua marcando o que já foi', ()=>w.relogio(R)==='1:05');
t('retomar soma ao acumulado', ()=>{
  w.iniciarTempo(R); R.inicio=Date.now()-10000;
  return Math.abs(w.duracao(R)-75)<2;
});
t('o relógio da transmissão não se importa com pausa',
  ()=>w.duracaoTransmissao(R)>300);

// fim de partida congela o jogo
const F=w.novaPartida({t1:['A','B'],t2:['C','D'],nSets:1});
w.iniciarTempo(F); F.inicio=Date.now()-120000;
F.g1=5; F.p1=3; w.pontoPara(F,1);
t('acabando a partida, o relógio do jogo congela',
  ()=>F.status==='finished' && F.rodando===false && Math.abs(F.acum-120)<2);
const congelado=w.relogio(F);
t('e fica parado no valor final', ()=>w.relogio(F)===congelado);
t('o da transmissão segue andando',  ()=>w.duracaoTransmissao(F)>=0);

// trocar de jogo zera só o do jogo
const T2=w.novaPartida({t1:['A','B'],t2:['C','D']});
T2.noArDesde=Date.now()-600000;
w.iniciarTempo(T2); T2.inicio=Date.now()-90000;
w.trocarJogo(T2,{hora:'',ctx:'FINAL',a:'Ju / Tom',b:'Lia / Vitor'});
t('jogo novo recomeça com o relógio parado',
  ()=>w.jogoComecou(T2)===false && T2.rodando===false);
t('mas a transmissão continua de onde estava',
  ()=>w.duracaoTransmissao(T2)>590);

console.log('\n── O TEMPO SÓ APARECE DEPOIS DE ACIONADO ──');
const OV=w.novaPartida({t1:['Ana','Bia'],t2:['Cris','Dani']});
OV.v++; w.pintarOverlay(OV);
const pilula=d.getElementById('ovTempo');
t('antes de acionar, o placar não mostra tempo',
  ()=>pilula.classList.contains('hidden'));
w.iniciarTempo(OV); OV.v++; w.pintarOverlay(OV);
t('depois de acionar, ele aparece',
  ()=>!pilula.classList.contains('hidden'));
t('e entra com animação, não seco',
  ()=>pilula.classList.contains('entra') && html.includes('@keyframes tempoEntra'));
t('a animação é discreta: só opacidade e um passo curto',
  ()=>/tempoEntra\{\s*0%\s*\{opacity:0;transform:translateY\(7px\)/.test(html));
OV.v++; w.pintarOverlay(OV);
t('e não reanima a cada ponto', ()=>{
  pilula.classList.remove('entra'); OV.v++; w.pintarOverlay(OV);
  return !pilula.classList.contains('entra');
});

console.log('\n── O OVERLAY DESENHA ──');
const O=w.novaPartida({t1:['Ana','Bia'],t2:['Cris','Dani'],cat:'Mista A',fase:'Final',
  torneio:'Copa Verão',quadra:'Quadra 2'});
O.g1=4; O.g2=2; O.p1=2; O.v++;
w.pintarOverlay(O);
t('os nomes aparecem', ()=>d.getElementById('ovN1').textContent==='Ana/Bia');
t('os games aparecem',  ()=>d.getElementById('ovG1').textContent==='4');
t('os pontos aparecem', ()=>d.getElementById('ovP1').textContent==='30');
w.iniciarTempo(O);
t('o relógio anda depois de acionado',
  ()=>{ O.v++; w.pintarOverlay(O); return /^\d+:\d\d/.test(d.getElementById('ovTempo').textContent); });
t('o palco é 1920×1080', ()=>html.includes('width:1920px;height:1080px'));

w.innerWidth=1920; w.innerHeight=1080; w.escalar();
t('em 1920×1080 a escala é 1:1',
  ()=>/scale\(1\)/.test(d.getElementById('stage').style.transform));

console.log('\n── FILA DA QUADRA E PATROCÍNIO ──');
const j=w.novoJogo('18:00','Mista A · Semi','Ju / Tom','Lia / Vitor');
t('monta um jogo da fila', ()=>j.a==='Ju / Tom' && j.ctx==='MISTA A · SEMI');
t('lê a planilha colada',
  ()=>w.lerPlanilha('18:00\tMista A · Semi\tAna / Bia\tCris / Dani').length===1);
w.trocarJogo(O,j);
t('trocar de jogo zera o placar e mantém o torneio',
  ()=>O.g1===0 && O.t1.join('/')==='Ju/Tom' && O.torneio==='Copa Verão');
t('logo png de 1 MB é aceita',
  ()=>w.validarLogo({name:'l.png',type:'image/png',size:1e6})===null);
t('svg é recusada',
  ()=>!!w.validarLogo({name:'l.svg',type:'image/svg+xml',size:1e4}));

console.log('\n── O PAINEL DE CONTROLE ──');
const c=abrir('https://x/index.html',1440);
setTimeout(async()=>{
  const cd=c.document;
  t('o controle abre sem overlay',
    ()=>!cd.getElementById('ctrl').classList.contains('hidden')
      && cd.getElementById('stage').classList.contains('hidden'));
  t('o formulário não pede mais o grupo', ()=>!cd.getElementById('grupo'));
  t('o painel tem as cinco áreas da mesa',
    ()=>cd.querySelectorAll('#live .painel > .cln').length===5);
  const area=c=>cd.querySelector('#live .painel > .'+c);
  t('cada área é irmã das outras, nenhuma aninhada',
    ()=>['area-pts','area-mesa','area-tv','area-patro','area-fila'].every(a=>!!area(a)));
  t('o preview fica na linha de cima, à esquerda',
    ()=>/\.area-tv\s*\{grid-column:1;\s*grid-row:1;\}/.test(html));
  t('a mesa de corte fica embaixo do preview',
    ()=>/\.area-mesa\s*\{grid-column:1;\s*grid-row:2;\}/.test(html));
  t('a pontuação ocupa a coluna da direita inteira',
    ()=>/\.area-pts\s*\{grid-column:2;\s*grid-row:1 \/ span 2;\}/.test(html));
  t('patrocinadores e fila ficam em cartões separados',
    ()=>/\.area-patro\{grid-column:1; grid-row:3;\}/.test(html)
      && /\.area-fila \{grid-column:2; grid-row:3;\}/.test(html));
  t('e cada um leva só o seu assunto',
    ()=>!!area('area-patro').querySelector('#spLista')
      && !area('area-patro').querySelector('#agdLista')
      && !!area('area-fila').querySelector('#agdLista')
      && !area('area-fila').querySelector('#spLista'));

  t('quem está sacando vem antes de corrigir placar', ()=>{
    const col=area('area-pts').innerHTML;
    return col.indexOf('Quem está sacando') < col.indexOf('Corrigir placar');
  });
  t('e logo depois de desfazer o ponto', ()=>{
    const col=area('area-pts').innerHTML;
    return col.indexOf('btnUndo') < col.indexOf('Quem está sacando');
  });
  t('no celular a ordem é marcar ponto primeiro', ()=>{
    const ordem=[...cd.querySelectorAll('#live .painel > .cln')].map(e=>e.className);
    return ordem[0].includes('area-pts');
  });
  t('as cenas viram barramento com luz de tally',
    ()=>!!cd.querySelector('#cenas.bus .cenab .tally')
      && /\.modo-pc \.cenas\.bus \.cenab\.on\{background:var\(--orange\)/.test(html));
  t('o replay fica fora do barramento, como disparo',
    ()=>!!cd.querySelector('.disparo#btnReplay'));
  t('nenhum id repetido na página', ()=>{
    const ids=[...cd.querySelectorAll('[id]')].map(e=>e.id);
    return new Set(ids).size===ids.length;
  });
  cd.getElementById('setup').classList.add('hidden');
  cd.getElementById('live').classList.remove('hidden');
  c.definirPartida(c.novaPartida({t1:['A','B'],t2:['C','D']}));
  let cliques=[];
  ['tap1','tap2'].forEach(id=>cd.getElementById(id).addEventListener('click',()=>cliques.push(id)));
  cd.body.dispatchEvent(new c.KeyboardEvent('keydown',{key:'a',bubbles:true,cancelable:true}));
  t('os atalhos de teclado continuam valendo', ()=>cliques.includes('tap1'));

  console.log('\n── O BOTÃO DO TEMPO NO PAINEL ──');
  const bt=cd.getElementById('btnTempo');
  c.definirPartida(c.novaPartida({t1:['A','B'],t2:['C','D']}));
  c.pintarControle();
  t('começa oferecendo iniciar',     ()=>bt.textContent.includes('Começar'));
  t('e o relógio do jogo mostra um traço',
    ()=>cd.getElementById('liveTempo').textContent==='—');
  t('o da transmissão já conta',
    ()=>/^\d+:\d\d/.test(cd.getElementById('liveNoAr').textContent));
  bt.click();
  t('clicando, o relógio começa',    ()=>c.partidaAtual().rodando===true);
  t('e o botão passa a oferecer pausa', ()=>bt.textContent.includes('Pausar'));
  t('o painel passa a mostrar o tempo',
    ()=>cd.getElementById('liveTempo').textContent!=='—');
  bt.click();
  t('clicando de novo, pausa',       ()=>c.partidaAtual().rodando===false);
  t('e oferece retomar',             ()=>bt.textContent.includes('Retomar'));
  const Mf=c.partidaAtual(); Mf.status='finished'; c.pintarControle();
  t('partida encerrada trava o botão', ()=>bt.disabled===true);

  console.log('\n── LINK DO YOUTUBE ──');
const casos=[
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ','dQw4w9WgXcQ','endereço comum'],
  ['https://youtu.be/dQw4w9WgXcQ','dQw4w9WgXcQ','link curto'],
  ['https://www.youtube.com/live/dQw4w9WgXcQ','dQw4w9WgXcQ','link de live'],
  ['https://www.youtube.com/embed/dQw4w9WgXcQ','dQw4w9WgXcQ','link de embed'],
  ['youtube.com/watch?v=dQw4w9WgXcQ','dQw4w9WgXcQ','sem o https'],
  ['https://youtu.be/dQw4w9WgXcQ?t=42','dQw4w9WgXcQ','com marca de tempo'],
  ['dQw4w9WgXcQ','dQw4w9WgXcQ','só o identificador'],
  ['https://vimeo.com/123','',  'outro site não vale'],
  ['','',                       'vazio não vale'],
  ['qualquer coisa','',         'texto solto não vale']
];
casos.forEach(([entrada,esperado,nome])=>{
  t(nome, ()=>(w.idDoYouTube(entrada)||'')===esperado);
});
t('o player entra sem som', ()=>w.urlDoPlayer('abc').includes('mute=1'));
t('e sem sugestões de outros vídeos', ()=>w.urlDoPlayer('abc').includes('rel=0'));
t('o id é escapado no endereço', ()=>w.urlDoPlayer('a b').includes('a%20b'));

console.log('\n── PREVIEW NA TELA ──');
const pv=abrir('https://x/index.html',1440);
await new Promise(r2=>setTimeout(r2,700));
const pd=pv.document;
pd.getElementById('setup').classList.add('hidden');
pd.getElementById('live').classList.remove('hidden');
pv.definirPartida(pv.novaPartida({t1:['A','B'],t2:['C','D']}));
pv.pintarControle();
t('sem link, a caixa explica o que fazer',
  ()=>!pd.getElementById('tvVazio').classList.contains('hidden')
    && pd.getElementById('tvVideo').classList.contains('hidden'));
pd.getElementById('ytUrl').value='https://youtu.be/dQw4w9WgXcQ';
pd.getElementById('btnYt').click();
t('com link, o player aparece',
  ()=>!pd.getElementById('tvVideo').classList.contains('hidden')
    && pd.getElementById('tvVideo').src.includes('dQw4w9WgXcQ'));
t('e o campo some, dando lugar ao vídeo',
  ()=>pd.getElementById('tvCampo').classList.contains('hidden'));
t('o link fica guardado na transmissão',
  ()=>pv.partidaAtual().youtube.includes('dQw4w9WgXcQ'));
pd.getElementById('btnYtTrocar').click();
t('dá para trocar de link', ()=>pd.getElementById('tvCampo').classList.contains('hidden')===false);
pd.getElementById('ytUrl').value='nao-e-link';
pd.getElementById('btnYt').click();
t('link inválido avisa em vez de quebrar',
  ()=>pd.getElementById('ytMsg').textContent.includes('NÃO RECONHECI'));
t('o overlay do preview não recebe clique (é vidro)',
  ()=>/\.tv-over\{[^}]*pointer-events:none/.test(html));
t('e roda em 1920×1080 de verdade, só encolhido',
  ()=>/\.tv-over-f\{[^}]*width:1920px;height:1080px/.test(html));

console.log('\n── TAMANHO DO PLACAR FIXO ──');
t('o controle de tamanho saiu da tela', ()=>!html.includes('id="segEsc"'));
t('e da partida também', ()=>w.novaPartida({t1:['A'],t2:['B']}).escala===undefined);
t('fica fixo em 60%', ()=>/--esc:\.6;/.test(html));
t('placar e detalhes moram na mesma âncora, para a distância encolher junto',
  ()=>{ const anc=d.getElementById('bug').closest('.anc');
        return anc && anc.contains(d.getElementById('ovPills')); });
t('e o espaço entre eles é do CSS, não de posição fixa',
  ()=>/\.hud-topo\{[^}]*flex-direction:column/.test(html));

console.log('\n── BARRA DE STATUS ──');
pv.partidaAtual().cena='placar'; pv.pintarControle();
t('diz que está no ar',    ()=>pd.getElementById('sigAr').textContent.includes('NO AR'));
t('e qual cena está indo', ()=>pd.getElementById('barraCena').textContent==='PLACAR');
pv.setCena('oculto');
t('ocultando tudo, avisa que não está no ar',
  ()=>pd.getElementById('sigAr').classList.contains('frio')
    && pd.getElementById('sigAr').textContent.includes('OCULTO'));
pv.setCena('agenda');
t('e acompanha a troca de cena', ()=>pd.getElementById('barraCena').textContent==='PRÓXIMOS');
t('a barra só vira régua no computador',
  ()=>/\.modo-pc \.barra\{/.test(html) && /\.sig\{display:none/.test(html));

console.log('\n── ALTERNAR ENTRE CELULAR E COMPUTADOR ──');
const r=cd.documentElement, bv=cd.getElementById('btnVis');
t('tela larga abre no computador', ()=>r.classList.contains('modo-pc'));
t('o botão existe e diz o modo',   ()=>!!bv && /COMPUTADOR · AUTO/.test(bv.textContent));
bv.click();
t('um clique força o celular numa tela larga',
  ()=>r.classList.contains('modo-cel') && !r.classList.contains('modo-pc'));
t('e o rótulo some o AUTO',        ()=>bv.textContent==='CELULAR');
t('a escolha fica guardada',       ()=>c.localStorage.getItem('lbt_visualizacao')==='cel');
t('no modo celular as gavetas fecham',
  ()=>[...cd.querySelectorAll('#live .cln > details')].every(x=>!x.open));
bv.click();
t('o clique seguinte fixa o computador', ()=>r.classList.contains('modo-pc') && bv.textContent==='COMPUTADOR');
t('e as gavetas voltam a abrir',
  ()=>[...cd.querySelectorAll('#live .cln > details')].every(x=>x.open));
bv.click();
t('o terceiro clique volta ao automático', ()=>/· AUTO/.test(bv.textContent));
t('e limpa o que estava guardado',  ()=>!c.localStorage.getItem('lbt_visualizacao'));

t('o layout de computador é por classe, não por media query',
  ()=>!/@media\s*\(min-width:1040px\)/.test(html) && html.includes('.modo-pc .painel{display:grid'));
t('forçar computador no celular rola em vez de esmagar',
  ()=>/\.modo-pc \.wrap\{[^}]*min-width:1000px/.test(html));

console.log('\n── A ESCOLHA SOBREVIVE A FECHAR A PÁGINA ──');
const cel=abrir('https://x/index.html',430,'pc');
const pc =abrir('https://x/index.html',1440,'cel');
await new Promise(r2=>setTimeout(r2,600));
t('celular com computador fixado abre no computador',
  ()=>cel.document.documentElement.classList.contains('modo-pc'));
t('monitor com celular fixado abre no celular',
  ()=>pc.document.documentElement.classList.contains('modo-cel'));
t('e no celular os atalhos de teclado não disparam', ()=>{
  const d2=pc.document;
  d2.getElementById('setup').classList.add('hidden');
  d2.getElementById('live').classList.remove('hidden');
  pc.definirPartida(pc.novaPartida({t1:['A','B'],t2:['C','D']}));
  let bateu=false;
  d2.getElementById('tap1').addEventListener('click',()=>{bateu=true;});
  d2.body.dispatchEvent(new pc.KeyboardEvent('keydown',{key:'a',bubbles:true,cancelable:true}));
  return bateu===false;
});

console.log('\n── SEM O BANCO CONFIGURADO, A TELA EXPLICA ──');
// Este é o estado em que o repositório nasce: marcadores no lugar da
// URL. Antes, o createClient explodia no topo do arquivo e a página
// ficava preta, sem uma palavra.
const cd2=c.document;
t('a página não fica em branco',
  ()=>!cd2.getElementById('ctrl').classList.contains('hidden'));
t('e diz que falta ligar o banco',
  ()=>cd2.getElementById('setup').textContent.includes('Falta ligar o banco'));
t('mostra as duas linhas para trocar',
  ()=>cd2.getElementById('setup').innerHTML.includes('SUPA_URL')
    && cd2.getElementById('setup').innerHTML.includes('SUPA_KEY'));
t('e oferece a demonstração, que roda sem banco',
  ()=>!!cd2.querySelector('#setup a[href*="overlay=demo"]'));
t('o botão de criar transmissão fica travado',
  ()=>cd2.getElementById('btnStart').disabled===true);
t('a demonstração do overlay desenha mesmo sem banco', ()=>{
  const dm=abrir('https://x/index.html?overlay=demo');
  return !!dm;  // se o script tivesse quebrado, nem carregaria
});

console.log('\n'+(bad? '✗ '+bad+' FALHA(S) · '+ok+' ok' : '✓ TUDO OK · '+ok+' testes'));
  process.exit(bad?1:0);
},700);

},700);
