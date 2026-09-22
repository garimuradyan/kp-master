
window.KP_APP_VERSION='v76-v74-plus-clear-contract-names';
var SURL='https://jjfkkvjkjnenwyuiznzv.supabase.co';
var SKEY='sb_publishable_GH0SGWZlueuHL_jWB4zY5Q_Z8BXdfpI';
var sb=null;
try{
  if(window.supabase&&window.supabase.createClient){sb=window.supabase.createClient(SURL,SKEY);}
}catch(e){console.error('Supabase init error',e);}
if(sb) window.sb=sb;
var currentKeyId=null,currentKeyData=null;
var services=[],equipment=[],extraStages=[],priceItems=[],equipmentItems=[],settings={},historyData=[],contactsData=[],logoDataURL=null,quotePhotos=[],_drgSrc=null;
var MAX_PHOTOS=6,MAX_PHOTO_MB=5;
var ALLOWED_TYPES=['image/jpeg','image/jpg','image/png','image/webp'];

function getStoredKey(){return localStorage.getItem('kp_access_key')||'';}
function rpcAuthParams(){return{p_key_id:currentKeyId,p_key:getStoredKey(),p_device_id:getDeviceId()};}
function rpcFailed(res){return res&&res.data&&res.data.ok===false;}
function rpcMsg(res,def){return(res&&res.data&&res.data.message)||(res&&res.error&&res.error.message)||def||'Ошибка';}


function daysLeft(exp){if(!exp)return 0;return Math.max(0,Math.ceil((new Date(exp)-new Date())/(864e5)));}

function getDeviceId(){
  var id=localStorage.getItem('kp_device_id');
  if(!id){id='dev_'+Math.random().toString(36).substr(2,9)+'_'+Date.now().toString(36);localStorage.setItem('kp_device_id',id);}
  return id;
}

window.addEventListener('DOMContentLoaded',function(){
  try{
    showPublicLanding();
    var sk=localStorage.getItem('kp_access_key'),sid=localStorage.getItem('kp_key_id');
    if(sk&&sid) verifyKey(sk,parseInt(sid,10),true);
    var keyInput=document.getElementById('keyInput');
    if(keyInput) keyInput.addEventListener('keydown',function(e){if(e.key==='Enter')doLogin();});
    var priceModal=document.getElementById('priceModal');
    if(priceModal) priceModal.addEventListener('click',function(e){if(e.target===this)closeModal();});
    var photoUrlInput=document.getElementById('photoUrlInput');
    if(photoUrlInput) photoUrlInput.addEventListener('keydown',function(e){if(e.key==='Enter')loadPhotoFromUrl();});
    if(typeof setupSignaturePad==='function') setupSignaturePad();
    var contractBody=document.getElementById('s-contract-body');
    if(contractBody && window.KP_DEFAULT_CONTRACT_BODY) contractBody.value=window.KP_DEFAULT_CONTRACT_BODY;
    var supplyContractBody=document.getElementById('s-supply-contract-body');
    if(supplyContractBody && window.KP_DEFAULT_SUPPLY_CONTRACT_BODY) supplyContractBody.value=window.KP_DEFAULT_SUPPLY_CONTRACT_BODY;
    if(typeof initPhoneMasks==='function') initPhoneMasks();
  }catch(e){
    console.error('Init error',e);
    setAuthMsg('Ошибка загрузки приложения. Обновите страницу.');
  }
});


function isLoggedIn(){
  return !!(currentKeyId && currentKeyData && currentKeyData.id);
}
function showPublicLanding(){
  var a=document.getElementById('authWrap');
  var p=document.getElementById('publicAboutWrap');
  var app=document.getElementById('appWrap');
  if(a)a.style.display='flex';
  if(p)p.style.display='block';
  if(app)app.style.display='none';
}
function hidePublicLanding(){
  var p=document.getElementById('publicAboutWrap');
  if(p)p.style.display='none';
}
function scrollToLogin(){
  var el=document.getElementById('authWrap');
  if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
}

async function doLogin(){
  try{
    var input=document.getElementById('keyInput');
    var key=(input?input.value:'').trim();
    if(!key){setAuthMsg('Введите ключ доступа');return;}
    if(!sb){setAuthMsg('Ошибка соединения. Обновите страницу и попробуйте снова.');return;}
    setAuthMsg('Проверяю...','var(--text2)');
    var res=await sb.rpc('kp_login',{p_key:key,p_device_id:getDeviceId()});
    if(res.error||rpcFailed(res)){console.error('kp_login response',res);setAuthMsg(rpcMsg(res,'Ключ не найден'));return;}
    var data=res.data&&res.data.key_data;
    if(!data||!data.id){setAuthMsg('Ошибка входа. Данные ключа не получены.');return;}
    localStorage.setItem('kp_access_key',key);
    localStorage.setItem('kp_key_id',data.id);
    currentKeyId=data.id;currentKeyData=data;
    showApp();
  }catch(e){
    console.error('Login error',e);
    setAuthMsg('Ошибка входа. Попробуйте обновить страницу.');
  }
}

async function verifyKey(key,keyId,silent){
  if(!sb){if(!silent)setAuthMsg('Ошибка соединения. Обновите страницу.');return;}
  var res;
  try{res=await sb.rpc('kp_verify',{p_key:key,p_key_id:keyId,p_device_id:getDeviceId()});}
  catch(e){console.error('Verify error',e);if(!silent)setAuthMsg('Ошибка проверки ключа');return;}
  if(res.error||rpcFailed(res)){
    showPublicLanding();
    if(!silent){setAuthMsg(rpcMsg(res,'Ошибка входа'));}
    return;
  }
  var data=res.data.key_data;
  currentKeyId=data.id;currentKeyData=data;
  showApp();
}

function setAuthMsg(msg,color){
  var el=document.getElementById('authMsg');
  el.textContent=msg;el.style.color=color||'var(--danger)';
}

function doLogout(){
  if(demoTimer){clearInterval(demoTimer);demoTimer=null;}
  localStorage.removeItem('kp_access_key');localStorage.removeItem('kp_key_id');
  currentKeyId=null;currentKeyData=null;
  services=[];equipment=[];priceItems=[];equipmentItems=[];settings={};historyData=[];contactsData=[];logoDataURL=null;quotePhotos=[];
  showPublicLanding();
  document.getElementById('keyInput').value='';
  setAuthMsg('');
}

var demoTimer = null;

function showApp(){
  hidePublicLanding();
  document.getElementById('authWrap').style.display='none';
  document.getElementById('appWrap').style.display='block';
  if(currentKeyData){
    document.getElementById('masterName').textContent=currentKeyData.master_name||'';
    if(!currentKeyData.is_admin){
      var dl=daysLeft(currentKeyData.expires_at);
      var dc=document.getElementById('daysCounter');
      if(dc){dc.style.display='';dc.textContent=dl+' дн.';dc.style.color=dl<=3?'var(--danger)':'var(--success)';}
    }
    if(currentKeyData.is_admin){
      document.getElementById('bnav-admin').style.display='';
    }
  }
  loadUserData();
}

async function loadUserData(){
  if(!isLoggedIn()){showPublicLanding();toast('Введите ключ доступа','error');return;}

  if(!currentKeyId)return;
  var res=await sb.rpc('kp_get_user_data',rpcAuthParams());
  if(res.error||rpcFailed(res)){toast(rpcMsg(res,'Ошибка загрузки данных'),'error');return;}
  settings=res.data.settings||{};applySettings();
  priceItems=(Array.isArray(res.data.price_items)&&res.data.price_items.length)?res.data.price_items:defaultPrices();
  equipmentItems=(settings&&Array.isArray(settings.equipmentItems)&&settings.equipmentItems.length)?settings.equipmentItems:defaultEquipmentItems();
  renderPriceList();
  renderEquipmentList();
  historyData=res.data.quotes||[];
  updateHistoryBadge();
  contactsData=res.data.contacts||[];
  renderContacts();
  if(typeof window.setScheduleJobsFromServer === 'function'){
    window.setScheduleJobsFromServer(res.data.schedule_jobs || res.data.schedule || []);
  }
  renderServices();
  renderEquipment();
}

function applySettings(){
  if(settings.company)document.getElementById('s-company').value=settings.company;
  if(settings.phone)document.getElementById('s-phone').value=stripDialCodeForInput(settings.phone);
  if(settings.email)document.getElementById('s-email').value=settings.email;
  if(settings.city)document.getElementById('s-city').value=settings.city;
  if(settings.inn)document.getElementById('s-inn').value=settings.inn;
  if(settings.requisites)document.getElementById('s-requisites').value=settings.requisites;
  if(settings.warranty)document.getElementById('s-warranty').value=settings.warranty;
  if(settings.color){document.getElementById('s-color').value=settings.color;document.getElementById('colorHex').textContent=settings.color;}
  if(settings.signature)document.getElementById('s-signature').value=settings.signature;
  if(document.getElementById('s-contract-body')) document.getElementById('s-contract-body').value = settings.contractBody || window.KP_DEFAULT_CONTRACT_BODY || '';
  if(document.getElementById('s-supply-contract-body')) document.getElementById('s-supply-contract-body').value = settings.supplyContractBody || window.KP_DEFAULT_SUPPLY_CONTRACT_BODY || '';
  if(settings.signatureImage) drawSavedSignature(settings.signatureImage);
  if(settings.logo){logoDataURL=settings.logo;document.getElementById('logoPreviewWrap').innerHTML='<img src="'+logoDataURL+'" class="logo-preview">';}
}

function showPage(name,el){
  if(!isLoggedIn()){
    showPublicLanding();
    setAuthMsg('Введите ключ доступа, чтобы открыть рабочие разделы','var(--danger)');
    return;
  }
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.bottom-nav-btn').forEach(function(b){b.classList.remove('active');});
  document.getElementById('page-'+name).classList.add('active');
  var bnav=document.getElementById('bnav-'+name);
  if(bnav)bnav.classList.add('active');
  if(name==='history')renderHistory();
  if(name==='schedule'&&typeof renderSchedule==='function')renderSchedule();
  if(name==='settings'){renderPriceList();renderEquipmentList();setTimeout(resizeSignatureCanvas,50);}
  if(name==='admin')loadAdminData();
  window.scrollTo({top:0,behavior:'smooth'});
}

function nextStep(n){
  if(n===2&&!validateClient())return;
  if(n===3)buildPreview();
  jumpStep(n);
}

function jumpStep(n){
  if(n===2){if(typeof renderEquipment==='function')renderEquipment();if(typeof renderServices==='function')renderServices();}
  document.getElementById('section-client').style.display=n===1?'':'none';
  document.getElementById('section-services').style.display=n===2?'':'none';
  document.getElementById('section-preview').style.display=n===3?'':'none';
  [1,2,3].forEach(function(i){
    var el=document.getElementById('step'+i);
    el.classList.remove('active','done');
    if(i<n)el.classList.add('done');
    if(i===n)el.classList.add('active');
  });
  window.scrollTo({top:0,behavior:'smooth'});
}

function validateClient(){
  if(!document.getElementById('c-name').value.trim()){toast('Введите ФИО клиента','error');return false;}
  if(!document.getElementById('c-phone').value.trim()){toast('Введите телефон','error');return false;}
  return true;
}

var UNIT_OPTIONS=['шт.','м','п.м.','кг','л','км'];
function normalizeUnit(unit){
  var u=String(unit||'шт.').trim();
  if(u==='шт')u='шт.';
  if(u==='м.п.'||u==='м/п'||u==='пм'||u==='п. м.'||u==='п.м')u='п.м.';
  return UNIT_OPTIONS.indexOf(u)>=0?u:'шт.';
}
function unitSelectHtml(value,onchange){
  var current=normalizeUnit(value);
  return '<select class="unit-select" onchange="'+onchange+'">'+UNIT_OPTIONS.map(function(u){return '<option value="'+esc(u)+'" '+(u===current?'selected':'')+'>'+esc(u)+'</option>';}).join('')+'</select>';
}
function addServiceRow(name,price,qty,unit,locked){services.push({name:name||'',price:clampMoneyValue(price),qty:clampQtyValue(qty),unit:normalizeUnit(unit),locked:!!locked});renderServices();}
function addEquipmentRow(name,price,qty,unit,locked){equipment.push({name:name||'',price:clampMoneyValue(price),qty:clampQtyValue(qty),unit:normalizeUnit(unit),locked:!!locked});renderEquipment();}
function removeEquipment(i){equipment.splice(i,1);renderEquipment();}
function removeService(i){services.splice(i,1);renderServices();}
function renderServices(){
  var list=document.getElementById('servicesList');
  var titleEl=document.getElementById('worksCardTitleText');
  if(titleEl)titleEl.textContent=extraStages.length>0?' Этап 1':' Перечень работ';
  if(!services.length){list.innerHTML='<div class="empty-state" style="padding:24px"><div class="empty-icon">🔧</div><p>Добавьте услуги</p></div>';renderExtraStages();return;}
  list.innerHTML=services.map(function(s,i){
    return'<div class="service-row" ondragover="drgOver(event)" ondragleave="drgLeave(event)" ondrop="drgDrop(event,\'services\',-1,'+i+')">'+
    '<textarea class="svc-name" rows="2" maxlength="120" placeholder="Наименование" oninput="services['+i+'].name=this.value">'+esc(s.name)+'</textarea>'+
    '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="8" value="'+s.price+'" onbeforeinput="return limitNumericBeforeInput(event,this,8)" onpaste="setTimeout(()=>clampMoneyInput(this),0)" oninput="clampMoneyInput(this);services['+i+'].price=parseFloat(this.value)||0;recalc()">'+
    (s.locked?'<div class="svc-unit-locked" title="Единица задана в прайсе">'+esc(normalizeUnit(s.unit))+'</div>':unitSelectHtml(s.unit,'services['+i+'].unit=this.value;recalc()'))+
    '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" value="'+s.qty+'" onbeforeinput="return limitNumericBeforeInput(event,this,4)" onpaste="setTimeout(()=>clampQtyInput(this),0)" oninput="clampQtyInput(this);services['+i+'].qty=parseFloat(this.value)||1;recalc()">'+
    '<div class="svc-total" id="svcTotal'+i+'" title="'+esc(fmt((parseFloat(s.price)||0)*(parseFloat(s.qty)||1)))+'">'+appMoneyHtml((parseFloat(s.price)||0)*(parseFloat(s.qty)||1))+'</div>'+
    '<div class="row-actions"><span class="drag-handle" draggable="true" ondragstart="drgStart(event,\'services\',-1,'+i+')" ondragend="drgEnd(event)" title="Перетащить">⠿</span><button class="delete-btn" onclick="removeService('+i+')">✕</button></div></div>';
  }).join('');
  renderExtraStages();
}

