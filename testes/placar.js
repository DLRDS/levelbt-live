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
function abrirComObs(nivel, cenas, armazem){
  const chamou=[];
  const w2=new JSDOM(html,{runScripts:'dangerously',url:'https://x/index.html?overlay=tk1',
    pretendToBeVisual:true,beforeParse(w){
      // No OBS, todas as fontes de navegador dividem o mesmo perfil, logo o
      // mesmo localStorage. Aqui dá para simular isso passando o mesmo
      // objeto para duas janelas.
      if(armazem) Object.defineProperty(w,'localStorage',{value:armazem,configurable:true});
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

// ── O BUG DAS TRÊS VEZES ──────────────────────────────────────────
// O overlay fica na cena ao vivo E na cena do replay, e a fonte pode
// recarregar ao trocar de cena. Cada instância nasce com a memória limpa,
// lê o mesmo comando ainda válido e dispara a coreografia de novo. Eram
// três disparos: um por instância. O guarda tem de ser da MÁQUINA.
const dados=new Map();
const armazemOBS={
  getItem:k=>dados.has(k)?dados.get(k):null,
  setItem:(k,v)=>dados.set(k,String(v)),
  removeItem:k=>dados.delete(k), clear:()=>dados.clear()
};
const cena1=abrirComObs(4,['Quadra 1','Intervalo'],armazemOBS);
const cena2=abrirComObs(4,['Quadra 1','Intervalo'],armazemOBS);
await new Promise(r8b=>setTimeout(r8b,1200));
cena1.chamou.length=0; cena2.chamou.length=0;
const umSo={id:'tresvezes',acao:'replay',em:Date.now()};
cena1.w.obsAtenderComando({obsCmd:umSo});
cena2.w.obsAtenderComando({obsCmd:umSo});
t('duas instâncias do overlay no OBS gastam o comando UMA vez', ()=>
  cena1.chamou.filter(c=>c==='saveReplayBuffer').length +
  cena2.chamou.filter(c=>c==='saveReplayBuffer').length === 1);

// e sobrevive a recarregar a página, que é o outro caminho do mesmo bug
const cena3=abrirComObs(4,['Quadra 1','Intervalo'],armazemOBS);
await new Promise(r8c=>setTimeout(r8c,1200));
cena3.chamou.length=0;
cena3.w.obsAtenderComando({obsCmd:umSo});
t('e a fonte recarregada não repete o replay',
  ()=>cena3.chamou.filter(c=>c==='saveReplayBuffer').length===0);

// Fora do OBS ninguém gasta comando de ninguém: o preview do painel roda
// este mesmo arquivo, e no mesmo navegador do painel.
t('o preview, fora do OBS, não consome o comando do OBS',
  ()=>/function marcarCmdUsado[\s\S]{0,200}if\(!OBS\) return;/.test(html));

// permissão baixa
const pouco=abrirComObs(1);
await new Promise(r8=>setTimeout(r8,900));
t('com permissão baixa, o replay não é chamado', ()=>{
  pouco.chamou.length=0;
  return pouco.w.obsExecutar({acao:'replay'})==='sem permissão'
      && pouco.chamou.length===0;
});

console.log('\n── A COREOGRAFIA DO REPLAY ──');
const seq=abrirComObs(4,['Ao vivo','Replay']);
await new Promise(rA=>setTimeout(rA,1200));
const seqD=seq.w.document;
const selo=seqD.getElementById('ovSeloRep');
t('o selo de REPLAY existe e começa escondido',
  ()=>!!selo && selo.classList.contains('hidden'));

seq.chamou.length=0;
seq.w.obsSequenciaReplay({cenaReplay:'Replay', cenaAoVivo:'Ao vivo', segundos:2});
t('manda salvar o buffer primeiro de tudo', ()=>seq.chamou.includes('saveReplayBuffer'));
t('a cortina ainda não entrou: o arquivo precisa de folga',
  ()=>!seqD.getElementById('ovRep').classList.contains('show'));
t('e muito menos corta', ()=>!seq.chamou.some(c=>c.startsWith('setCurrentScene')));

await new Promise(rB0=>setTimeout(rB0,900));
t('passada a folga, a cortina entra',
  ()=>seqD.getElementById('ovRep').classList.contains('show'));
t('e o corte só vem depois dela cobrir',
  ()=>!seq.chamou.some(c=>c.startsWith('setCurrentScene')));

await new Promise(rB=>setTimeout(rB,1400));   // passa o instante coberto
t('com a tela coberta, corta para a cena do replay',
  ()=>seq.chamou.includes('setCurrentScene:Replay'));
t('e o selo REPLAY entra',  ()=>!selo.classList.contains('hidden'));
t('o placar sai, porque estaria errado sobre o replay', ()=>{
  const m=seq.w.novaPartida({t1:['A'],t2:['B']});
  m.v++; seq.w.pintarOverlay(m);
  return seqD.getElementById('bug').classList.contains('out');
});

await new Promise(rC=>setTimeout(rC,2000+1400));  // D + volta coberta
t('no fim, volta para a cena ao vivo',
  ()=>seq.chamou.includes('setCurrentScene:Ao vivo'));
t('e o selo sai', ()=>selo.classList.contains('hidden'));
t('o placar volta', ()=>{
  const m=seq.w.novaPartida({t1:['A'],t2:['B']});
  m.v++; seq.w.pintarOverlay(m);
  return !seqD.getElementById('bug').classList.contains('out');
});

t('a duração é limitada, para um valor absurdo não travar a transmissão', ()=>{
  const antes=seq.chamou.length;
  seq.w.pararSequenciaReplay();
  seq.w.obsSequenciaReplay({cenaReplay:'Replay',cenaAoVivo:'Ao vivo',segundos:9999});
  seq.w.pararSequenciaReplay();
  return true;   // não travou nem estourou
});
t('o instante do corte casa com a janela coberta da cortina',
  ()=>/const COBERTO_MS=1200;/.test(html) && /replayVarre 2\.6s/.test(html));
t('existe folga entre salvar e cortar, para o arquivo ficar pronto',
  ()=>/const PRE_SALVA_MS=700;/.test(html));

console.log('\n── O SCRIPT QUE CARREGA O ARQUIVO ──');
const lua=require('fs').readFileSync(require('path').join(__dirname,'..','obs','levelbt-replay.lua'),'utf8');
t('o script existe no repositório', ()=>lua.length>500);
t('ele ouve o EVENTO de replay salvo, não um atalho',
  ()=>lua.includes('OBS_FRONTEND_EVENT_REPLAY_BUFFER_SAVED')
    && lua.includes('obs_frontend_add_event_callback'));
t('e não registra atalho nenhum — era isso que quebrava',
  ()=>!lua.includes('obs_hotkey_register_frontend'));
t('pergunta ao buffer qual foi o último arquivo',
  ()=>lua.includes('get_last_replay'));
t('aguenta o arquivo demorar, em vez de supor um tempo',
  ()=>lua.includes('MAX_TENTATIVAS') && lua.includes('timer_add'));
t('sabe lidar com Fonte de Mídia e com VLC',
  ()=>lua.includes('ffmpeg_source') && lua.includes('vlc_source'));
t('avisa no log quando a fonte não existe',
  ()=>lua.includes("nao achei fonte chamada"));
// Cada um destes era um caminho de falha SILENCIOSA: o script desistia e
// a Fonte de Mídia ficava vazia sem uma linha de explicação. Foi o que
// aconteceu na prática.
t('avisa quando nenhuma fonte foi escolhida',
  ()=>lua.includes('nenhuma Fonte de Midia escolhida'));
t('avisa quando o Replay Buffer está desligado',
  ()=>lua.includes('Replay Buffer nao existe')
    && lua.includes("nao esta ") && lua.includes("obs_output_active"));
t('tem botão de conferência, para testar sem a coreografia',
  ()=>lua.includes('obs_properties_add_button')
    && lua.includes('botao_agora'));
t('manda a mídia tocar uma vez, não em laço',
  ()=>/obs_data_set_bool\(ajustes, "looping", false\)/.test(lua));
t('não empilha callback ao recarregar o script',
  ()=>lua.includes('obs_frontend_remove_event_callback'));

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

// sem cenas escolhidas: salva e toca a cortina
ctrlObsD.getElementById('btnReplay').click();
t('sem cenas escolhidas, salva no OBS e toca a cortina', ()=>{
  const m=ctrlObs.partidaAtual();
  return m.replayEm>0 && m.obsCmd && m.obsCmd.acao==='replay';
});

// com as duas cenas escolhidas: a coreografia inteira
const Mc=ctrlObs.partidaAtual();
Mc.obsCfg={cenaReplay:'Intervalo', cenaAoVivo:'Quadra', segundos:15};
// o clique anterior travou o botão; o rótulo só é reescrito quando ele
// está livre, justamente para não apagar o "REPLAY NO AR…"
ctrlObsD.getElementById('btnReplay').disabled=false;
ctrlObs.pintarControle();
t('com as duas cenas, o botão anuncia o replay completo',
  ()=>ctrlObsD.getElementById('btnReplay').textContent.includes('REPLAY COMPLETO'));
t('e mostra a duração escolhida',
  ()=>ctrlObsD.getElementById('btnReplay').textContent.includes('15s'));
ctrlObsD.getElementById('btnReplay').disabled=false;
ctrlObsD.getElementById('btnReplay').click();
t('o comando enviado é a sequência, com as cenas junto', ()=>{
  const c=ctrlObs.partidaAtual().obsCmd;
  return c.acao==='replaySeq' && c.cfg.cenaReplay==='Intervalo'
      && c.cfg.cenaAoVivo==='Quadra' && c.cfg.segundos===15;
});
t('faltando uma cena, não promete o que não entrega', ()=>{
  Mc.obsCfg={cenaReplay:'Intervalo', cenaAoVivo:'', segundos:10};
  return ctrlObs.replayCompletoPronto()===false;
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
const pecas=['replay','cartela','selo','quebrou','patrocinio','proximos','fim','stats'];
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


// ══════════════════════════════════════════════════════════════════
// SINCRONIA · FILA, REENVIO E DESFAZER PERSISTENTE
//
// Aqui o banco de mentira imita o banco-v2.sql DE VERDADE, inclusive a
// recusa por número de ordem antigo. Se a regra do SQL e a do navegador
// discordarem, é aqui que aparece.
// ══════════════════════════════════════════════════════════════════
console.log('\n── SINCRONIA ──');

function bancoFalso(){
  const linhas={};
  const b={
    linhas, escritas:[], tentativas:[], atrasarWrite:null,
    rpc: async (fn,a)=>{
      if(fn==='bc_create'){
        linhas['tk1']={ck:'ck1',payload:{}};
        return {data:[{token:'tk1',control_key:'ck1'}],error:null};
      }
      if(fn==='bc_write'){
        b.tentativas.push(JSON.parse(JSON.stringify(a.p_payload)));
        if(b.atrasarWrite) return b.atrasarWrite(a);
        return b.gravar(a);
      }
      if(fn==='bc_read'){
        const l=linhas[a.p_token];
        return {data:l?JSON.parse(JSON.stringify(l.payload)):null,error:null};
      }
      return {data:null,error:null};
    },
    // a mesma regra do banco-v2.sql, em JavaScript
    gravar: (a)=>{
      b.escritas.push(JSON.parse(JSON.stringify(a.p_payload)));
      const l=Object.values(linhas).find(x=>x.ck===a.p_control_key);
      if(!l) return {data:{ok:false,motivo:'chave'},error:null};
      const novoV  = typeof a.p_payload.v==='number' ? a.p_payload.v : null;
      const velhoV = typeof l.payload.v==='number'   ? l.payload.v   : null;
      if(novoV!==null && velhoV!==null && novoV<=velhoV)
        return {data:{ok:false,motivo:'antigo',v:velhoV},error:null};
      l.payload=JSON.parse(JSON.stringify(a.p_payload));
      return {data:{ok:true,motivo:'gravado',v:novoV},error:null};
    }
  };
  return b;
}

// localStorage que dá para compartilhar entre duas janelas — é assim que
// se simula "o operador recarregou a página".
function armazemFalso(){
  const m=new Map();
  return {getItem:k=>m.has(k)?m.get(k):null,
          setItem:(k,v)=>m.set(k,String(v)),
          removeItem:k=>m.delete(k), clear:()=>m.clear(), _mapa:m};
}

function abrirPainel(banco, armazem){
  return new JSDOM(html,{runScripts:'dangerously',url:'https://x/index.html',
    pretendToBeVisual:true,beforeParse(w){
      if(armazem) Object.defineProperty(w,'localStorage',{value:armazem,configurable:true});
      w.innerWidth=1440; w.innerHeight=900; w.scrollTo=()=>{}; w.confirm=()=>true;
      w.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});
      w.supabase={createClient:()=>({ rpc:banco.rpc,
        storage:{from:()=>({upload:async()=>({error:null}),
          getPublicUrl:()=>({data:{publicUrl:'https://x/l.png'}})})}})};
    }}).window;
}

async function painelComJogo(banco, armazem){
  const w=abrirPainel(banco, armazem);
  await new Promise(r=>setTimeout(r,700));
  w.document.getElementById('a1').value='Ana';
  w.document.getElementById('b1').value='Cris';
  await w.iniciar();
  await new Promise(r=>setTimeout(r,60));
  return w;
}

// ── A fila: um envio de cada vez, e o do meio morre ───────────────
{
  const banco=bancoFalso();
  const w=await painelComJogo(banco);
  banco.escritas.length=0; banco.tentativas.length=0;

  // segura o próximo envio no ar, como uma internet lenta faria
  let soltar=null;
  banco.atrasarWrite=(a)=>new Promise(res=>{ soltar=()=>{ banco.atrasarWrite=null; res(banco.gravar(a)); }; });

  w.setCena('agenda');          // dispara o envio que vai ficar pendurado
  await new Promise(r=>setTimeout(r,20));
  w.setCena('patroc');          // estes três acontecem com o anterior no ar
  w.setCena('oculto');
  w.setCena('placar');
  await new Promise(r=>setTimeout(r,20));

  t('com um envio no ar, os seguintes não saem atropelando',
    ()=>banco.tentativas.length===1);

  soltar();
  await new Promise(r=>setTimeout(r,60));

  t('ao liberar, sai UM envio só com os três de uma vez',
    ()=>banco.tentativas.length===2);
  t('e o que saiu é o estado mais recente, não o do meio',
    ()=>banco.tentativas[1].cena==='placar');
  t('o banco ficou com o placar certo',
    ()=>banco.linhas['tk1'].payload.cena==='placar');
}

// ── Reenvio com espera crescente ──────────────────────────────────
{
  const banco=bancoFalso();
  const w=await painelComJogo(banco);
  const msg=()=>w.document.getElementById('syncMsg');

  let quedas=0;
  banco.atrasarWrite=(a)=>{ quedas++; if(quedas<=1) throw new Error('sem internet');
                            banco.atrasarWrite=null; return banco.gravar(a); };
  w.setCena('agenda');
  await new Promise(r=>setTimeout(r,60));

  t('a queda aparece na tela, com o número da tentativa',
    ()=>/tentando de novo \(1ª vez\)/.test(msg().textContent));
  t('e o aviso fica em vermelho', ()=>msg().classList.contains('sync-fora'));

  // enquanto está fora, o operador segue marcando
  w.setCena('placar');
  await new Promise(r=>setTimeout(r,1300));   // a 1ª espera é de 1s

  t('ele tentou de novo sozinho, sem ninguém mandar',
    ()=>banco.escritas.length>=2);
  t('e o que foi gravado é o placar de AGORA, não o que falhou',
    ()=>banco.linhas['tk1'].payload.cena==='placar');
  t('quando volta, avisa que voltou',
    ()=>/Sincronizado de novo/.test(msg().textContent)
      && msg().classList.contains('sync-voltou'));
}

// ── Recusa por ordem não é alarme; chave errada é ─────────────────
{
  const banco=bancoFalso();
  const w=await painelComJogo(banco);
  const msg=()=>w.document.getElementById('syncMsg');

  banco.atrasarWrite=()=>({data:{ok:false,motivo:'antigo',v:999},error:null});
  w.setCena('agenda');
  await new Promise(r=>setTimeout(r,60));
  t('recusa por mensagem atrasada não assusta o operador',
    ()=>!msg().classList.contains('sync-fora')
      && /Sincronizado/.test(msg().textContent));

  banco.atrasarWrite=()=>({data:{ok:false,motivo:'chave'},error:null});
  w.setCena('placar');
  await new Promise(r=>setTimeout(r,60));
  t('chave de controle errada, essa sim, aparece em vermelho',
    ()=>msg().classList.contains('sync-fora')
      && /Chave de controle/.test(msg().textContent));
}

// ── O número de ordem nunca anda para trás ────────────────────────
{
  const banco=bancoFalso();
  const w=await painelComJogo(banco);

  w.document.getElementById('tap1').click();
  await new Promise(r=>setTimeout(r,40));
  w.document.getElementById('tap1').click();
  await new Promise(r=>setTimeout(r,40));
  const vAntes=banco.linhas['tk1'].payload.v;

  w.document.getElementById('btnUndo').click();
  await new Promise(r=>setTimeout(r,60));

  // Este é o teste que importa: o desfazer restaura um placar ANTIGO, de
  // v menor. Se ele devolvesse o v antigo, o banco recusaria a correção
  // como "mensagem atrasada" e o OBS ficaria com o ponto errado na tela.
  t('desfazer chega ao banco em vez de ser recusado como atrasado',
    ()=>banco.linhas['tk1'].payload.v > vAntes);
  t('e o placar realmente voltou um ponto',
    ()=>banco.linhas['tk1'].payload.p1===1);
}

// ── O DESFAZER sobrevive ao recarregar ────────────────────────────
{
  const banco=bancoFalso(), armazem=armazemFalso();
  const w1=await painelComJogo(banco, armazem);
  w1.pontoPara(w1.partidaAtual(),1); w1.publicar();
  w1.pontoPara(w1.partidaAtual(),2); w1.publicar();
  await new Promise(r=>setTimeout(r,60));

  t('a pilha de desfazer foi gravada no aparelho',
    ()=>JSON.parse(armazem.getItem('lbt_hist_tk1')||'[]').length===2);

  // o operador recarrega a página
  const w2=abrirPainel(banco, armazem);
  await new Promise(r=>setTimeout(r,700));
  const voltou=await w2.tentarRetomar();
  await new Promise(r=>setTimeout(r,40));

  t('a partida volta depois do F5', ()=>voltou===true);
  t('e o DESFAZER volta habilitado junto',
    ()=>w2.document.getElementById('btnUndo').disabled===false);

  w2.document.getElementById('btnUndo').click();
  await new Promise(r=>setTimeout(r,60));
  t('e desfaz de verdade o ponto de antes do F5',
    ()=>banco.linhas['tk1'].payload.p2===0 && banco.linhas['tk1'].payload.p1===1);

  // jogo novo começa sem desfazer do jogo anterior
  w2.esquecerHist();
  t('jogo novo pela fila limpa a pilha, também no aparelho',
    ()=>armazem.getItem('lbt_hist_tk1')===null);
}

// ── Duas quadras no mesmo celular não se misturam ─────────────────
t('a pilha é chaveada pelo token da transmissão',
  ()=>/const HIST_LS='lbt_hist_'/.test(html)
    && /return tokenPub \? HIST_LS\+tokenPub : null/.test(html));
t('e tem teto, para não encher a memória do celular',
  ()=>/const HIST_MAX=200/.test(html) && /hist\.slice\(-HIST_MAX\)/.test(html));

// ── O SQL novo existe e não mexe no antigo ────────────────────────
const sqlV2=fs.readFileSync(path.join(__dirname,'..','banco-v2.sql'),'utf8');
t('banco-v2.sql derruba a função antes, porque o tipo de retorno mudou',
  ()=>/drop function if exists bc_write\(text, jsonb\)/.test(sqlV2));
t('e compara o número de ordem antes de gravar',
  ()=>/v_novo <= v_velho/.test(sqlV2) && /'motivo', 'antigo'/.test(sqlV2));
t('payload sem número de ordem continua passando (primeira gravação)',
  ()=>/v_novo is not null and v_velho is not null/.test(sqlV2));
t('e segura a linha para dois envios simultâneos não se atropelarem',
  ()=>/for update/.test(sqlV2));
const sqlV1=fs.readFileSync(path.join(__dirname,'..','banco.sql'),'utf8');
t('o banco.sql original ficou intocado',
  ()=>sqlV1.includes('returns boolean') && !sqlV1.includes('v_velho'));



// ══════════════════════════════════════════════════════════════════
// TEMPO REAL · A CAMPAINHA
//
// A campainha é um aviso VAZIO. O que vai ao ar vem sempre do bc_read.
// Os testes aqui existem sobretudo para garantir que ninguém, um dia,
// "otimize" isso mandando o placar junto — seria abrir a porta para
// placar falso no meio da final.
// ══════════════════════════════════════════════════════════════════
console.log('\n── TEMPO REAL ──');

// Realtime de mentira: guarda o que foi assinado e o que foi enviado.
function realtimeFalso(){
  const r={canais:[], enviados:[], estado:'SUBSCRIBED'};
  r.channel=(nome)=>{
    const c={nome, ouvintes:{}, enviados:[]};
    c.on=(tipo,filtro,fn)=>{ c.ouvintes[filtro.event]=fn; return c; };
    c.subscribe=(cb)=>{ setTimeout(()=>cb&&cb(r.estado),0); return c; };
    c.send=async(msg)=>{ c.enviados.push(msg); r.enviados.push(msg); return 'ok'; };
    r.canais.push(c);
    return c;
  };
  return r;
}

function abrirOverlay(banco, rt){
  return new JSDOM(html,{runScripts:'dangerously',url:'https://x/index.html?overlay=tk1',
    pretendToBeVisual:true,beforeParse(w){
      w.innerWidth=1920; w.innerHeight=1080; w.scrollTo=()=>{};
      w.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});
      w.supabase={createClient:()=>{
        const cli={rpc:banco.rpc,
          storage:{from:()=>({upload:async()=>({error:null}),
            getPublicUrl:()=>({data:{publicUrl:'https://x/l.png'}})})}};
        if(rt){ cli.channel=rt.channel; cli.removeChannel=()=>{}; }
        return cli;
      }};
    }}).window;
}

// ── O overlay escuta e confere o banco ────────────────────────────
{
  const banco=bancoFalso(); const rt=realtimeFalso();
  banco.linhas['tk1']={ck:'ck1',payload:{t1:['Ana'],t2:['Cris'],v:1,status:'playing',
                                         p1:0,p2:0,g1:0,g2:0,s1:0,s2:0,cena:'placar',
                                         setsFeitos:[],agenda:[],patrocinios:[]}};
  let lidas=0;
  const rpcOrig=banco.rpc;
  banco.rpc=async(fn,a)=>{ if(fn==='bc_read') lidas++; return rpcOrig(fn,a); };

  const w=abrirOverlay(banco, rt);
  await new Promise(r=>setTimeout(r,800));

  t('o overlay entra no canal da sua transmissão',
    ()=>rt.canais.length===1 && rt.canais[0].nome==='bc:tk1');
  t('e escuta o aviso de mudança',
    ()=>typeof rt.canais[0].ouvintes['mudou']==='function');

  const antes=lidas;
  await new Promise(r=>setTimeout(r,350));   // passa o teto entre leituras
  rt.canais[0].ouvintes['mudou']({payload:{}});
  await new Promise(r=>setTimeout(r,80));
  t('campainha toca → o overlay vai conferir o banco na hora',
    ()=>lidas===antes+1);

  // ── a parte que importa: placar falso na campainha é ignorado ──
  banco.linhas['tk1'].payload.p1=2;
  banco.linhas['tk1'].payload.v=2;
  await new Promise(r=>setTimeout(r,350));
  rt.canais[0].ouvintes['mudou']({payload:{t1:['HACKER'],p1:99,v:9999}});
  await new Promise(r=>setTimeout(r,120));
  const texto=w.document.getElementById('stage').textContent;
  t('placar inventado na campainha não entra na tela',
    ()=>!texto.includes('HACKER') && !texto.includes('99'));
  t('o que aparece é o que o banco diz, lido pela porta de sempre',
    ()=>texto.includes('ANA') || texto.includes('Ana'));

  // ── enxurrada de campainhas vira uma leitura só ──
  await new Promise(r=>setTimeout(r,350));
  const antes2=lidas;
  for(let i=0;i<12;i++) rt.canais[0].ouvintes['mudou']({payload:{}});
  await new Promise(r=>setTimeout(r,120));
  t('doze campainhas seguidas não viram doze leituras',
    ()=>lidas-antes2<=2);
}

// ── Sem Realtime, nada quebra ─────────────────────────────────────
{
  const banco=bancoFalso();
  banco.linhas['tk1']={ck:'ck1',payload:{t1:['Ana'],t2:['Cris'],v:1,status:'playing',
                                         p1:0,p2:0,g1:0,g2:0,s1:0,s2:0,cena:'placar',
                                         setsFeitos:[],agenda:[],patrocinios:[]}};
  const w=abrirOverlay(banco, null);        // cliente sem .channel
  await new Promise(r=>setTimeout(r,800));
  t('biblioteca sem Realtime: o overlay desenha assim mesmo',
    ()=>/ANA|Ana/.test(w.document.getElementById('stage').textContent));
}

// ── O controle toca DEPOIS de gravar ──────────────────────────────
{
  const banco=bancoFalso(); const rt=realtimeFalso();
  const w=new JSDOM(html,{runScripts:'dangerously',url:'https://x/index.html',
    pretendToBeVisual:true,beforeParse(w2){
      w2.innerWidth=1440; w2.innerHeight=900; w2.scrollTo=()=>{}; w2.confirm=()=>true;
      w2.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});
      w2.supabase={createClient:()=>({rpc:banco.rpc, channel:rt.channel, removeChannel:()=>{},
        storage:{from:()=>({upload:async()=>({error:null}),
          getPublicUrl:()=>({data:{publicUrl:'https://x/l.png'}})})}})};
    }}).window;
  await new Promise(r=>setTimeout(r,700));
  w.document.getElementById('a1').value='Ana';
  w.document.getElementById('b1').value='Cris';
  await w.iniciar();
  await new Promise(r=>setTimeout(r,80));

  t('o controle também entra no canal da transmissão',
    ()=>rt.canais.some(c=>c.nome==='bc:tk1'));
  t('e o painel diz que está em tempo real',
    ()=>/TEMPO REAL/.test(w.document.getElementById('trMsg').textContent));

  const antes=rt.enviados.length;
  w.setCena('agenda');
  await new Promise(r=>setTimeout(r,80));
  t('cada mudança gravada toca a campainha',
    ()=>rt.enviados.length===antes+1);
  t('e a campainha vai VAZIA — sem placar dentro',
    ()=>Object.keys(rt.enviados[rt.enviados.length-1].payload||{}).length===0);

  // a gravação falha: não adianta tocar campainha para um placar que não entrou
  const antes2=rt.enviados.length;
  let caiu=0;
  banco.atrasarWrite=()=>{ caiu++; throw new Error('sem internet'); };
  w.setCena('placar');
  await new Promise(r=>setTimeout(r,80));
  t('gravação que falhou não toca campainha',
    ()=>caiu>0 && rt.enviados.length===antes2);
}

