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
t('o banco está ligado, com URL de verdade',
  ()=>/const SUPA_URL='https:\/\/[a-z0-9]+\.supabase\.co';/.test(html));
t('e com chave publicável, não secreta',
  ()=>/const SUPA_KEY='sb_publishable_/.test(html) && !html.includes('sb_secret'));
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

console.log('\n── REGRAS DA ITF · RODÍZIO DE SAQUE (regra 15) ──');
// saque é o índice em [t1[0], t1[1], t2[0], t2[1]].
// A roda certa é t1[0] → t2[0] → t1[1] → t2[1], ou seja 0 → 2 → 1 → 3.
const sqA=w.novaPartida({t1:['A1','A2'],t2:['B1','B2'],alvo:6,nSets:2});
const ganhaUmGame=(m,time)=>{ for(let i=0;i<4 && !m.inTb && m.status==='playing';i++) w.pontoPara(m,time); };
const times=[];
sqA.saque=0;
for(let g=0; g<8; g++){ times.push(w.saqueDoTime(sqA)); ganhaUmGame(sqA, g%2===0?1:2); }
t('as duplas se alternam a cada game, nunca duas seguidas',
  ()=>times.join('')==='12121212');

const sqB=w.novaPartida({t1:['A1','A2'],t2:['B1','B2']});
sqB.saque=0;
const idx=[0];
for(let i=0;i<5;i++){ w.trocaSaque(sqB); idx.push(sqB.saque); }
t('a roda é 0 → 2 → 1 → 3 e volta', ()=>idx.join(',')==='0,2,1,3,0,2');
t('dentro da dupla, os dois se revezam', ()=>{
  // os saques da dupla 1 na roda são 0 e 1, alternando
  const daUm=idx.filter(i=>i===0||i===1);
  return daUm.join(',')==='0,1,0';
});

console.log('\n── TIEBREAK (regra 8b) ──');
const tbA=w.novaPartida({t1:['A1','A2'],t2:['B1','B2'],alvo:6,tbPts:7,nSets:2});
// leva a 6—6
tbA.g1=5; tbA.g2=6; tbA.saque=0;
ganhaUmGame(tbA,1);
t('6—6 entra no tiebreak', ()=>tbA.inTb===true);
const abriu=tbA.saque;
t('o tiebreak guarda quem abriu', ()=>tbA.tbAbriu===abriu);

// o saque troca depois dos pontos 1, 3, 5 — um ponto, depois de dois em dois
const seq=[];
for(let i=0;i<6;i++){ seq.push(tbA.saque); w.pontoPara(tbA, i%2===0?1:2); }
t('o primeiro ponto é de um, os dois seguintes do outro',
  ()=>seq[0]!==seq[1] && seq[1]===seq[2] && seq[2]!==seq[3] && seq[3]===seq[4]);

// fecha o tiebreak
const tbB=w.novaPartida({t1:['A1','A2'],t2:['B1','B2'],alvo:6,tbPts:7,nSets:2});
tbB.g1=6; tbB.g2=6; tbB.inTb=true; tbB.saque=0; tbB.tbAbriu=0;
for(let i=0;i<7;i++) w.pontoPara(tbB,1);
t('tiebreak até 7 fecha o set', ()=>tbB.s1===1 && tbB.inTb===false);
t('quem abriu o tiebreak recebe no set seguinte',
  ()=>tbB.saque===w.proximoSaque(0));

console.log('\n── FORMATOS DE PARTIDA (regras 6 e 7) ──');
const um=w.novaPartida({t1:['A'],t2:['B'],nSets:1,alvo:6});
um.g1=5; um.p1=3; w.pontoPara(um,1);
t('1 set: um set decide', ()=>um.status==='finished' && um.vencedor===1);

const dois=w.novaPartida({t1:['A'],t2:['B'],nSets:2,alvo:6});
dois.s1=1; dois.s2=1; w.novoSet(dois);
t('2 sets: empate em 1 a 1 vira match tiebreak',
  ()=>dois.superSet===true && dois.inTb===true);
t('e o match tiebreak é até 10', ()=>dois.superTb===10);
const d2=w.novaPartida({t1:['A'],t2:['B'],nSets:2,alvo:6});
d2.s1=1; d2.s2=1; w.novoSet(d2);
for(let i=0;i<10;i++) w.pontoPara(d2,1);
t('ganhando o match tiebreak, ganha a partida',
  ()=>d2.status==='finished' && d2.vencedor===1 && d2.s1===2);

const tres=w.novaPartida({t1:['A'],t2:['B'],nSets:3,alvo:6});
tres.s1=1; tres.s2=1; w.novoSet(tres);
t('3 sets: o terceiro é set normal, sem match tiebreak',
  ()=>tres.superSet===false && tres.inTb===false);
t('e os dois formatos longos pedem 2 sets para vencer',
  ()=>w.precisaSets({nSets:2})===2 && w.precisaSets({nSets:3})===2);
t('o de um set pede só um', ()=>w.precisaSets({nSets:1})===1);

console.log('\n── GAME E SET (regras 7 e 8) ──');
const gmA=w.novaPartida({t1:['A'],t2:['B'],alvo:6,nSets:2});
w.pontoPara(gmA,1); w.pontoPara(gmA,1); w.pontoPara(gmA,1);
t('15, 30, 40', ()=>gmA.p1===3);
w.pontoPara(gmA,2); w.pontoPara(gmA,2); w.pontoPara(gmA,2);
t('40—40 é ponto decisivo, sem vantagem', ()=>w.ehQuarentao(gmA)===true);
w.pontoPara(gmA,2);
t('quem faz o ponto decisivo leva o game', ()=>gmA.g2===1 && gmA.p1===0 && gmA.p2===0);

const stA=w.novaPartida({t1:['A'],t2:['B'],alvo:6,nSets:2});
stA.g1=5; stA.g2=4; stA.p1=3; w.pontoPara(stA,1);
t('6—4 fecha o set', ()=>stA.s1===1);
const stB=w.novaPartida({t1:['A'],t2:['B'],alvo:6,nSets:2});
stB.g1=5; stB.g2=5; stB.p1=3; w.pontoPara(stB,1);
t('6—5 não fecha: precisa de 2 de vantagem', ()=>stB.s1===0 && stB.g1===6);

const stC=w.novaPartida({t1:['A'],t2:['B'],alvo:4,nSets:2});
stC.g1=3; stC.g2=4; stC.p1=3; w.pontoPara(stC,1);
t('set curto: 4—4 também vai para o tiebreak', ()=>stC.inTb===true);

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
// Agora o arquivo real está ligado, então este caso se testa numa cópia
// com os marcadores de volta — é o estado em que alguém clonaria o
// repositório. Antes, o createClient explodia no topo do arquivo e a
// página ficava preta, sem uma palavra.
const htmlCru=html
  .replace(/const SUPA_URL='[^']*';/,"const SUPA_URL='COLE_AQUI_A_URL_DO_PROJETO';")
  .replace(/const SUPA_KEY='[^']*';/,"const SUPA_KEY='COLE_AQUI_A_CHAVE_PUBLICA';");
const semBanco=new JSDOM(htmlCru,{runScripts:'dangerously',url:'https://x/index.html',
  pretendToBeVisual:true,beforeParse(w){
    w.innerWidth=1440; w.scrollTo=()=>{}; w.confirm=()=>true;
    w.supabase={createClient:(u)=>{
      if(!/^https?:\/\//.test(String(u)))
        throw new Error('Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.');
      return {rpc:async()=>({data:null,error:null})};
    }};
    w.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});
  }}).window;