function renderEquipment(){
  var list=document.getElementById('equipmentList');
  if(!list)return;
  if(!equipment.length){list.innerHTML='<div class="empty-state" style="padding:20px"><div class="empty-icon">❄️</div><p>Оборудование не добавлено</p></div>';recalc();return;}
  list.innerHTML=equipment.map(function(s,i){
    return'<div class="service-row equipment-row" ondragover="drgOver(event)" ondragleave="drgLeave(event)" ondrop="drgDrop(event,\'equipment\',-1,'+i+')">'+
    '<textarea class="svc-name" rows="2" maxlength="140" placeholder="Оборудование" oninput="equipment['+i+'].name=this.value">'+esc(s.name)+'</textarea>'+
    '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="8" value="'+s.price+'" onbeforeinput="return limitNumericBeforeInput(event,this,8)" onpaste="setTimeout(()=>clampMoneyInput(this),0)" oninput="clampMoneyInput(this);equipment['+i+'].price=parseFloat(this.value)||0;recalc()">'+
    (s.locked?'<div class="svc-unit-locked" title="Единица задана в прайсе">'+esc(normalizeUnit(s.unit))+'</div>':unitSelectHtml(s.unit,'equipment['+i+'].unit=this.value;recalc()'))+
    '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" value="'+s.qty+'" onbeforeinput="return limitNumericBeforeInput(event,this,4)" onpaste="setTimeout(()=>clampQtyInput(this),0)" oninput="clampQtyInput(this);equipment['+i+'].qty=parseFloat(this.value)||1;recalc()">'+
    '<div class="svc-total" id="eqTotal'+i+'" title="'+esc(fmt((parseFloat(s.price)||0)*(parseFloat(s.qty)||1)))+'">'+appMoneyHtml((parseFloat(s.price)||0)*(parseFloat(s.qty)||1))+'</div>'+
    '<div class="row-actions"><span class="drag-handle" draggable="true" ondragstart="drgStart(event,\'equipment\',-1,'+i+')" ondragend="drgEnd(event)" title="Перетащить">⠿</span><button class="delete-btn" onclick="removeEquipment('+i+')">✕</button></div></div>';
  }).join('');
  recalc();
}


function renderExtraStages(){
  var container=document.getElementById('extraStagesContainer');
  if(!container)return;
  if(!extraStages.length){container.innerHTML='';recalc();return;}
  container.innerHTML=extraStages.map(function(stage,si){
    var stageNum=si+2;
    var rowsHtml=stage.items.length?stage.items.map(function(s,ri){
      var v=(parseFloat(s.price)||0)*(parseFloat(s.qty)||1);
      return'<div class="service-row" ondragover="drgOver(event)" ondragleave="drgLeave(event)" ondrop="drgDrop(event,\'stage\','+si+','+ri+')">'+
      '<textarea class="svc-name" rows="2" maxlength="120" placeholder="Наименование" oninput="extraStages['+si+'].items['+ri+'].name=this.value">'+esc(s.name)+'</textarea>'+
      '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="8" value="'+s.price+'" onbeforeinput="return limitNumericBeforeInput(event,this,8)" onpaste="setTimeout(()=>clampMoneyInput(this),0)" oninput="clampMoneyInput(this);extraStages['+si+'].items['+ri+'].price=parseFloat(this.value)||0;recalc()">'+
      (s.locked?'<div class="svc-unit-locked" title="Единица задана в прайсе">'+esc(normalizeUnit(s.unit))+'</div>':unitSelectHtml(s.unit,'extraStages['+si+'].items['+ri+'].unit=this.value;recalc()'))+
      '<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="4" value="'+s.qty+'" onbeforeinput="return limitNumericBeforeInput(event,this,4)" onpaste="setTimeout(()=>clampQtyInput(this),0)" oninput="clampQtyInput(this);extraStages['+si+'].items['+ri+'].qty=parseFloat(this.value)||1;recalc()">'+
      '<div class="svc-total" id="stg'+si+'r'+ri+'Total" title="'+esc(fmt(v))+'">'+appMoneyHtml(v)+'</div>'+
      '<div class="row-actions"><span class="drag-handle" draggable="true" ondragstart="drgStart(event,\'stage\','+si+','+ri+')" ondragend="drgEnd(event)" title="Перетащить">⠿</span><button class="delete-btn" onclick="removeStageRow('+si+','+ri+')">✕</button></div></div>';
    }).join(''):'<div class="empty-state" style="padding:24px"><div class="empty-icon">🔧</div><p>Добавьте услуги</p></div>';
    return'<div class="stage-block">'+
    '<div class="stage-header">'+
    '<span class="stage-num">Этап '+stageNum+'</span>'+
    '<input class="stage-title-input" type="text" maxlength="60" placeholder="Название этапа" value="'+esc(stage.title)+'" oninput="extraStages['+si+'].title=this.value">'+
    '<button class="delete-btn stage-remove-btn" onclick="removeExtraStage('+si+')" title="Удалить этап">✕</button>'+
    '</div>'+
    '<div class="services-header"><span>Наименование</span><span>Цена</span><span>Ед.</span><span>Кол-во</span><span>Сумма</span><span></span></div>'+
    '<div class="services-list">'+rowsHtml+'</div>'+
    '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" onclick="addStageRow('+si+')">+ Добавить строку</button><button class="btn btn-ghost btn-sm" onclick="addFromPriceListToStage('+si+')"><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="10" height="13" rx="1"/><path d="M6 2V1h4v1"/><line x1="5" y1="7" x2="11" y2="7"/><line x1="5" y1="10" x2="9" y2="10"/></svg> Из прайса</button></div>'+
    '</div>';
  }).join('');
  recalc();
}
function addExtraStage(){
  extraStages.push({title:'',items:[]});
  var titleEl=document.getElementById('worksCardTitleText');
  if(titleEl)titleEl.textContent=' Этап 1';
  renderExtraStages();
}
function removeExtraStage(si){
  extraStages.splice(si,1);
  var titleEl=document.getElementById('worksCardTitleText');
  if(titleEl)titleEl.textContent=extraStages.length>0?' Этап 1':' Перечень работ';
  renderExtraStages();
}
function addStageRow(si){extraStages[si].items.push({name:'',price:0,qty:1,unit:'шт.',locked:false});renderExtraStages();}
function removeStageRow(si,ri){extraStages[si].items.splice(ri,1);renderExtraStages();}

function recalc(){
  var worksSub=services.reduce(function(s,x){return s+(parseFloat(x.price)||0)*(parseFloat(x.qty)||1);},0);
  extraStages.forEach(function(stage,si){stage.items.forEach(function(x,ri){var v=(parseFloat(x.price)||0)*(parseFloat(x.qty)||1);worksSub+=v;var el=document.getElementById('stg'+si+'r'+ri+'Total');if(el){el.innerHTML=appMoneyHtml(v);el.title=fmt(v);}});});
  var equipmentSub=equipment.reduce(function(s,x){return s+(parseFloat(x.price)||0)*(parseFloat(x.qty)||1);},0);
  var sub=worksSub+equipmentSub;
  services.forEach(function(s,i){var el=document.getElementById('svcTotal'+i);var v=(parseFloat(s.price)||0)*(parseFloat(s.qty)||1);if(el){el.innerHTML=appMoneyHtml(v);el.title=fmt(v);}});
  equipment.forEach(function(s,i){var el=document.getElementById('eqTotal'+i);var v=(parseFloat(s.price)||0)*(parseFloat(s.qty)||1);if(el){el.innerHTML=appMoneyHtml(v);el.title=fmt(v);}});
  var dv=parseFloat(document.getElementById('discountVal').value)||0;
  var dt=document.getElementById('discountType').value;
  var disc=dv>0?(dt==='percent'?sub*dv/100:dv):0;
  var discountDisplay=document.getElementById('discountDisplay');
  if(dv>0){document.getElementById('discountRow').style.display='';if(discountDisplay){discountDisplay.innerHTML='−'+appMoneyHtml(disc);discountDisplay.title='−'+fmt(disc);}}
  else{document.getElementById('discountRow').style.display='none';}
  var prepay=parseFloat(document.getElementById('prepayVal')?document.getElementById('prepayVal').value:0)||0;
  var prepayDisplay=document.getElementById('prepayDisplay');
  if(prepay>0&&document.getElementById('prepayRow')){document.getElementById('prepayRow').style.display='';if(prepayDisplay){prepayDisplay.innerHTML='−'+appMoneyHtml(prepay);prepayDisplay.title='−'+fmt(prepay);}}
  else if(document.getElementById('prepayRow')){document.getElementById('prepayRow').style.display='none';}
  var eqRow=document.getElementById('equipmentTotalRow');if(eqRow)eqRow.style.display=equipmentSub>0?'':'none';
  var eqEl=document.getElementById('equipmentTotalDisplay');if(eqEl){eqEl.innerHTML=appMoneyHtml(equipmentSub);eqEl.title=fmt(equipmentSub);}
  var stageCont=document.getElementById('stageSubtotalsContainer');
  var worksLabelEl=document.getElementById('worksTotalLabel');
  if(stageCont){
    if(extraStages.length>0){
      var s1sub=services.reduce(function(s,x){return s+(parseFloat(x.price)||0)*(parseFloat(x.qty)||1);},0);
      var sh='<div class="totals-row stage-subtotal-row"><span>Этап 1:</span><span>'+appMoneyHtml(s1sub)+'</span></div>';
      extraStages.forEach(function(stage,si){var stSub=stage.items.reduce(function(s,x){return s+(parseFloat(x.price)||0)*(parseFloat(x.qty)||1);},0);sh+='<div class="totals-row stage-subtotal-row"><span>Этап '+(si+2)+(stage.title?' — '+stage.title:'')+':</span><span>'+appMoneyHtml(stSub)+'</span></div>';});
      stageCont.innerHTML=sh;
      if(worksLabelEl)worksLabelEl.textContent='Работы итого:';
    }else{stageCont.innerHTML='';if(worksLabelEl)worksLabelEl.textContent='Работы:';}
  }
  var workEl=document.getElementById('worksTotalDisplay');if(workEl){workEl.innerHTML=appMoneyHtml(worksSub);workEl.title=fmt(worksSub);}
  var subEl=document.getElementById('subtotalDisplay');if(subEl){subEl.innerHTML=appMoneyHtml(sub);subEl.title=fmt(sub);}
  var grandEl=document.getElementById('grandTotalDisplay');if(grandEl){var gv=Math.max(0,sub-disc-prepay);grandEl.innerHTML=appMoneyHtml(gv);grandEl.title=fmt(gv);}
}



