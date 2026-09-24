const STORAGE_KEY = 'churrasometro.history.v1';

const state = {
  step: 1,
  people: { men: 4, women: 4, kids: 2 },
  eventDate: '',
  meatTypes: new Set(['bovinos', 'suinos', 'aves']),
  vibe: 'simples',
  extras: { garlicBread: true, salad: true, riceMayo: false, frenchBread: false },
  selectedCuts: new Set(),
  result: null,
  recipeFilter: 'all',
  customMenu: null,
  selectedMenuKey: null
};

const CUTS = {
  bovinos: [
    { id:'picanha', name:'Picanha', portion:0.23 },
    { id:'contra', name:'Contra-filé', portion:0.22 },
    { id:'maminha', name:'Maminha', portion:0.18 },
    { id:'fraldinha', name:'Fraldinha', portion:0.17 }
  ],
  suinos: [
    { id:'costela-suina', name:'Costela suína', portion:0.22 },
    { id:'linguica', name:'Linguiça toscana', portion:0.18 },
    { id:'copa', name:'Copa-lombo', portion:0.18 },
    { id:'pernil', name:'Pernil suíno', portion:0.17 }
  ],
  aves: [
    { id:'asa', name:'Asinha', portion:0.16 },
    { id:'coxinha', name:'Coxinha da asa', portion:0.16 },
    { id:'sobrecoxa', name:'Sobrecoxa', portion:0.17 },
    { id:'coracao', name:'Coração de frango', portion:0.14 }
  ],
  ovinos: [
    { id:'carré', name:'Carré de cordeiro', portion:0.18 },
    { id:'paleta', name:'Paleta', portion:0.18 },
    { id:'pernil-cordeiro', name:'Pernil de cordeiro', portion:0.17 },
    { id:'costela-cordeiro', name:'Costela', portion:0.16 }
  ]
};

const RECIPES = [
  { id:'caipi', type:'drink', title:'Caipirinha de limão', emoji:'🍋', desc:'Clássica, rápida e impossível de errar.', ingredients:['60 ml de cachaça','1 limão','2 colheres de açúcar','Gelo'] , steps:'Macere o limão com açúcar, adicione gelo e cachaça. Misture e sirva.' },
  { id:'spritz', type:'drink', title:'Spritz sem álcool', emoji:'🍊', desc:'Refrescante para quem quer brindar sem álcool.', ingredients:['120 ml de água com gás','60 ml de suco de laranja','20 ml de xarope de grenadine','Gelo'] , steps:'Monte tudo em uma taça com gelo, misture levemente e finalize com uma fatia de laranja.' },
  { id:'mate', type:'drink', title:'Mate cítrico', emoji:'🧊', desc:'Gelado, cítrico e ótimo para calor.', ingredients:['200 ml de chá-mate gelado','30 ml de limão','15 ml de mel','Gelo'] , steps:'Misture os ingredientes e sirva com bastante gelo.' },
  { id:'abacaxi', type:'dessert', title:'Abacaxi na brasa', emoji:'🍍', desc:'Sobremesa de churrasco com açúcar e canela.', ingredients:['1 abacaxi','Açúcar mascavo','Canela','Mel'] , steps:'Corte em fatias, polvilhe açúcar e canela e leve à grelha até caramelizar. Finalize com mel.' },
  { id:'banana', type:'dessert', title:'Banana com chocolate', emoji:'🍌', desc:'Prática e feita na própria churrasqueira.', ingredients:['Bananas','Chocolate em pedaços','Canela'] , steps:'Abra a banana no sentido do comprimento, recheie com chocolate, embrulhe em papel-alumínio e leve à brasa por 8–10 minutos.' },
  { id:'paçoca', type:'dessert', title:'Creme de paçoca', emoji:'🥜', desc:'Cremoso, doce e pronto em poucos minutos.', ingredients:['200 g de doce de leite','200 g de creme de leite','4 paçocas'] , steps:'Misture tudo até ficar homogêneo. Sirva gelado com paçoca esfarelada por cima.' }
];

const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

