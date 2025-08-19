// Arcathlon Spirale v3.2 – Ciné-mode + QR Bilan (ScanProf/points)
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const SVGNS = "http://www.w3.org/2000/svg";
  const ALLOWED = [0,6,7,8,9,10];

  // QRCode lib (cdn)
  const QRCDN = "https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js";
  function loadQRLIB(){
    return new Promise((resolve,reject)=>{
      if(window.QRCode) return resolve();
      const s=document.createElement('script'); s.src=QRCDN; s.defer=true;
      s.onload=()=>resolve(); s.onerror=()=>reject(new Error('QRCode CDN introuvable'));
      document.head.appendChild(s);
    });
  }

  const state = {
    board: [],
    teams: [
      { name:"Équipe A", color:"#5ac8fa", p1:"A1", p2:"A2", pos:0, skip:0, arrowsPerShooter:3, cumul:0 },
      { name:"Équipe B", color:"#ff7b7b", p1:"B1", p2:"B2", pos:0, skip:0, arrowsPerShooter:3, cumul:0 },
    ],
    round: 1,
    history: [],
    cineAuto: JSON.parse(localStorage.getItem("cineAuto") || "true")
  };

  /* ---------- helpers ---------- */
  function toast(html){ const dlg=$("#modal"); $("#modal-content").innerHTML=html; dlg.showModal(); }
  function closeToast(){ $("#modal").close(); }
  function save(){ localStorage.setItem("arcathlon-spirale-v32", JSON.stringify(state)); }
  function load(){ const t=localStorage.getItem("arcathlon-spirale-v32"); if(!t) return false; try{ Object.assign(state, JSON.parse(t)); return true;}catch{ return false; } }

  /* ---------- Fullscreen / Ciné-mode ---------- */
  async function enterCine(){ document.body.classList.add("cine"); $("#hud").hidden=false; const wrap=$("#board-wrap"); try{ if(wrap.requestFullscreen) await wrap.requestFullscreen(); }catch{} }
  async function exitCine(){ $("#hud").hidden=true; document.body.classList.remove("cine"); try{ if(document.fullscreenElement) await document.exitFullscreen(); }catch{} }

  /* ---------- Spiral board ---------- */
  function spiralPos(i){ const cx=500, cy=500, step=0.44, a=30, b=11; const th=i*step, r=a+b*th; return { x: cx + r*Math.cos(th), y: cy + r*Math.sin(th) }; }
  function renderBoard(){
    const svg=$("#board"); svg.innerHTML="";
    const defs=document.createElementNS(SVGNS,"defs");
    const grad=document.createElementNS(SVGNS,"radialGradient"); grad.setAttribute("id","finishGrad");
    const s1=document.createElementNS(SVGNS,"stop"); s1.setAttribute("offset","0%"); s1.setAttribute("stop-color","#ffb703");
    const s2=document.createElementNS(SVGNS,"stop"); s2.setAttribute("offset","100%"); s2.setAttribute("stop-color","#7b2cbf");
    grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad); svg.appendChild(defs);
    state.board.forEach((sq,i)=>{
      const g=document.createElementNS(SVGNS,"g"); g.setAttribute("class","square"+(sq.type? " "+sq.type:"")+(i===state.board.length-1?" finish":""));
      const {x,y}=spiralPos(i); g.setAttribute("transform",`translate(${x-26},${y-20})`);
      const r=document.createElementNS(SVGNS,"rect"); r.setAttribute("width","52"); r.setAttribute("height","40"); r.setAttribute("rx","10"); r.setAttribute("ry","10");
      const t=document.createElementNS(SVGNS,"text"); t.setAttribute("x","26"); t.setAttribute("y","24"); t.setAttribute("text-anchor","middle"); t.textContent = sq.hidden ? "?" : (sq.label || i);
      const title=document.createElementNS(SVGNS,"title"); title.textContent = sq.hidden ? "Mystère" : (sq.label || ("Case "+i));
      g.appendChild(r); g.appendChild(t); g.appendChild(title); svg.appendChild(g);
    });
    placeTokens(true);
  }
  function placeTokens(initial=false){
    $$(".token", $("#board")).forEach(n=>n.remove());
    state.teams.forEach((tm,idx)=>{
      const {x,y}=spiralPos(tm.pos);
      const g=document.createElementNS(SVGNS,"g"); g.setAttribute("class","token duo"); g.setAttribute("transform",`translate(${x-6},${y-34})`);
      const c1=document.createElementNS(SVGNS,"circle"); c1.setAttribute("class","c1"); c1.setAttribute("r","7"); c1.setAttribute("cx","6"); c1.setAttribute("cy","6"); c1.setAttribute("fill",tm.color);
      const ring1=document.createElementNS(SVGNS,"circle"); ring1.setAttribute("class","inner c1"); ring1.setAttribute("r","10"); ring1.setAttribute("cx","6"); ring1.setAttribute("cy","6");
      const c2=document.createElementNS(SVGNS,"circle"); c2.setAttribute("class","c2"); c2.setAttribute("r","7"); c2.setAttribute("cx","6"); c2.setAttribute("cy","6"); c2.setAttribute("fill",tm.color);
      const ring2=document.createElementNS(SVGNS,"circle"); ring2.setAttribute("class","inner c2"); ring2.setAttribute("r","10"); ring2.setAttribute("cx","6"); ring2.setAttribute("cy","6");
      const title=document.createElementNS(SVGNS,"title"); title.textContent=`${tm.name} (#${tm.pos})`;
      g.appendChild(c1); g.appendChild(ring1); g.appendChild(c2); g.appendChild(ring2); g.appendChild(title); $("#board").appendChild(g);
    });
    if(initial) return;
  }

  /* ---------- FX ---------- */
  function confettiBurst(count=160){
    const fx=$("#fx-layer"); const colors=["#5ac8fa","#2dd4bf","#16db65","#ffd166","#a78bfa","#ff7b7b"];
    const w=fx.clientWidth;
    for(let i=0;i<count;i++){
      const d=document.createElement("div"); d.className="confetti"; d.style.left = Math.random()*w + "px"; d.style.top = "-10px";
      d.style.background = colors[Math.floor(Math.random()*colors.length)]; d.style.animationDelay = (Math.random()*300)+"ms";
      fx.appendChild(d); setTimeout(()=> d.remove(), 1400);
    }
  }
  function highlightPath(from, steps){
    const delay=70;
    for(let i=1;i<=steps;i++){ const idx=Math.min(from+i, state.board.length-1); const g=$$(".square")[idx];
      setTimeout(()=> g && g.classList.add("highlight"), i*delay);
      setTimeout(()=> g && g.classList.remove("highlight"), (i*delay)+500);
    }
  }
  function hudMessage(html){ $("#hud-text").innerHTML = html; }
  function moveTeamAnimated(teamIndex, steps){
    return new Promise(resolve=>{
      if(steps===0) return resolve();
      const t=state.teams[teamIndex]; let remaining=Math.abs(steps), dir=Math.sign(steps);
      const tick=()=>{ t.pos=Math.max(0,Math.min(t.pos+dir, state.board.length-1)); placeTokens(); remaining--; if(remaining>0) setTimeout(tick, 180); else resolve(); };
      setTimeout(tick, 120);
    });
  }

  /* ---------- Inputs ---------- */
  function buildArcherUI(id, name, teamIndex){
    const host=$("#"+id); host.innerHTML="";
    const title=document.createElement("div"); title.className="who"; title.textContent=name; host.appendChild(title);
    const maxArrows=state.teams[teamIndex].arrowsPerShooter || 3;
    for(let i=1;i<=maxArrows;i++){
      const row=document.createElement("div"); row.className="arrow-row";
      const badge=document.createElement("span"); badge.className="badge"; badge.textContent=`Flèche ${i}`;
      const group=document.createElement("div"); group.className="value-group"; group.dataset.for=`${id}-a${i}`;
      ALLOWED.forEach(v=>{ const b=document.createElement("button"); b.className="value-btn"; b.type="button"; b.textContent=String(v); b.dataset.val=String(v); b.setAttribute("aria-pressed","false");
        b.addEventListener("click",()=>{ $$(".value-btn",group).forEach(x=>x.setAttribute("aria-pressed","false")); b.setAttribute("aria-pressed","true"); computeLiveTotals(); });
        group.appendChild(b);
      });
      const best=document.createElement("span"); best.className="best"; best.id=`${id}-a${i}-sel`;
      row.appendChild(badge); row.appendChild(group); row.appendChild(best); host.appendChild(row);
    }
  }
  function getArrowValue(ref){ const g=$(`.value-group[data-for="${ref}"]`); const pressed=g?$(`.value-btn[aria-pressed="true"]`,g):null; return pressed?Number(pressed.dataset.val):0; }
  function bestOfShooter(prefix, teamIndex){ const arrows=state.teams[teamIndex].arrowsPerShooter || 3; const vals=[]; for(let i=1;i<=arrows;i++) vals.push(getArrowValue(`${prefix}-a${i}`)); return Math.max(...vals,0); }
  function computeTotals(){ const bestA1=bestOfShooter("A1",0), bestA2=bestOfShooter("A2",0); const bestB1=bestOfShooter("B1",1), bestB2=bestOfShooter("B2",1);
    return { A:{shooters:[bestA1,bestA2], total: bestA1+bestA2}, B:{shooters:[bestB1,bestB2], total: bestB1+bestB2} }; }
  function computeLiveTotals(){ const t=computeTotals(); $("#A-total").textContent=t.A.total; $("#B-total").textContent=t.B.total; }

  /* ---------- Effects ---------- */
  function revealMystery(sq){ const choices=[ {type:"bonus",value:2,label:"+2 bonus"}, {type:"malus",value:2,label:"-2 malus"}, {type:"skip",value:1,label:"Saut 1 tour"}, {type:"teleport",value:6,label:"Téléport → 6"}, {type:"steal",value:1,label:"Vole une flèche"} ];
    Object.assign(sq, choices[Math.floor(Math.random()*choices.length)], {hidden:false}); }
  function applyEffect(teamIndex, sq, lastAdvance){
    const team=state.teams[teamIndex]; let msg="";
    if(sq.hidden) revealMystery(sq);
    switch(sq.type){
      case "bonus": team.pos=Math.min(team.pos+(sq.value||0), state.board.length-1); msg=`Bonus +${sq.value}`; break;
      case "malus": team.pos=Math.max(team.pos-(sq.value||0), 0); msg=`Malus -${sq.value}`; break;
      case "skip": team.skip=(team.skip||0)+1; msg=`⏭️ Sautera le prochain tour`; break;
      case "teleport": { const dest=Number(sq.value||0); team.pos = dest<=state.board.length-1 ? dest : Math.min(state.board.length-1, team.pos+dest); msg=`🌀 Téléport → #${team.pos}`; } break;
      case "goal": msg=`🎯 Objectif atteint : ${sq.label}`; break;
      case "replay": msg=`🔁 Rejoue immédiatement (+${lastAdvance})`; break;
      case "steal": { const opp=1-teamIndex; state.teams[opp].arrowsPerShooter=2; msg=`🟡 Vole une flèche : l’adversaire aura 2 flèches/tireur au prochain tour`; } break;
      default: msg=""; break;
    }
    return msg;
  }

  async function runRoundAnimation(totals){
    if(state.cineAuto) await enterCine();
    const fromA=state.teams[0].pos, fromB=state.teams[1].pos;
    const toA=Math.min(fromA+totals.A.total, state.board.length-1);
    const toB=Math.min(fromB+totals.B.total, state.board.length-1);
    hudMessage(`<span>${state.teams[0].name} :</span> <b>${totals.A.shooters[0]}</b> + <b>${totals.A.shooters[1]}</b> = <b>${totals.A.total}</b> &nbsp;|&nbsp; <span>${state.teams[1].name} :</span> <b>${totals.B.shooters[0]}</b> + <b>${totals.B.shooters[1]}</b> = <b>${totals.B.total}</b>`);
    highlightPath(fromA, totals.A.total); highlightPath(fromB, totals.B.total);
    await moveTeamAnimated(0, totals.A.total); let logs=[]; const sqA=state.board[state.teams[0].pos]; const eA=applyEffect(0, sqA, totals.A.total); if(eA){ logs.push(`${state.teams[0].name}: ${eA}`); placeTokens(); } if(sqA.type==="replay"){ await moveTeamAnimated(0, totals.A.total); }
    await moveTeamAnimated(1, totals.B.total); const sqB=state.board[state.teams[1].pos]; const eB=applyEffect(1, sqB, totals.B.total); if(eB){ logs.push(`${state.teams[1].name}: ${eB}`); placeTokens(); } if(sqB.type==="replay"){ await moveTeamAnimated(1, totals.B.total); }
    if(state.teams[0].pos===state.board.length-1 || state.teams[1].pos===state.board.length-1) confettiBurst(180);
    await new Promise(r=>setTimeout(r, 350)); await exitCine(); return logs;
  }

  function pushHistory(from,to){ state.history.push({ round: state.round, from:[...from], to:[...to], snapshot: JSON.stringify(state) }); }

  async function undoAnimated(){
    if(state.history.length===0){ toast("Rien à annuler."); return; }
    const last=state.history.pop();
    if(state.cineAuto) await enterCine();
    const cur=[state.teams[0].pos, state.teams[1].pos];
    const deltaA=last.from[0]-cur[0], deltaB=last.from[1]-cur[1];
    await moveTeamAnimated(0, deltaA); await moveTeamAnimated(1, deltaB);
    const prev=JSON.parse(last.snapshot); Object.assign(state, prev);
    $("#round-no").textContent=state.round;
    $("#A-debuff").hidden = state.teams[0].arrowsPerShooter !== 2;
    $("#B-debuff").hidden = state.teams[1].arrowsPerShooter !== 2;
    buildArcherUI("A1", state.teams[0].p1, 0); buildArcherUI("A2", state.teams[0].p2, 0); buildArcherUI("B1", state.teams[1].p1, 1); buildArcherUI("B2", state.teams[1].p2, 1);
    computeLiveTotals(); save(); await new Promise(r=>setTimeout(r, 250)); await exitCine();
  }

  /* ---------- Default board ---------- */
  function defaultBoard(){
    const N=63, sp={
      4:{type:"goal",label:"🎯 Objectif: Avance +4"}, 5:{type:"bonus",value:2,label:"+2 bonus"}, 8:{type:"goal",label:"🎯 Objectif: → +10"}, 9:{type:"malus",value:2,label:"-2 malus"},
      12:{type:"goal",label:"🎯 Objectif: Rejouer"}, 13:{type:"skip",value:1,label:"Saut 1 tour"}, 16:{type:"goal",label:"🎯 Objectif: Vole 1 flèche"},
      19:{type:"teleport",value:6,label:"Téléport → 6"}, 23:{type:"bonus",value:3,label:"+3 bonus"}, 27:{type:"mystery",value:0,label:"Mystère ?",hidden:true},
      31:{type:"bonus",value:2,label:"+2 bonus"}, 34:{type:"replay",value:0,label:"Rejouer"}, 36:{type:"malus",value:3,label:"-3 malus"}, 41:{type:"mystery",value:0,label:"Mystère ?",hidden:true},
      45:{type:"skip",value:1,label:"Saut 1 tour"}, 48:{type:"steal",value:1,label:"Vole 1 flèche"}, 50:{type:"bonus",value:2,label:"+2 bonus"}, 54:{type:"malus",value:4,label:"-4 malus"},
      58:{type:"teleport",value:32,label:"Téléport → 32"}, 60:{type:"mystery",value:0,label:"Mystère ?",hidden:true}
    };
    const arr=[]; for(let i=0;i<=N;i++){ if(i===0) arr.push({index:i,label:"Départ",type:"",value:0}); else if(i===N) arr.push({index:i,label:"Arrivée 🎯",type:"",value:0}); else if(sp[i]) arr.push({index:i, ...sp[i]}); else arr.push({index:i,label:String(i),type:"",value:0}); }
    return arr;
  }

  /* ---------- QR: build records ---------- */
  function computeBilan(){
    // cumuls points = somme des totaux de tour
    return state.teams.map((t,idx)=>({ name:t.name, cumul:t.cumul, pos:t.pos, idx }));
  }
  function getWinnerName(){
    if(state.teams[0].pos===state.board.length-1 && state.teams[1].pos===state.board.length-1) return "Égalité";
    if(state.teams[0].pos===state.board.length-1) return state.teams[0].name;
    if(state.teams[1].pos===state.board.length-1) return state.teams[1].name;
    // sinon: leader par position puis cumul
    const b=computeBilan().sort((a,b)=> b.pos-a.pos || b.cumul-a.cumul);
    return b[0]?.name || "";
  }
  function buildQRDataPoints({classe,sexe}){
    const winner=getWinnerName();
    const items=state.teams.map(t=>({ nom: t.name, prenom:"", classe, sexe: (sexe==='M'?'M':'F'), points_total: String(t.cumul), vainqueur: t.name===winner }));
    return JSON.stringify(items);
  }
  // “v4” mode as a fallback: encode cumul points sur des clés "200","400"… sous forme ss -> mm:ss (pour ScanProf temps).
  // Ici on met juste une clé "200" = 0:PP (PP=points) pour être scannable même si non pertinent pour des temps.
  function toClock(n){ const s=Math.max(0, Math.round(Number(n)||0)); const m=Math.floor(s/60); const ss=String(s%60).padStart(2,'0'); return `${m}:${ss}`; }
  function buildQRDataV4({classe,sexe}){
    const items=state.teams.map(t=>({ nom: t.name, prenom:"", classe, sexe:(sexe==='M'?'M':'F'), "200": toClock(t.cumul) }));
    return JSON.stringify(items);
  }

  async function openQR(){
    await loadQRLIB();
    $("#qr-bilan").showModal();
    refreshQR();
  }
  function refreshQR(){
    const mode = document.querySelector('input[name="qr-mode"]:checked').value;
    const classe = $("#qr-classe").value.trim() || "";
    const sexe = $("#qr-sexe").value.trim() || "F";
    const slot = $("#qr-slot"); slot.innerHTML="";
    const data = mode==="v4" ? buildQRDataV4({classe,sexe}) : buildQRDataPoints({classe,sexe});
    new QRCode(slot, { text: data, width: 360, height: 360, colorDark:"#000000", colorLight:"#ffffff", correctLevel: QRCode.CorrectLevel.H });
    $("#qr-json").textContent = JSON.stringify(JSON.parse(data), null, 2);
  }
  function downloadQR(){
    const slot=$("#qr-slot"); const img=slot.querySelector('img')||slot.querySelector('canvas'); if(!img) return alert("QR non généré");
    const url = img.tagName==='IMG' ? img.src : img.toDataURL('image/png');
    const a=document.createElement('a'); a.href=url; a.download=`QR_Arcathlon_${Date.now()}.png`; a.click();
  }

  /* ---------- Events ---------- */
  $("#cine-auto").checked = state.cineAuto;
  $("#cine-auto").addEventListener("change",(e)=>{ state.cineAuto=e.target.checked; localStorage.setItem("cineAuto", JSON.stringify(state.cineAuto)); });
  $("#btn-bilan").addEventListener("click", openQR);
  $("#qr-refresh").addEventListener("click", refreshQR);
  $("#qr-download").addEventListener("click", downloadQR);
  $("#qr-close").addEventListener("click", ()=>$("#qr-bilan").close());

  $("#btn-start").addEventListener("click", async () => {
    state.teams[0].name=$("#teamA-name").value||"Équipe A"; state.teams[0].p1=$("#teamA-p1").value||"A1"; state.teams[0].p2=$("#teamA-p2").value||"A2"; state.teams[0].color=$("#teamA-color").value||"#5ac8fa";
    state.teams[1].name=$("#teamB-name").value||"Équipe B"; state.teams[1].p1=$("#teamB-p1").value||"B1"; state.teams[1].p2=$("#teamB-p2").value||"B2"; state.teams[1].color=$("#teamB-color").value||"#ff7b7b";
    state.teams.forEach(t=>{t.pos=0; t.skip=0; t.arrowsPerShooter=3; t.cumul=0;});
    state.round=1; state.history=[];
    $("#nameA").textContent=state.teams[0].name; $("#nameB").textContent=state.teams[1].name; $("#round-no").textContent=state.round;
    $("#A-debuff").hidden=true; $("#B-debuff").hidden=true;
    $("#A-cumul").textContent="0"; $("#B-cumul").textContent="0";
    buildArcherUI("A1", state.teams[0].p1, 0); buildArcherUI("A2", state.teams[0].p2, 0); buildArcherUI("B1", state.teams[1].p1, 1); buildArcherUI("B2", state.teams[1].p2, 1);
    state.board=defaultBoard(); renderBoard();
    $("#screen-setup").classList.remove("active"); $("#screen-game").classList.add("active"); save();
  });

  $("#btn-resume").addEventListener("click", () => {
    if(load()){
      $("#nameA").textContent=state.teams[0].name; $("#nameB").textContent=state.teams[1].name; $("#round-no").textContent=state.round;
      $("#A-debuff").hidden=state.teams[0].arrowsPerShooter !== 2; $("#B-debuff").hidden=state.teams[1].arrowsPerShooter !== 2;
      $("#A-cumul").textContent=String(state.teams[0].cumul||0); $("#B-cumul").textContent=String(state.teams[1].cumul||0);
      buildArcherUI("A1", state.teams[0].p1, 0); buildArcherUI("A2", state.teams[0].p2, 0); buildArcherUI("B1", state.teams[1].p1, 1); buildArcherUI("B2", state.teams[1].p2, 1);
      renderBoard(); $("#screen-setup").classList.remove("active"); $("#screen-game").classList.add("active");
    } else toast("Aucune sauvegarde trouvée.");
  });

  $("#btn-export").addEventListener("click", () => {
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"})); a.download="arcathlon-spirale-v32-save.json"; a.click(); URL.revokeObjectURL(a.href);
  });
  $("#import-save").addEventListener("change", (e) => {
    const f=e.target.files[0]; if(!f) return; const r=new FileReader();
    r.onload=()=>{ try{
      Object.assign(state, JSON.parse(r.result));
      $("#nameA").textContent=state.teams[0].name; $("#nameB").textContent=state.teams[1].name; $("#round-no").textContent=state.round;
      $("#A-debuff").hidden=state.teams[0].arrowsPerShooter !== 2; $("#B-debuff").hidden=state.teams[1].arrowsPerShooter !== 2;
      $("#A-cumul").textContent=String(state.teams[0].cumul||0); $("#B-cumul").textContent=String(state.teams[1].cumul||0);
      buildArcherUI("A1", state.teams[0].p1, 0); buildArcherUI("A2", state.teams[0].p2, 0); buildArcherUI("B1", state.teams[1].p1, 1); buildArcherUI("B2", state.teams[1].p2, 1);
      renderBoard(); $("#screen-setup").classList.remove("active"); $("#screen-game").classList.add("active"); save();
    }catch{ toast("Sauvegarde invalide."); } }; r.readAsText(f,"utf-8");
  });

  $("#btn-calc").addEventListener("click", computeLiveTotals);

  $("#btn-validate").addEventListener("click", async () => {
    const totals=computeTotals(); const from=[state.teams[0].pos, state.teams[1].pos];
    if(state.teams[0].skip){ totals.A.total=0; state.teams[0].skip--; }
    if(state.teams[1].skip){ totals.B.total=0; state.teams[1].skip--; }

    // cumul points
    state.teams[0].cumul += totals.A.total; state.teams[1].cumul += totals.B.total;
    $("#A-cumul").textContent=String(state.teams[0].cumul); $("#B-cumul").textContent=String(state.teams[1].cumul);

    const logs=await runRoundAnimation(totals); const to=[state.teams[0].pos, state.teams[1].pos];
    // resolve one-round penalties
    $("#A-debuff").hidden=true; $("#B-debuff").hidden=true;
    if(state.teams[0].arrowsPerShooter===2){ $("#A-debuff").hidden=false; state.teams[0].arrowsPerShooter=3; }
    if(state.teams[1].arrowsPerShooter===2){ $("#B-debuff").hidden=false; state.teams[1].arrowsPerShooter=3; }
    if(state.teams[0].pos===state.board.length-1 || state.teams[1].pos===state.board.length-1){
      const winner = state.teams[0].pos===state.board.length-1 && state.teams[1].pos===state.board.length-1 ? "Égalité" : (state.teams[0].pos===state.board.length-1 ? state.teams[0].name : state.teams[1].name);
      toast(`🏆 Fin de partie : <b>${winner}</b>`);
    } else if(logs.length){ toast(logs.map(l=>"• "+l).join("<br>")); }
    buildArcherUI("A1", state.teams[0].p1, 0); buildArcherUI("A2", state.teams[0].p2, 0); buildArcherUI("B1", state.teams[1].p1, 1); buildArcherUI("B2", state.teams[1].p2, 1);
    computeLiveTotals(); pushHistory(from,to); state.round++; $("#round-no").textContent=state.round; save();
  });

  $("#btn-undo").addEventListener("click", undoAnimated);
  $("#btn-save").addEventListener("click", ()=>{ save(); toast("Sauvegardé (navigateur)."); });
  $("#btn-help").addEventListener("click", ()=>$("#help").showModal());
  $("#help-close").addEventListener("click", ()=>$("#help").close());
  $("#modal-close").addEventListener("click", ()=>$("#modal").close());
  $("#exit-cine").addEventListener("click", exitCine);
})();