function renderPriceList(){
  var list=document.getElementById('priceList');if(!list)return;
  list.innerHTML=priceItems.map(function(p,i){
    return'<div class="service-row settings-price-row" ondragover="drgOver(event)" ondragleave="drgLeave(event)" ondrop="drgDrop(event,\'priceItems\',-1,'+i+')">'+
    '<label class="settings-price-cell settings-name-cell"><em class="settings-row-label">Услуга</em><input type="text" maxlength="120" placeholder="Услуга" value="'+esc(p.name)+'" oninput="priceItems['+i+'].name=this.value"></label>'+
    '<label class="settings-price-cell settings-price-cell-price"><em class="settings-row-label">Цена</em><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="8" value="'+p.price+'" onbeforeinput="return limitNumericBeforeInput(event,this,8)" placeholder="Цена" oninput="clampMoneyInput(this);priceItems['+i+'].price=parseFloat(this.value)||0"></label>'+
    '<label class="settings-price-cell settings-price-cell-unit"><em class="settings-row-label">Ед.</em>'+unitSelectHtml(p.unit,'priceItems['+i+'].unit=this.value')+'</label>'+
    '<div class="row-actions"><span class="drag-handle" draggable="true" ondragstart="drgStart(event,\'priceItems\',-1,'+i+')" ondragend="drgEnd(event)" title="Перетащить">⠿</span><button class="delete-btn" onclick="removePriceItem('+i+')">✕</button></div></div>';
  }).join('');
}
function addPriceItem(){priceItems.push({name:'',price:0,unit:'шт.'});renderPriceList();}
function removePriceItem(i){priceItems.splice(i,1);renderPriceList();}

function defaultQuoteServices(){return[];}

function defaultPrices(){return[
  {name:'Монтаж кондиционера до 2,5 кВт',price:4500,unit:'шт.'},
  {name:'Монтаж кондиционера 3,5 кВт',price:5500,unit:'шт.'},
  {name:'Монтаж кондиционера 5,0 кВт',price:7500,unit:'шт.'},
  {name:'Демонтаж кондиционера',price:2500,unit:'шт.'},
  {name:'Прокладка трассы',price:600,unit:'п.м.'},
  {name:'Штробление стены',price:1000,unit:'п.м.'},
  {name:'Установка дренажной помпы',price:2500,unit:'шт.'},
  {name:'Подключение к электросети',price:1500,unit:'шт.'},
  {name:'Заправка фреоном R-32',price:1800,unit:'кг'},
  {name:'Выезд мастера / диагностика',price:1000,unit:'шт.'}
];}

function defaultEquipmentItems(){return[
  {name:'Кондиционер настенный сплит-система 7 BTU',price:0,unit:'шт.'},
  {name:'Кондиционер настенный сплит-система 9 BTU',price:0,unit:'шт.'},
  {name:'Кондиционер настенный сплит-система 12 BTU',price:0,unit:'шт.'},
  {name:'Кондиционер настенный сплит-система 18 BTU',price:0,unit:'шт.'},
  {name:'Кондиционер настенный сплит-система 24 BTU',price:0,unit:'шт.'},
  {name:'Медная трасса 1/4–3/8 с утеплителем',price:0,unit:'п.м.'},
  {name:'Кронштейн наружного блока',price:0,unit:'компл.'},
  {name:'Дренажный шланг',price:0,unit:'п.м.'},
  {name:'Кабель межблочный',price:0,unit:'п.м.'},
  {name:'Дренажная помпа',price:0,unit:'шт.'}
];}
function renderEquipmentList(){
  var list=document.getElementById('equipmentPriceList');if(!list)return;
  list.innerHTML=equipmentItems.map(function(p,i){
    return'<div class="service-row settings-price-row" ondragover="drgOver(event)" ondragleave="drgLeave(event)" ondrop="drgDrop(event,\'equipmentItems\',-1,'+i+')">'+
    '<label class="settings-price-cell settings-name-cell"><em class="settings-row-label">Оборудование</em><input type="text" maxlength="140" placeholder="Оборудование" value="'+esc(p.name)+'" oninput="equipmentItems['+i+'].name=this.value"></label>'+
    '<label class="settings-price-cell settings-price-cell-price"><em class="settings-row-label">Цена</em><input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="8" value="'+p.price+'" onbeforeinput="return limitNumericBeforeInput(event,this,8)" placeholder="Цена" oninput="clampMoneyInput(this);equipmentItems['+i+'].price=parseFloat(this.value)||0"></label>'+
    '<label class="settings-price-cell settings-price-cell-unit"><em class="settings-row-label">Ед.</em>'+unitSelectHtml(p.unit,'equipmentItems['+i+'].unit=this.value')+'</label>'+
    '<div class="row-actions"><span class="drag-handle" draggable="true" ondragstart="drgStart(event,\'equipmentItems\',-1,'+i+')" ondragend="drgEnd(event)" title="Перетащить">⠿</span><button class="delete-btn" onclick="removeEquipmentItem('+i+')">✕</button></div></div>';
  }).join('');
}
function addEquipmentItem(){equipmentItems.push({name:'',price:0,unit:'шт.'});renderEquipmentList();}
function removeEquipmentItem(i){equipmentItems.splice(i,1);renderEquipmentList();}


var priceModalTarget='services';
function addFromPriceList(){
  priceModalTarget='services';
  var mt=document.getElementById('modalPriceTitle');if(mt)mt.textContent='📋 Выбрать из прайса работ';
  if(!priceItems.length){toast('Прайс пуст','error');return;}
  document.getElementById('modalPriceList').innerHTML=priceItems.map(function(p,i){
    return'<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer;min-width:0">'+
    '<input type="checkbox" data-idx="'+i+'" style="width:16px;height:16px;flex-shrink:0;margin-top:2px">'+
    '<span style="flex:1;font-size:14px;word-break:break-word;min-width:0;overflow-wrap:break-word">'+esc(p.name)+'</span>'+
    '<span style="color:var(--accent);font-weight:700;white-space:nowrap;flex-shrink:0;margin-left:8px">'+fmt(p.price)+' / '+esc(normalizeUnit(p.unit))+'</span></label>';
  }).join('');
  document.getElementById('priceModal').style.display='flex';
}
function addFromEquipmentList(){
  priceModalTarget='equipment';
  var mt=document.getElementById('modalPriceTitle');if(mt)mt.textContent='❄️ Выбрать оборудование';
  if(!equipmentItems.length){toast('Список оборудования пуст','error');return;}
  document.getElementById('modalPriceList').innerHTML=equipmentItems.map(function(p,i){
    return'<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer;min-width:0">'+
    '<input type="checkbox" data-idx="'+i+'" style="width:16px;height:16px;flex-shrink:0;margin-top:2px">'+
    '<span style="flex:1;font-size:14px;word-break:break-word;min-width:0;overflow-wrap:break-word">'+esc(p.name)+'</span>'+
    '<span style="color:var(--accent);font-weight:700;white-space:nowrap;flex-shrink:0;margin-left:8px">'+fmt(p.price)+' / '+esc(normalizeUnit(p.unit))+'</span></label>';
  }).join('');
  document.getElementById('priceModal').style.display='flex';
}
function closeModal(){document.getElementById('priceModal').style.display='none';}
function addFromPriceListToStage(si){
  priceModalTarget='stage_'+si;
  var mt=document.getElementById('modalPriceTitle');if(mt)mt.textContent='📋 Выбрать из прайса работ';
  if(!priceItems.length){toast('Прайс пуст','error');return;}
  document.getElementById('modalPriceList').innerHTML=priceItems.map(function(p,i){
    return'<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;cursor:pointer;min-width:0">'+
    '<input type="checkbox" data-idx="'+i+'" style="width:16px;height:16px;flex-shrink:0;margin-top:2px">'+
    '<span style="flex:1;font-size:14px;word-break:break-word;min-width:0;overflow-wrap:break-word">'+esc(p.name)+'</span>'+
    '<span style="color:var(--accent);font-weight:700;white-space:nowrap;flex-shrink:0;margin-left:8px">'+fmt(p.price)+' / '+esc(normalizeUnit(p.unit))+'</span></label>';
  }).join('');
  document.getElementById('priceModal').style.display='flex';
}
function applyModalItems(){
  var isStage=priceModalTarget.indexOf('stage_')===0;
  var stageIdx=isStage?parseInt(priceModalTarget.slice(6),10):-1;
  document.querySelectorAll('#modalPriceList input:checked').forEach(function(cb){
    if(priceModalTarget==='equipment'){
      var e=equipmentItems[cb.dataset.idx];if(e)addEquipmentRow(e.name,e.price,1,normalizeUnit(e.unit),true);
    }else if(isStage){
      var p=priceItems[cb.dataset.idx];if(p&&extraStages[stageIdx])extraStages[stageIdx].items.push({name:p.name,price:clampMoneyValue(p.price),qty:1,unit:normalizeUnit(p.unit),locked:true});
    }else{
      var p=priceItems[cb.dataset.idx];if(p)addServiceRow(p.name,p.price,1,normalizeUnit(p.unit),true);
    }
  });
  if(isStage)renderExtraStages();
  closeModal();
}


async function saveSettings(showMsg){
  if(!isLoggedIn()){showPublicLanding();toast('Введите ключ доступа','error');return;}

  settings={
    company:document.getElementById('s-company').value,
    phone:getPhoneWithDialCode('s-phone'),
    email:document.getElementById('s-email').value,
    city:document.getElementById('s-city').value,
    inn:document.getElementById('s-inn').value,
    requisites:document.getElementById('s-requisites').value,
    warranty:document.getElementById('s-warranty').value,
    color:document.getElementById('s-color').value,
    signature:document.getElementById('s-signature').value,
    signatureImage:(typeof getSignatureImageForSave==='function' ? getSignatureImageForSave() : ((settings && settings.signatureImage) || '')),
    contractBody:document.getElementById('s-contract-body') ? document.getElementById('s-contract-body').value : '',
    supplyContractBody:document.getElementById('s-supply-contract-body') ? document.getElementById('s-supply-contract-body').value : '',
    equipmentItems:JSON.parse(JSON.stringify(equipmentItems||[])),
    logo:logoDataURL
  };
  var args=Object.assign(rpcAuthParams(),{p_settings:settings,p_items:priceItems});
  var res=await sb.rpc('kp_save_settings',args);
  if(res.error||rpcFailed(res)){toast(rpcMsg(res,'Ошибка сохранения'),'error');return;}
  if(showMsg)toast('Настройки сохранены ✓','success');
}

function handleLogo(e){
  var file=e.target.files[0];if(!file)return;
  if(file.size>5*1024*1024){toast('Файл слишком большой','error');return;}
  var r=new FileReader();
  r.onload=function(ev){
    var img=new Image();
    img.onload=function(){
      var c=document.createElement('canvas'),max=200,w=img.naturalWidth,h=img.naturalHeight;
      if(w>h){h=Math.round(h*max/w);w=max;}else{w=Math.round(w*max/h);h=max;}
      c.width=w;c.height=h;
      var ctx=c.getContext('2d');ctx.clearRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
      logoDataURL=c.toDataURL('image/jpeg',0.6);
      document.getElementById('logoPreviewWrap').innerHTML='<img src="'+logoDataURL+'" class="logo-preview">';
      toast('Логотип загружен ✓','success');
    };
    img.src=ev.target.result;
  };
  r.readAsDataURL(file);
}
function clearLogo(){logoDataURL=null;document.getElementById('logoPreviewWrap').innerHTML='<div style="color:var(--text3);font-size:13px"><div style="font-size:32px;margin-bottom:8px">🖼</div><p>Нажмите для загрузки</p></div>';}