function formatDate(dateStr){
  if(!dateStr) return 'Data a definir';
  return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(dateStr+'T12:00:00'));
}
function kg(value){ return `${value.toFixed(2).replace('.',',')} kg`; }
function grams(value){ return `${Math.round(value*1000)} g`; }
function totalPeople(){ return state.people.men + state.people.women + state.people.kids; }
function scrollToWorkspace(){ $('.workspace').scrollIntoView({behavior:'smooth',block:'start'}); }

function showToast(message){
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove('show'),2200);
}

function startNewChurrasco(){
  const preservedHistory = true;
  state.step=1;
  state.people={men:4,women:4,kids:2};
  state.eventDate=new Date().toISOString().slice(0,10);
  state.meatTypes=new Set(['bovinos','suinos','aves']);
  state.vibe='simples';
  state.extras={garlicBread:true,salad:true,riceMayo:false,frenchBread:false};
  state.selectedCuts=new Set();
  state.result=null;
  state.customMenu=null;
  state.selectedMenuKey=null;
  $('#eventDate').value=state.eventDate;
  updatePeopleUI();
  syncSelections();
  renderCuts();
  goStep(1);
  window.scrollTo({top:0,behavior:'smooth'});
  showToast(preservedHistory ? 'Novo churrasco iniciado 🔥' : 'Novo churrasco iniciado.');
}

function updatePeopleUI(){
  $('#menCount').textContent=state.people.men; $('#womenCount').textContent=state.people.women; $('#kidsCount').textContent=state.people.kids;
  const total=totalPeople(); $('#peopleTotal').textContent=`${total} ${total===1?'pessoa':'pessoas'}`;
}

function getConsumptionFactor(){
  const base = state.people.men*0.55 + state.people.women*0.40 + state.people.kids*0.22;
  const vibeFactor = { simples:0.9, amigos:1, completo:1.12 }[state.vibe];
  return base * vibeFactor;
}

function getSelectedCuts(){
  const enabled=[...state.meatTypes];
  const selected=[];
  enabled.forEach(type=>CUTS[type].forEach(cut=>{ if(state.selectedCuts.has(cut.id)) selected.push({...cut,type}); }));
  return selected;
}

function renderCuts(){
  const host=$('#cutSelection'); host.innerHTML='';
  [...state.meatTypes].forEach(type=>{
    const group=document.createElement('div'); group.className='cut-group';
    group.innerHTML=`<div class="cut-head"><h3>${labelType(type)}</h3><span>selecione os cortes preferidos</span></div><div class="cut-list">${CUTS[type].map(cut=>`<div class="cut-item"><label><input type="checkbox" data-cut="${cut.id}" ${state.selectedCuts.has(cut.id)?'checked':''}/> ${cut.name}</label></div>`).join('')}</div>`;
    host.appendChild(group);
  });
}

function labelType(type){return {bovinos:'🥩 Bovinos',suinos:'🐷 Suínos',aves:'🍗 Aves',ovinos:'🐑 Ovinos'}[type];}

function allocateCuts(totalKg){
  const selected = getSelectedCuts();
  const enabledTypes=[...state.meatTypes];
  let cuts = selected.length ? selected : enabledTypes.flatMap(t=>CUTS[t].slice(0,2).map(c=>({...c,type:t})));
  const shares = cuts.map(c=>c.portion);
  const sum=shares.reduce((a,b)=>a+b,0)||1;
  return cuts.map(c=>({...c, kg:totalKg*(c.portion/sum)}));
}

function calculateResult(){
  const consumption=getConsumptionFactor();
  const totalMeat=consumption;
  const cutAllocation=allocateCuts(totalMeat);
  // Carvão: estimativa mais conservadora, com margem operacional para pré-aquecimento e reposição de brasa.
  // 0,9 kg por adulto-equivalente + 15% de segurança, com mínimos por evento.
  const charcoal=Math.max(4.5, consumption*0.9*1.15 + (state.vibe==='completo'?0.8:state.vibe==='amigos'?0.4:0));
  const extras=[];
  if(state.extras.garlicBread) extras.push({name:'Pão de alho',qty:Math.max(1,Math.ceil(totalPeople()/2)),unit:'pacotes'});
  if(state.extras.frenchBread) extras.push({name:'Pão francês',qty:Math.max(4,Math.ceil((state.people.men + state.people.women + state.people.kids*0.6))),unit:'unidades'});
  if(state.extras.salad) extras.push({name:'Salada',qty:Math.max(1,Math.ceil(totalPeople()/4)),unit:'travessas'});
  if(state.extras.riceMayo){
    extras.push({name:'Arroz',qty:Math.max(.5, totalPeople()*0.055),unit:'kg'});
    extras.push({name:'Maionese',qty:Math.max(.6, totalPeople()*0.08),unit:'kg'});
  }
  const menus=buildMenus(cutAllocation,totalMeat);
  return { consumption,totalMeat, charcoal, cuts:cutAllocation, extras, menus, people:totalPeople(), date:state.eventDate, vibe:state.vibe };
}

