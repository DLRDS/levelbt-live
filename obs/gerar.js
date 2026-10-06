// ══════════════════════════════════════════════════════════════════
// LEVEL BT LIVE · gerador das peças soltas para o OBS
//
// Monta o obs/pecas.html a partir do index.html, reaproveitando o
// MESMO estilo e a MESMA marcação do overlay que vai ao ar. É por isso
// que isto é um gerador e não um arquivo escrito à mão: peça copiada na
// unha vira peça desatualizada na primeira vez que o overlay muda.
//
// Rode depois de qualquer mexida no visual do overlay:
//     node obs/gerar.js
// ══════════════════════════════════════════════════════════════════
const fs=require('fs'), path=require('path');
const RAIZ=path.join(__dirname,'..');
const fonte=fs.readFileSync(path.join(RAIZ,'index.html'),'utf8');

function entre(texto, abre, fecha, nome){
  const i=texto.indexOf(abre);
  if(i<0) throw new Error('não achei o começo de '+nome);
  const j=texto.indexOf(fecha, i+abre.length);
  if(j<0) throw new Error('não achei o fim de '+nome);
  return texto.slice(i+abre.length, j);
}

const css   = entre(fonte,'<style>','</style>','o estilo');
const palco = entre(fonte,'<div class="stage hidden" id="stage">','\n</div>\n\n<!-- ════════ CONTROLE','o palco do overlay');