var signatureCanvas=null,signatureCtx=null,signatureDrawing=false,signatureHasInk=false;
function setupSignaturePad(){
  signatureCanvas=document.getElementById('signatureCanvas');
  if(!signatureCanvas)return;
  signatureCtx=signatureCanvas.getContext('2d');
  resizeSignatureCanvas();
  ['pointerdown','pointermove','pointerup','pointerleave','pointercancel'].forEach(function(ev){signatureCanvas.addEventListener(ev,handleSignaturePointer);});
  window.addEventListener('resize',function(){setTimeout(resizeSignatureCanvas,80);});
}
function resizeSignatureCanvas(){
  if(!signatureCanvas)return;
  var saved = settings && settings.signatureImage ? settings.signatureImage : (signatureHasInk ? signatureCanvas.toDataURL('image/png') : '');
  var rect=signatureCanvas.getBoundingClientRect();
  var ratio=Math.max(1,window.devicePixelRatio||1);
  var w=Math.max(320,Math.round((rect.width||640)*ratio)), h=Math.round(180*ratio);
  if(signatureCanvas.width!==w || signatureCanvas.height!==h){signatureCanvas.width=w;signatureCanvas.height=h;}
  signatureCtx=signatureCanvas.getContext('2d');
  signatureCtx.setTransform(1,0,0,1,0,0);
  signatureCtx.clearRect(0,0,signatureCanvas.width,signatureCanvas.height);
  signatureCtx.lineWidth=2.4*ratio;signatureCtx.lineCap='round';signatureCtx.lineJoin='round';signatureCtx.strokeStyle='#2563eb';
  if(saved) drawSavedSignature(saved);
}
function handleSignaturePointer(e){
  if(!signatureCtx)return;
  e.preventDefault();
  var p=getSignaturePoint(e);
  if(e.type==='pointerdown'){
    signatureDrawing=true;signatureHasInk=true;signatureCanvas.setPointerCapture&&signatureCanvas.setPointerCapture(e.pointerId);
    signatureCtx.beginPath();signatureCtx.moveTo(p.x,p.y);return;
  }
  if(e.type==='pointermove'&&signatureDrawing){signatureCtx.lineTo(p.x,p.y);signatureCtx.stroke();return;}
  if(e.type==='pointerup'||e.type==='pointerleave'||e.type==='pointercancel') signatureDrawing=false;
}
function getSignaturePoint(e){
  var rect=signatureCanvas.getBoundingClientRect();
  return {x:(e.clientX-rect.left)*(signatureCanvas.width/rect.width),y:(e.clientY-rect.top)*(signatureCanvas.height/rect.height)};
}
function clearSignaturePad(){
  if(!signatureCanvas||!signatureCtx)return;
  signatureCtx.clearRect(0,0,signatureCanvas.width,signatureCanvas.height);
  signatureHasInk=false;
  if(settings)settings.signatureImage='';
  toast('Подпись очищена','success');
}
function getSignatureImageForSave(){
  if(signatureCanvas && signatureHasInk) return signatureCanvas.toDataURL('image/png');
  return (settings && settings.signatureImage) || '';
}
function saveSignaturePad(){
  if(!signatureCanvas){toast('Поле подписи не найдено','error');return;}
  if(!signatureHasInk && !(settings&&settings.signatureImage)){toast('Сначала поставьте подпись','error');return;}
  settings.signatureImage=signatureCanvas.toDataURL('image/png');
  toast('Подпись сохранена ✓','success');
}
function drawSavedSignature(dataURL){
  if(!signatureCanvas||!signatureCtx||!dataURL)return;
  var img=new Image();
  img.onload=function(){
    signatureCtx.clearRect(0,0,signatureCanvas.width,signatureCanvas.height);
    var ratio=Math.min(signatureCanvas.width/img.width,signatureCanvas.height/img.height);
    var w=img.width*ratio,h=img.height*ratio;
    signatureCtx.drawImage(img,(signatureCanvas.width-w)/2,(signatureCanvas.height-h)/2,w,h);
    signatureHasInk=true;
  };
  img.src=dataURL;
}
function resetContractTemplate(){
  var el=document.getElementById('s-contract-body');
  if(!el)return;
  if(!confirm('Вернуть стандартный текст договора?'))return;
  el.value=window.KP_DEFAULT_CONTRACT_BODY||'';
  toast('Стандартный договор восстановлен','success');
}
function resetSupplyContractTemplate(){
  var el=document.getElementById('s-supply-contract-body');
  if(!el)return;
  if(!confirm('Вернуть стандартный текст договора поставки оборудования?'))return;
  el.value=window.KP_DEFAULT_SUPPLY_CONTRACT_BODY||'';
  toast('Стандартный договор поставки восстановлен','success');
}

function renderPhotos(){
  var g=document.getElementById('photoGrid');
  document.getElementById('photoCount').textContent=quotePhotos.length+' / '+MAX_PHOTOS+' фото';
  document.getElementById('photoClearBtn').style.display=quotePhotos.length?'':'none';
  if(!quotePhotos.length){g.innerHTML='<div class="photo-empty">Фото пока не добавлены</div>';return;}
  g.innerHTML=quotePhotos.map(function(p,i){return'<div class="photo-card"><img src="'+p.dataURL+'"><button class="photo-del" onclick="removePhoto('+i+')">✕</button></div>';}).join('');
}
function removePhoto(i){quotePhotos.splice(i,1);renderPhotos();}
function clearAllPhotos(){if(!confirm('Удалить все фото?'))return;quotePhotos=[];renderPhotos();}
function loadPhotoFromUrl(){
  var url=document.getElementById('photoUrlInput').value.trim();
  if(!url){toast('Введите ссылку','error');return;}
  if(quotePhotos.length>=MAX_PHOTOS){toast('Максимум '+MAX_PHOTOS+' фото','error');return;}
  var img=new Image();img.crossOrigin='anonymous';
  img.onload=function(){
    try{var c=document.createElement('canvas'),M=800,w=img.naturalWidth,h=img.naturalHeight;
    if(w>M||h>M){if(w>h){h=Math.round(h*M/w);w=M;}else{w=Math.round(w*M/h);h=M;}}
    c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
    quotePhotos.push({dataURL:c.toDataURL('image/jpeg',.85),name:'фото'});
    document.getElementById('photoUrlInput').value='';renderPhotos();toast('Фото добавлено ✓','success');
    }catch(e){toast('CORS — сайт запрещает копирование','error');}
  };
  img.onerror=function(){toast('Не удалось загрузить','error');};
  img.src=url+(url.indexOf('?')>=0?'&':'?')+'_cb='+Date.now();
}
function loadPhotoFromFile(e){
  Array.from(e.target.files).forEach(function(file){
    if(ALLOWED_TYPES.indexOf(file.type)===-1){toast(file.name+': только JPG, PNG, WebP','error');return;}
    if(file.size>MAX_PHOTO_MB*1024*1024){toast(file.name+': превышает '+MAX_PHOTO_MB+' МБ','error');return;}
    if(quotePhotos.length>=MAX_PHOTOS){toast('Максимум '+MAX_PHOTOS+' фото','error');return;}
    var r=new FileReader();
    r.onload=function(ev){var img=new Image();img.onload=function(){
      var c=document.createElement('canvas'),M=800,w=img.naturalWidth,h=img.naturalHeight;
      if(w>M||h>M){if(w>h){h=Math.round(h*M/w);w=M;}else{w=Math.round(w*M/h);h=M;}}
      c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
      quotePhotos.push({dataURL:c.toDataURL('image/jpeg',.85),name:file.name});renderPhotos();
    };img.src=ev.target.result;};
    r.readAsDataURL(file);
  });
  e.target.value='';
}

function buildPreview(){
  normalizeLineItems();
  var c=getClientData(),t=getTotals();
  var today=new Date().toLocaleDateString('ru-RU'),num=generateQuoteNumber(),color=settings.color||'#0066ff';
  var workRows=services.map(function(s){var total=(parseFloat(s.price)||0)*(parseFloat(s.qty)||1);return'<tr><td class="qp-name">'+esc(s.name)+'</td><td class="qp-money">'+moneyHtml(s.price)+'</td><td class="qp-unit">'+esc(normalizeUnit(s.unit))+'</td><td class="qp-qty">'+s.qty+'</td><td class="qp-money qp-total">'+moneyHtml(total)+'</td></tr>';}).join('');
  var eqRows=equipment.map(function(s){var total=(parseFloat(s.price)||0)*(parseFloat(s.qty)||1);return'<tr><td class="qp-name">'+esc(s.name)+'</td><td class="qp-money">'+moneyHtml(s.price)+'</td><td class="qp-unit">'+esc(normalizeUnit(s.unit))+'</td><td class="qp-qty">'+s.qty+'</td><td class="qp-money qp-total">'+moneyHtml(total)+'</td></tr>';}).join('');
  var tableHead='<table class="quote-preview-table" style="table-layout:fixed;width:100%"><colgroup><col><col style="width:82px"><col style="width:38px"><col style="width:38px"><col style="width:106px"></colgroup><thead style="background:'+color+'"><tr><th style="color:#fff;padding:7px">Наименование</th><th style="color:#fff;padding:7px;text-align:right">Цена</th><th style="color:#fff;padding:7px;text-align:center">Ед.</th><th style="color:#fff;padding:7px;text-align:center">Кол.</th><th style="color:#fff;padding:7px;text-align:right">Сумма</th></tr></thead><tbody>';
  var tableEnd='</tbody></table>';
  var hasEquipment = equipment.length > 0;
  var hasWorks = services.length > 0;
  var useStageLabels = extraStages.length > 0;
  var sectionLabel = function(title,top){return '<div class="quote-section-label" style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:'+color+';margin:'+(top?'10px':'12px')+' 0 6px">'+title+'</div>';};
  var sections = '';
  if(hasEquipment) sections += sectionLabel('Оборудование',true)+tableHead+eqRows+tableEnd;
  if(hasWorks){var wl=useStageLabels?'Этап 1':(hasEquipment?'Работы':'');sections+=(wl?sectionLabel(wl,!hasEquipment):'')+tableHead+workRows+tableEnd;}
  extraStages.forEach(function(stage,si){if(!stage.items.length)return;var stLabel='Этап '+(si+2)+(stage.title?' — '+stage.title:'');var stRows=stage.items.map(function(s){var total=(parseFloat(s.price)||0)*(parseFloat(s.qty)||1);return'<tr><td class="qp-name">'+esc(s.name)+'</td><td class="qp-money">'+moneyHtml(s.price)+'</td><td class="qp-unit">'+esc(normalizeUnit(s.unit))+'</td><td class="qp-qty">'+s.qty+'</td><td class="qp-money qp-total">'+moneyHtml(total)+'</td></tr>';}).join('');sections+=sectionLabel(stLabel,false)+tableHead+stRows+tableEnd;});
  if(!hasEquipment&&!hasWorks&&!extraStages.some(function(s){return s.items.length>0;})) sections = '<div class="empty-state" style="padding:20px"><p>Позиции не добавлены</p></div>';
  var h='<div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid '+color+';margin-bottom:14px">'+
    '<div>'+(logoDataURL?'<img src="'+logoDataURL+'" style="max-height:52px;max-width:150px;object-fit:contain;display:block;margin-bottom:4px">':'')+
    (settings.company?'<div style="font-size:15px;font-weight:800;color:#111">'+esc(settings.company)+'</div>':'')+
    '<div style="font-size:11px;color:#666">'+[getPhoneWithDialCode('s-phone')||settings.phone,settings.email].filter(Boolean).join(' · ')+'</div>'+
    ([settings.city,settings.inn?'ИНН '+settings.inn:''].filter(Boolean).length?'<div style="font-size:10px;color:#999">'+[settings.city,settings.inn?'ИНН '+settings.inn:''].filter(Boolean).join(' · ')+'</div>':'')+
    '</div><div style="text-align:right"><div style="font-size:16px;font-weight:900;color:'+color+';line-height:1.2">КОММЕРЧЕСКОЕ<br/>ПРЕДЛОЖЕНИЕ</div><div style="font-size:10px;color:#888;margin-top:4px">№ '+num+' от '+today+'</div></div></div>'+
    '<div style="background:#f8fafc;border-radius:6px;padding:10px 14px;margin-bottom:14px;font-size:12px;max-width:100%;overflow:hidden;overflow-wrap:anywhere;word-break:break-word">'+
    '<div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#999;font-weight:700;margin-bottom:4px">Клиент</div>'+
    '<b>ФИО:</b> '+esc(c.name)+' &nbsp; <b>Тел:</b> '+esc(c.phone)+
    (c.email?' &nbsp; <b>Email:</b> '+esc(c.email):'')+
    (c.addr?'<br><b>Адрес:</b> '+esc(c.addr):'')+
    '</div>'+
    sections+
    '<div style="text-align:right"><div style="display:inline-block;min-width:210px">'+
    (t.equipmentSubtotal>0?'<div style="display:flex;justify-content:space-between;font-size:12px;color:#666;padding:3px 0"><span>Оборудование:</span><span class="qp-money">'+moneyHtml(t.equipmentSubtotal)+'</span></div>':'')+
    (function(){if(!extraStages.length)return'';var s1s=services.reduce(function(s,x){return s+(parseFloat(x.price)||0)*(parseFloat(x.qty)||1);},0);var r='<div style="display:flex;justify-content:space-between;font-size:11px;color:#888;padding:2px 0 2px 6px"><span>Этап 1:</span><span class="qp-money">'+moneyHtml(s1s)+'</span></div>';extraStages.forEach(function(stage,si){var ss=stage.items.reduce(function(s,x){return s+(parseFloat(x.price)||0)*(parseFloat(x.qty)||1);},0);r+='<div style="display:flex;justify-content:space-between;font-size:11px;color:#888;padding:2px 0 2px 6px"><span>Этап '+(si+2)+(stage.title?' — '+stage.title:'')+':</span><span class="qp-money">'+moneyHtml(ss)+'</span></div>';});return r;})()+
    (t.worksSubtotal>0&&(t.equipmentSubtotal>0||extraStages.length>0)?'<div style="display:flex;justify-content:space-between;font-size:12px;color:#666;padding:3px 0"><span>'+(extraStages.length>0?'Работы итого:':'Работы:')+'</span><span class="qp-money">'+moneyHtml(t.worksSubtotal)+'</span></div>':'')+
    '<div style="display:flex;justify-content:space-between;font-size:12px;color:#666;padding:3px 0"><span>Итого:</span><span class="qp-money">'+moneyHtml(t.subtotal)+'</span></div>'+
    (t.discount>0?'<div style="display:flex;justify-content:space-between;font-size:12px;color:#c00;padding:3px 0"><span>Скидка:</span><span class="qp-money">−'+moneyHtml(t.discount)+'</span></div>':'')+
    (t.prepay>0?'<div style="display:flex;justify-content:space-between;font-size:12px;color:#059669;padding:3px 0"><span>Предоплата:</span><span class="qp-money">−'+moneyHtml(t.prepay)+'</span></div>':'')+
    '<div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:'+color+';border-top:2px solid '+color+';padding-top:6px;margin-top:4px"><span>К ОПЛАТЕ:</span><span class="qp-money">'+moneyHtml(t.grand)+'</span></div></div></div>'+
    (c.notes?'<div data-wrap-fix="1" style="background:#fffbf0;border-left:3px solid #f0a020;padding:8px 12px;margin-top:10px;font-size:11px;overflow-wrap:anywhere;word-break:break-word;white-space:normal;max-width:100%;overflow:hidden"><b>Примечание:</b> '+esc(c.notes)+'</div>':'')+
    (settings.warranty?'<div data-wrap-fix="1" style="background:#f0f8ff;border-left:3px solid '+color+';padding:8px 12px;margin-top:10px;font-size:11px;color:#445;overflow-wrap:anywhere;word-break:break-word;white-space:normal">'+esc(settings.warranty)+'</div>':'')+
    (quotePhotos.length?'<div style="margin-top:14px;padding-top:10px;border-top:2px solid '+color+'"><div style="font-size:9px;font-weight:700;text-transform:uppercase;color:'+color+';margin-bottom:8px">Фото оборудования</div><div style="display:grid;grid-template-columns:repeat('+Math.min(quotePhotos.length,3)+',1fr);gap:6px">'+quotePhotos.map(function(p){return'<img src="'+p.dataURL+'" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:4px;border:1px solid #ddd">';}).join('')+'</div></div>':'')+
    '<div style="margin-top:14px;padding-top:10px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:10px;color:#aaa">'+
    '<div>'+[settings.requisites,settings.inn?'ИНН '+settings.inn:'',settings.city].filter(Boolean).join(' · ')+'</div>'+
    '<div>'+esc(settings.signature||'')+'</div></div>';
  document.getElementById('pdfPreview').innerHTML=h;
}