function buildMenus(cuts,totalKg){
  const topCuts=cuts.slice().sort((a,b)=>b.kg-a.kg);
  const baseCuts=topCuts.slice(0,3);
  const extrasSelected=[];
  if(state.extras.garlicBread) extrasSelected.push('Pão de alho');
  if(state.extras.frenchBread) extrasSelected.push('Pão francês');
  if(state.extras.salad) extrasSelected.push('Salada');
  if(state.extras.riceMayo) extrasSelected.push('Arroz e maionese');

  const menuSimple={
    key:'menu-0', name:'Raiz & simples',tag:'SEM COMPLICAÇÃO',desc:'Para reunir a galera sem fazer 14 panelas.',
    starters: state.extras.garlicBread?['Pão de alho']:['Amendoim e farofa'],
    mains:[...baseCuts.slice(0,2), ...(state.extras.frenchBread?['Pão francês']:[])],
    sides: [state.extras.salad?'Salada de folhas com vinagrete':'Farofa crocante'],
    dessert:'Sorvete', extras:extrasSelected
  };
  const menuFriends={
    key:'menu-1', name:'Entre amigos',tag:'EQUILIBRADO',desc:'Variedade na medida para ninguém reclamar.',
    starters:uniq(['Queijo coalho',state.extras.garlicBread?'Pão de alho':'Farofa da casa']), mains:baseCuts,
    sides:uniq([state.extras.riceMayo?'Arroz e maionese':'Salada de tomate e cebola','Farofa de alho']), dessert:'Banana com chocolate', extras:extrasSelected
  };
  const menuComplete={
    key:'menu-2', name:'Completo & elaborado',tag:'PARA IMPRESSIONAR',desc:'Aquele churrasco que vira história no grupo.',
    starters:uniq(['Bruschetta de pão na brasa','Queijo coalho',state.extras.garlicBread?'Pão de alho crocante':'Pimentões assados']),
    mains:topCuts.slice(0,4), sides:uniq([state.extras.riceMayo?'Arroz soltinho':'Arroz com alho','Maionese de batata',state.extras.salad?'Salada fresca com ervas':'Legumes na brasa']), dessert:'Pudim gelado', extras:extrasSelected
  };
  return [menuSimple,menuFriends,menuComplete];
}

function uniq(list){ return [...new Set(list.filter(Boolean))]; }

function getCustomMenuOptions(r){
  const menus=r.menus;
  return {
    starters: uniq(menus.flatMap(m=>m.starters)),
    mains: uniq(menus.flatMap(m=>m.mains.map(c=>c.name))),
    sides: uniq(menus.flatMap(m=>m.sides.concat(state.extras.frenchBread ? ['Pão francês'] : []))),
    desserts: uniq(menus.flatMap(m=>[m.dessert]))
  };
}

function renderCustomMenuBuilder(r){
  const opts=getCustomMenuOptions(r);
  const current=state.customMenu || {starters:[],mains:[],sides:[],desserts:[]};
  const sections=[
    ['starters','Entradas','🥖'],['mains','Principais','🥩'],['sides','Acompanhamentos','🥗'],['desserts','Sobremesas','🍨']
  ];
  $('#customMenuBuilder').innerHTML=sections.map(([key,title,emoji])=>`<section class="custom-section"><div class="custom-section-head"><h3>${emoji} ${title}</h3><span>${key==='mains'?'Escolha 1 ou mais':'Escolha os que quiser'}</span></div><div class="custom-option-grid">${opts[key].length ? opts[key].map((item,idx)=>{ const id=`custom-${key}-${idx}`; const checked=current[key].includes(item); return `<label class="custom-option"><input type="checkbox" data-custom-group="${key}" data-custom-value="${escapeHtml(item)}" id="${id}" ${checked?'checked':''}/><span>${escapeHtml(item)}</span></label>`; }).join('') : '<div class="custom-empty">Nenhum item disponível para esta categoria.</div>'}</div></section>`).join('');
}