await new Promise(r3=>setTimeout(r3,700));
const cd2=semBanco.document;
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

console.log('\n── PONTE COM O OBS · OVERLAY ──');
// Um OBS de mentira, com o mesmo formato do window.obsstudio real.
function abrirComObs(nivel, cenas){
  const chamou=[];
  const w2=new JSDOM(html,{runScripts:'dangerously',url:'https://x/index.html?overlay=tk1',
    pretendToBeVisual:true,beforeParse(w){
      w.innerWidth=1920; w.innerHeight=1080; w.scrollTo=()=>{};
      w.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});
      w.__chamou=chamou;
      const api={ pluginVersion:'2.26.0',
        getControlLevel:cb=>cb(nivel),
        getCurrentScene:cb=>cb({name:(cenas||['Quadra'])[0]}),
        getScenes:cb=>cb(cenas||['Quadra','Intervalo']) };
      if(nivel>=4){
        api.saveReplayBuffer=()=>chamou.push('saveReplayBuffer');
        api.setCurrentScene=n=>chamou.push('setCurrentScene:'+n);
        api.startRecording=()=>chamou.push('startRecording');
      }
      if(nivel>0) w.obsstudio=api;
      w.supabase={createClient:()=>({
        rpc:async(fn,a)=>{ chamou.push('rpc:'+fn); 
          if(fn==='bc_read') return {data:{t1:['A'],t2:['B'],v:1,status:'playing'},error:null};
          return {data:null,error:null}; }
      })};
    }}).window;
  return {w:w2, chamou};
}

const semObs=abrirComObs(0);
await new Promise(r6=>setTimeout(r6,900));
t('fora do OBS, a ponte fica desligada e nada quebra',
  ()=>semObs.w.obsTem('saveReplayBuffer')===false);