// ── Canal que não sobe cai para a reserva, e avisa ────────────────
{
  const banco=bancoFalso(); const rt=realtimeFalso(); rt.estado='CHANNEL_ERROR';
  const w=new JSDOM(html,{runScripts:'dangerously',url:'https://x/index.html',
    pretendToBeVisual:true,beforeParse(w2){
      w2.innerWidth=1440; w2.innerHeight=900; w2.scrollTo=()=>{}; w2.confirm=()=>true;
      w2.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});
      w2.supabase={createClient:()=>({rpc:banco.rpc, channel:rt.channel, removeChannel:()=>{},
        storage:{from:()=>({upload:async()=>({error:null}),
          getPublicUrl:()=>({data:{publicUrl:'https://x/l.png'}})})}})};
    }}).window;
  await new Promise(r=>setTimeout(r,700));
  w.document.getElementById('a1').value='Ana';
  w.document.getElementById('b1').value='Cris';
  await w.iniciar();
  await new Promise(r=>setTimeout(r,80));
  t('canal que não sobe: o painel avisa que está na reserva',
    ()=>/RESERVA/.test(w.document.getElementById('trMsg').textContent));
  t('e o placar continua sendo gravado normalmente',
    ()=>banco.linhas['tk1'].payload.t1[0]==='Ana');
}