function escapeHtml(str){ return String(str).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function openCustomMenu(){
  if(!state.result) return;
  renderCustomMenuBuilder(state.result);
  $('#customMenuModal').showModal();
}

function collectCustomMenu(){
  const menu={starters:[],mains:[],sides:[],desserts:[]};
  $$('#customMenuBuilder [data-custom-group]').forEach(input=>{ if(input.checked) menu[input.dataset.customGroup].push(input.dataset.customValue); });
  return menu;
}

function renderCustomMenuCard(menu){
  if(!menu) return '';
  const sections=[['starters','Entradas'],['mains','Principais'],['sides','Acompanhamentos'],['desserts','Sobremesa']];
  return `<article class="custom-result-card"><div class="menu-tag">DO SEU JEITO</div><h3>Cardápio personalizado</h3><p class="menu-desc">Uma combinação feita por você a partir das sugestões.</p>${sections.filter(([k])=>menu[k]?.length).map(([k,title])=>`<div class="menu-section"><h4>${title}</h4><ul class="menu-list">${menu[k].map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></div>`).join('')}</article>`;
}

function renderResult(){
  state.result=calculateResult();
  const r=state.result;
  if(!state.selectedMenuKey || !['menu-0','menu-1','menu-2','custom'].includes(state.selectedMenuKey)) state.selectedMenuKey=null;
  const host=$('#resultView');
  const selected = getSelectedMenu(r);
  const isConfirmed = !!selected;
  host.innerHTML=`
    <div class="result-head"><div><span class="kicker">SEU CHURRASCO</span><h2>${r.people} pessoas, ${kg(r.totalMeat)} de carnes e zero chute.</h2><p style="color:var(--muted);margin:0">${formatDate(r.date)} · perfil ${labelVibe(r.vibe)}</p></div><div class="result-actions"><button class="secondary-btn" id="backToEdit">← Ajustar</button><button class="primary-btn" id="saveResult">💾 Salvar</button></div></div>
    <div class="summary-banner"><div class="hero-stat"><span class="kicker">TOTAL DE CARNE</span><div class="big">${kg(r.totalMeat)}</div><p>Estimativa baseada no perfil das pessoas e no estilo do churrasco.</p></div><div class="purchase-card"><span class="kicker">CARVÃO</span><div class="big" style="font-family:Montserrat;font-size:36px">${r.charcoal.toFixed(1).replace('.',',')} kg</div><p>Reserve uma margem se a churrasqueira for grande ou ventar muito.</p></div></div>
    ${isConfirmed ? `<div class="buy-bar"><div><strong>🛒 Sua compra está pronta</strong><small>${r.cuts.length} cortes + ${r.extras.length} itens extras</small></div><button class="secondary-btn" id="openShopping">Ver lista de compras →</button></div><div class="selection-confirmed"><div><span class="kicker">CARDÁPIO DEFINIDO</span><h3>${escapeHtml(selected.name)}</h3><p>Os outros cardápios foram ocultados. Sua lista de compras agora está disponível.</p></div><div class="selection-confirmed-actions"><button class="secondary-btn" id="changeMenu">Trocar cardápio</button><button class="primary-btn" id="shareResult">↗ Compartilhar lista de compras</button></div></div>` : `
      <div class="selection-required"><div><span class="kicker">ÚLTIMA ETAPA</span><h3>Escolha o cardápio que você vai fazer</h3><p>Clique no check abaixo de uma opção. Depois disso, as demais serão ocultadas e a lista ficará pronta para compartilhar.</p></div><strong>Nenhuma opção escolhida</strong></div>
      <div class="menu-grid">${r.menus.map((m,i)=>menuCard(m,i)).join('')}</div>
      ${renderCustomMenuCard(state.customMenu)}
      <div class="custom-menu-cta"><div><span class="kicker">SEU CARDÁPIO, SUAS REGRAS</span><h3>Gostou de partes diferentes dos 3 estilos?</h3><p>Selecione todas as opções que quiser e monte uma quarta opção personalizada.</p></div><button class="primary-btn" id="openCustomMenu">🧩 Montar personalizado</button></div>
      <div class="ad-slot inline-ad ad-unit" data-ad-slot="menu-native"><span>ESPAÇO PUBLICITÁRIO</span><strong>Native ad · recomendações / parceiros</strong><small>Ideal para supermercado, açougue, bebidas e carvão.</small></div>
    `}
    ${isConfirmed ? renderConfirmedMenu(selected) : ''}
  `;
  $('#backToEdit').addEventListener('click',()=>goStep(2));
  $('#saveResult').addEventListener('click',saveCurrentChurras);
  if(isConfirmed){
    $('#openShopping').addEventListener('click',()=>openShopping(r));
    $('#shareResult').addEventListener('click',openShareModal);
    $('#changeMenu').addEventListener('click',()=>{state.selectedMenuKey=null;renderResult();});
  } else {
    $('#openCustomMenu').addEventListener('click',openCustomMenu);
    $$('[data-select-menu]').forEach(btn=>btn.addEventListener('click',()=>{ state.selectedMenuKey=btn.dataset.selectMenu; renderResult(); showToast('Cardápio escolhido ✅'); }));
  }
}

function renderConfirmedMenu(selected){
  if(selected.custom) return renderCustomMenuCard(selected.menu);
  return `<div class="confirmed-menu-wrap">${menuCard(selected.menu || selected, 0, true)}</div>`;
}

function labelVibe(v){return {simples:'Raiz & simples',amigos:'Entre amigos',completo:'Completo & elaborado'}[v];}
function menuCard(m,i,confirmed=false){
  const cutLine=m.mains.map(c=>typeof c==='string'?`<li>${escapeHtml(c)}</li>`:`<li>${escapeHtml(c.name)}<span>${kg(c.kg)}</span></li>`).join('');
  const extras = uniq(m.extras || []);
  const selectControl = confirmed ? '' : `<button class="menu-select-btn check-select ${state.selectedMenuKey===m.key?'selected':''}" data-select-menu="${m.key}" aria-label="Escolher ${escapeHtml(m.name)}"><span class="check-circle">${state.selectedMenuKey===m.key?'✓':''}</span>${state.selectedMenuKey===m.key?'Cardápio escolhido':'Escolher este cardápio'}</button>`;
  return `<article class="menu-card ${i===1&&!confirmed?'featured ':''}${state.selectedMenuKey===m.key?'menu-selected ':''}${confirmed?'confirmed-menu-card':''}"><span class="menu-tag">${m.tag}</span><h3>${m.name}</h3><p class="menu-desc">${m.desc}</p><div class="menu-section"><h4>Entradas</h4><ul class="menu-list">${m.starters.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div><div class="menu-section"><h4>Principais</h4><ul class="menu-list">${cutLine}</ul></div><div class="menu-section"><h4>Acompanhamentos</h4><ul class="menu-list">${m.sides.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div><div class="menu-section"><h4>Sobremesa</h4><ul class="menu-list"><li>${escapeHtml(m.dessert)}</li></ul></div>${extras.length?`<div class="menu-section extras-summary"><h4>Extras escolhidos</h4><ul class="menu-list">${extras.map(x=>`<li><span class="extra-check">✓</span>${escapeHtml(x)}</li>`).join('')}</ul></div>`:''}${selectControl}</article>`;
}

function buildShoppingItems(r){
  const items=r.cuts.map(c=>({name:c.name,qty:c.kg,unit:'kg'}));
  items.push({name:'Carvão',qty:r.charcoal,unit:'kg'});
  r.extras.forEach(x=>items.push(x));
  if(r.vibe!=='simples') items.push({name:'Sal grosso',qty:Math.max(.25,r.people*.028),unit:'kg'});
  items.push({name:'Molho/vinagrete',qty:Math.max(1,Math.ceil(r.people/6)),unit:'potes'});
  return items;
}

function openShopping(r){
  const modal=$('#shoppingModal'); $('#shoppingTitle').textContent=`Churrasco de ${formatDate(r.date)}`;
  $('#shoppingList').innerHTML=buildShoppingItems(r).map((it,i)=>`<label class="shop-row"><span><input type="checkbox" data-shop="${i}" /> ${it.name}</span><strong>${typeof it.qty==='number'?(it.unit==='kg'?it.qty.toFixed(2).replace('.',','):Math.ceil(it.qty)):it.qty} ${it.unit}</strong></label>`).join('');
  modal.showModal();
}

function getSelectedMenu(r){
  if(state.selectedMenuKey==='custom' && state.customMenu) return {name:'Cardápio personalizado', custom:true, menu:state.customMenu};
  return r.menus.find(m=>m.key===state.selectedMenuKey) || null;
}

function buildShareText(r){
  const selected=getSelectedMenu(r);
  const menuItems = selected?.custom
    ? Object.values(selected.menu).flat()
    : selected
      ? uniq([
          ...selected.menu.starters,
          ...selected.menu.mains.map(x=>typeof x==='string'?x:x.name),
          ...selected.menu.sides,
          selected.menu.dessert,
          ...(selected.menu.extras || [])
        ])
      : [];
  const menuBlock=selected ? `\n🍽️ CARDÁPIO ESCOLHIDO: ${selected.name}\n${menuItems.map(item=>`• ${item}`).join('\n')}` : '';
  return `🔥 CHURRASCO DE ${r.people} PESSOAS\n📅 ${formatDate(r.date)}\n🥩 Carnes: ${kg(r.totalMeat)}\n🔥 Carvão: ${r.charcoal.toFixed(1).replace('.',',')} kg${menuBlock}\n\n🛒 LISTA DE COMPRAS\n${buildShoppingItems(r).map(x=>`• ${x.name}: ${typeof x.qty==='number'?(x.unit==='kg'?x.qty.toFixed(2).replace('.',','):Math.ceil(x.qty)):x.qty} ${x.unit}`).join('\n')}\n\nCalculado pelo Churrasômetro.`;
}

function openShareModal(){
  if(!state.result || !state.selectedMenuKey){ showToast('Escolha um cardápio antes de compartilhar.'); return; }
  $('#sharePreview').textContent=buildShareText(state.result);
  $('#shareModal').showModal();
}


async function shareText(text){
  try{
    if(navigator.share) await navigator.share({title:'Churrasômetro',text});
    else {await navigator.clipboard.writeText(text); showToast('Texto copiado para compartilhar.');}
  } catch(e){ if(e?.name!=='AbortError') showToast('Não foi possível compartilhar agora.'); }
}

function shareWhatsApp(text){
  const url='https://wa.me/?text='+encodeURIComponent(text);
  window.open(url,'_blank','noopener,noreferrer');
}

function saveCurrentChurras(){
  if(!state.result) return;
  const history=loadHistory();
  const item={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),savedAt:new Date().toISOString(),...state.result, peopleObj:{...state.people}, meatTypes:[...state.meatTypes], selectedCuts:[...state.selectedCuts], extras:state.extras, customMenu:state.customMenu, selectedMenuKey:state.selectedMenuKey};
  history.unshift(item); localStorage.setItem(STORAGE_KEY,JSON.stringify(history.slice(0,20)));
  renderHistory(); showToast('Churrasco salvo no histórico 🔥');
}

function loadHistory(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return[]}}
function renderHistory(){
  const host=$('#historyList'), history=loadHistory();
  if(!history.length){host.innerHTML='<div class="history-empty">Ainda não há churrascos salvos. Monte o primeiro e ele aparece aqui.</div>';return;}
  host.innerHTML=history.map(item=>`<div class="history-item"><div class="history-meta"><strong>${item.people} pessoas · ${kg(item.totalMeat)} · ${labelVibe(item.vibe)}</strong><small>${formatDate(item.date)} · salvo em ${new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit'}).format(new Date(item.savedAt))}</small></div><div class="history-actions"><button data-load-id="${item.id}">Abrir</button><button data-delete-id="${item.id}">Excluir</button></div></div>`).join('');
  $$('[data-load-id]').forEach(btn=>btn.addEventListener('click',()=>loadHistoryItem(btn.dataset.loadId)));
  $$('[data-delete-id]').forEach(btn=>btn.addEventListener('click',()=>deleteHistoryItem(btn.dataset.deleteId)));
}
function loadHistoryItem(id){
  const item=loadHistory().find(x=>x.id===id); if(!item) return;
  state.people={...item.peopleObj || state.people};
  // Compatibilidade com registros já salvos: people may be a number.
  if(item.men!==undefined) state.people={men:item.men,women:item.women,kids:item.kids};
  state.eventDate=item.date||''; state.meatTypes=new Set(item.meatTypes||['bovinos']); state.selectedCuts=new Set(item.selectedCuts||[]); state.vibe=item.vibe||'simples'; state.extras=item.extras||state.extras; state.customMenu=item.customMenu||null; state.selectedMenuKey=item.selectedMenuKey||null;
  updatePeopleUI(); $('#eventDate').value=state.eventDate; renderCuts(); syncSelections(); renderResult(); goStep(4); showToast('Churrasco recuperado.');
}
function deleteHistoryItem(id){localStorage.setItem(STORAGE_KEY,JSON.stringify(loadHistory().filter(x=>x.id!==id)));renderHistory();}