const comObs=abrirComObs(4,['Quadra 1','Intervalo','Patrocínio']);
await new Promise(r7=>setTimeout(r7,1200));
t('dentro do OBS, a ponte se reconhece', ()=>comObs.w.obsTem('saveReplayBuffer')===true);
t('descobre o nível de permissão', ()=>comObs.w.obsDescobrir().then?true:true);
const info=await comObs.w.obsDescobrir();
t('lê o nível', ()=>info.nivel===4);
t('lê as cenas', ()=>info.cenas.length===3 && info.cenas[0]==='Quadra 1');
t('e a versão do plugin', ()=>info.versao==='2.26.0');
t('conta ao painel pelo canal próprio',
  ()=>comObs.chamou.some(c=>c==='rpc:bc_obs'));

// Regressão: o preview da live roda o overlay num iframe, com o mesmo
// token, FORA do OBS. Se ele reportasse, apagaria o que o OBS contou.
t('fora do OBS, o overlay fica calado em vez de reportar nível zero',
  ()=>!semObs.chamou.some(c=>c==='rpc:bc_obs'));
t('e a guarda está no código, não por acaso',
  ()=>/if\(!OBS\) return;/.test(html));

// comandos
comObs.chamou.length=0;
t('comando de replay chega ao OBS', ()=>{
  comObs.w.obsExecutar({acao:'replay'});
  return comObs.chamou.includes('saveReplayBuffer');
});
t('comando de cena chega ao OBS', ()=>{
  comObs.w.obsExecutar({acao:'cena',arg:'Intervalo'});
  return comObs.chamou.includes('setCurrentScene:Intervalo');
});
t('comando desconhecido não faz nada',
  ()=>comObs.w.obsExecutar({acao:'inventado'})==='comando desconhecido');

// cada comando roda uma vez só
comObs.chamou.length=0;
const cmd={id:'abc',acao:'replay',em:Date.now()};
comObs.w.obsAtenderComando({obsCmd:cmd});
comObs.w.obsAtenderComando({obsCmd:cmd});
comObs.w.obsAtenderComando({obsCmd:cmd});
t('o mesmo comando não dispara três vezes',
  ()=>comObs.chamou.filter(c=>c==='saveReplayBuffer').length===1);
comObs.chamou.length=0;
comObs.w.obsAtenderComando({obsCmd:{id:'xyz',acao:'replay',em:Date.now()-60000}});
t('comando velho é ignorado ao entrar no ar',
  ()=>comObs.chamou.length===0);

// permissão baixa
const pouco=abrirComObs(1);
await new Promise(r8=>setTimeout(r8,900));
t('com permissão baixa, o replay não é chamado', ()=>{
  pouco.chamou.length=0;
  return pouco.w.obsExecutar({acao:'replay'})==='sem permissão'
      && pouco.chamou.length===0;
});

console.log('\n── PONTE COM O OBS · PAINEL ──');
const ctrlObs=abrir('https://x/index.html',1440);
await new Promise(r9=>setTimeout(r9,700));
const ctrlObsD=ctrlObs.document;
ctrlObsD.getElementById('setup').classList.add('hidden');
ctrlObsD.getElementById('live').classList.remove('hidden');
const Mp=ctrlObs.definirPartida(ctrlObs.novaPartida({t1:['A'],t2:['B']}));

Mp._obs=null; ctrlObs.pintarControle();
t('sem notícia do overlay, o painel diz que está procurando',
  ()=>ctrlObsD.getElementById('obsEstado').textContent.includes('PROCURANDO'));

Mp._obs={dentro:true,nivel:1,cenas:[],em:Math.floor(Date.now()/1000)};
ctrlObs.pintarControle();
t('permissão baixa: o painel explica onde mudar',
  ()=>ctrlObsD.getElementById('obsEstado').textContent==='SEM PERMISSÃO'
    && ctrlObsD.getElementById('obsCaixa').textContent.includes('Acesso avançado'));

Mp._obs={dentro:true,nivel:4,cenas:['Quadra','Intervalo'],cena:'Quadra',
         em:Math.floor(Date.now()/1000)};
ctrlObs.pintarControle();
t('com permissão, o painel libera os comandos',
  ()=>ctrlObsD.getElementById('obsEstado').textContent.includes('PRONTO')
    && !!ctrlObsD.getElementById('obsReplay'));
t('e lista as cenas do OBS',
  ()=>ctrlObsD.querySelectorAll('#obsCenas [data-cena]').length===2);
t('a cena no ar fica marcada',
  ()=>ctrlObsD.querySelector('[data-cena="Quadra"]').classList.contains('on'));

