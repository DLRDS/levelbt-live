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

function abrir(url,largura){
  return new JSDOM(html,{runScripts:'dangerously',url,pretendToBeVisual:true,beforeParse(w){
    w.innerWidth=largura||1440; w.innerHeight=900;
    w.scrollTo=()=>{}; w.confirm=()=>true;
    w.supabase={createClient:()=>({
      rpc:async()=>({data:null,error:null}),
      storage:{from:()=>({upload:async()=>({error:null}),
        getPublicUrl:()=>({data:{publicUrl:'https://x/l.png'}})})}
    })};
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

console.log('\n── O OVERLAY DESENHA ──');
const O=w.novaPartida({t1:['Ana','Bia'],t2:['Cris','Dani'],cat:'Mista A',fase:'Final',
  torneio:'Copa Verão',quadra:'Quadra 2'});
O.g1=4; O.g2=2; O.p1=2; O.v++;
w.pintarOverlay(O);
t('os nomes aparecem', ()=>d.getElementById('ovN1').textContent==='Ana/Bia');
t('os games aparecem',  ()=>d.getElementById('ovG1').textContent==='4');
t('os pontos aparecem', ()=>d.getElementById('ovP1').textContent==='30');
t('o relógio anda',     ()=>/^\d+:\d\d/.test(d.getElementById('ovTempo').textContent));
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
setTimeout(()=>{
  const cd=c.document;
  t('o controle abre sem overlay',
    ()=>!cd.getElementById('ctrl').classList.contains('hidden')
      && cd.getElementById('stage').classList.contains('hidden'));
  t('o formulário não pede mais o grupo', ()=>!cd.getElementById('grupo'));
  t('as três colunas do computador seguem lá',
    ()=>cd.querySelectorAll('#live .painel > .cln').length===3);
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

  console.log('\n'+(bad? '✗ '+bad+' FALHA(S) · '+ok+' ok' : '✓ TUDO OK · '+ok+' testes'));
  process.exit(bad?1:0);
},700);

},700);