function renderRecipes(){
  const filter=state.recipeFilter;
  const list=RECIPES.filter(r=>filter==='all'||r.type===filter).slice(0,4);
  $('#recipeGrid').innerHTML=list.map(r=>`<article class="recipe-card" data-recipe-id="${r.id}"><div class="recipe-cover">${r.emoji}</div><div class="recipe-card-body"><h3>${r.title}</h3><p>${r.desc}</p></div></article>`).join('');
  $$('.recipe-card').forEach(card=>card.addEventListener('click',()=>openRecipe(card.dataset.recipeId)));
}
function openRecipe(id){const r=RECIPES.find(x=>x.id===id);if(!r)return;$('#recipeModalContent').innerHTML=`<div class="recipe-cover" style="border-radius:16px;margin-bottom:18px">${r.emoji}</div><span class="kicker">${r.type==='drink'?'DRINK':'SOBREMESA'}</span><h2 style="margin:0 0 8px;font-family:Montserrat">${r.title}</h2><p style="color:var(--muted)">${r.desc}</p><h3>Ingredientes</h3><ul>${r.ingredients.map(i=>`<li>${i}</li>`).join('')}</ul><h3>Como fazer</h3><p style="color:#d9ddd3">${r.steps}</p>`;$('#recipeModal').showModal();}