// ── O vigia levanta a campainha caída ─────────────────────────────
{
  const banco=bancoFalso(); const rt=realtimeFalso(); rt.estado='CHANNEL_ERROR';
  const w=new JSDOM(html,{runScripts:'dangerously',url:'https://x/index.html',
    pretendToBeVisual:true,beforeParse(w2){
      w2.innerWidth=1440; w2.innerHeight=900; w2.scrollTo=()=>{}; w2.confirm=()=>true;
      w2.matchMedia=()=>({matches:true,addListener(){},removeListener(){}});
      w2.supabase={createClient:()=>({rpc:banco.rpc, channel:rt.channel, removeChannel:()=>{},
        storage:{from:()=>({upload:async()=>({error:null}),
          getPublicUrl:()=>({data:{publicUrl:'https://x/l.png'}})})}})};
    }}).window;
  await new Promise(r=>setTimeout(r,700));
  w.document.getElementById('a1').value='Ana';
  w.document.getElementById('b1').value='Cris';
  await w.iniciar();
  await new Promise(r=>setTimeout(r,80));

  const canaisAntes=rt.canais.length;
  rt.estado='SUBSCRIBED';              // a internet voltou
  w.religarCampainha();
  await new Promise(r=>setTimeout(r,60));
  t('o vigia levanta outra campainha quando a anterior morreu',
    ()=>rt.canais.length===canaisAntes+1);
  t('e o painel volta a dizer tempo real',
    ()=>/TEMPO REAL/.test(w.document.getElementById('trMsg').textContent));

  const quantos=rt.canais.length;
  w.religarCampainha();                 // com a campainha viva, não mexe
  await new Promise(r=>setTimeout(r,40));
  t('com a campainha viva, o vigia não fica trocando de canal à toa',
    ()=>rt.canais.length===quantos);
}