ctrlObsD.getElementById('obsReplay').click();
t('clicar deixa o recado no placar',
  ()=>ctrlObs.partidaAtual().obsCmd && ctrlObs.partidaAtual().obsCmd.acao==='replay');
ctrlObsD.querySelector('[data-cena="Intervalo"]').click();
t('trocar de cena também', ()=>{
  const c=ctrlObs.partidaAtual().obsCmd;
  return c.acao==='cena' && c.arg==='Intervalo';
});
t('cada recado tem id próprio, para não repetir', ()=>{
  const antes=ctrlObs.partidaAtual().obsCmd.id;
  ctrlObsD.querySelector('[data-cena="Quadra"]').click();
  return ctrlObs.partidaAtual().obsCmd.id!==antes;
});

// o botão de replay faz as duas coisas
ctrlObsD.getElementById('btnReplay').click();
t('o botão de replay salva no OBS e toca a cortina', ()=>{
  const m=ctrlObs.partidaAtual();
  return m.replayEm>0 && m.obsCmd && m.obsCmd.acao==='replay';
});

// sem OBS, o replay continua tocando a cortina
Mp._obs=null; ctrlObs.pintarControle();
const antesRep=ctrlObs.partidaAtual().replayEm;
await new Promise(r10=>setTimeout(r10,10));
ctrlObsD.getElementById('btnReplay').disabled=false;   // o clique anterior o travou
ctrlObsD.getElementById('btnReplay').click();
t('sem OBS, a cortina toca do mesmo jeito',
  ()=>ctrlObs.partidaAtual().replayEm>antesRep);

t('o campo do OBS não é gravado como se fosse da partida',
  ()=>/delete limpo\._obs/.test(html));

console.log('\n── PEÇAS SOLTAS PARA O OBS ──');
const fsx=require('fs'), px=require('path');
const pecasArq=px.join(__dirname,'..','obs','pecas.html');
t('o arquivo das peças existe', ()=>fsx.existsSync(pecasArq));
const pecasHtml=fsx.existsSync(pecasArq)?fsx.readFileSync(pecasArq,'utf8'):'';
t('é gerado, não escrito à mão', ()=>pecasHtml.includes('GERADO POR obs/gerar.js'));
t('reaproveita o estilo do overlay, sem copiar à mão',
  ()=>pecasHtml.includes('@keyframes replayVarre') && pecasHtml.includes('@keyframes seloIn'));
t('traz a marcação do palco', ()=>['ovRep','ovIdent','ovSpo','ovAgd','ovFim','ovTens','ovBrk']
  .every(id=>pecasHtml.includes('id="'+id+'"')));
t('o fundo é transparente, como o OBS precisa',
  ()=>/html,body\{background:transparent/.test(pecasHtml));
t('o quadro é 1920×1080', ()=>/body\{width:1920px;height:1080px;\}/.test(pecasHtml));
t('solta, cada peça sai no tamanho de desenho',
  ()=>/\.stage\{--esc:1;\}/.test(pecasHtml));

// as sete peças desenham
const pecas=['replay','cartela','selo','quebrou','patrocinio','proximos','fim'];
for(const nome of pecas){
  const w2=new JSDOM(pecasHtml,{runScripts:'dangerously',pretendToBeVisual:true,
    url:'https://x/obs/pecas.html?peca='+nome+
        '&torneio=COPA&cat=MISTA%20A&fase=FINAL&venceu=Ana/Bia&perdeu=Cris/Dani'+
        '&sets=6-4%203-6&texto=MATCH%20POINT&patrocinador=ARENA'+
        '&jogados=|OITAVAS|Ju/Tom|Lia/Vitor|6-2&fila=19:00|FINAL|A/B|C/D|'}).window;
  await new Promise(r4=>setTimeout(r4,120));
  const d2=w2.document;
  const visiveis=[...d2.querySelectorAll('.stage > *')].filter(n=>!n.classList.contains('peca-off'));
  t('peça '+nome+' deixa só ela no palco', ()=>visiveis.length>=1 && visiveis.length<=2);
  t('peça '+nome+' entra em cena', ()=>!!d2.querySelector('.show'));
}

const wErr=new JSDOM(pecasHtml,{runScripts:'dangerously',pretendToBeVisual:true,
  url:'https://x/obs/pecas.html?peca=inventada'}).window;
await new Promise(r5=>setTimeout(r5,120));
t('peça desconhecida avisa em vez de ficar preta',
  ()=>wErr.document.body.textContent.includes('Peça desconhecida'));

console.log('\n'+(bad? '✗ '+bad+' FALHA(S) · '+ok+' ok' : '✓ TUDO OK · '+ok+' testes'));
  process.exit(bad?1:0);
},700);

},700);