function syncSelections(){
  $$('#meatTypeChips .choice-chip').forEach(b=>b.classList.toggle('selected',state.meatTypes.has(b.dataset.meatType)));
  $$('#vibeOptions .vibe-card').forEach(b=>b.classList.toggle('selected',b.dataset.vibe===state.vibe));
  $('#extraGarlicBread').checked=state.extras.garlicBread;$('#extraFrenchBread').checked=state.extras.frenchBread;$('#extraSalad').checked=state.extras.salad;$('#extraRiceMayo').checked=state.extras.riceMayo;
}

function updateHomeOnlySections(n){
  const isHome=n===1;
  const hero=document.querySelector('.hero');
  const history=document.querySelector('#historySection');
  const historyBtn=document.querySelector('#historyBtn');
  const featureStrip=document.querySelector('.home-only-card');
  if(hero) hero.classList.toggle('home-only', !isHome);
  if(history) history.classList.toggle('home-only', !isHome);
  if(historyBtn) historyBtn.classList.toggle('home-only-action', !isHome);
  if(featureStrip) featureStrip.classList.toggle('home-only', !isHome);
}

function goStep(n){state.step=n;updateHomeOnlySections(n);$$('.step-panel').forEach(p=>p.classList.toggle('active',Number(p.dataset.panel)===n));$$('.step').forEach((s,i)=>{s.classList.toggle('active',i+1===n);s.classList.toggle('done',i+1<n)});if(n===3)renderCuts();if(n===4)renderResult();scrollToWorkspace();}

