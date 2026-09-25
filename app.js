const DB_KEY = "pena-connect-v1";
const CURRENT_USER = { id: "local-user", name: "Mi usuario", role: "commercial" };

const seed = {
  meta: { year: new Date().getFullYear(), annualGoal: 0, user: CURRENT_USER },
  clients: [],
  visits: [],
  sales: []
};

let state = loadState();
let currentView = "dashboard";

const navItems = [
  ["dashboard","⌂","Inicio"],["clients","◉","Clientes"],["visits","◷","Agenda"],["map","⌖","Mapa"],["sales","▥","Ventas"]
];

function loadState(){
  try{
    const raw = localStorage.getItem(DB_KEY);
    return raw ? {...seed, ...JSON.parse(raw)} : structuredClone(seed);
  }catch(e){ return structuredClone(seed); }
}
function save(){ localStorage.setItem(DB_KEY, JSON.stringify(state)); }
function uid(prefix){ return prefix+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7); }
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function euro(v){return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(v)||0)}
function dateES(v){if(!v)return "—"; return new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(v+"T12:00:00"))}
function pct(a,b){return b?Math.round((a/b)*100):0}
function monthLabel(i){return ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][i]}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}

function initNav(){
  document.getElementById("desktopNav").innerHTML = navItems.map(([id,icon,label])=>`<button class="nav-item ${currentView===id?"active":""}" data-view="${id}"><span>${icon}</span>${label}</button>`).join("");
  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{currentView=b.dataset.view; document.querySelector(".sidebar")?.classList.remove("open"); render();});
}
function render(){
  initNav();
  const titles={dashboard:"Inicio",clients:"Clientes",visits:"Agenda",map:"Mapa",sales:"Ventas",settings:"Configuración"};
  document.getElementById("pageTitle").textContent=titles[currentView];
  const view=document.getElementById("appView");
  if(currentView==="dashboard") view.innerHTML=dashboardView();
  if(currentView==="clients") view.innerHTML=clientsView();
  if(currentView==="visits") view.innerHTML=visitsView();
  if(currentView==="map") view.innerHTML=mapView();
  if(currentView==="sales") view.innerHTML=salesView();
  if(currentView==="settings") view.innerHTML=settingsView();
  bindView();
}
function dashboardView(){
  const y=state.meta.year, sales=state.sales.filter(s=>new Date(s.date+"T12:00:00").getFullYear()===y);
  const total=sales.reduce((a,s)=>a+Number(s.amount||0),0), margin=total?sales.reduce((a,s)=>a+Number(s.margin||0),0)/sales.length:0;
  const goal=Number(state.meta.annualGoal||0), clients=state.clients.filter(c=>c.type==="client").length, prospects=state.clients.filter(c=>c.type==="prospect").length;
  const pending=state.visits.filter(v=>v.status!=="done" && v.date>=today()).sort((a,b)=>a.date.localeCompare(b.date));
  const doneThisYear=state.visits.filter(v=>v.status==="done"&&v.date.startsWith(String(y))).length;
  const months=Array.from({length:12},(_,i)=>sales.filter(s=>new Date(s.date+"T12:00:00").getMonth()===i).reduce((a,s)=>a+Number(s.amount||0),0));
  const max=Math.max(...months,1);
  return `<div class="grid" style="gap:16px">
    <div class="grid two-col">
      <div class="card hero"><div class="muted">VENTAS ${y}</div><div class="big">${euro(total)}</div><div class="muted">Objetivo ${euro(goal)} · ${pct(total,goal)}% de cumplimiento</div><div style="margin-top:16px" class="progress"><span style="width:${Math.min(pct(total,goal),100)}%"></span></div></div>
      <div class="card"><div class="section-head"><h2>Mi día</h2><span class="hint">${dateES(today())}</span></div>${dayItems(pending.slice(0,4))}</div>
    </div>
    <div class="grid kpi-grid">
      ${kpi("Clientes",clients,"activos")}
      ${kpi("Prospectos",prospects,"en cartera")}
      ${kpi("Visitas pendientes",pending.length,"próximas")}
      ${kpi("Margen medio",margin?margin.toFixed(1)+"%":"0%","registrado en ventas")}
    </div>
    <div class="grid two-col">
      <div class="card"><div class="section-head"><h2>Evolución de ventas</h2><span class="hint">${y}</span></div><div class="chart">${months.map((v,i)=>`<div class="bar-wrap"><div class="bar" style="height:${Math.max(3,v/max*100)}%"></div><small>${monthLabel(i)}</small></div>`).join("")}</div></div>
      <div class="card"><div class="section-head"><h2>Próximas visitas</h2><button class="tiny" data-action="new-visit">+ Nueva</button></div>${dayItems(pending.slice(0,6))}</div>
    </div>
    <div class="card"><div class="section-head"><h2>Acciones rápidas</h2></div><div class="quick-grid">
      <button class="quick" data-action="new-client"><span>👤</span>Nuevo cliente</button><button class="quick" data-action="new-visit"><span>📅</span>Nueva visita</button><button class="quick" data-view="clients"><span>◉</span>Clientes</button><button class="quick" data-view="sales"><span>€</span>Ventas</button>
    </div></div>
  </div>`;
}
function kpi(label,value,sub){return `<div class="card kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`}
function dayItems(items){
  if(!items.length)return `<div class="empty"><strong>Todo al día</strong>No hay visitas pendientes.</div>`;
  return `<div class="list">${items.map(v=>`<div class="list-row"><div class="list-main"><strong>${esc(clientName(v.clientId))}</strong><small>${dateES(v.date)} ${v.time||""} · ${esc(v.reason||"Visita")}</small></div><button class="tiny" data-complete-visit="${v.id}">✓</button></div>`).join("")}</div>`;
}
function clientsView(){
  return `<div class="toolbar"><input class="search" id="clientSearch" placeholder="Buscar empresa, contacto, provincia..." /><select class="select" id="clientType"><option value="all">Todos</option><option value="client">Clientes</option><option value="prospect">Prospectos</option></select><button class="primary-btn" data-action="new-client">+ Nuevo</button></div>
  <div class="card table-card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Empresa</th><th>Contacto</th><th>Tipo</th><th>Provincia</th><th>Ventas</th><th>Última visita</th><th></th></tr></thead><tbody id="clientsBody">${clientRows()}</tbody></table></div></div>`;
}
function clientRows(){
  const q=(document.getElementById("clientSearch")?.value||"").toLowerCase(), type=document.getElementById("clientType")?.value||"all";
  const arr=state.clients.filter(c=>(type==="all"||c.type===type)&&[c.company,c.contact,c.province,c.phone].join(" ").toLowerCase().includes(q));
  if(!arr.length)return `<tr><td colspan="7"><div class="empty"><strong>No hay resultados</strong>Añade tu primer cliente o prospecto.</div></td></tr>`;
  return arr.map(c=>`<tr><td><strong>${esc(c.company)}</strong><br><small>${esc(c.phone||"")}</small></td><td>${esc(c.contact||"—")}</td><td><span class="badge ${c.type}">${c.type==="client"?"Cliente":"Prospecto"}</span></td><td>${esc(c.province||"—")}</td><td>${euro(clientSales(c.id))}</td><td>${dateES(lastVisit(c.id))}</td><td><div class="row-actions"><button class="tiny" data-edit-client="${c.id}">Editar</button><button class="tiny danger-btn" data-delete-client="${c.id}">Borrar</button></div></td></tr>`).join("");
}
function visitsView(){
  const pending=state.visits.filter(v=>v.status!=="done").sort((a,b)=>a.date.localeCompare(b.date));
  const done=state.visits.filter(v=>v.status==="done").sort((a,b)=>b.date.localeCompare(a.date));
  return `<div class="toolbar"><button class="primary-btn" data-action="new-visit">+ Nueva visita</button><div class="tabs"><button class="tab active">Pendientes ${pending.length}</button><button class="tab">Realizadas ${done.length}</button></div></div>
  <div class="grid two-col"><div class="card"><div class="section-head"><h2>Próximas visitas</h2></div>${visitList(pending)}</div><div class="card"><div class="section-head"><h2>Visitas realizadas</h2></div>${visitList(done.slice(0,12),true)}</div></div>`;
}
function visitList(arr,done=false){
  if(!arr.length)return `<div class="empty"><strong>Sin visitas</strong>Cuando crees una visita aparecerá aquí.</div>`;
  return `<div class="list">${arr.map(v=>`<div class="list-row"><div class="list-main"><strong>${esc(clientName(v.clientId))}</strong><small>${dateES(v.date)} ${v.time||""} · ${esc(v.reason||"")}</small><small>${esc(v.result||v.nextStep||"")}</small></div>${done?`<span class="badge">Realizada</span>`:`<button class="tiny" data-complete-visit="${v.id}">Marcar realizada</button>`}</div>`).join("")}</div>`;
}
function mapView(){
  const withAddr=state.clients.filter(c=>c.address||c.province);
  return `<div class="card"><div class="section-head"><h2>Mapa comercial</h2><span class="hint">V1: cartera preparada para geolocalización</span></div><div class="empty"><strong>Mapa real en la siguiente fase</strong><p>La V1 guarda dirección y provincia para que podamos añadir geocodificación, mapa y rutas sin cambiar el modelo de datos.</p><p><b>${withAddr.length}</b> registros tienen datos de localización.</p></div></div>`;
}
function salesView(){
  const y=state.meta.year, arr=state.sales.filter(s=>new Date(s.date+"T12:00:00").getFullYear()===y);
  const total=arr.reduce((a,s)=>a+Number(s.amount||0),0), goal=Number(state.meta.annualGoal||0);
  return `<div class="toolbar"><button class="primary-btn" data-action="new-sale">+ Registrar venta</button><div class="card" style="padding:9px 12px">Objetivo ${y}: <strong>${euro(goal)}</strong> · Cumplimiento <strong>${pct(total,goal)}%</strong></div></div>
  <div class="grid three-col">${kpi("Ventas del año",euro(total),String(arr.length)+" operaciones")}${kpi("Objetivo",euro(goal),"configurado")}${kpi("Margen medio",arr.length?(arr.reduce((a,s)=>a+Number(s.margin||0),0)/arr.length).toFixed(1)+"%":"0%","sobre ventas registradas")}</div>
  <div class="card table-card" style="margin-top:16px"><div class="table-wrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Cliente</th><th>Importe</th><th>Margen</th><th>Referencia</th></tr></thead><tbody>${arr.length?arr.sort((a,b)=>b.date.localeCompare(a.date)).map(s=>`<tr><td>${dateES(s.date)}</td><td>${esc(clientName(s.clientId))}</td><td><strong>${euro(s.amount)}</strong></td><td>${Number(s.margin||0).toFixed(1)}%</td><td>${esc(s.note||"—")}</td></tr>`).join(""):`<tr><td colspan="5"><div class="empty"><strong>Sin ventas registradas</strong>Registra la primera para activar el dashboard.</div></td></tr>`}</tbody></table></div></div>`;
}
function settingsView(){
  return `<div class="grid settings-grid">
    <div class="card"><div class="section-head"><h2>Objetivo comercial</h2></div><div class="field"><label>Objetivo anual ${state.meta.year}</label><input id="annualGoal" type="number" min="0" step="100" value="${Number(state.meta.annualGoal||0)}"></div><button class="primary-btn" id="saveGoal" style="margin-top:12px">Guardar objetivo</button></div>
    <div class="card"><div class="section-head"><h2>Datos</h2><span class="hint">Siempre exportables</span></div>
      ${settingButton("⬇️","Exportar todos los datos","export-json")}${settingButton("📊","Exportar clientes CSV","export-clients")}${settingButton("📅","Exportar visitas CSV","export-visits")}${settingButton("€","Exportar ventas CSV","export-sales")}${settingButton("⬆️","Importar / restaurar copia","import-json")}
      <input type="file" id="importFile" accept=".json,application/json" hidden>
    </div>
  </div>
  <div class="card" style="margin-top:16px"><div class="section-head"><h2>Arquitectura multiusuario</h2></div><p style="color:var(--muted);line-height:1.6">La V1 utiliza un <b>userId</b> local y separa clientes, visitas y ventas. Esto permite migrar posteriormente a autenticación y base de datos en la nube, con permisos por comercial, sin rehacer la interfaz.</p><div class="settings-item"><span>Usuario actual</span><strong>${esc(CURRENT_USER.name)}</strong></div><div class="settings-item"><span>Rol preparado</span><strong>${esc(CURRENT_USER.role)}</strong></div></div>`;
}
function settingButton(icon,label,action){return `<div class="settings-item"><span>${icon} &nbsp;${label}</span><button class="tiny" data-action="${action}">Ejecutar</button></div>`}

