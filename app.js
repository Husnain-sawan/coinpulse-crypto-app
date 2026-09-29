const API = "https://api.coingecko.com/api/v3";
const $ = (s) => document.querySelector(s);
const state = { coins: [], extraCoins: [], watchlist: JSON.parse(localStorage.getItem("coinpulse_watchlist") || "[]"), view: "market", selected: null, days: 1, searchTimer: null, searchResults: null, deferredInstall: null, lastUpdated: null };
const currency = () => localStorage.getItem("coinpulse_currency") || "usd";
const fmtPrice = (n) => {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const val = Number(n);
  const digits = val >= 1000 ? 2 : val >= 1 ? 2 : val >= .01 ? 4 : 7;
  return new Intl.NumberFormat(undefined,{style:"currency",currency:currency().toUpperCase(),maximumFractionDigits:digits,minimumFractionDigits:val>=1000?2:0}).format(val);
};
const fmtCompact = (n) => n == null ? "—" : new Intl.NumberFormat(undefined,{notation:"compact",maximumFractionDigits:2}).format(n);
const fmtPct = (n) => n == null || !Number.isFinite(Number(n)) ? "—" : `${Number(n)>=0?"+":""}${Number(n).toFixed(2)}%`;
const changeClass = (n) => Number(n) >= 0 ? "positive" : "negative";
const safe = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(message){const t=$("#toast");t.textContent=message;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),2500);}
function coinIcon(c){return c.image || `https://placehold.co/64x64/17223b/ffffff?text=${encodeURIComponent((c.symbol||"?").slice(0,2).toUpperCase())}`;}
function isSaved(id){return state.watchlist.includes(id);}
function saveWatchlist(){localStorage.setItem("coinpulse_watchlist",JSON.stringify(state.watchlist));$("#watchCount").textContent=state.watchlist.length;}
function allCoins(){return [...state.coins,...state.extraCoins].filter((c,i,a)=>a.findIndex(x=>x.id===c.id)===i);}
function currentCoins(){return state.searchResults ?? allCoins();}
function sortCoins(coins){
 const mode=$("#sortSelect").value;
 return [...coins].sort((a,b)=>mode==="change_desc"?(b.price_change_percentage_24h||0)-(a.price_change_percentage_24h||0):mode==="change_asc"?(a.price_change_percentage_24h||0)-(b.price_change_percentage_24h||0):mode==="volume_desc"?(b.total_volume||0)-(a.total_volume||0):(b.market_cap||0)-(a.market_cap||0));
}
function coinRow(c){
 const change=c.price_change_percentage_24h;
 return `<div class="coin-row">
  <div class="coin-main" data-open="${safe(c.id)}"><img class="coin-icon" src="${safe(coinIcon(c))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><div class="coin-identity"><div class="coin-name">${safe(c.name)}</div><div class="coin-symbol">${safe(c.symbol)}</div></div></div>
  <div class="coin-price"><div class="price-main">${fmtPrice(c.current_price)}</div><div class="price-change ${changeClass(change)}">${fmtPct(change)}</div></div>
  <button class="star-button ${isSaved(c.id)?"saved":""}" data-star="${safe(c.id)}" aria-label="${isSaved(c.id)?"Remove from":"Add to"} watchlist">${isSaved(c.id)?"★":"☆"}</button>
 </div>`;
}
function renderList(){
 const list=$("#coinList"), coins=sortCoins(currentCoins());
 $("#resultsLabel").textContent=state.searchResults ? `${coins.length} search result${coins.length===1?"":"s"}` : `Top ${coins.length} coins by market cap`;
 list.innerHTML=coins.length?coins.map(coinRow).join(""):`<div class="empty-state">No coins found. Try another name or ticker.</div>`;
 renderWatchlist();
}
function renderWatchlist(){
 const list=$("#watchList"), saved=state.watchlist.map(id=>allCoins().find(c=>c.id===id)).filter(Boolean);
 list.innerHTML=saved.length?saved.map(coinRow).join(""):`<div class="empty-state">Your watchlist is empty. Tap ☆ beside a coin to save it.</div>`;
 $("#watchCount").textContent=state.watchlist.length;
}
function setView(view){
 state.view=view;
 $("#globalBackBtn").hidden=(view==="market");
 document.querySelectorAll(".tab,.bottom-link").forEach(b=>b.classList.toggle("active",b.dataset.view===view || (view==="details" && b.dataset.view===(state.previousView||"market"))));
 document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
 const id=view==="market"?"marketView":view==="watchlist"?"watchlistView":view==="insights"?"insightsView":"detailsView";
 $("#"+id).classList.add("active");
 $("#marketTitle").textContent=view==="watchlist"?"Your watchlist":view==="insights"?"AI market insights":"Market overview";
 window.scrollTo({top:0,behavior:"smooth"});
}
async function fetchMarkets(page=1){
 const perPage=100;
 const key=localStorage.getItem("coinpulse_cg_key")||"";
 const url=new URL(`${API}/coins/markets`);
 url.searchParams.set("vs_currency",currency());url.searchParams.set("order","market_cap_desc");url.searchParams.set("per_page",String(perPage));url.searchParams.set("page",String(page));url.searchParams.set("sparkline","false");url.searchParams.set("price_change_percentage","24h");
 const headers={accept:"application/json"}; if(key) headers["x-cg-demo-api-key"]=key;
 const response=await fetch(url,{headers});
 if(!response.ok) throw new Error(response.status===429?"Rate limit reached. Wait a little and refresh.":response.status===401||response.status===403?"The API may require a free CoinGecko Demo API key. Add it in the setup notes.":`Market data error (${response.status}).`);
 return response.json();
}
async function loadMarkets(append=false){
 const label=$("#liveLabel");label.textContent="Updating";
 if(!append) $("#coinList").innerHTML='<div class="loading-state"><span class="spinner"></span>Loading market data…</div>';
 try{
  const page=append?2:1;const data=await fetchMarkets(page);
  if(append) state.extraCoins=data; else {state.coins=data;state.extraCoins=[];state.searchResults=null;}
  state.lastUpdated=new Date();label.textContent="Live data";
  $("#coinCount").textContent=fmtCompact(state.coins.length+state.extraCoins.length);
  const changes=state.coins.map(c=>c.price_change_percentage_24h).filter(v=>v!=null);
  const avg=changes.length?changes.reduce((a,b)=>a+b,0)/changes.length:null;
  $("#marketChange").textContent=fmtPct(avg);$("#marketChange").className=changeClass(avg);
  $("#updatedAt").textContent=`Updated ${state.lastUpdated.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} · Refreshes automatically every 90 seconds`;
  renderList(); if(state.selected) renderCoinDetail(state.selected);
 }catch(e){
  label.textContent=navigator.onLine?"API unavailable":"Offline";
  if(!state.coins.length) $("#coinList").innerHTML=`<div class="empty-state">${safe(e.message)}<br><br>Check your internet connection or API setup, then refresh.</div>`;
  $("#updatedAt").textContent=e.message;
  toast(e.message);
 }
}
async function searchCoins(query){
 if(!query.trim()){state.searchResults=null;renderList();return;}
 const local=allCoins().filter(c=>c.name.toLowerCase().includes(query.toLowerCase())||c.symbol.toLowerCase().includes(query.toLowerCase()));
 if(local.length){state.searchResults=local;renderList();}
 try{
  const url=new URL(`${API}/search`);url.searchParams.set("query",query);
  const key=localStorage.getItem("coinpulse_cg_key")||"";const headers={accept:"application/json"};if(key)headers["x-cg-demo-api-key"]=key;
  const r=await fetch(url,{headers});if(!r.ok) return;const data=await r.json();
  const ids=(data.coins||[]).slice(0,15).map(c=>c.id);
  const unseen=ids.filter(id=>!allCoins().some(c=>c.id===id));
  if(unseen.length){
   const marketsUrl=new URL(`${API}/coins/markets`);marketsUrl.searchParams.set("vs_currency",currency());marketsUrl.searchParams.set("ids",unseen.join(","));marketsUrl.searchParams.set("sparkline","false");marketsUrl.searchParams.set("price_change_percentage","24h");
   const mr=await fetch(marketsUrl,{headers});if(mr.ok){const extra=await mr.json();state.extraCoins.push(...extra);}
  }
  state.searchResults=allCoins().filter(c=>c.name.toLowerCase().includes(query.toLowerCase())||c.symbol.toLowerCase().includes(query.toLowerCase()));
  renderList();
 }catch(_){}
}
function toggleStar(id){
 if(isSaved(id)) state.watchlist=state.watchlist.filter(x=>x!==id); else state.watchlist.push(id);
 saveWatchlist();renderList();toast(isSaved(id)?"Added to watchlist":"Updated watchlist");
}
function money(n){return n==null?"—":fmtPrice(n);}
async function openCoin(id){
 const coin=allCoins().find(c=>c.id===id);
 if(!coin){toast("Coin details are not loaded yet.");return;}
 state.previousView=state.view==="watchlist"?"watchlist":"market";
 state.selected=id;setView("details");await renderCoinDetail(id);
}
async function renderCoinDetail(id){
 const c=allCoins().find(x=>x.id===id);if(!c)return;
 const host=$("#coinDetail");
 host.innerHTML=`<div class="detail-card"><div class="detail-head"><img class="coin-icon" src="${safe(coinIcon(c))}" alt=""><div><div class="detail-title">${safe(c.name)}</div><div class="detail-symbol">${safe(c.symbol)} · Rank #${c.market_cap_rank||"—"}</div></div><button class="star-button ${isSaved(c.id)?"saved":""}" data-star="${safe(c.id)}" aria-label="Toggle watchlist">${isSaved(c.id)?"★":"☆"}</button></div>
 <div class="detail-price">${fmtPrice(c.current_price)}</div><div class="detail-change ${changeClass(c.price_change_percentage_24h)}">${fmtPct(c.price_change_percentage_24h)} in 24 hours</div>
 <div class="chart-wrap"><canvas id="priceChart" aria-label="Price history chart"></canvas></div>
 <div class="range-row">${[[1,"24H"],[7,"7D"],[30,"1M"],[365,"1Y"]].map(([d,l])=>`<button class="range-button ${state.days===d?"active":""}" data-range="${d}">${l}</button>`).join("")}</div>
 <div class="stats-grid"><div class="stat-box"><span>Market cap</span><strong>${fmtPrice(c.market_cap)}</strong></div><div class="stat-box"><span>24h volume</span><strong>${fmtPrice(c.total_volume)}</strong></div><div class="stat-box"><span>24h high</span><strong>${fmtPrice(c.high_24h)}</strong></div><div class="stat-box"><span>24h low</span><strong>${fmtPrice(c.low_24h)}</strong></div><div class="stat-box"><span>Circulating supply</span><strong>${fmtCompact(c.circulating_supply)} ${safe(c.symbol.toUpperCase())}</strong></div><div class="stat-box"><span>Last updated</span><strong>${c.last_updated?new Date(c.last_updated).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):"—"}</strong></div></div></div>`;
 await loadChart(id,state.days);
}
async function loadChart(id,days){
 const canvas=$("#priceChart");if(!canvas)return;
 const ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#93a3bf";ctx.font="12px system-ui";ctx.fillText("Loading price history…",12,24);
 try{
  const key=localStorage.getItem("coinpulse_cg_key")||"";const headers={accept:"application/json"};if(key)headers["x-cg-demo-api-key"]=key;
  const url=new URL(`${API}/coins/${encodeURIComponent(id)}/market_chart`);url.searchParams.set("vs_currency",currency());url.searchParams.set("days",String(days));
  const r=await fetch(url,{headers});if(!r.ok)throw new Error("Chart data is temporarily unavailable.");
  const data=await r.json();const points=data.prices||[];
  drawChart(canvas,points.map(p=>p[1]));
 }catch(e){const cv=$("#priceChart");if(cv){const c=cv.getContext("2d");c.clearRect(0,0,cv.width,cv.height);c.fillStyle="#93a3bf";c.font="12px system-ui";c.fillText("Chart unavailable — try again later.",12,25);}}
}
function drawChart(canvas,values){
 const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
 canvas.width=Math.max(1,rect.width*dpr);canvas.height=Math.max(1,rect.height*dpr);
 const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);
 const w=rect.width,h=rect.height,pad=12;
 if(values.length<2){ctx.fillStyle="#93a3bf";ctx.fillText("Not enough history available.",12,25);return;}
 const min=Math.min(...values),max=Math.max(...values),range=max-min||1;
 const coords=values.map((v,i)=>({x:pad+i/(values.length-1)*(w-pad*2),y:pad+(max-v)/range*(h-pad*2)}));
 const up=values[values.length-1]>=values[0],stroke=up?"#20c997":"#ff667d";
 ctx.beginPath();coords.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.lineWidth=2.3;ctx.strokeStyle=stroke;ctx.lineJoin="round";ctx.stroke();
 const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,up?"rgba(32,201,151,.22)":"rgba(255,102,125,.20)");grad.addColorStop(1,"rgba(10,20,40,0)");
 ctx.lineTo(coords[coords.length-1].x,h);ctx.lineTo(coords[0].x,h);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
 ctx.fillStyle="#93a3bf";ctx.font="10px system-ui";ctx.fillText(fmtPrice(max),pad,11);ctx.fillText(fmtPrice(min),pad,h-3);
}
function buildLocalSummary(coins){
 const usable=coins.filter(c=>Number.isFinite(c.price_change_percentage_24h));
 if(!usable.length)return "No current price-change data is available. Try refreshing in a moment.";
 const avg=usable.reduce((s,c)=>s+c.price_change_percentage_24h,0)/usable.length;
 const gainers=[...usable].sort((a,b)=>b.price_change_percentage_24h-a.price_change_percentage_24h).slice(0,3);
 const losers=[...usable].sort((a,b)=>a.price_change_percentage_24h-b.price_change_percentage_24h).slice(0,3);
 const mood=avg>.75?"positive across the tracked list":avg<-.75?"negative across the tracked list":"mixed, with no strong average direction";
 return `<h3>Market snapshot</h3><p>Across ${usable.length} tracked coins, the average 24-hour price change is <strong class="${changeClass(avg)}">${fmtPct(avg)}</strong>. Based on this simple average, movement is ${mood}. This is not a market-wide weighted index.</p><h3>Largest 24-hour gainers in the tracked list</h3><ul>${gainers.map(c=>`<li><strong>${safe(c.name)}</strong>: ${fmtPct(c.price_change_percentage_24h)}</li>`).join("")}</ul><h3>Largest 24-hour declines in the tracked list</h3><ul>${losers.map(c=>`<li><strong>${safe(c.name)}</strong>: ${fmtPct(c.price_change_percentage_24h)}</li>`).join("")}</ul><p class="muted">This summary describes recent data only. It does not forecast future prices.</p>`;
}
async function generateSummary(){
 const out=$("#summaryOutput"),btn=$("#generateSummary");btn.disabled=true;btn.textContent="Preparing summary…";out.innerHTML='<div class="loading-state"><span class="spinner"></span>Reviewing latest market data…</div>';
 const coins=allCoins().filter(c=>c.current_price!=null).slice(0,50);
 try{
  const r=await fetch("/.netlify/functions/summary",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({coins:coins.map(c=>({name:c.name,symbol:c.symbol,price:c.current_price,change24h:c.price_change_percentage_24h,marketCap:c.market_cap,volume:c.total_volume}))})});
  if(r.ok){const data=await r.json();if(data.summary){out.innerHTML=`<h3>Market snapshot</h3><p>${safe(data.summary).replace(/\n/g,"<br>")}</p><p class="muted">${data.mode==="ai"?"AI-generated from the supplied market data.":"Generated from current market data."} Informational only.</p>`;btn.disabled=false;btn.textContent="Generate market summary";return;}}
 }catch(_){}
 out.innerHTML=buildLocalSummary(coins);
 btn.disabled=false;btn.textContent="Generate market summary";
}
function setCurrency(newCurrency){localStorage.setItem("coinpulse_currency",newCurrency);loadMarkets();}
document.addEventListener("click",e=>{
 const star=e.target.closest("[data-star]");if(star){e.stopPropagation();toggleStar(star.dataset.star);if(state.selected)renderCoinDetail(state.selected);return;}
 const open=e.target.closest("[data-open]");if(open){openCoin(open.dataset.open);return;}
 const tab=e.target.closest("[data-view]");if(tab){setView(tab.dataset.view);return;}
 const range=e.target.closest("[data-range]");if(range){state.days=Number(range.dataset.range);renderCoinDetail(state.selected);return;}
});
$("#searchInput").addEventListener("input",e=>{const q=e.target.value;$("#clearSearch").hidden=!q;clearTimeout(state.searchTimer);state.searchTimer=setTimeout(()=>searchCoins(q),350);});
$("#clearSearch").addEventListener("click",()=>{$("#searchInput").value="";$("#clearSearch").hidden=true;state.searchResults=null;renderList();});
$("#sortSelect").addEventListener("change",renderList);
$("#showAllBtn").addEventListener("click",()=>{if(state.extraCoins.length){toast("The next 100 coins are already loaded.");return;}loadMarkets(true);});
$("#refreshBtn").addEventListener("click",()=>loadMarkets());
function goBack(){
 if(state.view==="details"){setView(state.previousView || "market");return;}
 if(state.view!=="market"){setView("market");return;}
 if($("#searchInput").value){$("#searchInput").value="";$("#clearSearch").hidden=true;state.searchResults=null;renderList();return;}
 toast("You are on the main market screen.");
}
$("#backToMarket").addEventListener("click",goBack);
$("#globalBackBtn").addEventListener("click",goBack);
$("#currencySelect").value=currency();
$("#currencySelect").addEventListener("change",e=>setCurrency(e.target.value));
$("#generateSummary").addEventListener("click",generateSummary);
$("#themeBtn").addEventListener("click",()=>{document.body.classList.toggle("light");localStorage.setItem("coinpulse_theme",document.body.classList.contains("light")?"light":"dark");});
$("#apiBtn").addEventListener("click",()=>{
 const current=localStorage.getItem("coinpulse_cg_key")||"";
 const key=prompt("Optional: paste your free CoinGecko Demo API key. Leave blank to remove it.",current);
 if(key===null)return;
 if(key.trim())localStorage.setItem("coinpulse_cg_key",key.trim());else localStorage.removeItem("coinpulse_cg_key");
 toast(key.trim()?"API key saved on this device":"API key removed");
 loadMarkets();
});
if(localStorage.getItem("coinpulse_theme")==="light")document.body.classList.add("light");
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();state.deferredInstall=e;$("#installBtn").hidden=false;});
$("#installBtn").addEventListener("click",async()=>{
 if(state.deferredInstall){
  state.deferredInstall.prompt();
  const choice=await state.deferredInstall.userChoice;
  if(choice && choice.outcome==="accepted") toast("Installing CoinPulse…");
  state.deferredInstall=null;
  return;
 }
 if(window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone){toast("CoinPulse is already installed.");return;}
 toast("To install: open Chrome menu ⋮ and choose Install app or Add to Home screen.");
 alert("Install CoinPulse on your phone:\n\nAndroid (Chrome): tap ⋮ → Install app or Add to Home screen.\n\niPhone (Safari): tap Share → Add to Home Screen.\n\nInstallation is available after this site is deployed over HTTPS on Netlify.");
});
window.addEventListener("appinstalled",()=>toast("CoinPulse installed successfully."));
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
saveWatchlist();loadMarkets();
setInterval(()=>{if(navigator.onLine)loadMarkets();},90000);