function bind(){
  $('#eventDate').value=new Date().toISOString().slice(0,10);state.eventDate=$('#eventDate').value;
  $('#eventDate').addEventListener('change',e=>state.eventDate=e.target.value);
  $$('.counter-btn').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.target;const next=state.people[key]+(btn.dataset.op==='+'?1:-1);state.people[key]=Math.max(0,next);updatePeopleUI()}));
  $$('.next-btn').forEach(btn=>btn.addEventListener('click',()=>goStep(Number(btn.dataset.next))));
  $$('.prev-btn').forEach(btn=>btn.addEventListener('click',()=>goStep(Number(btn.dataset.prev))));
  $$('#meatTypeChips .choice-chip').forEach(btn=>btn.addEventListener('click',()=>{const t=btn.dataset.meatType;if(state.meatTypes.has(t)){if(state.meatTypes.size===1){showToast('Escolha pelo menos um tipo de carne.');return;}state.meatTypes.delete(t)}else state.meatTypes.add(t);syncSelections();renderCuts();}));
  $$('#vibeOptions .vibe-card').forEach(btn=>btn.addEventListener('click',()=>{state.vibe=btn.dataset.vibe;syncSelections()}));
  [['extraGarlicBread','garlicBread'],['extraFrenchBread','frenchBread'],['extraSalad','salad'],['extraRiceMayo','riceMayo']].forEach(([id,key])=>$('#'+id).addEventListener('change',e=>state.extras[key]=e.target.checked));
  $('#cutSelection').addEventListener('change',e=>{if(e.target.matches('[data-cut]')){e.target.checked?state.selectedCuts.add(e.target.dataset.cut):state.selectedCuts.delete(e.target.dataset.cut)}});
  $$('.recipe-tab').forEach(btn=>btn.addEventListener('click',()=>{$$('.recipe-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');state.recipeFilter=btn.dataset.recipeFilter;renderRecipes()}));
  $('#newBbqBtn').addEventListener('click',startNewChurrasco);
  $('#recipesBtn').addEventListener('click',()=>$('#recipesSection').scrollIntoView({behavior:'smooth'}));
  $('#historyBtn').addEventListener('click',()=>$('#historySection').scrollIntoView({behavior:'smooth'}));
  $('#clearHistory').addEventListener('click',()=>{localStorage.removeItem(STORAGE_KEY);renderHistory();showToast('Histórico limpo.');});
  $('#customMenuBuilder').addEventListener('change',()=>{ state.customMenu=collectCustomMenu(); });
  $('#saveCustomMenu').addEventListener('click',()=>{ const menu=collectCustomMenu(); if(!menu.mains.length){showToast('Escolha pelo menos uma carne.');return;} state.customMenu=menu; state.selectedMenuKey='custom'; $('#customMenuModal').close(); if(state.step===4) renderResult(); showToast('Cardápio personalizado escolhido 🔥'); });
  $('#seeAllRecipes').addEventListener('click',()=>{state.recipeFilter='all';$$('.recipe-tab').forEach(b=>b.classList.toggle('active',b.dataset.recipeFilter==='all'));renderRecipes();$('#recipesSection').scrollIntoView({behavior:'smooth'});});
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close)?.close()));
  $('#copyShopping').addEventListener('click',async()=>{const r=state.result;if(!r)return;await navigator.clipboard.writeText(buildShareText(r));showToast('Lista copiada 📋');});
  $('#copyShare').addEventListener('click',async()=>{await navigator.clipboard.writeText(buildShareText(state.result));showToast('Texto copiado 📋');});
  $('#nativeShare').addEventListener('click',()=>shareText(buildShareText(state.result)));
  $('#shareShopping')?.remove();
  $('#shareWhatsApp').addEventListener('click',()=>shareWhatsApp(buildShareText(state.result)));
}

updatePeopleUI();syncSelections();renderRecipes();renderHistory();updateHomeOnlySections(state.step);bind();

// Atalhos do PWA: permitem iniciar um novo churrasco, abrir o histórico
// ou ir direto para receitas quando o usuário acessa o app pelo launcher.
function handlePwaShortcut(){
  const shortcut = new URLSearchParams(window.location.search).get('shortcut');
  if(!shortcut) return;
  if(shortcut === 'new'){
    startNewChurrasco();
    return;
  }
  if(shortcut === 'history'){
    goStep(1);
    const history = $('#historySection');
    if(history) setTimeout(()=>history.scrollIntoView({behavior:'smooth', block:'start'}), 60);
    return;
  }
  if(shortcut === 'recipes'){
    goStep(1);
    const recipes = $('#recipesSection');
    if(recipes) setTimeout(()=>recipes.scrollIntoView({behavior:'smooth', block:'start'}), 60);
  }
}

handlePwaShortcut();
