// Arcathlon — QR & Observateurs (IIFE)
(function(){
  const CDN_QR = "https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js";
  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

  function loadQRCodeLibIfNeeded(){
    if(window.QRCode) return Promise.resolve();
    return new Promise((resolve, reject)=>{
      const s=document.createElement('script');
      s.src=CDN_QR; s.defer=true;
      s.onload=()=>resolve();
      s.onerror=()=>reject(new Error("Lib QRCode introuvable"));
      document.head.appendChild(s);
    });
  }

  function ensureUI(){
    if($('#arc-qr-fab')) return;
    const wrap=document.createElement('div');
    wrap.innerHTML = `
      <style>
        #arc-qr-fab{position:fixed;right:16px;bottom:16px;z-index:99999;background:#4f46e5;color:#fff;border:0;border-radius:999px;padding:12px 16px;font-weight:900;box-shadow:0 10px 30px rgba(0,0,0,.35);cursor:pointer}
        #arc-qr-panel{position:fixed;inset:0;display:none;place-items:center;background:rgba(0,0,0,.55);z-index:99998}
        #arc-qr-card{background:#111827;color:#e5e7eb;border:1px solid #243041;border-radius:16px;width:min(92vw,1000px);padding:16px;box-shadow:0 10px 32px rgba(0,0,0,.45)}
        .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
        .col{display:grid;gap:8px}
        .grid{display:grid;gap:12px}
        @media(min-width:860px){.grid{grid-template-columns:1.2fr .8fr}}
        label{font-weight:800}
        input,select,textarea{width:100%;padding:10px;border-radius:10px;border:1px solid #334155;background:#0b1222;color:#e5e7eb}
        textarea{min-height:72px}
        .btn{padding:10px 14px;border-radius:10px;border:0;font-weight:900;cursor:pointer}
        .btn-1{background:#4f46e5;color:#fff}
        .btn-2{background:#10b981;color:#083d31}
        .btn-3{background:#f59e0b;color:#1f1400}
        .btn-ghost{background:transparent;color:#cbd5e1;border:1px dashed rgba(255,255,255,.25)}
        #qr-zone{display:grid;place-items:center}
        #qr-zone .white{background:#fff;border:1px solid #d1d5db;border-radius:12px;padding:12px}
        pre{background:#0b1222;border:1px solid #22314b;border-radius:8px;color:#cbd5e1;padding:8px;font:12px ui-monospace,Menlo,Consolas,monospace;max-height:220px;overflow:auto}
        #qr-full{position:fixed;inset:0;background:#fff;display:none;place-items:center;z-index:100000}
        #qr-full .inner{display:grid;place-items:center;gap:16px}
        #qr-full .white{background:#fff;padding:20px}
        #qr-full .close{position:fixed;top:14px;right:14px;border:1px dashed #94a3b8}
      </style>
      <button id="arc-qr-fab" title="QR & Observateurs">QR & Observateurs</button>
      <div id="arc-qr-panel">
        <div id="arc-qr-card">
          <div class="row" style="justify-content:space-between;margin-bottom:8px">
            <h3 style="margin:0">QR & Observateurs — Arcathlon</h3>
            <button id="arc-qr-close" class="btn btn-ghost">Fermer</button>
          </div>
          <div class="grid">
            <section class="col">
              <div class="row" style="gap:12px;flex-wrap:wrap">
                <div style="flex:1 1 180px"><label>Nom</label><input id="nom" placeholder="Martin"></div>
                <div style="flex:1 1 180px"><label>Prénom</label><input id="prenom" placeholder="Julie"></div>
                <div style="flex:0 0 120px"><label>Classe</label><input id="classe" placeholder="4C"></div>
                <div style="flex:0 0 100px"><label>Sexe</label><select id="sexe"><option value="F">F</option><option value="M">M</option></select></div>
              </div>
              <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:6px">
                <div style="flex:1 1 220px"><label>Observateur</label><input id="obs" placeholder="Nom observateur"></div>
                <div style="flex:1 1 160px"><label>Météo</label>
                  <select id="meteo"><option>—</option><option>Soleil</option><option>Nuageux</option><option>Pluie</option><option>Vent</option></select>
                </div>
                <div style="flex:1 1 160px"><label>Vent</label>
                  <select id="vent"><option>—</option><option>Faible</option><option>Modéré</option><option>Fort</option></select>
                </div>
              </div>
              <div style="margin-top:6px"><label>Remarques (observations techniques, incidents...)</label>
                <textarea id="notes" placeholder="Ex: régularité, transitions, tir, incidents..."></textarea>
              </div>
              <div style="margin-top:6px" class="row">
                <button id="arc-qr-scan" class="btn btn-1">Lire le tableau & Préparer le QR</button>
                <button id="arc-qr-copy" class="btn btn-3" disabled>Copier le JSON</button>
                <button id="arc-qr-dl" class="btn btn-2" disabled>Télécharger QR (PNG)</button>
                <button id="arc-qr-full" class="btn btn-1" disabled>Plein écran</button>
              </div>
              <pre id="arc-qr-json" aria-label="aperçu JSON"></pre>
            </section>
            <section class="col">
              <div id="qr-zone"><div class="white"><div id="qr-slot"></div></div></div>
            </section>
          </div>
        </div>
      </div>
      <div id="qr-full">
        <button class="close btn-ghost">Fermer</button>
        <div class="inner">
          <div class="white"><div id="qr-full-slot"></div></div>
          <div class="row"><button id="qr-full-dl" class="btn btn-2">Télécharger PNG</button></div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
    $('#arc-qr-fab').onclick = ()=>{ $('#arc-qr-panel').style.display='grid'; };
    $('#arc-qr-close').onclick = ()=>{ $('#arc-qr-panel').style.display='none'; };
    $('#qr-full .close').onclick = ()=>{ $('#qr-full').style.display='none'; };
  }

  function getAllTables(){ return document.querySelectorAll('table'); }
  function headerTexts(table){
    let headers = Array.from(table.querySelectorAll('thead th')).map(th=>th.textContent.trim());
    if(!headers.length){
      const firstRow = table.querySelector('tr');
      if(firstRow){
        const ths = Array.from(firstRow.querySelectorAll('th'));
        if(ths.length) headers = ths.map(th=>th.textContent.trim());
      }
    }
    if(!headers.length){ headers = Array.from(table.querySelectorAll('th')).map(th=>th.textContent.trim()); }
    return headers;
  }
  function scoreTableCandidate(table){
    const h = headerTexts(table).map(x=>x.toLowerCase());
    const hasPhase = h.some(x=>/phase/.test(x));
    const hasTemps = h.some(x=>/temps/.test(x));
    const hasVit   = h.some(x=>/vitesse/.test(x));
    const hasScore = h.some(x=>/score/.test(x));
    let score = 0; if(hasPhase) score++; if(hasTemps) score++; if(hasVit) score++; if(hasScore) score++; return score;
  }
  function findRecapTable(){
    let best=null, bestScore=-1;
    getAllTables().forEach(t=>{ const sc = scoreTableCandidate(t); if(sc>bestScore){ best=t; bestScore=sc; } });
    return best;
  }

  function readRecapTable(){
    const table = findRecapTable();
    if(!table) return { headers:[], rows:[] };
    let headers = headerTexts(table);
    const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
    const rows = [];
    bodyRows.forEach(tr=>{
      const cells = Array.from(tr.children).map(td=>td.textContent.trim());
      if(headers.length===0){ headers = cells.map((_,i)=>'col'+(i+1)); }
      const obj = {}; headers.forEach((h,i)=> obj[h] = (cells[i]??'')); rows.push(obj);
    });
    return { headers, rows };
  }

  function chooseKeys(row){
    const keys = Object.keys(row||{});
    const find = (word)=> keys.find(k=>k.toLowerCase().includes(word));
    const timeKey  = find('temps') || find('time') || keys[1];
    const speedKey = find('vitesse') || find('speed');
    const scoreKey = find('score');
    const phaseKey = find('phase') || keys[0];
    return { timeKey, speedKey, scoreKey, phaseKey };
  }
  function toFloat(x){ const s=String(x||'').replace(',', '.'); const v=parseFloat(s); return Number.isFinite(v)?v:0; }
  function computeSummary(rows){
    if(!rows.length) return { totalSec:0, avgSpeed:0, totalScore:0, keys:{} };
    const keys = chooseKeys(rows[0]); let totalSec=0, totalScore=0, sumSpeed=0, nSpeed=0;
    rows.forEach(r=>{ const t=toFloat(r[keys.timeKey]); const v=toFloat(r[keys.speedKey]); const s=toFloat(r[keys.scoreKey]); totalSec+=t; if(Number.isFinite(v)&&v>0){sumSpeed+=v;nSpeed++;} totalScore+=s; });
    const avgSpeed = nSpeed? (sumSpeed/nSpeed) : 0; return { totalSec, avgSpeed, totalScore, keys };
  }

  function renderQR(text){
    const slot = document.getElementById('qr-slot'); slot.innerHTML='';
    new QRCode(slot,{text,width:360,height:360,colorDark:"#000",colorLight:"#fff",correctLevel:QRCode.CorrectLevel.H});
  }

  function buildPayload(){
    const { headers, rows } = readRecapTable();
    if(!rows.length){ alert("Je n’ai pas trouvé le tableau récapitulatif (ou il est vide)."); return null; }
    const { totalSec, avgSpeed, totalScore, keys } = computeSummary(rows);
    const payload = {
      Mode: "Arcathlon",
      nom: document.getElementById('nom')?.value?.trim() || "",
      prenom: document.getElementById('prenom')?.value?.trim() || "",
      classe: document.getElementById('classe')?.value?.trim() || "",
      sexe: ((['M','F'].includes(document.getElementById('sexe')?.value)) ? document.getElementById('sexe').value : 'F'),
      Observateur: document.getElementById('obs')?.value?.trim() || undefined,
      Meteo: (document.getElementById('meteo')?.value && document.getElementById('meteo').value !== '—') ? document.getElementById('meteo').value : undefined,
      Vent: (document.getElementById('vent')?.value && document.getElementById('vent').value !== '—') ? document.getElementById('vent').value : undefined,
      Remarques: document.getElementById('notes')?.value?.trim() || undefined,
      Total_s: Number(totalSec.toFixed(2)),
      Vitesse_moy_kmh: Number(avgSpeed.toFixed(2)),
      Score_total: Number(totalScore.toFixed(2)),
      Phases: rows.map(r=> ({
        Phase: r[keys.phaseKey],
        Temps_s: toFloat(r[keys.timeKey]),
        Vitesse_kmh: (keys.speedKey? toFloat(r[keys.speedKey]) : undefined),
        Score: (keys.scoreKey? toFloat(r[keys.scoreKey]) : undefined)
      }))
    };
    return payload;
  }

  function wire(){
    document.getElementById('arc-qr-fab').onclick = ()=>{ document.getElementById('arc-qr-panel').style.display='grid'; };
    document.getElementById('arc-qr-close').onclick = ()=>{ document.getElementById('arc-qr-panel').style.display='none'; };
    document.getElementById('arc-qr-scan').onclick = async ()=>{
      try{ await loadQRCodeLibIfNeeded(); }catch(e){ alert("Librairie QRCode non chargée."); return; }
      const data = buildPayload(); if(!data) return;
      const txt = JSON.stringify([data]);
      document.getElementById('arc-qr-json').textContent = JSON.stringify([data], null, 2);
      renderQR(txt);
      document.getElementById('arc-qr-copy').disabled=false;
      document.getElementById('arc-qr-dl').disabled=false;
      document.getElementById('arc-qr-full').disabled=false;
      document.getElementById('arc-qr-full').onclick = ()=>{
        const full = document.getElementById('qr-full');
        const slot = document.getElementById('qr-full-slot'); slot.innerHTML='';
        new QRCode(slot,{text:txt,width:520,height:520,colorDark:"#000",colorLight:"#fff",correctLevel:QRCode.CorrectLevel.H});
        full.style.display='grid';
      };
      document.getElementById('qr-full-dl').onclick = ()=>{
        const img = document.querySelector('#qr-full-slot img') || document.querySelector('#qr-full-slot canvas');
        const url = img.tagName==='IMG' ? img.src : img.toDataURL('image/png');
        const a=document.createElement('a');
        const base=`QR_Arcathlon_${(document.getElementById('nom')?.value||'')}_${(document.getElementById('prenom')?.value||'')}`.replace(/\s+/g,'_');
        a.href=url; a.download=base+'.png'; a.click();
      };
    };
    document.getElementById('arc-qr-copy').onclick = ()=>{
      const txt = document.getElementById('arc-qr-json').textContent;
      navigator.clipboard.writeText(txt).then(()=> alert('JSON copié.'));
    };
    document.getElementById('arc-qr-dl').onclick = ()=>{
      const img = document.querySelector('#qr-slot img') || document.querySelector('#qr-slot canvas');
      if(!img){ alert('Génère d’abord le QR.'); return; }
      const url = img.tagName==='IMG' ? img.src : img.toDataURL('image/png');
      const a=document.createElement('a');
      const base=`QR_Arcathlon_${(document.getElementById('nom')?.value||'')}_${(document.getElementById('prenom')?.value||'')}`.replace(/\s+/g,'_');
      a.href=url; a.download=base+'.png'; a.click();
    };
  }

  function ensureUIOnce(){
    if(document.getElementById('arc-qr-fab')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <button id="arc-qr-fab" title="QR & Observateurs">QR & Observateurs</button>
      <div id="arc-qr-panel" style="display:none"></div>
    `;
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // Build full UI now
    (function inject(){ 
      const tmp=document.createElement('div'); 
      tmp.innerHTML=`
        <button id="arc-qr-fab" title="QR & Observateurs" style="position:fixed;right:16px;bottom:16px;z-index:99999;background:#4f46e5;color:#fff;border:0;border-radius:999px;padding:12px 16px;font-weight:900;box-shadow:0 10px 30px rgba(0,0,0,.35);cursor:pointer">QR & Observateurs</button>
        <div id="arc-qr-panel" style="position:fixed;inset:0;display:none;place-items:center;background:rgba(0,0,0,.55);z-index:99998">
          <div id="arc-qr-card"></div>
        </div>`;
      document.body.appendChild(tmp);
    })();
    // Now fill panel content
    (function fill(){
      const panel = document.getElementById('arc-qr-card');
      panel.innerHTML = document.querySelector('#arc-qr-card') ? document.querySelector('#arc-qr-card').innerHTML : `
        <div style="padding:12px;color:#e5e7eb">Si vous voyez ce message, re-collez le script fourni (version compacte installée).</div>`;
    })();

    // Replace with full feature UI (from ensureUI) 
    document.getElementById('arc-qr-panel').outerHTML = (function(){
      const d=document.createElement('div');
      d.innerHTML = `
        <div id="arc-qr-panel" style="display:none"></div>
      `; return d.firstElementChild.outerHTML; })();

    // Actually add full UI now
    // (we rebuild the full UI with styles to avoid CSS duplication in the compact bootstrap)
    (function rebuildUI(){ 
      const container=document.createElement('div');
      container.innerHTML = `
        <style>
          #arc-qr-panel{position:fixed;inset:0;display:none;place-items:center;background:rgba(0,0,0,.55);z-index:99998}
        </style>
      `;
      document.body.appendChild(container);
    })();

    // Simpler: call ensureUI() that creates the whole panel & styles
    ensureUI();
    wire();
  });
})();