function printPDF(){
  if(!isLoggedIn()){showPublicLanding();toast('Введите ключ доступа','error');return;}

  normalizeLineItems();
  var c=getClientData(),t=getTotals();
  var today=new Date().toLocaleDateString('ru-RU'),num=generateQuoteNumber(),color=settings.color||'#0066ff';
  var sRows=services.map(function(s,i){var total=(parseFloat(s.price)||0)*(parseFloat(s.qty)||1);
    return'<tr style="background:'+(i%2===0?'#fff':'#f8fafc')+'">'+
    '<td class="num-td">'+(i+1)+'</td><td class="name-td"><span class="clip-name">'+esc(s.name)+'</span></td>'+ 
    '<td class="money-td">'+moneyHtml(s.price)+'</td><td class="unit-td">'+esc(normalizeUnit(s.unit))+'</td><td class="qty-td">'+s.qty+'</td>'+ 
    '<td class="money-td sum-td" style="color:'+color+'">'+moneyHtml(total)+'</td></tr>';
  }).join('');
  var eqRows=equipment.map(function(s,i){var total=(parseFloat(s.price)||0)*(parseFloat(s.qty)||1);
    return'<tr style="background:'+(i%2===0?'#fff':'#f8fafc')+'">'+
    '<td class="num-td">'+(i+1)+'</td><td class="name-td"><span class="clip-name">'+esc(s.name)+'</span></td>'+ 
    '<td class="money-td">'+moneyHtml(s.price)+'</td><td class="unit-td">'+esc(normalizeUnit(s.unit))+'</td><td class="qty-td">'+s.qty+'</td>'+ 
    '<td class="money-td sum-td" style="color:'+color+'">'+moneyHtml(total)+'</td></tr>';
  }).join('');
  var pdfTableHead='<table><colgroup><col style="width:22px"><col><col style="width:78px"><col style="width:34px"><col style="width:28px"><col style="width:102px"></colgroup><thead><tr><th>#</th><th>Наименование</th><th>Цена</th><th>Ед.</th><th>Кол.</th><th>Сумма</th></tr></thead><tbody>';
  var pdfTableEnd='</tbody></table>';
  var hasPdfEquipment = equipment.length > 0;
  var hasPdfWorks = services.length > 0;
  var usePdfStageLabels = extraStages.length > 0;
  var pdfSections = '';
  if(hasPdfEquipment) pdfSections += '<div class="sec-title">Оборудование</div>'+pdfTableHead+eqRows+pdfTableEnd;
  if(hasPdfWorks){var pwl=usePdfStageLabels?'Этап 1':(hasPdfEquipment?'Работы':'');pdfSections+=(pwl?'<div class="sec-title">'+pwl+'</div>':'')+pdfTableHead+sRows+pdfTableEnd;}
  extraStages.forEach(function(stage,si){if(!stage.items.length)return;var stLabel='Этап '+(si+2)+(stage.title?' — '+stage.title:'');var stRows=stage.items.map(function(s,i){var total=(parseFloat(s.price)||0)*(parseFloat(s.qty)||1);return'<tr style="background:'+(i%2===0?'#fff':'#f8fafc')+'"><td class="num-td">'+(i+1)+'</td><td class="name-td"><span class="clip-name">'+esc(s.name)+'</span></td><td class="money-td">'+moneyHtml(s.price)+'</td><td class="unit-td">'+esc(normalizeUnit(s.unit))+'</td><td class="qty-td">'+s.qty+'</td><td class="money-td sum-td" style="color:'+color+'">'+moneyHtml(total)+'</td></tr>';}).join('');pdfSections+='<div class="sec-title">'+stLabel+'</div>'+pdfTableHead+stRows+pdfTableEnd;});
  if(!hasPdfEquipment&&!hasPdfWorks&&!extraStages.some(function(s){return s.items.length>0;})) pdfSections = '<div style="padding:14px;border:1px solid #eee;border-radius:8px;color:#777">Позиции не добавлены</div>';
  var logoH=logoDataURL?'<img src="'+logoDataURL+'" style="max-height:50px;max-width:140px;object-fit:contain;display:block;margin-bottom:4px">':'';
  var masterH='';
  if(settings.company)masterH+='<div style="font-size:15px;font-weight:800;color:#111;margin-bottom:2px;word-break:normal;overflow-wrap:normal;white-space:normal;hyphens:none;word-break:keep-all;max-width:100%;overflow:hidden">'+esc(settings.company)+'</div>';
  var ct=[getPhoneWithDialCode('s-phone')||settings.phone,settings.email].filter(Boolean).join(' · ');if(ct)masterH+='<div style="font-size:11px;color:#555;word-break:normal;overflow-wrap:normal;white-space:normal;hyphens:none;word-break:keep-all;max-width:100%;overflow:hidden">'+ct+'</div>';
  var dt=[settings.city,settings.inn?'ИНН '+settings.inn:''].filter(Boolean).join(' · ');if(dt)masterH+='<div style="font-size:10px;color:#888;word-break:normal;overflow-wrap:normal;white-space:normal;hyphens:none;word-break:keep-all;max-width:100%;overflow:hidden">'+dt+'</div>';
  var discH=t.discount>0?'<tr><td style="color:#444">Скидка:</td><td class="money-td" style="color:#c00">−'+moneyHtml(t.discount)+'</td></tr>':'';
  var prepayH=t.prepay>0?'<tr><td style="color:#059669">Предоплата:</td><td class="money-td" style="color:#059669">−'+moneyHtml(t.prepay)+'</td></tr>':'';
  var photosH='';
  if(quotePhotos.length){photosH='<div style="margin-top:18px;padding-top:12px;border-top:2px solid '+color+'"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:'+color+';margin-bottom:8px">Фото оборудования</div><div style="display:grid;grid-template-columns:repeat('+Math.min(quotePhotos.length,3)+',1fr);gap:6px">'+quotePhotos.map(function(p){return'<img src="'+p.dataURL+'" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:4px;border:1px solid #ddd">';}).join('')+'</div></div>';}
  var footer=[settings.requisites,settings.inn?'ИНН '+settings.inn:'',settings.city].filter(Boolean).join(' · ');
  var pdfTitle='КП_'+safeFileName(c.name||'Клиент')+'_'+num;
  var html='<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no"><title>'+esc(pdfTitle)+'</title>'+
    '<style>'+
    '*{box-sizing:border-box;margin:0;padding:0}'+
    'html,body{width:100%;max-width:100%;overflow-x:hidden;background:#fff}'+
    'body{font-family:-apple-system,Helvetica,Arial,sans-serif;font-size:12px;color:#222;padding:14px;word-break:break-word;overflow-wrap:anywhere}'+
    'body *{max-width:100%;box-sizing:border-box;overflow-wrap:anywhere;word-break:break-word}'+
    '.hdr{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding-bottom:12px;border-bottom:3px solid '+color+';margin-bottom:14px;overflow:hidden}'+'.hdr>div:first-child{min-width:0;max-width:58%;overflow:hidden;word-break:normal;overflow-wrap:normal;white-space:normal}'+'.hdr>div:last-child{flex:0 0 170px;max-width:170px;min-width:150px;text-align:right;word-break:normal;overflow-wrap:normal}'+
    '.hdr>div{min-width:0;word-break:normal;overflow-wrap:normal}'+
    '.kpt{text-align:right;font-size:15px;font-weight:900;color:'+color+';line-height:1.15;white-space:normal;word-break:normal;overflow-wrap:normal;hyphens:none;word-break:keep-all}'+
    '.cb{background:#f8fafc;border-radius:6px;padding:10px 12px;margin-bottom:14px;overflow:hidden}'+
    '.sec-title{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:'+color+';margin:10px 0 6px}'+
    '.cg{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:6px 12px;font-size:10.5px}'+
    '.cg>div{min-width:0;white-space:normal;overflow-wrap:anywhere;word-break:break-word}'+
    'table{width:100%;max-width:100%;border-collapse:collapse;margin-bottom:10px;table-layout:fixed;overflow:hidden}'+
    'thead tr{background:'+color+'}thead th{padding:7px 5px;color:#fff;font-size:9px;text-align:left;white-space:normal;overflow:hidden;vertical-align:middle;line-height:1.15}'+
    'thead th:nth-child(1){width:22px;text-align:center}'+
    'thead th:nth-child(2){width:auto}'+
    'thead th:nth-child(3){text-align:right;width:78px}'+
    'thead th:nth-child(4){text-align:center;width:34px;vertical-align:middle;white-space:nowrap;word-break:normal;overflow-wrap:normal}'+
    'thead th:nth-child(5){text-align:center;width:28px;vertical-align:middle;white-space:nowrap;word-break:normal;overflow-wrap:normal}thead th:nth-child(6){text-align:right;width:108px}'+
    'tbody td{padding:6px 5px;border-bottom:1px solid #eee;font-size:10.5px;white-space:normal;overflow:visible;text-overflow:clip;vertical-align:top}'+
    '.num-td{text-align:center!important;color:#888;width:22px!important}'+
    '.name-td{word-break:break-word;overflow-wrap:anywhere}'+
    '.clip-name{display:block;line-height:1.25;white-space:normal;overflow:visible}'+
    '.unit-td,.qty-td{text-align:center!important;font-size:10px;white-space:nowrap!important;word-break:normal!important;overflow-wrap:normal!important}'+
    '.money-td{text-align:right!important;font-weight:700;white-space:nowrap!important;word-break:normal!important;overflow-wrap:normal!important;overflow:hidden!important}'+
    '.money-nowrap{display:inline-block;max-width:100%;white-space:nowrap!important;word-break:normal!important;overflow-wrap:normal!important;line-height:1.05;font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.35px}'+
    '.tot{display:flex;justify-content:flex-end;margin-bottom:12px;width:100%;overflow:hidden}.tot table{width:100%;max-width:330px;min-width:0;table-layout:fixed}'+
    '.tot td{padding:4px 0;font-size:11px;white-space:nowrap!important;word-break:normal!important;overflow-wrap:normal!important;overflow:hidden}.tot td:first-child{width:110px}.tot td:last-child{text-align:right;padding-left:10px;width:220px}'+
    '.grand td{font-size:14px;font-weight:900;color:'+color+';border-top:2px solid '+color+';padding-top:8px}'+
    'a{color:inherit;text-decoration:none}'+
    '.ftr{margin-top:18px;padding-top:10px;border-top:1px solid #ddd;display:flex;justify-content:space-between;gap:10px;font-size:9px;color:#aaa;overflow:hidden}.ftr>div{min-width:0}'+
    '.pbtn{display:block;width:100%;padding:14px;margin-bottom:14px;background:'+color+';color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer}'+
    '@media(max-width:520px){body{padding:10px;font-size:10.5px}.hdr{gap:8px}.hdr>div:first-child{max-width:55%}.hdr>div:last-child{flex:0 0 148px;max-width:148px;min-width:148px}.kpt{font-size:12px;word-break:normal;overflow-wrap:normal;hyphens:none;word-break:keep-all}.cg{grid-template-columns:minmax(0,1fr);font-size:10px}thead th{font-size:8.5px;padding:6px 3px}tbody td{font-size:9.5px;padding:5px 3px}thead th:nth-child(3){width:72px}thead th:nth-child(4){width:32px}thead th:nth-child(5){width:26px}thead th:nth-child(6){width:98px}.money-nowrap{letter-spacing:-.45px}.tot table{max-width:210px}.grand td{font-size:13px}}'+
    '@media print{.pbtn{display:none}@page{size:A4;margin:0}html,body{background:#fff;margin:0!important;padding:0!important;overflow:visible}body::before,body::after{display:none!important}.print-sheet{padding:12mm 14mm}}'+
    '</style></head><body>'+
    '<button class="pbtn" onclick="window.print()">💾 Сохранить как PDF</button><div class="print-sheet">'+
    '<div class="hdr"><div>'+logoH+masterH+'</div>'+
    '<div><div class="kpt">КОММЕРЧЕСКОЕ<br/>ПРЕДЛОЖЕНИЕ</div><div style="font-size:10px;color:#888;text-align:right;margin-top:4px">№ '+num+' от '+today+'</div></div></div>'+
    '<div class="cb"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#999;font-weight:700;margin-bottom:6px">Клиент</div>'+
    '<div class="cg"><div><b>ФИО:</b> '+esc(c.name)+'</div><div><b>Тел:</b> '+esc(c.phone)+'</div>'+
    (c.email?'<div><b>Email:</b> '+esc(c.email)+'</div>':'<div></div>')+
    (c.city?'<div><b>Город:</b> '+esc(c.city)+'</div>':'<div></div>')+
    (c.addr?'<div style="grid-column:1/-1"><b>Адрес:</b> '+esc(c.addr)+'</div>':'')+
    '</div></div>'+
    pdfSections+
    '<div class="tot"><table>'+
    (t.equipmentSubtotal>0?'<tr><td style="color:#444">Оборудование:</td><td class="money-td">'+moneyHtml(t.equipmentSubtotal)+'</td></tr>':'')+
    (function(){if(!extraStages.length)return'';var s1s=services.reduce(function(s,x){return s+(parseFloat(x.price)||0)*(parseFloat(x.qty)||1);},0);var r='<tr><td style="color:#444">Этап 1:</td><td class="money-td">'+moneyHtml(s1s)+'</td></tr>';extraStages.forEach(function(stage,si){var ss=stage.items.reduce(function(s,x){return s+(parseFloat(x.price)||0)*(parseFloat(x.qty)||1);},0);r+='<tr><td style="color:#444">Этап '+(si+2)+(stage.title?' — '+stage.title:'')+':</td><td class="money-td">'+moneyHtml(ss)+'</td></tr>';});return r;})()+
    (t.worksSubtotal>0&&(t.equipmentSubtotal>0||extraStages.length>0)?'<tr><td style="color:#444">'+(extraStages.length>0?'Работы итого:':'Работы:')+'</td><td class="money-td">'+moneyHtml(t.worksSubtotal)+'</td></tr>':'')+
    '<tr><td style="color:#444">Итого:</td><td class="money-td">'+moneyHtml(t.subtotal)+'</td></tr>'+discH+prepayH+'<tr class="grand"><td>К ОПЛАТЕ:</td><td class="money-td">'+moneyHtml(t.grand,'grand-money')+'</td></tr></table></div>'+
    (c.notes?'<div style="background:#fffbf0;border-left:3px solid #f0a020;padding:8px 12px;border-radius:3px;margin-top:10px;font-size:11px;overflow-wrap:anywhere;word-break:break-word;white-space:normal;max-width:100%;overflow:hidden"><b>Примечание:</b> '+esc(c.notes)+'</div>':'')+
    (settings.warranty?'<div style="background:#f0f8ff;border-left:3px solid '+color+';padding:8px 12px;border-radius:3px;margin-top:10px;font-size:11px;color:#445;overflow-wrap:anywhere;word-break:break-word;white-space:normal">'+esc(settings.warranty)+'</div>':'')+
    photosH+
    '<div class="ftr"><div>'+footer+'</div><div>'+esc(settings.signature||'')+'</div></div></div>'+
    '</body></html>';
  var w=window.open('','_blank');
  if(w){w.document.write(html);w.document.close();try{w.document.title=pdfTitle;}catch(e){}}
  else toast('Разрешите всплывающие окна','error');
}