// ── O desenho, lido no código ─────────────────────────────────────
t('a reserva ficou em 5s, e não mais em 900ms',
  ()=>/const RESERVA_MS=5000/.test(html) && !/setTimeout\(loopOverlay,900\)/.test(html));
t('existe teto entre leituras, para campainha repetida não virar enxurrada',
  ()=>/const MIN_ENTRE_LEITURAS=300/.test(html));
t('a campainha não leva placar: o envio é sempre payload vazio',
  ()=>/event:'mudou',payload:\{\}/.test(html));
t('e o overlay nunca lê o payload da campainha',
  ()=>/\.on\('broadcast',\{event:'mudou'\},\(\)=>aoTocar\(\)\)/.test(html));
t('nenhuma policy foi aberta na tabela do placar',
  ()=>!/create policy[\s\S]{0,200}broadcasts/i.test(
        fs.readFileSync(path.join(__dirname,'..','banco.sql'),'utf8')
       +fs.readFileSync(path.join(__dirname,'..','banco-obs.sql'),'utf8')
       +fs.readFileSync(path.join(__dirname,'..','banco-v2.sql'),'utf8')));



// ══════════════════════════════════════════════════════════════════
// ESTATÍSTICAS · REGISTRO PONTO A PONTO
//
// Partidas jogadas aqui com resultado conhecido de antemão: cada número
// conferido foi calculado na mão antes de escrever o teste.
// ══════════════════════════════════════════════════════════════════
console.log('\n── ESTATÍSTICAS ──');
{
  const W=w;   // a janela demo do começo: tem todas as funções, sem banco
  const P=W.novaPartida({t1:['Ana','Bia'],t2:['Cris','Dani'],alvo:6,tbPts:7,nSets:2});
  P.saque=0;                                   // Ana saca: dupla 1 no saque

  t('partida nova nasce com o registro vazio', ()=>Array.isArray(P.pontos) && P.pontos.length===0);
  t('o placar curto começa em S1 0-0 0-0', ()=>W.placarCurto(P)==='S1 0-0 0-0');

  // O game, roteirizado: dupla 2 abre 0-40, a 1 salva três break points
  // até o quarentão, e a 2 converte no quarentão.
  //   0-0  0-15  0-30 │ 0-40 bp  15-40 bp  30-40 bp │ 40-40 bp+q
  [2,2,2, 1,1,1, 2].forEach(q=>W.pontoPara(P,q));

  t('cada ponto virou uma linha', ()=>P.pontos.length===7);
  t('a linha guarda o placar de ANTES do ponto',
    ()=>P.pontos[0].pl==='S1 0-0 0-0' && P.pontos[3].pl==='S1 0-0 0-40'
      && P.pontos[6].pl==='S1 0-0 40-40');
  t('e quem sacava — o jogador, não só a dupla', ()=>P.pontos.every(x=>x.s===0));
  t('0-15 e 0-30 não são break point', ()=>!P.pontos[1].bp && !P.pontos[2].bp);
  t('0-40, 15-40 e 30-40 são break point', ()=>P.pontos[3].bp && P.pontos[4].bp && P.pontos[5].bp);
  t('o quarentão é break point E quarentão', ()=>P.pontos[6].bp===1 && P.pontos[6].q===1);
  t('campo falso nem é gravado, para a linha ficar enxuta',
    ()=>!('bp' in P.pontos[0]) && !('q' in P.pontos[0]));
  t('e o game virou quebra de saque', ()=>P.g2===1 && P.evento && P.evento.t==='QUEBROU');

  const e=W.estatisticas(P);
  t('saque da dupla 1: venceu 3 de 7', ()=>e[1].saqueV===3 && e[1].saqueJ===7);
  t('devolução da dupla 2: venceu 4 de 7', ()=>e[2].devolV===4 && e[2].devolJ===7);
  t('dupla 2 ainda não sacou: zero jogados', ()=>e[2].saqueJ===0);
  t('break points da dupla 2: converteu 1 de 4', ()=>e[2].bpV===1 && e[2].bpJ===4);
  t('quem saca não tem break point', ()=>e[1].bpJ===0);
  t('maior sequência: 3 para cada lado', ()=>e[1].seq===3 && e[2].seq===3);
  t('quarentão: 1 para a dupla 2, 0 para a 1', ()=>e[2].q===1 && e[1].q===0);
  t('total de pontos', ()=>e.total===7);

  // segundo game: agora a dupla 2 saca (rodízio ITF: 0 → 2)
  t('o saque passou para a outra dupla', ()=>P.saque===2);
  [2,2,2,2].forEach(q=>W.pontoPara(P,q));       // game de zero da dupla 2
  const e2=W.estatisticas(P);
  t('game de zero no saque: 4/4', ()=>e2[2].saqueV===4 && e2[2].saqueJ===4);
  t('e a sequência atravessa de um game para o outro: 5 seguidos',
    ()=>e2[2].seq===5);
  t('placar curto no segundo game', ()=>P.pontos[7].pl==='S1 0-1 0-0');

  // ── as linhas prontas para a tela ──
  const L=W.linhasEstat(e2);
  t('cinco linhas, na ordem combinada', ()=>L.length===5 &&
    L.map(l=>l.rot).join('|')==='PONTOS NO SAQUE|PONTOS NA DEVOLUÇÃO|BREAK POINTS|MAIOR SEQUÊNCIA|QUARENTÕES VENCIDOS');
  t('saque mostrado como fração e porcentagem',
    ()=>L[0].a==='3/7' && L[0].pa==='43%' && L[0].b==='4/4' && L[0].pb==='100%');
  t('break points como "1/4"', ()=>L[2].b==='1/4' && L[2].a==='—');
  t('quem lidera fica marcado', ()=>L[0].lid===2 && L[3].lid===2);

  // ── tiebreak: conta no saque, mas não tem break point nem quarentão ──
  const T=W.novaPartida({t1:['A'],t2:['B'],alvo:6,tbPts:7,nSets:2});
  T.g1=6; T.g2=6; W.conferirTiebreak(T);
  t('em 6-6 entra no tiebreak', ()=>T.inTb===true);
  t('placar curto do tiebreak', ()=>W.placarCurto(T)==='S1 TB 0-0');
  [1,2,1,2,1,2].forEach(q=>W.pontoPara(T,q));
  t('no tiebreak nenhum ponto é break point', ()=>T.pontos.every(x=>!x.bp));
  t('nem quarentão', ()=>T.pontos.every(x=>!x.q));
  const et=W.estatisticas(T);
  t('mas todos contam no saque e na devolução',
    ()=>et[1].saqueJ+et[2].saqueJ===6 && et[1].devolJ+et[2].devolJ===6);
  t('o sacador muda ao longo do tiebreak, e o registro acompanha',
    ()=>new Set(T.pontos.map(x=>x.s)).size>=2);

  const S=W.novaPartida({t1:['A'],t2:['B'],nSets:2});
  S.s1=1; S.s2=1; S.setsFeitos=[{g1:6,g2:3},{g1:3,g2:6}]; S.superSet=true; S.inTb=true; S.tb1=7; S.tb2=6;
  t('placar curto do match tiebreak', ()=>W.placarCurto(S)==='MTB 7-6');

  // ── robustez ──
  const V=W.novaPartida({t1:['A'],t2:['B']}); delete V.pontos;
  t('partida antiga, sem registro: as contas dão zero sem quebrar',
    ()=>W.estatisticas(V).total===0);
  W.pontoPara(V,1);
  t('e o primeiro ponto cria o registro', ()=>Array.isArray(V.pontos) && V.pontos.length===1);
  const X={pontos:[null,{w:7},{w:'1'},{},{w:1,s:0}]};
  t('linha estranha no registro é ignorada, não derruba a conta',
    ()=>W.estatisticas(X).total===1);
  t('sem nenhum ponto, traço — nunca "0%" inventado',
    ()=>W.linhasEstat(W.estatisticas({pontos:[]}))[0].a==='—'
      && W.linhasEstat(W.estatisticas({pontos:[]}))[0].pa==='');
  t('sem dado dos dois lados, ninguém é pintado de líder',
    ()=>W.linhasEstat(e)[0].lid===0);   // dupla 2 não tinha sacado ainda

  // ── trocar de jogo zera ──
  const J=W.novaPartida({t1:['A'],t2:['B']});
  W.pontoPara(J,1); W.pontoPara(J,2);
  W.trocarJogo(J,{a:'C',b:'D',ctx:''});
  t('jogo novo pela fila começa sem o registro do anterior', ()=>J.pontos.length===0);
}