// as fontes vêm do mesmo lugar que o overlay usa
const fontes = (fonte.match(/<link href="https:\/\/fonts\.googleapis[^>]*>/g)||[]).join('\n');
const preconnect = (fonte.match(/<link rel="preconnect"[^>]*>/g)||[]).join('\n');

const saida = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Level BT Live · peças para o OBS</title>
<!-- GERADO POR obs/gerar.js — não edite à mão, edite o index.html e rode de novo -->
${preconnect}
${fontes}
<style>
${css}
  /* O OBS entrega a página sobre o vídeo: fundo transparente, sem rolagem. */
  html,body{background:transparent;margin:0;overflow:hidden;}
  body{width:1920px;height:1080px;}
  .stage{display:block !important;}
  /* Solta, cada peça sai no tamanho de desenho. Os 60% do placar ao vivo
     existem para ele conviver com o jogo; aqui quem redimensiona é você,
     na própria fonte do OBS. Dá para forçar outro valor com ?escala= */
  .stage{--esc:1;}
  /* fora do ar até a peça escolhida ser ligada */
  .peca-off{display:none !important;}
</style>
</head>
<body class="ov">
<div class="stage" id="stage">
${palco}
</div>

<script>
// ── Qual peça, e com que texto ────────────────────────────────────
// Tudo vem do endereço, para você montar a fonte do OBS sem mexer em
// código. Exemplo:
//   pecas.html?peca=cartela&torneio=COPA%20VERAO&cat=MISTA%20A&fase=FINAL
const qs=new URLSearchParams(location.search);
const $=id=>document.getElementById(id);
const txt=(id,v)=>{ const e=$(id); if(e) e.textContent=v; };
const p=(nome,padrao)=>{ const v=qs.get(nome); return (v===null||v==='') ? padrao : v; };

const PECA=(qs.get('peca')||'replay').toLowerCase();
const LOOP=qs.get('loop')==='1';
const ESPERA=Number(qs.get('espera')||0)*1000;   // atraso antes de entrar
const ESCALA=qs.get('escala');
if(ESCALA) document.documentElement.style.setProperty('--esc', ESCALA);

// Todas as peças do palco, e qual elemento é a raiz de cada uma.
const PECAS={
  replay   : {el:'ovRep',   dur:2600},
  cartela  : {el:'ovIdent', dur:0},
  patrocinio:{el:'ovSpo',   dur:0},
  proximos : {el:'ovAgd',   dur:0},
  fim      : {el:'ovFim',   dur:0, extra:['ovVeil']},
  selo     : {el:'ovTens',  dur:0},
  quebrou  : {el:'ovBrk',   dur:0},
  stats    : {el:'ovSta',   dur:0}
};

// Apaga tudo que não é a peça pedida. O palco inteiro vem do overlay,
// então sobra muita coisa — some com ela em vez de recortar o HTML.
function soAPeca(){
  const d=PECAS[PECA];
  if(!d){ document.body.innerHTML='<div style="color:#FF6600;font:700 28px sans-serif;padding:40px">'+
    'Peça desconhecida: '+PECA+'. Use uma destas: '+Object.keys(PECAS).join(', ')+'</div>'; return null; }
  const guardar=new Set([d.el].concat(d.extra||[]));
  [...document.querySelectorAll('.stage > *')].forEach(n=>{
    const dentro=[...guardar].some(id=>n.id===id || n.querySelector('#'+id));
    if(!dentro) n.classList.add('peca-off');
  });
  return d;
}

function preencher(){
  // ── cartela de abertura ──
  txt('idTorn', p('torneio','LEVEL BT').toUpperCase());
  txt('idCat',  p('cat','MISTA A').toUpperCase());
  txt('idFase', p('fase','FINAL').toUpperCase());
  const meta=[p('quadra',''), p('data','')].filter(Boolean)
    .map(x=>'<span>'+x.toUpperCase()+'</span>').join('');
  if($('idMeta')) $('idMeta').innerHTML=meta;

  // ── patrocínio ──
  txt('spoNome', p('patrocinador','SEU PATROCINADOR').toUpperCase());
  txt('spoTorn', p('torneio','').toUpperCase());
  const logo=p('logo','');
  if(logo && $('spoMarcas')){
    $('spoMarcas').classList.remove('hidden');
    $('spoMarcas').innerHTML='<div class="m"><img src="'+logo+'" alt=""></div>';
  }

  // ── selo de tensão ──
  const grande=p('texto','MATCH POINT').toUpperCase();
  if($('ovTensBig')) $('ovTensBig').innerHTML=grande.replace(' ','<br>');
  txt('ovTensSub', p('sub','QUEM FAZ, LEVA').toUpperCase());

  // ── quebra de saque ──
  txt('ovBrkSub', 'SAQUE DE '+p('perdeu','DUPLA').toUpperCase());

  // ── fim de jogo ──
  txt('fCtx', [p('torneio',''),p('cat',''),p('fase','')].filter(Boolean).join(' · ').toUpperCase());
  txt('fW1', p('venceu','Ana/Bia'));
  txt('fW2', p('perdeu','Cris/Dani'));
  const sets=p('sets','6-4 6-3').split(' ').filter(Boolean);
  const caixas=(lado)=>sets.map(s=>{
    const n=s.split('-'); const meu=n[lado], dele=n[1-lado];
    return '<span class="'+(Number(meu)>Number(dele)?'w':'')+'">'+meu+'</span>';
  }).join('');
  if($('fS1')) $('fS1').innerHTML=caixas(0);
  if($('fS2')) $('fS2').innerHTML=caixas(1);
  if($('fFt')) $('fFt').innerHTML=p('rodape','') ? '<span>'+p('rodape','').toUpperCase()+'</span>' : '';

  // ── estatísticas ──
  // Cada número entra como "dupla de cima,dupla de baixo":
  //   saque=24/32,18/29  devol=11/29,8/32  bp=2/5,1/3  seq=6,4  q=3,2
  //
  // SEM VALOR, TRAÇO. Diferente das outras peças, esta não tem exemplo
  // pronto: um número de mentira aqui seria uma estatística inventada
  // indo ao ar se alguém esquecer de preencher o endereço.
  txt('staCtx', [p('torneio',''),p('cat',''),p('fase','')].filter(Boolean).join(' · ').toUpperCase());
  txt('staA', p('a','—'));
  txt('staB', p('b','—'));
  // o endereço vira HTML aqui: escapa antes, para um "<" não virar marcação
  const esc=t=>String(t).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
  const par=(nome)=>{ const v=p(nome,''); const x=v.split(',').map(y=>esc(y.trim()));
                      return [x[0]||'—', x[1]||'—']; };
  const razao=(f)=>{ const n=String(f).split('/').map(Number);
                     return n.length===2 && n[1]>0 ? n[0]/n[1] : -1; };
  const num=(f)=>{ const n=parseFloat(String(f).split('/')[0]); return isNaN(n)?-1:n; };
  const pct=(f)=>{ const r=razao(f); return r<0 ? '' : Math.round(r*100)+'%'; };
  // Mesma regra do overlay ao vivo: só destaca com dado dos DOIS lados.
  const lider=(a,b)=>(a<0||b<0||a===b) ? 0 : (a>b?1:2);
  const linhas=[
    ['PONTOS NO SAQUE',     par('saque'), 'pct'],
    ['PONTOS NA DEVOLUÇÃO', par('devol'), 'pct'],
    ['BREAK POINTS',        par('bp'),    'conv'],
    ['MAIOR SEQUÊNCIA',     par('seq'),   'num'],
    ['QUARENTÕES VENCIDOS', par('q'),     'num']
  ];
  if($('staLinhas')) $('staLinhas').innerHTML=linhas.map(([rot,[a,b],tipo])=>{
    const va = tipo==='pct' ? razao(a) : num(a);
    const vb = tipo==='pct' ? razao(b) : num(b);
    const l = lider(va,vb);
    const pa = tipo==='pct' ? pct(a) : '', pb = tipo==='pct' ? pct(b) : '';
    return '<div class="ln">'+
      '<div class="v a'+(l===1?' lid':'')+'">'+a+(pa?'<small>'+pa+'</small>':'')+'</div>'+
      '<div class="rot">'+rot+'</div>'+
      '<div class="v b'+(l===2?' lid':'')+'">'+(pb?'<small>'+pb+'</small>':'')+b+'</div></div>';
  }).join('');

  // ── próximos jogos ──
  txt('agdTorn', [p('torneio',''),p('quadra','')].filter(Boolean).join(' · ').toUpperCase());
  const linha=(j)=>{
    const c=j.split('|').map(x=>x.trim());
    const quando=c[0]||'', ctx=c[1]||'', a=c[2]||'—', b=c[3]||'—', placar=c[4]||'';
    return '<div class="it'+(placar?'':' now')+'">'+
      '<div class="top"><div class="hr">'+quando+'</div><div class="cx">'+ctx+'</div></div>'+
      '<div class="ln"><div class="du">'+a+'</div>'+(placar?'<div class="sc">'+placar+'</div>':'')+'</div>'+
      '<div class="rule"></div>'+
      '<div class="ln"><div class="du">'+b+'</div></div></div>';
  };
  const feitos=(qs.get('jogados')||'').split(';').filter(Boolean);
  const proxs =(qs.get('fila')||'').split(';').filter(Boolean);
  if($('agdFeitos')) $('agdFeitos').innerHTML = feitos.length
    ? feitos.map(linha).join('') : '<div class="vaz">AINDA NÃO HOUVE JOGO</div>';
  if($('agdProx')) $('agdProx').innerHTML = proxs.length
    ? proxs.map(linha).join('') : '<div class="vaz">SEM JOGOS NA FILA</div>';
}

// ── Entrada e saída ───────────────────────────────────────────────
// No OBS, marque "Atualizar navegador quando a cena ficar ativa" para a
// animação recomeçar toda vez que você cortar para a cena.
function tocar(d){
  const alvo=$(d.el);
  if(!alvo) return;
  (d.extra||[]).forEach(id=>{ const e=$(id); if(e){ e.classList.remove('hide'); e.classList.add('show'); } });
  alvo.classList.remove('hide');
  alvo.classList.add('show');
  if(d.el==='ovRep'){
    alvo.querySelectorAll('.bars i').forEach(i=>{ i.style.animation='none'; void i.offsetWidth; i.style.animation=''; });
  }
  if(d.dur>0){
    setTimeout(()=>{
      alvo.classList.remove('show'); alvo.classList.add('hide');
      (d.extra||[]).forEach(id=>{ const e=$(id); if(e){ e.classList.remove('show'); e.classList.add('hide'); } });
      if(LOOP) setTimeout(()=>tocar(d), 600);
    }, d.dur);
  }
}

const dados=soAPeca();
if(dados){
  preencher();
  setTimeout(()=>tocar(dados), ESPERA || 60);
}
</script>
</body>
</html>
`;

const destino=path.join(__dirname,'pecas.html');
fs.writeFileSync(destino, saida, 'utf8');
console.log('obs/pecas.html gerado ·', (saida.length/1024).toFixed(0)+' KB');