async function saveToHistory(){
  if(!isLoggedIn()){showPublicLanding();toast('Введите ключ доступа','error');return;}

  if(!validateClient()){nextStep(1);return;}
  var c=getClientData(),t=getTotals(),num=generateQuoteNumber();
  var entry={num:num,date:new Date().toLocaleDateString('ru-RU'),clientName:c.name,clientPhone:c.phone,total:t.grand,servicesCount:services.length,services:JSON.parse(JSON.stringify(services)),equipment:JSON.parse(JSON.stringify(equipment)),extraStages:JSON.parse(JSON.stringify(extraStages)),client:Object.assign({},c),discount:{val:parseFloat(document.getElementById('discountVal').value)||0,type:document.getElementById('discountType').value}};
  var args=Object.assign(rpcAuthParams(),{p_client_name:c.name,p_client_phone:c.phone,p_total:t.grand,p_data:entry});
  var res=await sb.rpc('kp_save_quote',args);
  if(res.error||rpcFailed(res)){toast(rpcMsg(res,'Ошибка сохранения'),'error');return;}
  entry.id=res.data.id;historyData.unshift(entry);updateHistoryBadge();toast('КП сохранено ✓','success');
}

function renderHistory(){
  var list=document.getElementById('historyList');
  if(!historyData.length){list.innerHTML='<div class="empty-state"><div class="empty-icon">📂</div><p>История пуста</p></div>';return;}
  var used=historyData.length;
  var counter=!currentKeyData.is_admin&&used?'<div style="margin-bottom:12px;font-size:12px;color:var(--text2);padding:4px 0">КП сохранено: <strong>'+used+'</strong></div>':'';
  list.innerHTML=counter+historyData.map(function(h){
    return'<div class="history-item">'+
    '<div class="history-info"><div class="history-name">'+esc(h.clientName)+'</div>'+
    '<div class="history-meta"><span>№ '+h.num+'</span><span>'+h.date+'</span><span>'+esc(h.clientPhone)+'</span><span>'+h.servicesCount+' услуг</span></div></div>'+
    '<div class="history-amount">'+fmt(h.total)+'</div>'+
    '<div class="history-actions"><button class="btn btn-ghost btn-sm" onclick="loadFromHistory('+h.id+')">✏️</button>'+
    '<button class="btn btn-danger btn-sm" onclick="deleteFromHistory('+h.id+')">✕</button></div></div>';
  }).join('');
}

function loadFromHistory(id){
  var h=historyData.find(function(x){return x.id===id;});if(!h)return;
  document.getElementById('c-name').value=h.client.name||'';
  document.getElementById('c-phone').value=stripDialCodeForInput(h.client.phone||'');
  document.getElementById('c-email').value=h.client.email||'';
  document.getElementById('c-city').value=h.client.city||'';
  document.getElementById('c-addr').value=h.client.addr||'';
  document.getElementById('c-notes').value=h.client.notes||'';
  services=JSON.parse(JSON.stringify(h.services||[]));
  equipment=JSON.parse(JSON.stringify(h.equipment||[]));
  extraStages=JSON.parse(JSON.stringify(h.extraStages||[]));
  if(h.discount){document.getElementById('discountVal').value=h.discount.val||'';document.getElementById('discountType').value=h.discount.type||'percent';}
  showPage('new',null);
  jumpStep(2);renderEquipment();renderServices();toast('КП загружено ✓','success');
}

async function deleteFromHistory(id){
  if(!confirm('Удалить КП?'))return;
  var args=Object.assign(rpcAuthParams(),{p_quote_id:id});
  var res=await sb.rpc('kp_delete_quote',args);
  if(res.error||rpcFailed(res)){toast(rpcMsg(res,'Ошибка удаления'),'error');return;}
  historyData=historyData.filter(function(x){return x.id!==id;});
  updateHistoryBadge();renderHistory();
}

function updateHistoryBadge(){
  var el=document.getElementById('histBadge');
  el.textContent=historyData.length;
  el.style.background='var(--accent)';
}

function resetForm(){
  if(!confirm('Начать новое КП?'))return;
  ['c-name','c-phone','c-email','c-city','c-addr','c-notes'].forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('discountVal').value='';
  if(document.getElementById('prepayVal'))document.getElementById('prepayVal').value='';
  services=[];equipment=[];extraStages=[];quotePhotos=[];renderPhotos();jumpStep(1);renderEquipment();renderServices();
}

async function loadAdminData(){
  if(!isLoggedIn()){showPublicLanding();toast('Введите ключ доступа','error');return;}

  var res=await sb.rpc('kp_admin_data',rpcAuthParams());
  if(res.error||rpcFailed(res)){toast(rpcMsg(res,'Ошибка загрузки'),'error');return;}
  var keys=res.data.keys||[];
  document.getElementById('statTotal').textContent=keys.filter(function(k){return!k.is_admin;}).length;
  document.getElementById('statActive').textContent=keys.filter(function(k){return k.is_active&&!k.is_admin&&daysLeft(k.expires_at)>0;}).length;
  document.getElementById('statBlocked').textContent=keys.filter(function(k){return(!k.is_active||daysLeft(k.expires_at)===0)&&!k.is_admin;}).length;
  document.getElementById('keysBody').innerHTML=keys.map(function(k){
    var dl=daysLeft(k.expires_at);
    var st;
    if(k.is_admin)st='<span class="status-badge status-admin">👑 Админ</span>';
    else if(!k.is_active)st='<span class="status-badge status-blocked">✕ Заблокирован</span>';
    else if(dl===0)st='<span class="status-badge status-blocked">⏰ Истёк</span>';
    else if(dl<=3)st='<span class="status-badge" style="background:rgba(245,158,11,.12);color:var(--warn)">⚠ '+dl+' дн.</span>';
    else st='<span class="status-badge status-active">✓ '+dl+' дн.</span>';
    var dev=k.device_id?'<span style="font-size:11px;color:var(--text3)">Привязан</span>':'<span style="font-size:11px;color:var(--success)">Свободен</span>';
    var lu=k.last_used?new Date(k.last_used).toLocaleDateString('ru-RU'):'—';
    var act='';
    if(!k.is_admin){
      act+='<input type="number" min="1" placeholder="Дней" id="d_'+k.id+'" style="width:65px;padding:4px 6px;font-size:12px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text)"> ';
      act+='<button class="btn btn-primary btn-sm" onclick="addDays('+k.id+')">+Дней</button> ';
      if(k.is_active)act+='<button class="btn btn-danger btn-sm" onclick="blockKey('+k.id+')">Блок</button> ';
      else act+='<button class="btn btn-success btn-sm" onclick="unblockKey('+k.id+')">Разблок</button> ';
      if(k.device_id)act+='<button class="btn btn-warn btn-sm" onclick="resetDevice('+k.id+')">Сброс</button> ';
      act+='<button class="btn btn-ghost btn-sm" onclick="deleteKey('+k.id+')">Удалить</button>';
    } else act+='<button class="btn btn-warn btn-sm" onclick="resetDevice('+k.id+')">Сброс устройства</button>';
    return'<tr>'+ 
      '<td><code style="font-size:12px;font-weight:700;color:var(--accent)">'+esc(k.key)+'</code></td>'+ 
      '<td>'+esc(k.master_name||'—')+'</td>'+ 
      '<td>'+st+'</td><td>'+dev+'</td>'+ 
      '<td style="color:var(--text2);font-size:12px">'+lu+'</td>'+ 
      '<td><div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center">'+act+'</div></td></tr>';
  }).join('');
}

async function addDays(id){
  var inp=document.getElementById('d_'+id);
  var days=parseInt(inp.value);
  if(!days||days<1){toast('Введите количество дней','error');return;}
  var args=Object.assign(rpcAuthParams(),{p_target_id:id,p_days:days});
  var res=await sb.rpc('kp_admin_add_days',args);
  if(res.error||rpcFailed(res)){toast(rpcMsg(res,'Ошибка'),'error');return;}
  inp.value='';toast('+'+days+' дн. ✓','success');loadAdminData();
}

async function addKey(){
  var key=document.getElementById('newKey').value.trim().toUpperCase();
  var name=document.getElementById('newName').value.trim();
  if(!key){toast('Введите ключ','error');return;}
  var args=Object.assign(rpcAuthParams(),{p_new_key:key,p_master_name:name||'Мастер'});
  var res=await sb.rpc('kp_admin_add_key',args);
  if(res.error||rpcFailed(res)){toast(rpcMsg(res,'Ошибка: ключ уже существует?'),'error');return;}
  document.getElementById('newKey').value='';
  document.getElementById('newName').value='';
  toast('Ключ добавлен ✓','success');
  loadAdminData();
}

function genKey(){
  var chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var part=function(len){var s='';for(var i=0;i<len;i++)s+=chars[Math.floor(Math.random()*chars.length)];return s;};
  document.getElementById('newKey').value='KLIM-'+part(4)+'-'+part(6);
}