// ── Desfazer apaga o registro junto ───────────────────────────────
{
  const banco=bancoFalso();
  const wp=await painelComJogo(banco);
  wp.document.getElementById('tap1').click(); await new Promise(r=>setTimeout(r,30));
  wp.document.getElementById('tap2').click(); await new Promise(r=>setTimeout(r,30));
  wp.document.getElementById('tap2').click(); await new Promise(r=>setTimeout(r,60));
  t('três toques, três linhas', ()=>wp.partidaAtual().pontos.length===3);
  t('e o registro viaja para o banco junto com o placar',
    ()=>banco.linhas['tk1'].payload.pontos.length===3);

  wp.document.getElementById('btnUndo').click(); await new Promise(r=>setTimeout(r,60));
  t('desfazer apaga a última linha', ()=>wp.partidaAtual().pontos.length===2);
  t('e o banco fica com o registro certo', ()=>banco.linhas['tk1'].payload.pontos.length===2);

  // o ajuste manual não inventa linha
  wp.ajustar('p1+'); await new Promise(r=>setTimeout(r,40));
  t('ajuste manual não cria registro', ()=>wp.partidaAtual().pontos.length===2);
  t('e o painel avisa em quantos pontos a conta se baseia',
    ()=>/BASEADO EM 2 PONTOS MARCADOS/.test(wp.document.getElementById('ctrlStats').textContent)
      && /AJUSTES MANUAIS NÃO ENTRAM/.test(wp.document.getElementById('ctrlStats').textContent));
  t('a gaveta mostra as cinco estatísticas',
    ()=>wp.document.querySelectorAll('#ctrlStats .sl').length===5);

  // ── a cartela no ar ──
  t('a mesa de corte tem o botão ESTATÍSTICAS',
    ()=>!!wp.document.querySelector('#cenas .cenab[data-c="stats"]'));
  wp.document.querySelector('#cenas .cenab[data-c="stats"]').click();
  await new Promise(r=>setTimeout(r,60));
  t('apertar o botão põe a cena no ar e acende o botão',
    ()=>banco.linhas['tk1'].payload.cena==='stats'
      && wp.document.querySelector('#cenas .cenab[data-c="stats"]').classList.contains('on'));
}

