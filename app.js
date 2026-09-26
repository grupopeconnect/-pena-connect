const DB_KEY="pena-connect-v1";
const CURRENT_USER={id:"local-user",name:"Mi usuario",role:"commercial"};
const seed={meta:{year:new Date().getFullYear(),annualGoal:0,user:CURRENT_USER},clients:[],visits:[],sales:[]};
let state=loadState(), currentView="dashboard";

const navItems=[["dashboard","⌂","Inicio"],["clients","◉","Clientes"],["visits","◷","Agenda"],["map","⌖","Mapa"],["sales","▥","Ventas"]];
function loadState(){
  try{
    const raw=localStorage.getItem(DB_KEY);
    const x=raw?{...seed,...JSON.parse(raw)}:structuredClone(seed);
    x.clients=x.clients||[];x.visits=x.visits||[];x.sales=x.sales||[];x.meta=x.meta||seed.meta;
    ensureClientCodes(x);
    x.clients.forEach(c=>{c.locality=c.locality??c.city??"";c.workshopPhoto=c.workshopPhoto??c.photo??"";c.mapsUrl=c.mapsUrl??c.googleMapsUrl??"";c.typeClient=["Cooperativa","Taller","Recambios"].includes(c.typeClient)?c.typeClient:"";c.whatsapp=c.whatsapp??"";});
    localStorage.setItem(DB_KEY,JSON.stringify(x));
    return x;
  }catch(e){return structuredClone(seed)}
}
function save(){localStorage.setItem(DB_KEY,JSON.stringify(state))}
function ensureClientCodes(s){
 let used=new Set();
 s.clients.forEach(c=>{let code=String(c.code||"").trim().toUpperCase();if(!code||used.has(code)){let n=1;while(used.has(`C${String(n).padStart(4,"0")}`))n++;code=`C${String(n).padStart(4,"0")}`;}c.code=code;used.add(code)});
}
function nextClientCode(){let n=0;state.clients.forEach(c=>{let m=String(c.code||"").match(/^C(\d+)$/i);if(m)n=Math.max(n,+m[1])});return `C${String(n+1).padStart(4,"0")}`}
function uid(p){return p+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function euro(v){return new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(Number(v)||0)}
function pct(a,b){return b?Math.round(a/b*100):0}
function dateES(v){if(!v)return"—";return new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(v+"T12:00:00"))}
function today(){return new Date().toISOString().slice(0,10)}
function monthName(i){return["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][i]}
function toast(m){let t=document.getElementById("toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function clientName(id){return state.clients.find(c=>c.id===id)?.company||"Cliente eliminado"}
function clientByCode(code){return state.clients.find(c=>String(c.code).toLowerCase()===String(code).toLowerCase())}
function clientSales(id,year){return state.sales.filter(s=>s.clientId===id&&(!year||new Date(s.date+"T12:00:00").getFullYear()===year)).reduce((a,s)=>a+Number(s.amount||0),0)}
function monthlySales(year){return Array.from({length:12},(_,m)=>state.sales.filter(s=>new Date(s.date+"T12:00:00").getFullYear()===year&&new Date(s.date+"T12:00:00").getMonth()===m).reduce((a,s)=>a+Number(s.amount||0),0))}
function rankings(){
 const rows=state.clients.map(c=>{let a=clientSales(c.id,2025),b=clientSales(c.id,2026),d=b-a;return{c,a,b,d,p:a?d/a*100:(b?100:0)}}).filter(x=>x.a||x.b);
 return {up:[...rows].filter(x=>x.d>0).sort((a,b)=>b.d-a.d),down:[...rows].filter(x=>x.d<0).sort((a,b)=>a.d-b.d)}
}
function render(){
 const titles={dashboard:"Inicio",clients:"Clientes",visits:"Agenda",map:"Mapa",sales:"Ventas",settings:"Configuración"};
 document.getElementById("pageTitle").textContent=titles[currentView];
 document.getElementById("desktopNav").innerHTML=navItems.map(x=>`<button class="nav-item ${currentView===x[0]?"active":""}" data-view="${x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join("");
 document.getElementById("appView").innerHTML=currentView==="dashboard"?dashboardView():currentView==="clients"?clientsView():currentView==="visits"?visitsView():currentView==="map"?mapView():currentView==="sales"?salesView():settingsView();
 bind();
}
function kpi(label,value,sub,cls=""){return`<div class="card kpi"><div class="label">${label}</div><div class="value ${cls}">${value}</div><div class="sub">${sub}</div></div>`}
function dashboardView(){
 const y=2026,total=clientSalesAll(y),prev=clientSalesAll(2025), goal=Number(state.meta.annualGoal||0), r=rankings(),up=r.up.length,down=r.down.length;
 const pm=monthlySales(2026), cm=monthlySales(2025), max=Math.max(...pm,...cm,1);
 return `<div class="grid gap">
 <div class="grid two-col">
  <div class="card hero"><div class="muted">FACTURACIÓN 2026</div><div class="big">${euro(total)}</div><div class="muted">2025: ${euro(prev)} · Variación: <b class="${total>=prev?"positive":"negative"}">${euro(total-prev)}</b></div>${goal?`<div class="progress"><span style="width:${Math.min(pct(total,goal),100)}%"></span></div><div class="muted small">Objetivo ${euro(goal)} · ${pct(total,goal)}%</div>`:""}</div>
  <div class="card"><div class="section-head"><h2>Clientes: evolución</h2><span class="hint">2026 vs 2025</span></div><div class="big-number">${up}<span class="positive"> suben</span></div><div class="big-number">${down}<span class="negative"> bajan</span></div><div class="muted small">El ranking se calcula por diferencia en euros.</div></div>
 </div>
 <div class="grid kpi-grid">${kpi("Clientes",state.clients.length,"cartera")}${kpi("Facturación 2025",euro(prev),"acumulado")}${kpi("Facturación 2026",euro(total),"acumulado")}${kpi("Variación",euro(total-prev),"2026 vs 2025",total>=prev?"positive":"negative")}</div>
 <div class="grid two-col">
  <div class="card"><div class="section-head"><h2>Facturación mensual</h2><span class="hint">2025 / 2026</span></div><div class="month-chart">${pm.map((v,i)=>`<div class="month-col"><div class="bars"><span class="bar y25" style="height:${Math.max(3,cm[i]/max*100)}%" title="${euro(cm[i])}"></span><span class="bar y26" style="height:${Math.max(3,v/max*100)}%" title="${euro(v)}"></span></div><small>${monthName(i).slice(0,3)}</small></div>`).join("")}</div><div class="legend"><span>2025</span><span>2026</span></div></div>
  <div class="card"><div class="section-head"><h2>Mi día</h2><button class="tiny" data-action="new-visit">+ Visita</button></div>${upcomingVisits().slice(0,5).map(v=>`<div class="list-row"><div><b>${esc(clientName(v.clientId))}</b><small>${dateES(v.date)} ${v.time||""}</small></div><button class="tiny" data-complete="${v.id}">✓</button></div>`).join("")||`<div class="empty">No hay visitas pendientes.</div>`}</div>
 </div>
 <div class="grid rank-grid">${rankingCard("📈","Mayores subidas",r.up,true)}${rankingCard("📉","Mayores bajadas",r.down,false)}</div>
 <div class="card"><div class="section-head"><h2>Acciones rápidas</h2></div><div class="quick-grid"><button class="quick" data-action="new-client">👤<b>Nuevo cliente</b></button><button class="quick" data-action="new-sale">€<b>Registrar venta</b></button><button class="quick" data-action="new-visit">📅<b>Nueva visita</b></button><button class="quick" data-view="sales">📊<b>Ver facturación</b></button></div></div>
 </div>`
}
function clientSalesAll(y){return state.sales.filter(s=>new Date(s.date+"T12:00:00").getFullYear()===y).reduce((a,s)=>a+Number(s.amount||0),0)}
function rankingCard(icon,title,arr,positive){
 return `<div class="card"><div class="section-head"><h2>${icon} ${title}</h2><span class="hint">por €</span></div>${arr.slice(0,8).map(x=>`<div class="rank-row"><div><b>${esc(x.c.company)}</b><small>${esc(x.c.code)} · ${esc(x.c.locality||"")}</small></div><div class="${positive?"positive":"negative"}"><b>${positive?"+":""}${euro(x.d)}</b><small>${x.p>=0?"+":""}${x.p.toFixed(1)}%</small></div></div>`).join("")||`<div class="empty">Sin datos comparables.</div>`}</div>`
}
function clientsView(){
 return `<div class="toolbar"><input class="search" id="clientSearch" placeholder="Buscar código, empresa, localidad, contacto..."><button class="primary-btn" data-action="new-client">+ Nuevo cliente</button></div>
 <div class="card table-card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Código</th><th>Taller / empresa</th><th>Localidad</th><th>2025</th><th>2026</th><th>Variación</th><th>Maps</th><th></th></tr></thead><tbody id="clientBody">${clientRows()}</tbody></table></div></div>`
}
function clientRows(){
 let q=(document.getElementById("clientSearch")?.value||"").toLowerCase();
 let arr=state.clients.filter(c=>[c.code,c.company,c.locality,c.province,c.contact,c.phone,c.whatsapp,c.typeClient].join(" ").toLowerCase().includes(q));
 if(!arr.length)return`<tr><td colspan="8"><div class="empty">No hay clientes todavía.</div></td></tr>`;
 return arr.map(c=>{let a=clientSales(c.id,2025),b=clientSales(c.id,2026),d=b-a;return`<tr><td><b>${esc(c.code)}</b></td><td><b>${esc(c.company||"Sin nombre")}</b><br><small>${esc(c.contact||"")}</small></td><td>${esc(c.locality||"—")}</td><td>${euro(a)}</td><td>${euro(b)}</td><td class="${d>0?"positive":d<0?"negative":""}">${d>0?"+":""}${euro(d)}</td><td>${c.mapsUrl?`<a class="maps-link" href="${esc(c.mapsUrl)}" target="_blank">📍 Abrir</a>`:"—"}</td><td><button class="tiny" data-edit="${c.id}">Editar</button></td></tr>`}).join("")
}
function visitsView(){
 let p=upcomingVisits(), done=state.visits.filter(v=>v.status==="done").sort((a,b)=>b.date.localeCompare(a.date));
 return `<div class="toolbar"><button class="primary-btn" data-action="new-visit">+ Nueva visita</button></div><div class="grid two-col"><div class="card"><div class="section-head"><h2>Próximas</h2></div>${visitRows(p)}</div><div class="card"><div class="section-head"><h2>Realizadas</h2></div>${visitRows(done,true)}</div></div>`
}
function upcomingVisits(){return state.visits.filter(v=>v.status!=="done"&&v.date>=today()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))}
function visitRows(a,done=false){return a.map(v=>`<div class="list-row"><div><b>${esc(clientName(v.clientId))}</b><small>${dateES(v.date)} ${v.time||""} · ${esc(v.reason||"")}</small></div>${done?`<span class="badge">Realizada</span>`:`<button class="tiny" data-complete="${v.id}">Realizada</button>`}</div>`).join("")||`<div class="empty">Sin visitas.</div>`}
function mapView(){
 let arr=state.clients.filter(c=>c.mapsUrl||c.address||c.locality);
 return `<div class="card"><div class="section-head"><h2>Ubicación de talleres</h2><span class="hint">${arr.length} con localización</span></div><div class="map-list">${arr.map(c=>`<div class="map-row">${c.workshopPhoto?`<img src="${esc(c.workshopPhoto)}">`:`<div class="photo-placeholder">🏢</div>`}<div><b>${esc(c.company)}</b><small>${esc(c.locality||"")} ${esc(c.province||"")}</small></div>${c.mapsUrl?`<a class="primary-btn" href="${esc(c.mapsUrl)}" target="_blank">Google Maps</a>`:`<button class="tiny" data-edit="${c.id}">Añadir ubicación</button>`}</div>`).join("")||`<div class="empty">Añade localidad y ubicación a tus clientes.</div>`}</div>`
}
function salesView(){
 let y2025=clientSalesAll(2025),y2026=clientSalesAll(2026),m25=monthlySales(2025),m26=monthlySales(2026),r=rankings();
 return `<div class="toolbar"><button class="primary-btn" data-action="new-sale">+ Registrar venta</button><div class="card compact">2025: <b>${euro(y2025)}</b> · 2026: <b>${euro(y2026)}</b> · Variación: <b class="${y2026>=y2025?"positive":"negative"}">${euro(y2026-y2025)}</b></div></div>
 <div class="grid three-col">${kpi("Facturación 2025",euro(y2025),"acumulado")}${kpi("Facturación 2026",euro(y2026),"acumulado")}${kpi("Variación 2026/25",euro(y2026-y2025),"diferencia",y2026>=y2025?"positive":"negative")}</div>
 <div class="card table-card" style="margin-top:16px"><div class="table-wrap"><table class="data-table"><thead><tr><th>Mes</th><th>2025</th><th>2026</th><th>Variación</th></tr></thead><tbody>${m25.map((v,i)=>`<tr><td><b>${monthName(i)}</b></td><td>${euro(v)}</td><td>${euro(m26[i])}</td><td class="${m26[i]-v>=0?"positive":"negative"}">${m26[i]-v>=0?"+":""}${euro(m26[i]-v)}</td></tr>`).join("")}</tbody></table></div></div>
 <div class="card table-card" style="margin-top:16px"><div class="section-head"><h2>Operaciones registradas</h2></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Fecha</th><th>Código</th><th>Cliente</th><th>Importe</th></tr></thead><tbody>${state.sales.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(s=>{let c=state.clients.find(x=>x.id===s.clientId);return`<tr><td>${dateES(s.date)}</td><td>${esc(c?.code||"—")}</td><td>${esc(c?.company||"—")}</td><td><b>${euro(s.amount)}</b></td></tr>`}).join("")||`<tr><td colspan="4"><div class="empty">Sin ventas registradas.</div></td></tr>`}</tbody></table></div></div>
 <div class="grid rank-grid" style="margin-top:16px">${rankingCard("📈","Subidas",r.up,true)}${rankingCard("📉","Bajadas",r.down,false)}</div>`
}
function settingsView(){
 return `<div class="grid two-col"><div class="card"><h2>Objetivo 2026</h2><div class="field"><label>Objetivo anual</label><input id="goal" type="number" value="${Number(state.meta.annualGoal||0)}"></div><button class="primary-btn" id="saveGoal">Guardar</button></div>
 <div class="card"><h2>Datos</h2><div class="settings-item"><span>Exportar copia completa</span><button class="tiny" data-action="export-json">Exportar</button></div><div class="settings-item"><span>Exportar clientes CSV</span><button class="tiny" data-action="export-clients">CSV</button></div><div class="settings-item"><span>Exportar ventas CSV</span><button class="tiny" data-action="export-sales">CSV</button></div><div class="settings-item"><span>Restaurar copia JSON</span><button class="tiny" data-action="import-json">Importar</button></div><input id="importFile" type="file" accept=".json" hidden></div></div>
 <div class="card" style="margin-top:16px"><h2>Datos siempre tuyos</h2><p class="muted">PEÑA CONNECT guarda los datos localmente en este iPhone y permite exportarlos. La actualización V2 conserva el mismo almacenamiento local.</p></div>`
}
function bind(){
 document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{currentView=b.dataset.view;document.querySelector(".sidebar")?.classList.remove("open");document.body.classList.remove("menu-open");document.querySelector(".mobile-menu-backdrop")?.remove();render()});
 document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>action(b.dataset.action));
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openClient(b.dataset.edit));
 document.querySelectorAll("[data-complete]").forEach(b=>b.onclick=()=>{let v=state.visits.find(x=>x.id===b.dataset.complete);if(v){v.status="done";save();render()}});
 const s=document.getElementById("clientSearch");if(s)s.oninput=()=>document.getElementById("clientBody").innerHTML=clientRows();
 const g=document.getElementById("saveGoal");if(g)g.onclick=()=>{state.meta.annualGoal=+document.getElementById("goal").value||0;save();toast("Objetivo guardado");render()};
 const f=document.getElementById("importFile");if(f)f.onchange=importFile;
 document.getElementById("menuBtn")?.addEventListener("click",toggleMenu);
}
function action(a){
 if(a==="new-client")openClient();
 if(a==="new-sale")openSale();
 if(a==="new-visit")openVisit();
 if(a==="export-json")download("pena-connect-backup.json",JSON.stringify(state,null,2),"application/json");
 if(a==="export-clients")download("pena-connect-clientes.csv",csv(state.clients),"text/csv;charset=utf-8");
 if(a==="export-sales")download("pena-connect-ventas.csv",csv(state.sales.map(s=>({...s,client:clientName(s.clientId)}))),"text/csv;charset=utf-8");
 if(a==="import-json")document.getElementById("importFile").click();
}
function download(name,data,type){let a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function csv(rows){if(!rows.length)return"";let cols=[...new Set(rows.flatMap(x=>Object.keys(x)))];return[cols.join(","),...rows.map(r=>cols.map(c=>`"${String(r[c]??"").replaceAll('"','""')}"`).join(","))].join("\n")}
function importFile(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);if(!x.clients||!x.sales)throw Error();state={...seed,...x};ensureClientCodes(state);save();toast("Copia restaurada");render()}catch(_){toast("Copia no válida")}};r.readAsText(f)}
function field(label,name,val="",required=false,wide=false,type="text"){return`<div class="field ${wide?"wide":""}"><label>${label}</label><input name="${name}" type="${type}" value="${esc(val)}" ${required?"required":""}></div>`}
function modal(title,body,onSave){
 document.getElementById("modalRoot").innerHTML=`<div class="modal-back"><div class="modal"><div class="modal-head"><h2>${title}</h2><button class="icon-btn" id="closeModal">×</button></div>${body}<div class="modal-actions"><button class="ghost-btn" id="cancelModal">Cancelar</button><button class="primary-btn" id="saveModal">Guardar</button></div></div></div>`;
 document.getElementById("closeModal").onclick=closeModal;document.getElementById("cancelModal").onclick=closeModal;document.getElementById("saveModal").onclick=onSave;
}
function closeModal(){document.getElementById("modalRoot").innerHTML=""}
function formObj(id){let f=document.getElementById(id);return Object.fromEntries(new FormData(f).entries())}
function openClient(id){
 let c=id?state.clients.find(x=>x.id===id):{code:nextClientCode()};
 modal("Ficha de cliente",`<form id="clientForm"><div class="client-photo"><div id="photoPreview">${c.workshopPhoto?`<img src="${esc(c.workshopPhoto)}" class="client-photo-preview">`:`<div class="photo-placeholder large">🏢</div>`}</div><label class="upload-btn">📸 Añadir foto del taller<input id="photoInput" type="file" accept="image/*" hidden></label></div><div class="form-grid">
 ${field("Código de cliente","code",c.code||nextClientCode(),true)}${field("Nombre / taller","company",c.company||"",true)}
 ${field("Localidad","locality",c.locality||"")}${field("Provincia","province",c.province||"")}
 <div class="field"><label>Tipo de cliente</label><select name="typeClient"><option value="">Seleccionar</option>${["Cooperativa","Taller","Recambios"].map(t=>`<option value="${t}" ${c.typeClient===t?"selected":""}>${t}</option>`).join("")}</select></div>
 ${field("Persona de contacto","contact",c.contact||"")}${field("Teléfono / WhatsApp","whatsapp",c.whatsapp||c.phone||"")}
 ${field("WhatsApp","whatsapp",c.whatsapp||"")}${field("Dirección","address",c.address||"")}
 ${field("Ubicación Google Maps","mapsUrl",c.mapsUrl||"","",true)}${field("Notas","notes",c.notes||"","",true)}
 </div></form>`,()=>saveClient(id));
 document.getElementById("photoInput").onchange=e=>{let f=e.target.files[0];if(!f)return;let rr=new FileReader();rr.onload=()=>{document.getElementById("photoPreview").innerHTML=`<img src="${rr.result}" class="client-photo-preview">`;document.getElementById("photoPreview").dataset.photo=rr.result};rr.readAsDataURL(f)}
}
function saveClient(id){
 let o=formObj("clientForm"), existing=id?state.clients.find(c=>c.id===id):null;
 if(!o.company){toast("Falta el nombre del taller");return}
 if(!id)o.id=uid("c");
 o.code=o.code.trim().toUpperCase()||nextClientCode();
 const clash=state.clients.find(c=>c.code===o.code&&c.id!==id);if(clash){toast("Ese código ya existe");return}
 if(!o.mapsUrl&&o.company){let q=[o.company,o.address,o.locality,o.province].filter(Boolean).join(", ");o.mapsUrl="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q)}
 const photo=document.getElementById("photoPreview")?.dataset.photo;
 o.workshopPhoto=photo||existing?.workshopPhoto||"";
 if(existing?.phone && !o.whatsapp) o.whatsapp=existing.phone;
 o.phone=existing?.phone||"";
 o.id=id||o.id;
 state.clients=id?state.clients.map(c=>c.id===id?{...c,...o}:c):[...state.clients,o];
 save();closeModal();render();toast("Cliente guardado")
}
function openSale(){
 if(!state.clients.length){toast("Primero crea un cliente");return}
 modal("Registrar facturación",`<form id="saleForm"><div class="form-grid">
 <div class="field wide"><label>Cliente</label><select name="clientId">${state.clients.map(c=>`<option value="${c.id}">${esc(c.code)} · ${esc(c.company)}</option>`).join("")}</select></div>
 ${field("Fecha","date",today(),true,false,"date")}${field("Importe (€)","amount","",true,false,"number")}${field("Margen %","margin","",false,false,"number")}${field("Referencia / nota","note","",false,true)}
 </div></form>`,saveSale)
}
function saveSale(){let o=formObj("saleForm");if(!o.clientId||!o.amount){toast("Indica cliente e importe");return}state.sales.push({id:uid("s"),clientId:o.clientId,date:o.date,amount:+o.amount,margin:+o.margin||0,note:o.note||""});save();closeModal();render();toast("Facturación registrada")}
function openVisit(){
 if(!state.clients.length){toast("Primero crea un cliente");return}
 modal("Nueva visita",`<form id="visitForm"><div class="form-grid"><div class="field wide"><label>Cliente</label><select name="clientId">${state.clients.map(c=>`<option value="${c.id}">${esc(c.code)} · ${esc(c.company)}</option>`).join("")}</select></div>${field("Fecha","date",today(),true,false,"date")}${field("Hora","time","",false,false,"time")}${field("Motivo","reason","")}${field("Siguiente paso","nextStep","",false,true)}</div></form>`,saveVisit)
}
function saveVisit(){let o=formObj("visitForm");state.visits.push({id:uid("v"),...o,status:"pending"});save();closeModal();render();toast("Visita guardada")}
function toggleMenu(){const side=document.querySelector(".sidebar");const open=side.classList.toggle("open");document.body.classList.toggle("menu-open",open);document.querySelector(".mobile-menu-backdrop")?.remove();if(open){const b=document.createElement("div");b.className="mobile-menu-backdrop";b.onclick=toggleMenu;document.body.appendChild(b)}}
render();
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