async function blockKey(id){
  if(!confirm('Заблокировать ключ?'))return;
  var args=Object.assign(rpcAuthParams(),{p_target_id:id,p_is_active:false});
  var res=await sb.rpc('kp_admin_set_active',args);
  if(res.error||rpcFailed(res)){toast(rpcMsg(res,'Ошибка'),'error');return;}
  toast('Заблокирован','success');loadAdminData();
}

async function unblockKey(id){
  var args=Object.assign(rpcAuthParams(),{p_target_id:id,p_is_active:true});
  var res=await sb.rpc('kp_admin_set_active',args);
  if(res.error||rpcFailed(res)){toast(rpcMsg(res,'Ошибка'),'error');return;}
  toast('Разблокирован','success');loadAdminData();
}

async function resetDevice(id){
  if(!confirm('Сбросить привязку устройства? Мастер сможет войти с нового устройства.'))return;
  var args=Object.assign(rpcAuthParams(),{p_target_id:id});
  var res=await sb.rpc('kp_admin_reset_device',args);
  if(res.error||rpcFailed(res)){toast(rpcMsg(res,'Ошибка'),'error');return;}
  toast('Устройство сброшено ✓','success');loadAdminData();
}

async function deleteKey(id){
  if(!confirm('Удалить ключ навсегда?'))return;
  var args=Object.assign(rpcAuthParams(),{p_target_id:id});
  var res=await sb.rpc('kp_admin_delete_key',args);
  if(res.error||rpcFailed(res)){toast(rpcMsg(res,'Ошибка'),'error');return;}
  toast('Ключ удалён','success');loadAdminData();
}

