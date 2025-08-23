// v3.6 — auto-calc on input, big color-coded board, exact finish with bounce, slower animation, goose tokens
(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const SVGNS="http://www.w3.org/2000/svg";
  const ALLOWED=[0,6,7,8,9,10];

  const state={
    board: [], centers: [],
    teams:[
      { name:"Équipe A", color:"#5ac8fa", p1:"A1", p2:"A2", pos:0, skip:0, arrowsMax:3, arrowsNext:3 },
      { name:"Équipe B", color:"#ff7b7b", p1:"B1", p2:"B2", pos:0, skip:0, arrowsMax:3, arrowsNext:3 },
    ],
    round:1, history:[]
  };

  /* -------------------- Tabs -------------------- */
  function setView(id){ $$(".screen").forEach(n=>n.classList.remove("active")); $$(".btn.tab").forEach(b=>b.classList.remove("active")); $(id).classList.add("active"); if(id==="#view-input") $("#tab-input").classList.add("active"); if(id==="#view-board") $("#tab-board").classList.add("active"); }
  $("#tab-input").addEventListener("click",()=>{ setView("#view-input"); renderNotices(); applyArrowsLimits(); });
  $("#tab-board").addEventListener("click",()=>setView("#view-board"));

  /* -------------------- Geometry: outside→inside spiral -------------------- */
  function spiralPosOutsideIn(i, N){
    const cx=900, cy=900;
    const step=0.52;        // angular step (spacing)
    const Rmax=700;         // bigger board
    const b=12;             // shrink per radian
    const th=i*step;
    const r=Math.max(50, Rmax - b*th);
    return { x: cx + r*Math.cos(th), y: cy + r*Math.sin(th) };
  }
  function buildCenters(){ state.centers = state.board.map((_,i)=>spiralPosOutsideIn(i, state.board.length-1)); }

  /* -------------------- Board rendering -------------------- */
  function typeClass(sq){
    if(!sq || !sq.type) return "";
    if(sq.type==="bonus"||sq.type==="malus"){ return `${sq.type}${sq.value||2}`; }
    if(sq.type==="neutral"){ return `neutral${sq.value||1}`; }
    return sq.type;
  }
  function typeLabel(sq){
    if(!sq || !sq.type) return "";
    if(sq.type==="bonus") return `↗ +${sq.value}`;
    if(sq.type==="malus") return `↘ -${sq.value}`;
    if(sq.type==="neutral") return `⚠ -${sq.value}🎯`;
    if(sq.type==="steal") return "🟡 vole 1🎯";
    if(sq.type==="skip") return "⏭️";
    if(sq.type==="teleport") return `🌀 → ${sq.value}`;
    if(sq.type==="mystery") return "?";
    if(sq.type==="replay") return "🔁";
    if(sq.type==="goal") return "🎯";
    return "";
  }

  function renderBoard(){
    const svg=$("#board"); svg.innerHTML="";
    // defs
    const defs=document.createElementNS(SVGNS,"defs");
    const grad=document.createElementNS(SVGNS,"radialGradient"); grad.setAttribute("id","finishGrad");
    const s1=document.createElementNS(SVGNS,"stop"); s1.setAttribute("offset","0%"); s1.setAttribute("stop-color","#ffb703");
    const s2=document.createElementNS(SVGNS,"stop"); s2.setAttribute("offset","100%"); s2.setAttribute("stop-color","#7b2cbf");
    grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad);
    const marker=document.createElementNS(SVGNS,"marker"); marker.setAttribute("id","arrow"); marker.setAttribute("viewBox","0 0 10 10"); marker.setAttribute("refX","5"); marker.setAttribute("refY","5"); marker.setAttribute("markerWidth","10"); marker.setAttribute("markerHeight","10"); marker.setAttribute("orient","auto-start-reverse");
    const p=document.createElementNS(SVGNS,"path"); p.setAttribute("d","M 0 0 L 10 5 L 0 10 z"); p.setAttribute("fill","#4cc9f0"); marker.appendChild(p);
    defs.appendChild(marker); svg.appendChild(defs);

    buildCenters();
    // path
    const pathShadow=document.createElementNS(SVGNS,"polyline"); pathShadow.setAttribute("id","path-shadow"); pathShadow.setAttribute("points", state.centers.map(c=>`${c.x},${c.y}`).join(" ")); svg.appendChild(pathShadow);
    const path=document.createElementNS(SVGNS,"polyline"); path.setAttribute("id","path"); path.setAttribute("points", state.centers.map(c=>`${c.x},${c.y}`).join(" ")); path.setAttribute("marker-end","url(#arrow)"); svg.appendChild(path);

    // squares
    state.board.forEach((sq,i)=>{
      const g=document.createElementNS(SVGNS,"g"); g.setAttribute("class", `square${i%2===1?" dark":""} ${typeClass(sq)}${i===state.board.length-1?" finish":""}`);
      const {x,y}=state.centers[i]; const w=86, h=64;
      g.setAttribute("transform", `translate(${x-w/2},${y-h/2})`);
      const r=document.createElementNS(SVGNS,"rect"); r.setAttribute("width",w); r.setAttribute("height",h); r.setAttribute("rx","16"); r.setAttribute("ry","16");
      const t=document.createElementNS(SVGNS,"text"); t.setAttribute("x", w/2); t.setAttribute("y", h/2+6); t.setAttribute("text-anchor","middle"); t.textContent = sq.hidden ? "?" : (sq.label || i);
      const lbl=typeLabel(sq); if(lbl){ const t2=document.createElementNS(SVGNS,"text"); t2.setAttribute("x", w/2); t2.setAttribute("y", 18); t2.setAttribute("text-anchor","middle"); t2.setAttribute("font-size","14"); t2.textContent = sq.hidden ? "?" : lbl; g.appendChild(t2); }
      const title=document.createElementNS(SVGNS,"title"); title.textContent=(sq.hidden?"Mystère":(sq.label||("Case "+i)))+` (#${i})`;
      g.appendChild(r); g.appendChild(t); g.appendChild(title); svg.appendChild(g);
    });

    placeTokens(true);
  }

  /* -------------------- Goose tokens -------------------- */
  function gooseToken(color){
    // stylized goose: ellipse body + neck + head + bill
    const g=document.createElementNS(SVGNS,"g"); g.setAttribute("class","goose token");
    const body=document.createElementNS(SVGNS,"ellipse"); body.setAttribute("cx","0"); body.setAttribute("cy","0"); body.setAttribute("rx","14"); body.setAttribute("ry","10"); body.setAttribute("fill",color); body.setAttribute("class","body");
    const neck=document.createElementNS(SVGNS,"path"); neck.setAttribute("d","M -4 -8 C -2 -16, 6 -16, 8 -8"); neck.setAttribute("fill","none"); neck.setAttribute("stroke",color); neck.setAttribute("stroke-width","4");
    const head=document.createElementNS(SVGNS,"circle"); head.setAttribute("cx","9"); head.setAttribute("cy","-9"); head.setAttribute("r","4"); head.setAttribute("fill",color);
    const eye=document.createElementNS(SVGNS,"circle"); eye.setAttribute("cx","10.5"); eye.setAttribute("cy","-10"); eye.setAttribute("r","0.8"); eye.setAttribute("class","eye");
    const bill=document.createElementNS(SVGNS,"polygon"); bill.setAttribute("points","13,-9 18,-8 13,-7"); bill.setAttribute("fill","#f59e0b"); bill.setAttribute("class","bill");
    g.appendChild(neck); g.appendChild(body); g.appendChild(head); g.appendChild(bill); g.appendChild(eye);
    return g;
  }
  function placeTokens(initial=false){
    $$(".token", $("#board")).forEach(n=>n.remove());
    state.teams.forEach((tm, idx)=>{
      const {x,y}=state.centers[tm.pos];
      const g=gooseToken(tm.color);
      g.setAttribute("transform", `translate(${x},${y-20})`);
      const title=document.createElementNS(SVGNS,"title"); title.textContent=`${tm.name} (#${tm.pos})`; g.appendChild(title);
      $("#board").appendChild(g);
    });
    if(initial) return;
  }

  /* -------------------- Input table -------------------- */
  function makeSelect(){
    const sel=document.createElement("select");
    ["", ...ALLOWED].forEach(v=>{ const o=document.createElement("option"); o.value=String(v); o.textContent=(v===""?"—":String(v)); sel.appendChild(o); });
    sel.addEventListener("change", computeAndRenderTotals);
    return sel;
  }
  function buildInputTable(){
    const tbody=$("#tbody-scores"); tbody.innerHTML="";
    const rows=[{team:"A",shooter:"A1",ti:0},{team:"A",shooter:"A2",ti:0},{team:"B",shooter:"B1",ti:1},{team:"B",shooter:"B2",ti:1}];
    rows.forEach(r=>{
      const tr=document.createElement("tr"); tr.dataset.ti=String(r.ti);
      tr.innerHTML=`<td>Équipe ${r.team}</td><td>${r.shooter}</td>`;
      for(let i=1;i<=3;i++){ const td=document.createElement("td"); const sel=makeSelect(); sel.id=`${r.shooter}-a${i}`; td.appendChild(sel); tr.appendChild(td); }
      const best=document.createElement("td"); best.id=`${r.shooter}-best`; best.textContent="0"; tr.appendChild(best);
      tbody.appendChild(tr);
    });
    applyArrowsLimits(); // disable selects if needed
  }
  function allowedForTeam(ti){ return Math.max(1, Math.min(3, state.teams[ti].arrowsMax||3)); }
  function applyArrowsLimits(){
    // Enable/disable 3rd (or 2nd/1st) selects by team
    [["A1",0],["A2",0],["B1",1],["B2",1]].forEach(([prefix,ti])=>{
      const n=allowedForTeam(ti);
      for(let i=1;i<=3;i++){
        const el = $("#"+prefix+"-a"+i);
        el.disabled = i>n;
        if(i>n) el.value="";
      }
    });
    renderNotices();
  }
  function renderNotices(){
    const box=$("#notices"); box.innerHTML="";
    [0,1].forEach(ti=>{
      const n=allowedForTeam(ti);
      if(n<3){ const div=document.createElement("div"); div.className="notice warn"; div.textContent=`${state.teams[ti].name}: pénalité ce tour (seulement ${n} flèche(s) par tireur)`; box.appendChild(div); }
    });
  }

  function bestOf(prefix, nSel=3){
    const vals=[]; for(let i=1;i<=nSel;i++){ const v = Number(($("#"+prefix+"-a"+i).value)||0); if(Number.isFinite(v)) vals.push(v); }
    return vals.length? Math.max(...vals) : 0;
  }
  function computeTotals(){
    const nA=allowedForTeam(0), nB=allowedForTeam(1);
    const a1=bestOf("A1", nA), a2=bestOf("A2", nA);
    const b1=bestOf("B1", nB), b2=bestOf("B2", nB);
    $("#A1-best").textContent=String(a1); $("#A2-best").textContent=String(a2);
    $("#B1-best").textContent=String(b1); $("#B2-best").textContent=String(b2);
    const totalA=a1+a2, totalB=b1+b2; $("#totalA").textContent=String(totalA); $("#totalB").textContent=String(totalB);
    return {A:{a1,a2,total:totalA}, B:{b1,b2,total:totalB}};
  }
  function computeAndRenderTotals(){ computeTotals(); }

  /* -------------------- Animations & exact finish -------------------- */
  function highlightPath(from, steps){
    const delay=100;
    let dir=+1;
    const last=state.board.length-1;
    let pos=from;
    let remaining=steps;
    // simulate bounce if overshoot
    const maxForward = Math.min(steps, last - from);
    // forward highlights
    for(let i=1;i<=maxForward;i++){
      const idx=from+i;
      setTimeout(()=> { const g=$$(".square")[idx]; g && g.classList.add("highlight"); setTimeout(()=>g&&g.classList.remove("highlight"), 900); }, i*delay);
    }
    if(steps>maxForward){
      // bounce back highlights
      const back = steps - maxForward;
      for(let j=1;j<=back;j++){
        const idx=last - j;
        setTimeout(()=> { const g=$$(".square")[idx]; g && g.classList.add("highlight"); setTimeout(()=>g&&g.classList.remove("highlight"), 900); }, (maxForward+j)*delay);
      }
    }
  }

  function moveTeamExact(idx, steps){
    return new Promise(resolve=>{
      if(steps===0) return resolve();
      const last=state.board.length-1;
      const t=state.teams[idx];
      let remaining = steps;
      let dir = +1;
      const tick=()=>{
        if(dir===+1 && t.pos===last){ dir = -1; } // bounce from finish
        t.pos = Math.max(0, Math.min(t.pos + dir, last));
        placeTokens();
        remaining--;
        if(remaining>0) setTimeout(tick, 260); else resolve();
      };
      setTimeout(tick, 200);
    });
  }

  /* -------------------- Effects -------------------- */
  function revealMystery(sq){
    const bag=[
      {type:"bonus", value:2, label:"+2"},
      {type:"bonus", value:4, label:"+4"},
      {type:"malus", value:2, label:"-2"},
      {type:"neutral", value:1, label:"-1 flèche"},
      {type:"skip", value:1, label:"Passe 1 tour"},
      {type:"steal", value:1, label:"Vole 1 flèche"},
      {type:"teleport", value:8, label:"→ 8"},
    ];
    Object.assign(sq, bag[Math.floor(Math.random()*bag.length)], {hidden:false});
  }
  function applyEffect(teamIndex, sq, lastAdvance){
    const me=state.teams[teamIndex], opp=state.teams[1-teamIndex];
    let msg="";
    if(sq.hidden) revealMystery(sq);
    switch(sq.type){
      case "bonus": me.pos=Math.min(me.pos+(sq.value||0), state.board.length-1); msg=`Bonus +${sq.value}`; break;
      case "malus": me.pos=Math.max(me.pos-(sq.value||0), 0); msg=`Malus -${sq.value}`; break;
      case "neutral": me.arrowsNext = Math.max(1, (me.arrowsNext||3) - (sq.value||1)); msg=`Neutralisation: -${sq.value} flèche(s) au prochain tour`; break;
      case "steal": opp.arrowsNext = Math.max(1, (opp.arrowsNext||3) - 1); msg=`Vole 1 flèche à l’adversaire (pénalité prochain tour)`; break;
      case "skip": me.skip=(me.skip||0)+1; msg=`Passe 1 tour (prochain)`; break;
      case "teleport": { const dest=Number(sq.value||0); me.pos = dest<=state.board.length-1 ? dest : Math.min(state.board.length-1, me.pos+dest); msg=`Téléport → #${me.pos}`; } break;
      case "replay": msg=`Rejoue immédiatement (+${lastAdvance})`; break;
      default: msg="";
    }
    return msg;
  }

  /* -------------------- Round flow -------------------- */
  async function runRound(){
    const tot=computeTotals();
    setView("#view-board");
    $("#hud").hidden=false;
    $("#hud-text").innerHTML = `<b>${state.teams[0].name}</b>: ${tot.A.a1}+${tot.A.a2}=<b>${tot.A.total}</b> | <b>${state.teams[1].name}</b>: ${tot.B.b1}+${tot.B.b2}=<b>${tot.B.total}</b>`;

    const from=[state.teams[0].pos, state.teams[1].pos];
    highlightPath(from[0], tot.A.total); highlightPath(from[1], tot.B.total);
    await moveTeamExact(0, tot.A.total);
    const sqA=state.board[state.teams[0].pos]; const eA=applyEffect(0, sqA, tot.A.total);
    if(eA){ $("#modal-content").innerHTML=`• ${state.teams[0].name}: ${eA}`; $("#modal").showModal(); }
    await moveTeamExact(1, tot.B.total);
    const sqB=state.board[state.teams[1].pos]; const eB=applyEffect(1, sqB, tot.B.total);
    if(eB){ $("#modal-content").innerHTML += `<br>• ${state.teams[1].name}: ${eB}`; if(!$("#modal").open) $("#modal").showModal(); }

    // prepare next round penalties
    state.teams.forEach(t=>{ t.arrowsMax = t.arrowsNext; });

    state.history.push({from, to:[state.teams[0].pos,state.teams[1].pos], snapshot: JSON.stringify(state)});
    state.round++;
  }

  $("#btn-validate").addEventListener("click", async ()=>{
    // handle skip
    if(state.teams[0].skip){ state.teams[0].skip--; $("#modal-content").innerHTML=`• ${state.teams[0].name} passe ce tour.`; $("#modal").showModal(); }
    if(state.teams[1].skip){ state.teams[1].skip--; $("#modal-content").innerHTML+=`<br>• ${state.teams[1].name} passe ce tour.`; if(!$("#modal").open) $("#modal").showModal(); }
    await runRound();
    // Back to input and enforce arrows limits (penalties for next round)
    setView("#view-input"); applyArrowsLimits(); computeTotals();
  });
  $("#btn-undo").addEventListener("click", async ()=>{
    if(!state.history.length){ $("#modal-content").textContent="Rien à annuler."; $("#modal").showModal(); return; }
    const last=state.history.pop();
    const cur=[state.teams[0].pos, state.teams[1].pos];
    // quick rewind without animation granularity (jump back)
    state.teams[0].pos = last.from[0]; state.teams[1].pos = last.from[1]; placeTokens();
    try{ const prev=JSON.parse(last.snapshot); Object.assign(state, prev);}catch{}
    setView("#view-input"); applyArrowsLimits(); computeTotals();
  });
  $("#modal-close").addEventListener("click", ()=>$("#modal").close());

  /* -------------------- Default board -------------------- */
  function defaultBoard(){
    const N=63;
    const specials={
      // bonuses
      3:{type:"bonus",value:2,label:"+2"},
      6:{type:"bonus",value:4,label:"+4"},
      9:{type:"bonus",value:6,label:"+6"},
      12:{type:"bonus",value:8,label:"+8"},
      // malus
      5:{type:"malus",value:2,label:"-2"},
      10:{type:"malus",value:4,label:"-4"},
      15:{type:"malus",value:6,label:"-6"},
      20:{type:"malus",value:8,label:"-8"},
      // neutralizations
      14:{type:"neutral",value:1,label:"-1🎯"},
      22:{type:"neutral",value:2,label:"-2🎯"},
      30:{type:"neutral",value:3,label:"-3🎯"},
      // skip & steal
      18:{type:"skip",value:1,label:"Passe 1 tour"},
      26:{type:"steal",value:1,label:"Vole 1 🎯"},
      // teleports
      28:{type:"teleport",value:8,label:"→ 8"},
      38:{type:"teleport",value:25,label:"→ 25"},
      52:{type:"teleport",value:44,label:"→ 44"},
      // replay goals
      34:{type:"replay",value:0,label:"Rejouer"},
      // mysteries
      24:{type:"mystery",value:0,label:"?",hidden:true},
      41:{type:"mystery",value:0,label:"?",hidden:true},
      57:{type:"mystery",value:0,label:"?",hidden:true},
    };
    const arr=[];
    for(let i=0;i<=N;i++){
      if(i===0) arr.push({index:i,label:"Départ",type:"",value:0});
      else if(i===N) arr.push({index:i,label:"Arrivée 🎯",type:"",value:0});
      else if(specials[i]) arr.push({index:i, ...specials[i]});
      else arr.push({index:i,label:String(i),type:"",value:0});
    }
    return arr;
  }

  // Boot
  function init(){
    buildInputTable();
    state.board = defaultBoard();
    renderBoard();
    computeTotals(); // initial totals (0)
  }
  init();
})();