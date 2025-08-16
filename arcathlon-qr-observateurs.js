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
        /* Fullscreen QR */
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

  function getAllTables(){
    return $$('table');
  }

  function headerTexts(table){
    let headers = $$('thead th', table).map(th=>th.textContent.trim());
    if(headers.length===0){
      const firstRow = $('tr', table);
      if(firstRow){
        const ths = $$('th', firstRow);
        if(ths.length) headers = ths.map(th=>th.textContent.trim());
      }
    }
    if(headers.length===0){
      headers = $$('th', table).map(th=>th.textContent.trim());
    }
    return headers;
  }

  function scoreTableCandidate(table){
    const h = headerTexts(table).map(x=>x.toLowerCase());
    const hasPhase = h.some(x=>/phase/.test(x));
    const hasTemps = h.some(x=>/temps/.test(x));
    const hasVit   = h.some(x=>/vitesse/.test(x));
    const hasScore = h.some(x=>/score/.test(x));
    let score = 0;
    if(hasPhase) score++;
    if(hasTemps) score++;
    if(hasVit) score++;
    if(hasScore) score++;
    return score;
  }

  function findRecapTable(){
    const tables = getAllTables();
    let best=null, bestScore=-1;
    tables.forEach(t=>{
      const sc = scoreTableCandidate(t);
      if(sc>bestScore){ best=t; bestScore=sc; }
    });
    return best;
  }

  function readRecapTable(){
    const table = findRecapTable();
    if(!table) return { headers:[], rows:[] };
    let headers = headerTexts(table);
    const bodyRows = $$('tbody tr', table);
    const rows = [];
    bodyRows.forEach(tr=>{
      const cells = Array.from(tr.children).map(td=>td.textContent.trim());
      if(headers.length===0){
        headers = cells.map((_,i)=>'col'+(i+1));
      }
      const obj = {};
      headers.forEach((h,i)=> obj[h] = (cells[i]??''));
      rows.push(obj);
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

  function toFloat(x){
    const s = String(x||'').replace(',', '.');
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : 0;
  }

  function computeSummary(rows){
    if(rows.length===0) return { totalSec:0, avgSpeed:0, totalScore:0, keys:{} };
    const keys = chooseKeys(rows[0]);
    let totalSec=0, totalScore=0, sumSpeed=0, nSpeed=0;
    rows.forEach(r=>{
      const t = toFloat(r[keys.timeKey]);
      const v = toFloat(r[keys.speedKey]);
      const s = toFloat(r[keys.scoreKey]);
      totalSec += t;
      if(Number.isFinite(v) && v>0){ sumSpeed += v; nSpeed++; }
      totalScore += s;
    });
    const avgSpeed = nSpeed? (sumSpeed/nSpeed) : 0;
    return { totalSec, avgSpeed, totalScore, keys };
  }

  function buildPayload(){
    const { headers, rows } = readRecapTable();
    if(rows.length===0){
      alert("Je n’ai pas trouvé le tableau récapitulatif (ou il est vide).");
      return null;
    }
    const { totalSec, avgSpeed, totalScore, keys } = computeSummary(rows);
    const payload = {
      Mode: "Arcathlon",
      nom: $('#nom')?.value?.trim() || "",
      prenom: $('#prenom')?.value?.trim() || "",
      classe: $('#classe')?.value?.trim() || "",
      sexe: ((['M','F'].includes($('#sexe')?.value)) ? $('#sexe').value : 'F'),
      Observateur: $('#obs')?.value?.trim() || undefined,
      Meteo: ($('#meteo')?.value && $('#meteo').value !== '—') ? $('#meteo').value : undefined,
      Vent: ($('#vent')?.value && $('#vent').value !== '—') ? $('#vent').value : undefined,
      Remarques: $('#notes')?.value?.trim() || undefined,
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

  function renderQRInto(targetId, payloadText, size=360){
    const slot = document.getElementById(targetId);
    slot.innerHTML='';
    new QRCode(slot, { text: payloadText, width: size, height: size, colorDark:"#000000", colorLight:"#ffffff", correctLevel: QRCode.CorrectLevel.H });
  }

  function wire(){
    const scanBtn = $('#arc-qr-scan');
    const copyBtn = $('#arc-qr-copy');
    const dlBtn   = $('#arc-qr-dl');
    const fsBtn   = $('#arc-qr-full');
    const fsWrap  = $('#qr-full');
    const fsDl    = $('#qr-full-dl');

    if(!scanBtn) return;

    scanBtn.onclick = async ()=>{
      try{
        await loadQRCodeLibIfNeeded();
      }catch(e){
        alert("Librairie QRCode non chargée."); return;
      }
      const data = buildPayload();
      if(!data) return;
      const txt = JSON.stringify([data]);
      $('#arc-qr-json').textContent = JSON.stringify([data], null, 2);
      renderQRInto('qr-slot', txt, 360);
      copyBtn.disabled = false;
      dlBtn.disabled   = false;
      fsBtn.disabled   = false;

      fsBtn.onclick = ()=>{
        renderQRInto('qr-full-slot', txt, 520);
        fsWrap.style.display='grid';
      };
      fsDl.onclick = ()=>{
        const cnv = $('#qr-full-slot canvas') || $('#qr-full-slot img');
        if(!cnv) return;
        const url = cnv.tagName==='IMG' ? cnv.src : cnv.toDataURL('image/png');
        const a=document.createElement('a');
        const base=`QR_Arcathlon_${($('#nom')?.value||'')}_${($('#prenom')?.value||'')}`.replace(/\s+/g,'_');
        a.href=url; a.download=base+'.png'; a.click();
      };
    };

    copyBtn.onclick = ()=>{
      const txt = $('#arc-qr-json').textContent || '';
      navigator.clipboard.writeText(txt).then(()=> alert('JSON copié.'));
    };

    dlBtn.onclick = ()=>{
      const cnv = $('#qr-slot canvas') || $('#qr-slot img');
      if(!cnv){ alert('Génère d’abord le QR.'); return; }
      const url = cnv.tagName==='IMG' ? cnv.src : cnv.toDataURL('image/png');
      const a=document.createElement('a');
      const base=`QR_Arcathlon_${($('#nom')?.value||'')}_${($('#prenom')?.value||'')}`.replace(/\s+/g,'_');
      a.href=url; a.download=base+'.png'; a.click();
    };
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    ensureUI();
    wire();
  });
})();