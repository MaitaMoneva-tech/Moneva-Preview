const $ = id => document.getElementById(id);
const today = new Date();
const isoToday = d => { const x = new Date(d); x.setMinutes(x.getMinutes()-x.getTimezoneOffset()); return x.toISOString().slice(0,10); };
const monthKey = date => String(date || "").slice(0,7);
const money = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n)||0);
const categories = {income:["Gaji","Freelance","Bisnis","Bonus","Lainnya"],expense:["Makanan","Transportasi","Belanja","Tagihan","Hiburan","Kesehatan","Rumah tangga","Lainnya"]};
const seed = {
  budget:2000000,
  transactions:[
    {id:"demo-1",type:"income",category:"Gaji",name:"Gaji bulanan",amount:5000000,date:isoToday(today),note:"Data contoh"},
    {id:"demo-2",type:"expense",category:"Makanan",name:"Belanja groceries",amount:350000,date:isoToday(today),note:"Data contoh"},
    {id:"demo-3",type:"expense",category:"Transportasi",name:"Transportasi",amount:75000,date:isoToday(today),note:"Data contoh"},
    {id:"demo-4",type:"income",category:"Freelance",name:"Freelance writing",amount:450000,date:isoToday(new Date(today.getFullYear(),today.getMonth(),Math.max(1,today.getDate()-2))),note:"Data contoh"}
  ],
  installments:[
    {id:"loan-1",name:"Contoh cicilan laptop",principal:3000000,remaining:2000000,monthly:500000,due:isoToday(new Date(today.getFullYear(),today.getMonth(),today.getDate()+5)),note:"Data contoh"},
    {id:"loan-2",name:"Contoh pinjaman pribadi",principal:4000000,remaining:2750000,monthly:450000,due:isoToday(new Date(today.getFullYear(),today.getMonth(),today.getDate()+10)),note:"Data contoh"}
  ]
};
let state;
try { state = JSON.parse(localStorage.getItem("moneva-v1")) || seed; } catch { state = seed; }
function save(){ localStorage.setItem("moneva-v1",JSON.stringify(state)); render(); }
function toast(message){ const el=$("toast"); el.textContent=message; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2200); }
function monthTransactions(){return state.transactions.filter(t=>monthKey(t.date)===monthKey(isoToday(today)));}
function totals(list){return list.reduce((a,t)=>{a[t.type]+=Number(t.amount)||0;return a;},{income:0,expense:0});}
function setPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  $(page+"-page").classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  $("page-title").textContent=({dashboard:"Ringkasan keuangan",transactions:"Transaksi",reports:"Laporan keuangan",installments:"Tracker cicilan"})[page];
  if(page==="reports")renderReports();
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>setPage(b.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>setPage(b.dataset.goto)));
function rowHTML(t,actions=false){
  const positive=t.type==="income";
  return `<div class="transaction-row"><div class="transaction-icon">${positive?"↙":"↗"}</div><div class="transaction-info"><strong>${escapeHTML(t.name)}</strong><small>${escapeHTML(t.category)} · ${formatDate(t.date)}${t.note?" · "+escapeHTML(t.note):""}</small></div><div class="transaction-amount ${positive?"positive":"negative"}">${positive?"+":"−"}${money(t.amount)}</div>${actions?`<div class="row-actions"><button data-edit-t="${t.id}">Edit</button><button data-delete-t="${t.id}">Hapus</button></div>`:""}</div>`;
}
function escapeHTML(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function formatDate(s){if(!s)return "-";return new Date(s+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});}
function renderDashboard(){
  const tx=monthTransactions(),t=totals(tx),balance=totals(state.transactions);
  $("balance-value").textContent=money(balance.income-balance.expense);
  $("income-value").textContent=money(t.income);$("expense-value").textContent=money(t.expense);
  const budget=Number(state.budget)||0,percent=budget?Math.round(t.expense/budget*100):0;
  $("budget-spent").textContent=money(t.expense);$("budget-percent").textContent=percent+"% terpakai";
  $("budget-progress").style.width=Math.min(100,percent)+"%";
  $("budget-total-label").textContent=money(budget);$("budget-left").textContent="Sisa "+money(Math.max(0,budget-t.expense));
  $("budget-input").value=budget;
  $("recent-list").innerHTML=state.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map(t=>rowHTML(t)).join("")||'<div class="empty-state">Belum ada transaksi. Yuk, catat yang pertama!</div>';
  const groups={};tx.filter(x=>x.type==="expense").forEach(x=>groups[x.category]=(groups[x.category]||0)+Number(x.amount));
  const entries=Object.entries(groups).sort((a,b)=>b[1]-a[1]);
  $("category-breakdown").innerHTML=entries.length?entries.map(([name,val])=>`<div class="category-row"><span>${escapeHTML(name)}</span><strong>${money(val)}</strong><div class="category-bar"><span style="width:${t.expense?val/t.expense*100:0}%"></span></div></div>`).join(""):'<div class="empty-state">Belum ada pengeluaran bulan ini.</div>';
}
function renderTransactions(){
  const filter=$("transaction-filter").value;
  const list=state.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).filter(t=>filter==="all"||t.type===filter);
  $("transaction-list").innerHTML=list.map(t=>rowHTML(t,true)).join("")||'<div class="empty-state">Belum ada transaksi pada filter ini.</div>';
  document.querySelectorAll("[data-edit-t]").forEach(b=>b.onclick=()=>editTransaction(b.dataset.editT));
  document.querySelectorAll("[data-delete-t]").forEach(b=>b.onclick=()=>{if(confirm("Hapus transaksi ini?")){state.transactions=state.transactions.filter(t=>t.id!==b.dataset.deleteT);save();toast("Transaksi dihapus.");}});
}
function renderInstallments(){
  const total=state.installments.reduce((s,x)=>s+Number(x.remaining),0);$("debt-total").textContent=money(total);
  $("installment-list").innerHTML=state.installments.map(x=>{
    const paid=Math.max(0,Number(x.principal)-Number(x.remaining)),progress=x.principal?Math.min(100,paid/x.principal*100):0;
    return `<article class="installment-card"><h3>${escapeHTML(x.name)}</h3><div class="sub">Jatuh tempo: ${formatDate(x.due)}</div><div class="remaining">${money(x.remaining)}</div><div class="sub">Sisa cicilan</div><div class="installment-meta"><span>Terbayar ${money(paid)}</span><span>${Math.round(progress)}%</span></div><div class="installment-progress"><span style="width:${progress}%"></span></div><div class="installment-meta"><span>Per bulan</span><strong>${money(x.monthly)}</strong></div><div class="installment-actions"><div class="row-actions"><button data-edit-i="${x.id}">Edit</button><button data-delete-i="${x.id}">Hapus</button></div><button class="paid-btn" data-pay-i="${x.id}">Catat pembayaran</button></div></article>`;
  }).join("")||'<article class="panel empty-state">Belum ada cicilan. Tambahkan cicilan pertamamu.</article>';
  document.querySelectorAll("[data-edit-i]").forEach(b=>b.onclick=()=>editInstallment(b.dataset.editI));
  document.querySelectorAll("[data-delete-i]").forEach(b=>b.onclick=()=>{if(confirm("Hapus data cicilan ini?")){state.installments=state.installments.filter(x=>x.id!==b.dataset.deleteI);save();toast("Cicilan dihapus.");}});
  document.querySelectorAll("[data-pay-i]").forEach(b=>b.onclick=()=>{const item=state.installments.find(x=>x.id===b.dataset.payI);if(!item)return;const amount=Math.min(Number(item.monthly),Number(item.remaining));if(amount<=0)return toast("Cicilan ini sudah lunas.");if(confirm("Catat pembayaran "+money(amount)+" untuk "+item.name+"?")){item.remaining=Math.max(0,Number(item.remaining)-amount);save();toast("Pembayaran berhasil dicatat.");}});
}
function renderReports(){
  const mode=$("report-period").value;
  const now=new Date();
  let start=null,end=null,label="Semua waktu";
  if(mode==="month") {start=new Date(now.getFullYear(),now.getMonth(),1);end=new Date(now.getFullYear(),now.getMonth()+1,0);label=now.toLocaleDateString("id-ID",{month:"long",year:"numeric"});}
  else if(mode==="last-month") {start=new Date(now.getFullYear(),now.getMonth()-1,1);end=new Date(now.getFullYear(),now.getMonth(),0);label=start.toLocaleDateString("id-ID",{month:"long",year:"numeric"});}
  else if(mode==="year") {start=new Date(now.getFullYear(),0,1);end=new Date(now.getFullYear(),11,31);label="Tahun "+now.getFullYear();}
  else if(mode==="custom") {const a=$("report-start").value,b=$("report-end").value;start=a?new Date(a+"T00:00:00"):null;end=b?new Date(b+"T23:59:59"):null;label=(a?formatDate(a):"Awal")+" – "+(b?formatDate(b):"Sekarang");}
  const inRange=state.transactions.filter(t=>{const d=new Date(t.date+"T12:00:00");return (!start||d>=start)&&(!end||d<=end);}).sort((a,b)=>b.date.localeCompare(a.date));
  const sums=totals(inRange),incomeCount=inRange.filter(t=>t.type==="income").length,expenseCount=inRange.filter(t=>t.type==="expense").length;
  $("report-period-label").textContent=label;
  $("report-income").textContent=money(sums.income);$("report-expense").textContent=money(sums.expense);$("report-net").textContent=money(sums.income-sums.expense);
  $("report-income-count").textContent=incomeCount+" transaksi";$("report-expense-count").textContent=expenseCount+" transaksi";
  $("report-transaction-count").textContent=inRange.length+" transaksi";
  const renderBars=(id,type)=>{
    const map={};inRange.filter(t=>t.type===type).forEach(t=>map[t.category]=(map[t.category]||0)+Number(t.amount||0));
    const entries=Object.entries(map).sort((a,b)=>b[1]-a[1]);const total=entries.reduce((s,x)=>s+x[1],0);const target=$(id);
    target.innerHTML=entries.length?entries.map(([name,value])=>`<div class="report-bar-row"><div class="report-bar-label"><span>${escapeHTML(name)}</span><strong>${money(value)}</strong></div><div class="report-bar-track"><span style="width:${total?value/total*100:0}%"></span></div><small>${total?Math.round(value/total*100):0}% dari total ${type==="expense"?"pengeluaran":"pemasukan"}</small></div>`).join(""):'<div class="empty-state">Belum ada data pada periode ini.</div>';
  };
  renderBars("report-expense-categories","expense");renderBars("report-income-categories","income");
  const monthList=[];for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const key=monthKey(isoToday(d));const items=state.transactions.filter(t=>monthKey(t.date)===key);const v=totals(items);monthList.push({label:d.toLocaleDateString("id-ID",{month:"short"}),income:v.income,expense:v.expense});}
  const max=Math.max(1,...monthList.flatMap(x=>[x.income,x.expense]));
  $("report-monthly-trend").innerHTML=monthList.map(m=>`<div class="trend-month"><div class="trend-bars"><span class="trend-income" style="height:${m.income/max*100}%" title="Pemasukan ${money(m.income)}"></span><span class="trend-expense" style="height:${m.expense/max*100}%" title="Pengeluaran ${money(m.expense)}"></span></div><small>${m.label}</small></div>`).join("");
  $("report-transaction-list").innerHTML=inRange.length?inRange.map(t=>rowHTML(t)).join(""):'<div class="empty-state">Belum ada transaksi pada periode ini.</div>';
}
function render(){renderDashboard();renderTransactions();renderInstallments();if($("reports-page").classList.contains("active"))renderReports();}
$("today-label").textContent=today.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).toUpperCase();
$("save-budget").onclick=()=>{state.budget=Math.max(0,Number($("budget-input").value)||0);save();toast("Budget diperbarui.");};
$("transaction-filter").onchange=renderTransactions;
$("report-period").onchange=()=>{$("report-custom-range").hidden=$("report-period").value!=="custom";renderReports();};
$("report-start").onchange=renderReports;$("report-end").onchange=renderReports;
function showTransactionForm(){ $("transaction-form-panel").hidden=false; $("transaction-form-panel").scrollIntoView({behavior:"smooth",block:"start"}); }
function hideTransactionForm(){ $("transaction-form-panel").hidden=true; $("transaction-form").reset(); $("transaction-id").value=""; $("form-title").textContent="Tambah transaksi"; populateCategories(); }
function populateCategories(){const type=$("transaction-type").value;const old=$("transaction-category").value;$("transaction-category").innerHTML=categories[type].map(c=>`<option>${c}</option>`).join("");if(categories[type].includes(old))$("transaction-category").value=old;}
$("open-transaction").onclick=()=>{hideTransactionForm();showTransactionForm();};
$("quick-add").onclick=()=>{setPage("transactions");hideTransactionForm();showTransactionForm();};
$("close-transaction").onclick=$("cancel-transaction").onclick=hideTransactionForm;
$("transaction-type").onchange=populateCategories;
function editTransaction(id){const t=state.transactions.find(x=>x.id===id);if(!t)return;setPage("transactions");$("transaction-id").value=t.id;$("transaction-type").value=t.type;populateCategories();$("transaction-category").value=t.category;$("transaction-name").value=t.name;$("transaction-amount").value=t.amount;$("transaction-date").value=t.date;$("transaction-note").value=t.note||"";$("form-title").textContent="Edit transaksi";showTransactionForm();}
$("transaction-form").onsubmit=e=>{e.preventDefault();const id=$("transaction-id").value;const item={id:id||"tx-"+Date.now(),type:$("transaction-type").value,category:$("transaction-category").value,name:$("transaction-name").value.trim(),amount:Number($("transaction-amount").value),date:$("transaction-date").value,note:$("transaction-note").value.trim()};if(!item.name||item.amount<=0||!item.date)return toast("Periksa kembali data transaksi.");if(id)state.transactions=state.transactions.map(t=>t.id===id?item:t);else state.transactions.push(item);save();hideTransactionForm();toast(id?"Transaksi diperbarui.":"Transaksi ditambahkan.");};
function showInstallmentForm(){ $("installment-form-panel").hidden=false;$("installment-form-panel").scrollIntoView({behavior:"smooth",block:"start"});}
function hideInstallmentForm(){ $("installment-form-panel").hidden=true;$("installment-form").reset();$("installment-id").value="";$("installment-form-title").textContent="Tambah cicilan";}
$("open-installment").onclick=()=>{hideInstallmentForm();showInstallmentForm();};
$("close-installment").onclick=$("cancel-installment").onclick=hideInstallmentForm;
function editInstallment(id){const x=state.installments.find(i=>i.id===id);if(!x)return;$("installment-id").value=x.id;$("installment-name").value=x.name;$("installment-principal").value=x.principal;$("installment-remaining").value=x.remaining;$("installment-monthly").value=x.monthly;$("installment-due").value=x.due;$("installment-note").value=x.note||"";$("installment-form-title").textContent="Edit cicilan";showInstallmentForm();}
$("installment-form").onsubmit=e=>{e.preventDefault();const id=$("installment-id").value;const item={id:id||"loan-"+Date.now(),name:$("installment-name").value.trim(),principal:Number($("installment-principal").value),remaining:Number($("installment-remaining").value),monthly:Number($("installment-monthly").value),due:$("installment-due").value,note:$("installment-note").value.trim()};if(!item.name||item.principal<=0||item.remaining<0||item.remaining>item.principal||item.monthly<=0||!item.due)return toast("Periksa nominal dan tanggal cicilan.");if(id)state.installments=state.installments.map(x=>x.id===id?item:x);else state.installments.push(item);save();hideInstallmentForm();toast(id?"Cicilan diperbarui.":"Cicilan ditambahkan.");};
$("transaction-date").value=isoToday(today);$("installment-due").value=isoToday(new Date(today.getFullYear(),today.getMonth(),today.getDate()+7));
render();