function normalizeLineItems(){
  services=(Array.isArray(services)?services:[]).map(function(x){return {name:String((x&&x.name)||'').slice(0,120),price:clampMoneyValue(x&&x.price),qty:clampQtyValue(x&&x.qty),unit:normalizeUnit(x&&x.unit),locked:!!(x&&x.locked)};});
  equipment=(Array.isArray(equipment)?equipment:[]).map(function(x){return {name:String((x&&x.name)||'').slice(0,140),price:clampMoneyValue(x&&x.price),qty:clampQtyValue(x&&x.qty),unit:normalizeUnit(x&&x.unit),locked:!!(x&&x.locked)};});
  extraStages=(Array.isArray(extraStages)?extraStages:[]).map(function(st){return{title:String((st&&st.title)||'').slice(0,60),items:(Array.isArray(st&&st.items)?st.items:[]).map(function(x){return{name:String((x&&x.name)||'').slice(0,120),price:clampMoneyValue(x&&x.price),qty:clampQtyValue(x&&x.qty),unit:normalizeUnit(x&&x.unit),locked:!!(x&&x.locked)};})};});
}
function getClientData(){return{name:document.getElementById('c-name').value.trim(),phone:getPhoneWithDialCode('c-phone'),email:document.getElementById('c-email').value.trim(),city:document.getElementById('c-city').value.trim(),addr:document.getElementById('c-addr').value.trim(),notes:document.getElementById('c-notes').value.trim()};}
function getTotals(){normalizeLineItems();var worksSub=services.reduce(function(s,x){return s+clampMoneyValue(x.price)*clampQtyValue(x.qty);},0);extraStages.forEach(function(stage){stage.items.forEach(function(x){worksSub+=clampMoneyValue(x.price)*clampQtyValue(x.qty);});});var equipmentSub=equipment.reduce(function(s,x){return s+clampMoneyValue(x.price)*clampQtyValue(x.qty);},0);var sub=worksSub+equipmentSub;var dv=clampMoneyValue(document.getElementById('discountVal').value)||0;var dt=document.getElementById('discountType').value;var disc=dv>0?(dt==='percent'?sub*Math.min(dv,100)/100:Math.min(dv,sub)):0;var prepay=Math.min(clampMoneyValue(document.getElementById('prepayVal')?document.getElementById('prepayVal').value:0)||0,sub);return{worksSubtotal:worksSub,equipmentSubtotal:equipmentSub,subtotal:sub,discount:disc,prepay:prepay,grand:Math.max(0,sub-disc-prepay)};}
var MONEY_LIMIT=99999999;
var QTY_LIMIT=9999;
var MONEY_DIGITS=8;
var QTY_DIGITS=4;
function digitsToLimitedNumber(v,digits,fallback){
  var raw=String(v||'').replace(/[^0-9]/g,'');
  if(raw.length>digits)raw=raw.slice(0,digits);
  if(raw.length>1)raw=raw.replace(/^0+(?=\d)/,'');
  if(raw==='')return fallback||0;
  var n=parseInt(raw,10);
  return isFinite(n)?n:(fallback||0);
}
function clampMoneyValue(v){
  return digitsToLimitedNumber(v,MONEY_DIGITS,0);
}
function clampQtyValue(v){
  var n=digitsToLimitedNumber(v,QTY_DIGITS,1);
  return n<1?1:n;
}
function projectedNumericValue(el,e){
  var value=String(el.value||'');
  var start=typeof el.selectionStart==='number'?el.selectionStart:value.length;
  var end=typeof el.selectionEnd==='number'?el.selectionEnd:value.length;
  var data=e&&typeof e.data==='string'?e.data:'';
  return (value.slice(0,start)+data+value.slice(end)).replace(/[^0-9]/g,'');
}
function limitNumericBeforeInput(e,el,digits){
  if(!e||!el)return true;
  if(e.inputType&&e.inputType.indexOf('delete')===0)return true;
  if(typeof e.data==='string' && e.data!=='' && /\D/.test(e.data)){e.preventDefault();return false;}
  var next=projectedNumericValue(el,e);
  if(next.length>digits){e.preventDefault();return false;}
  return true;
}
function keepIntegerDigits(el,digits){
  if(!el)return;
  var raw=String(el.value||'').replace(/[^0-9]/g,'');
  if(raw.length>digits)raw=raw.slice(0,digits);
  if(raw.length>1)raw=raw.replace(/^0+(?=\d)/,'');
  el.value=raw;
}
function clampMoneyInput(el){
  keepIntegerDigits(el,MONEY_DIGITS);
}
function clampQtyInput(el){
  keepIntegerDigits(el,QTY_DIGITS);
}
function fmt(n){var v=Math.round(Number(n)||0);return v.toLocaleString('ru-RU')+' ₽';}
function moneyFontByText(txt){
  var len=String(txt||'').length;
  if(len>18)return 8.8;
  if(len>15)return 9.2;
  if(len>12)return 9.8;
  return 10.5;
}
function moneyHtml(n,cls){
  var txt=fmt(n);
  var safe=esc(txt).replace(/ /g,'&nbsp;');
  return '<span class="money-nowrap '+(cls||'')+'" title="'+esc(txt)+'" style="font-size:'+moneyFontByText(txt)+'px">'+safe+'</span>';
}
function appMoneyHtml(n){
  var txt=fmt(n);
  var safe=esc(txt).replace(/ /g,'&nbsp;');
  var fs=moneyFontByText(txt);
  if(fs<9)fs=9;
  return '<span class="app-money-nowrap" title="'+esc(txt)+'" style="font-size:'+fs+'px">'+safe+'</span>';
}
function safeFileName(s){
  return String(s||'').trim()
    .replace(/[\\/:*?"<>|]+/g,' ')
    .replace(/\s+/g,'_')
    .replace(/^_+|_+$/g,'') || 'Клиент';
}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function generateQuoteNumber(){var d=new Date();return d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'-'+pad(d.getHours())+pad(d.getMinutes());}
function pad(n){return String(n).padStart(2,'0');}
var toastTimer;
function toast(msg,type){var el=document.getElementById('toast');el.textContent=msg;el.className='show '+(type||'success');clearTimeout(toastTimer);toastTimer=setTimeout(function(){el.classList.remove('show');},3000);}

// ── КОНТАКТЫ ─────────────────────────────────────────────────

function renderContacts(query){
  var tbody=document.getElementById('contactsTbody');
  var emptyRow=document.getElementById('contactsEmptyRow');
  var badge=document.getElementById('contactsBadge');
  if(!tbody)return;

  var q=(query||'').toLowerCase().trim();
  var list=q?contactsData.filter(function(c){
    return (c.name||'').toLowerCase().indexOf(q)>-1||
           (c.phone||'').toLowerCase().indexOf(q)>-1||
           (c.email||'').toLowerCase().indexOf(q)>-1||
           (c.address||'').toLowerCase().indexOf(q)>-1;
  }):contactsData;

  var n=contactsData.length;
  if(badge)badge.textContent=n+' '+(n===1?'клиент':(n>=2&&n<=4?'клиента':'клиентов'));

  Array.from(tbody.querySelectorAll('tr.contact-row')).forEach(function(r){r.remove();});

  if(!list.length){
    if(emptyRow){
      emptyRow.style.display='';
      var hint=emptyRow.querySelector('span:last-child');
      if(hint)hint.textContent=q?'Ничего не найдено':'Нажмите «Добавить клиента» чтобы начать';
    }
    return;
  }
  if(emptyRow)emptyRow.style.display='none';

  var kpCountMap={};
  contactsData.forEach(function(c){
    kpCountMap[c.id]=historyData.filter(function(h){return linkedToContact(h,c);}).length;
  });

  list.forEach(function(c){
    var tr=document.createElement('tr');
    tr.className='contact-row';
    var kpCnt=kpCountMap[c.id]||0;
    var kpBadge=kpCnt?'<span class="contact-kp-badge" onclick="openContactKpModal('+c.id+')" title="Связанные КП">'+kpCnt+' КП</span>':'';
    tr.innerHTML=
      '<td><span class="contact-name">'+esc(c.name)+'</span>'+kpBadge+'</td>'+
      '<td>'+(c.phone?'<a href="tel:'+esc(c.phone)+'" class="contact-link">'+esc(c.phone)+'</a>':'<span class="contact-empty">—</span>')+'</td>'+
      '<td>'+(c.email?'<a href="mailto:'+esc(c.email)+'" class="contact-link">'+esc(c.email)+'</a>':'<span class="contact-empty">—</span>')+'</td>'+
      '<td><span class="contact-addr">'+(c.address?esc(c.address):'<span class="contact-empty">—</span>')+'</span></td>'+
      '<td class="contact-actions">'+
        '<button class="btn btn-ghost btn-sm" title="Создать КП" onclick="newKpFromContact('+c.id+')">'+
          '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5L9 1z"/><polyline points="9 1 9 5 13 5"/><line x1="5" y1="9" x2="11" y2="9"/></svg>'+
          ' КП'+
        '</button>'+
        '<button class="btn btn-ghost btn-sm" title="Редактировать" onclick="openContactModal('+c.id+')">'+
          '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>'+
        '</button>'+
        '<button class="btn btn-ghost btn-sm contact-delete-btn" title="Удалить" onclick="deleteContact('+c.id+')">'+
          '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2 4 14 4"/><path d="M5 4V2h6v2"/><path d="M3 4l1 10a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-10"/></svg>'+
        '</button>'+
      '</td>';
    tbody.appendChild(tr);
  });
}

function linkedToContact(h,c){
  var hn=(h.clientName||h.client&&h.client.name||'').toLowerCase().trim();
  var hp=(h.clientPhone||h.client&&h.client.phone||'').replace(/\D/g,'');
  var cn=(c.name||'').toLowerCase().trim();
  var cp=(c.phone||'').replace(/\D/g,'');
  if(cn&&hn===cn)return true;
  if(cp&&hp&&hp===cp)return true;
  return false;
}

function filterContacts(q){renderContacts(q);}

function openContactModal(idArg){
  var id=typeof idArg==='number'?idArg:null;
  var modal=document.getElementById('contactModal');
  var title=document.getElementById('contactModalTitle');
  document.getElementById('contactId').value=id||'';
  var c=id?contactsData.find(function(x){return x.id===id;}):null;
  if(title)title.textContent=c?'Редактировать клиента':'Новый клиент';
  document.getElementById('c-contact-name').value=c?c.name:'';
  document.getElementById('c-contact-phone').value=c?c.phone:'';
  document.getElementById('c-contact-email').value=c?c.email:'';
  document.getElementById('c-contact-address').value=c?c.address:'';
  document.getElementById('c-contact-notes').value=c?c.notes:'';
  modal.style.display='flex';
  setTimeout(function(){document.getElementById('c-contact-name').focus();},50);
}

function closeContactModal(){
  document.getElementById('contactModal').style.display='none';
}

async function saveContact(){
  var name=document.getElementById('c-contact-name').value.trim();
  if(!name){toast('Введите ФИО клиента','error');return;}
  var cid=parseInt(document.getElementById('contactId').value)||0;
  var data={
    name:name,
    phone:document.getElementById('c-contact-phone').value.trim(),
    email:document.getElementById('c-contact-email').value.trim(),
    address:document.getElementById('c-contact-address').value.trim(),
    notes:document.getElementById('c-contact-notes').value.trim()
  };
  var args=Object.assign(rpcAuthParams(),{p_contact_id:cid||null,p_data:data});
  var res=await sb.rpc('kp_save_contact',args);
  if(res.error||rpcFailed(res)){toast(rpcMsg(res,'Ошибка сохранения'),'error');return;}
  var newId=res.data.id;
  if(cid){
    var idx=contactsData.findIndex(function(x){return x.id===cid;});
    if(idx>-1)contactsData[idx]=Object.assign({id:cid},data);
  }else{
    contactsData.unshift(Object.assign({id:newId,created_at:new Date().toISOString()},data));
  }
  closeContactModal();
  renderContacts(document.getElementById('contactsSearch').value);
  toast(cid?'Клиент обновлён':'Клиент добавлен','success');
}

async function deleteContact(id){
  if(!confirm('Удалить этого клиента? Связанные КП не удаляются.'))return;
  var args=Object.assign(rpcAuthParams(),{p_contact_id:id});
  var res=await sb.rpc('kp_delete_contact',args);
  if(res.error||rpcFailed(res)){toast(rpcMsg(res,'Ошибка удаления'),'error');return;}
  contactsData=contactsData.filter(function(c){return c.id!==id;});
  renderContacts(document.getElementById('contactsSearch').value);
  toast('Клиент удалён','success');
}

function openContactKpModal(contactId){
  var c=contactsData.find(function(x){return x.id===contactId;});
  if(!c)return;
  var modal=document.getElementById('contactKpModal');
  var title=document.getElementById('contactKpTitle');
  var list=document.getElementById('contactKpList');
  if(title)title.textContent='КП клиента: '+c.name;
  var linked=historyData.filter(function(h){return linkedToContact(h,c);});
  if(!linked.length){
    list.innerHTML='<div style="color:var(--text3);font-size:14px;padding:12px 0;text-align:center">Нет сохранённых КП для этого клиента</div>';
  }else{
    list.innerHTML=linked.map(function(h){
      return '<div class="contact-kp-item" onclick="openKpFromContact(\''+esc(String(h.id||''))+'\')" style="cursor:pointer">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px">'+
          '<div>'+
            '<div style="font-weight:600;font-size:14px">'+esc(h.clientName||h.num||'КП')+'</div>'+
            '<div style="font-size:12px;color:var(--text3);margin-top:2px">'+esc(h.date||'')+(h.num?' &nbsp;·&nbsp; №'+esc(h.num):'')+'</div>'+
          '</div>'+
          '<div style="font-weight:700;font-size:14px;white-space:nowrap">'+fmt(h.total||0)+' ₽</div>'+
        '</div>'+
      '</div>';
    }).join('');
  }
  modal.style.display='flex';
}

function openKpFromContact(id){
  closeContactKpModal();
  var idx=historyData.findIndex(function(h){return String(h.id)===String(id);});
  if(idx>-1){
    var bnav=document.getElementById('bnav-history');
    if(typeof showPage==='function')showPage('history',bnav||null);
    setTimeout(function(){
      var el=document.getElementById('historyList');
      if(el){var item=el.querySelectorAll('.history-item')[idx];if(item)item.scrollIntoView({behavior:'smooth',block:'center'});}
    },150);
  }
}

function closeContactKpModal(){
  document.getElementById('contactKpModal').style.display='none';
}

function newKpFromContact(id){
  var c=contactsData.find(function(x){return x.id===id;});
  if(!c)return;
  var bnav=document.getElementById('bnav-new');
  if(typeof showPage==='function')showPage('new',bnav||null);
  if(typeof resetForm==='function')resetForm();
  setTimeout(function(){
    var fn=document.getElementById('c-name');
    var fp=document.getElementById('c-phone');
    var fe=document.getElementById('c-email');
    var fa=document.getElementById('c-address');
    if(fn)fn.value=c.name||'';
    if(fp){fp.value=c.phone||'';reformatPhoneField('c-phone');}
    if(fe)fe.value=c.email||'';
    if(fa)fa.value=c.address||'';
  },50);
}

function openContactModalFromQuote(){
  openContactModal(null);
  setTimeout(function(){
    var name=document.getElementById('c-name');
    var phone=document.getElementById('c-phone');
    var email=document.getElementById('c-email');
    var addr=document.getElementById('c-addr');
    if(name)document.getElementById('c-contact-name').value=name.value.trim();
    if(phone){document.getElementById('c-contact-phone').value=phone.value.trim();reformatPhoneField('c-contact-phone');}
    if(email)document.getElementById('c-contact-email').value=email.value.trim();
    if(addr)document.getElementById('c-contact-address').value=addr.value.trim();
  },60);
}

function exportContacts(){
  if(!contactsData.length){toast('Нет контактов для экспорта','error');return;}
  var rows=[['ФИО','Телефон','Email','Адрес','Заметки']];
  contactsData.forEach(function(c){
    rows.push([c.name||'',c.phone||'',c.email||'',c.address||'',c.notes||'']);
  });
  var csv=rows.map(function(r){
    return r.map(function(v){return'"'+String(v).replace(/"/g,'""')+'"';}).join(',');
  }).join('\r\n');
  var blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='контакты.csv';
  a.click();
}


// ── DRAG-AND-DROP REORDER ────────────────────────────────────
function drgStart(e,arr,si,idx){_drgSrc={arr:arr,si:si,idx:idx};e.dataTransfer.effectAllowed='move';}
function drgOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';e.currentTarget.classList.add('drag-over');}
function drgLeave(e){e.currentTarget.classList.remove('drag-over');}
function drgEnd(e){_drgSrc=null;document.querySelectorAll('.drag-over').forEach(function(el){el.classList.remove('drag-over');});}
function drgDrop(e,arr,si,idx){
  e.preventDefault();e.currentTarget.classList.remove('drag-over');
  if(!_drgSrc||_drgSrc.arr!==arr||_drgSrc.si!==si||_drgSrc.idx===idx)return;
  var a=_drgArr(arr,si);
  var item=a.splice(_drgSrc.idx,1)[0];
  a.splice(_drgSrc.idx<idx?idx-1:idx,0,item);
  _drgSrc=null;_drgRerender(arr);
}
function _drgArr(arr,si){
  if(arr==='services')return services;
  if(arr==='equipment')return equipment;
  if(arr==='priceItems')return priceItems;
  if(arr==='equipmentItems')return equipmentItems;
  if(arr==='stage')return extraStages[si].items;
  return[];
}
function _drgRerender(arr){
  if(arr==='services')renderServices();
  else if(arr==='equipment')renderEquipment();
  else if(arr==='priceItems')renderPriceList();
  else if(arr==='equipmentItems')renderEquipmentList();
  else renderExtraStages();
}

// ── PHONE MASKING ─────────────────────────────────────────────
var PHONE_MASKS={
  ru:'(###) ###-##-##',kz:'(###) ###-##-##',
  by:'(##) ###-##-##', ua:'(##) ###-##-##',
  us:'(###) ###-####', ca:'(###) ###-####',
  gb:'#### ######',    de:'### #######',
  fr:'# ## ## ## ##',  it:'### #### ###',
  es:'### ## ## ##',   pl:'## ### ## ##',
  tr:'### ### ## ##',  az:'## ### ## ##',
  ge:'## ### ####',    am:'## ### ###',
  _: '### ### ####'
};
var phoneItiMap={};

function _pmaxd(m){return (m.match(/#/g)||[]).length;}

function _pmask(digs,m){
  var r='',di=0;
  for(var i=0;i<m.length;i++){
    if(di>=digs.length)break;
    if(m[i]==='#'){r+=digs[di++];}else{r+=m[i];}
  }
  return r;
}

// Count digits in str before position pos
function _pdigbefore(str,pos){return str.slice(0,pos).replace(/\D/g,'').length;}

// Position in formatted string after n-th digit (1-based)
function _pposafter(fmt,n){
  if(n<=0)return 0;
  var c=0;
  for(var i=0;i<fmt.length;i++){if(/\d/.test(fmt[i])&&++c===n)return i+1;}
  return fmt.length;
}

function reformatPhoneField(id){
  var inp=document.getElementById(id);
  if(!inp)return;
  var iti=phoneItiMap[id];
  var mask=iti?PHONE_MASKS[(iti.getSelectedCountryData()||{}).iso2]||PHONE_MASKS._:PHONE_MASKS._;
  var d=inp.value.replace(/\D/g,'').slice(0,_pmaxd(mask));
  inp.value=_pmask(d,mask);
}
function getPhoneWithDialCode(id){
  var inp=document.getElementById(id);
  if(!inp)return'';
  var v=inp.value.trim();
  if(!v)return'';
  var iti=phoneItiMap[id];
  if(!iti)return v;
  var dc=(iti.getSelectedCountryData()||{}).dialCode||'';
  return dc?'+'+dc+' '+v:v;
}
function stripDialCodeForInput(phone){
  if(!phone)return'';
  return phone.replace(/^\+\d+\s/,'');
}

function initPhoneMask(id){
  if(!window.intlTelInput)return;
  var inp=document.getElementById(id);
  if(!inp||inp._phInit)return;
  inp._phInit=true;

  var iti=window.intlTelInput(inp,{
    initialCountry:'ru',
    preferredCountries:['ru','by','kz','ua'],
    separateDialCode:true,
    autoPlaceholder:'off'
  });
  phoneItiMap[id]=iti;
  var mask=PHONE_MASKS.ru;

  function curMask(){return PHONE_MASKS[(iti.getSelectedCountryData()||{}).iso2]||PHONE_MASKS._;}
  function fmt(digits){return _pmask(digits.slice(0,_pmaxd(mask)),mask);}
  function digits(){return inp.value.replace(/\D/g,'');}

  inp.placeholder=mask.replace(/#/g,'0');

  inp.addEventListener('countrychange',function(){
    mask=curMask();inp.value='';
    inp.placeholder=mask.replace(/#/g,'0');
  });

  inp.addEventListener('keydown',function(e){
    var s=inp.selectionStart,end=inp.selectionEnd;
    var digs=digits(),maxd=_pmaxd(mask);
    var db=_pdigbefore(inp.value,s),de=_pdigbefore(inp.value,end);

    if(e.key==='Backspace'){
      e.preventDefault();
      var nd;
      if(s!==end){nd=digs.slice(0,db)+digs.slice(de);}
      else if(db>0){nd=digs.slice(0,db-1)+digs.slice(db);}
      else return;
      var f=fmt(nd);inp.value=f;
      var p=_pposafter(f,s!==end?db:db-1);
      inp.setSelectionRange(p,p);
      return;
    }
    if(e.key==='Delete'){
      e.preventDefault();
      var nd;
      if(s!==end){nd=digs.slice(0,db)+digs.slice(de);}
      else if(db<digs.length){nd=digs.slice(0,db)+digs.slice(db+1);}
      else return;
      var f=fmt(nd);inp.value=f;
      var p=_pposafter(f,db);
      inp.setSelectionRange(p,p);
      return;
    }
    if(['ArrowLeft','ArrowRight','Tab','Home','End'].indexOf(e.key)>-1)return;
    if(e.ctrlKey||e.metaKey)return;
    if(!/^\d$/.test(e.key)){e.preventDefault();return;}
    // digit key — handle manually so cursor is always correct
    e.preventDefault();
    if(digs.length>=maxd&&s===end)return;
    var nd=(digs.slice(0,db)+e.key+digs.slice(de)).slice(0,maxd);
    var f=fmt(nd);inp.value=f;
    var p=_pposafter(f,db+1);
    inp.setSelectionRange(p,p);
  });

  inp.addEventListener('paste',function(e){
    e.preventDefault();
    var s=inp.selectionStart,end=inp.selectionEnd;
    var digs=digits();
    var db=_pdigbefore(inp.value,s),de=_pdigbefore(inp.value,end);
    var pasted=(e.clipboardData||window.clipboardData).getData('text').replace(/\D/g,'');
    var nd=(digs.slice(0,db)+pasted+digs.slice(de)).slice(0,_pmaxd(mask));
    var f=fmt(nd);inp.value=f;
    var p=_pposafter(f,Math.min(db+pasted.length,_pmaxd(mask)));
    inp.setSelectionRange(p,p);
  });

  // fallback for mobile/IME
  inp.addEventListener('input',function(){
    var cur=inp.selectionStart;
    var db=_pdigbefore(inp.value,cur);
    var nd=digits().slice(0,_pmaxd(mask));
    var f=fmt(nd);
    if(inp.value!==f){inp.value=f;var p=_pposafter(f,db);inp.setSelectionRange(p,p);}
  });

  inp.addEventListener('focus',function(){
    var nd=digits().slice(0,_pmaxd(mask));
    inp.value=fmt(nd);
    inp.placeholder=mask.replace(/#/g,'0');
    var w=inp.closest('.iti');if(w)w.classList.add('phone-focused');
  });
  inp.addEventListener('blur',function(){
    var w=inp.closest('.iti');if(w)w.classList.remove('phone-focused');
  });
}

function initPhoneMasks(){
  ['c-phone','s-phone','schPhone','c-contact-phone'].forEach(initPhoneMask);
}