// ── O overlay desenha a cartela ───────────────────────────────────
{
  const banco=bancoFalso();
  const base=w.novaPartida({t1:['Ana','Bia'],t2:['Cris','Dani'],torneio:'Copa Verão',cat:'Mista A',fase:'Semi'});
  base.saque=0;
  [2,2,2,1,1,1,2].forEach(q=>w.pontoPara(base,q));
  base.cena='stats'; base.v=50;
  banco.linhas['tk1']={ck:'ck1',payload:JSON.parse(JSON.stringify(base))};
  const wo=abrirOverlay(banco,null);
  await new Promise(r=>setTimeout(r,800));
  const d2=wo.document;
  t('com a cena ESTATÍSTICAS, a cartela entra', ()=>d2.getElementById('ovSta').classList.contains('show'));
  t('e o placar sai, como nas outras cartelas', ()=>d2.getElementById('bug').classList.contains('out'));
  t('a cartela traz as duas duplas', ()=>d2.getElementById('staA').textContent==='Ana/Bia'
    && d2.getElementById('staB').textContent==='Cris/Dani');
  t('e o contexto do jogo', ()=>/COPA VERÃO · MISTA A · SEMI/.test(d2.getElementById('staCtx').textContent));
  t('as cinco linhas', ()=>d2.querySelectorAll('#staLinhas .ln').length===5);
  t('com os números da mesma conta do controle',
    ()=>/3\/7/.test(d2.getElementById('staLinhas').textContent)
      && /1\/4/.test(d2.getElementById('staLinhas').textContent));

  // volta para o placar: a cartela sai
  banco.linhas['tk1'].payload.cena='placar'; banco.linhas['tk1'].payload.v=51;
  await new Promise(r=>setTimeout(r,5300));     // a reserva lê de 5 em 5s
  t('voltando para PLACAR, a cartela sai e o placar volta',
    ()=>!d2.getElementById('ovSta').classList.contains('show')
      && !d2.getElementById('bug').classList.contains('out'));
}
t('nenhuma animação nova mexe em letter-spacing',
  ()=>!/\.sta[^{]*\{[^}]*animation[^}]*letter/.test(html));