function bindView(){
  document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>actions(b.dataset.action));
  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{currentView=b.dataset.view;render()});
  document.querySelectorAll("[data-edit-client]").forEach(b=>b.onclick=()=>openClient(b.dataset.editClient));
  document.querySelectorAll("[data-delete-client]").forEach(b=>b.onclick=()=>deleteClient(b.dataset.deleteClient));
  document.querySelectorAll("[data-complete-visit]").forEach(b=>b.onclick=()=>completeVisit(b.dataset.completeVisit));
  const search=document.getElementById("clientSearch"), type=document.getElementById("clientType");
  if(search)search.oninput=()=>document.getElementById("clientsBody").innerHTML=clientRows();
  if(type)type.onchange=()=>document.getElementById("clientsBody").innerHTML=clientRows();
  const goal=document.getElementById("saveGoal"); if(goal)goal.onclick=()=>{state.meta.annualGoal=Number(document.getElementById("annualGoal").value||0);save();toast("Objetivo guardado");render()};
}
function actions(a){
  if(a==="new-client")openClient();
  if(a==="new-visit")openVisit();
  if(a==="new-sale")openSale();
  if(a==="export-json")download("pena-connect-backup.json",JSON.stringify(state,null,2),"application/json");
  if(a==="export-clients")download("pena-connect-clientes.csv",csv(state.clients), "text/csv;charset=utf-8");
  if(a==="export-visits")download("pena-connect-visitas.csv",csv(state.visits.map(v=>({...v,client:clientName(v.clientId)}))),"text/csv;charset=utf-8");
  if(a==="export-sales")download("pena-connect-ventas.csv",csv(state.sales.map(s=>({...s,client:clientName(s.clientId)}))),"text/csv;charset=utf-8");
  if(a==="import-json")document.getElementById("importFile").click();
}
function openClient(id){
  const c=id?state.clients.find(x=>x.id===id):{};
  modal("Cliente / Prospecto",`<form id="clientForm"><div class="form-grid">
  ${field("Empresa","company",c.company||"",true)}${field("Contacto","contact",c.contact||"")}
  ${field("Teléfono","phone",c.phone||"")}${field("WhatsApp","whatsapp",c.whatsapp||"")}
  ${field("Dirección","address",c.address||"")}${field("Provincia","province",c.province||"")}
  ${selectField("Tipo","type",c.type||"client",[["client","Cliente"],["prospect","Prospecto"]])}
  ${field("Marcas de tractores","tractorBrands",c.tractorBrands||"")}${field("Notas","notes",c.notes||"","",true)}
  </div></form>`,()=>saveClient(id));
}
function openVisit(){
  const todayDate=today();
  modal("Nueva visita",`<form id="visitForm"><div class="form-grid">
  ${selectField("Cliente / prospecto","clientId","",state.clients.map(c=>[c.id,c.company]))}
  ${field("Fecha","date",todayDate,false,"date")}${field("Hora","time","",false,"time")}
  ${field("Motivo","reason","Seguimiento comercial")}${field("Resultado","result","")}
  ${field("Próximo paso","nextStep","")}${field("Notas","notes","", "", true)}
  </div></form>`,saveVisit);
}
function openSale(){
  modal("Registrar venta",`<form id="saleForm"><div class="form-grid">
  ${selectField("Cliente","clientId","",state.clients.filter(c=>c.type==="client").map(c=>[c.id,c.company]))}
  ${field("Fecha","date",today(),false,"date")}${field("Importe","amount","",true,"number")}${field("Margen %","margin","",false,"number")}
  ${field("Referencia / nota","note","", "", true)}
  </div></form>`,saveSale);
}
function field(label,name,value="",required=false,type="text",full=false){return `<div class="field ${full||name==="notes"?"full":""}"><label>${label}${required?" *":""}</label><input name="${name}" type="${type}" value="${esc(value)}" ${required?"required":""}></div>`}
function selectField(label,name,value,opts){return `<div class="field"><label>${label}</label><select name="${name}">${opts.map(o=>`<option value="${esc(o[0])}" ${o[0]===value?"selected":""}>${esc(o[1])}</option>`).join("")}</select></div>`}
function modal(title,body,onSave){
  const root=document.getElementById("modalRoot"); root.innerHTML=`<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h3>${title}</h3><button class="icon-btn" id="closeModal">×</button></div><div class="modal-body">${body}</div><div class="modal-foot"><button class="ghost-btn" id="cancelModal">Cancelar</button><button class="primary-btn" id="saveModal">Guardar</button></div></div></div>`;
  const close=()=>root.innerHTML=""; document.getElementById("closeModal").onclick=close;document.getElementById("cancelModal").onclick=close;document.getElementById("saveModal").onclick=()=>{if(onSave()!==false)close()};
}
function formData(id){return Object.fromEntries(new FormData(document.getElementById(id)).entries())}
function saveClient(id){
  const d=formData("clientForm"); if(!d.company)return false;
  if(id)Object.assign(state.clients.find(c=>c.id===id),d); else state.clients.push({id:uid("c"),...d,userId:CURRENT_USER.id,createdAt:new Date().toISOString()});
  save();toast(id?"Cliente actualizado":"Cliente creado");render();
}
function saveVisit(){
  const d=formData("visitForm"); if(!d.clientId||!d.date){toast("Selecciona cliente y fecha");return false}
  state.visits.push({id:uid("v"),...d,status:"planned",userId:CURRENT_USER.id,createdAt:new Date().toISOString()});save();toast("Visita creada");render();
}
function saveSale(){
  const d=formData("saleForm"); if(!d.clientId||!d.amount){toast("Selecciona cliente e importe");return false}
  state.sales.push({id:uid("s"),...d,amount:Number(d.amount),margin:Number(d.margin||0),userId:CURRENT_USER.id});save();toast("Venta registrada");render();
}
function completeVisit(id){const v=state.visits.find(x=>x.id===id);if(v){v.status="done";v.completedAt=new Date().toISOString();save();toast("Visita marcada como realizada");render()}}
function deleteClient(id){if(confirm("¿Borrar este cliente? Las visitas y ventas relacionadas se conservarán.")){state.clients=state.clients.filter(c=>c.id!==id);save();render();toast("Cliente borrado")}}
function clientName(id){return state.clients.find(c=>c.id===id)?.company||"Cliente eliminado"}
function clientSales(id){return state.sales.filter(s=>s.clientId===id).reduce((a,s)=>a+Number(s.amount||0),0)}
function lastVisit(id){const a=state.visits.filter(v=>v.clientId===id&&v.status==="done").sort((x,y)=>y.date.localeCompare(x.date));return a[0]?.date||""}
function today(){return new Date().toISOString().slice(0,10)}
function csv(rows){
  if(!rows.length)return "";
  const keys=[...new Set(rows.flatMap(r=>Object.keys(r)))];
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  return "\ufeff"+keys.map(q).join(";")+"\n"+rows.map(r=>keys.map(k=>q(r[k])).join(";")).join("\n");
}
function download(name,data,type){const blob=new Blob([data],{type}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
document.getElementById("menuBtn").onclick=()=>document.querySelector(".sidebar").classList.toggle("open");
document.getElementById("quickBackup").onclick=()=>actions("export-json");
document.getElementById("modalRoot").addEventListener("click",e=>{if(e.target.classList.contains("modal-backdrop"))e.currentTarget.innerHTML=""});
document.addEventListener("change",e=>{
  if(e.target.id==="importFile"&&e.target.files[0]){
    const reader=new FileReader();reader.onload=()=>{try{const imported=JSON.parse(reader.result);if(!imported.clients||!imported.visits||!imported.sales)throw new Error();state=imported;save();toast("Copia restaurada");render()}catch{toast("Archivo de copia no válido")}};reader.readAsText(e.target.files[0])
  }
});
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
render();