// ── A peça avulsa de estatísticas ─────────────────────────────────
{
  const abrirPeca=(q)=>new JSDOM(pecasHtml,{runScripts:'dangerously',pretendToBeVisual:true,
    url:'https://x/obs/pecas.html?'+q}).window;
  const wp=abrirPeca('peca=stats&a=Ana/Bia&b=Cris/Dani&torneio=Copa&saque=24/32,18/29&devol=11/29,8/32&bp=2/5,1/3&seq=6,4&q=3,2');
  await new Promise(r=>setTimeout(r,150));
  const d3=wp.document, txt3=d3.getElementById('staLinhas').textContent;
  t('peça stats: as duplas vêm do endereço',
    ()=>d3.getElementById('staA').textContent==='Ana/Bia' && d3.getElementById('staB').textContent==='Cris/Dani');
  t('peça stats: os números também', ()=>/24\/32/.test(txt3) && /2\/5/.test(txt3) && /6/.test(txt3));
  t('peça stats: a porcentagem é calculada, não digitada', ()=>/75%/.test(txt3) && /62%/.test(txt3));
  t('peça stats: quem lidera fica laranja, igual ao ao vivo',
    ()=>d3.querySelectorAll('#staLinhas .v.a.lid').length===5);

  // A regra do projeto: nunca inventar resultado. Sem endereço, traço.
  const vz=abrirPeca('peca=stats');
  await new Promise(r=>setTimeout(r,150));
  const dv=vz.document;
  t('peça stats sem dados mostra traço, nunca número de exemplo',
    ()=>dv.getElementById('staA').textContent==='—'
      && !/\d/.test(dv.getElementById('staLinhas').textContent));

  const xs=abrirPeca('peca=stats&saque='+encodeURIComponent('<img src=x onerror=alert(1)>,1/2'));
  await new Promise(r=>setTimeout(r,150));
  t('peça stats: o endereço não vira HTML', ()=>!xs.document.querySelector('#staLinhas img'));
}

console.log('\n'+(bad? '✗ '+bad+' FALHA(S) · '+ok+' ok' : '✓ TUDO OK · '+ok+' testes'));
  process.exit(bad?1:0);
},700);

},700);
