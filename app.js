// v3.7 — EPS/iPad: saisie tactile, reset auto, thème clair, plateau "jeu de l'oie"
(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const SVGNS="http://www.w3.org/200-svg";
  const ALLOWED=[0,6,7,8,9,10];

  const state={
    board:[], centers:[],
    teams:[
      { name:"Équipe A", color:"#2b7fff", p1:"A1", p2:"A2", pos:0, skip:0, arrowsMax:3, arrowsNext:3 },
      { name:"Équipe B", color:"#ff5b5b", p1:"B1", p2:"B2", pos:0, skip:0, arrowsMax:3, arrowsNext:3 },
    ],
    round:1, history:[]
  };

  /* Tabs + fullscreen */
  function setView(id){ $$(".screen").forEach(n=>n.classList.remove("active")); $$(".btn.tab").forEach(b=>b.classList.remove("active")); $(id).classList.add("active"); if(id==="#view-input") $("#tab-input").classList.add("active"); if(id==="#view-board") $("#tab-board").classList.add("active"); }
  $("#tab-input").addEventListener("click",()=>{ setView("#view-input"); applyArrowsLimits(); computeTotals(); });
  $("#tab-board").addEventListener("click",()=>setView("#view-board"));
  $("#btn-full").addEventListener("click", async ()=>{
    const wrap=$(".board-wrap");
    try{ if(!document.fullscreenElement){ await wrap.requestFullscreen?.(); } else { await document.exitFullscreen?.(); } }catch{}
  });

  /* Geometry: outside → inside spiral (larger, lighter path) */
  function spiralPos(i, N){
    const cx=1000, cy=1000;
    const step=0.5, Rmax=760, b=12;
    const th=i*step, r=Math.max(60, Rmax - b*th);
    return {x:cx + r*Math.cos(th), y:cy + r*Math.sin(th)};
  }
  function buildCenters(){ state.centers = state.board.map((_,i)=>spiralPos(i, state.board.length-1)); }

  function typeClass(sq){
    if(!sq || !sq.type) return "";
    if(sq.type==="bonus"||sq.type==="malus") return `${sq.type}${sq.value||2}`;
    if(sq.type==="neutral") return `neutral${sq.value||1}`;
    return sq.type;
  }
  function typeEmoji(sq){
    if(!sq || !sq.type) return "";
    const map={bonus:"↗", malus:"↘", neutral:"⚠", steal:"🟡", skip:"⏭", teleport:"🌀", mystery:"?"};
    return map[sq.type]||"";
  }

  /* Render board */
  function renderBoard(){
    const svg=$("#board"); svg.innerHTML="";
    const defs=document.createElementNS("http://www.w3.org/2000/svg","defs");
    const grad=document.createElementNS("http://www.w3.org/2000/svg","radialGradient"); grad.setAttribute("id","finishGrad");
    const s1=document.createElementNS("http://www.w3.org/2000/svg","stop"); s1.setAttribute("offset","0%"); s1.setAttribute("stop-color","#fff1a1");
    const s2=document.createElementNS("http://www.w3.org/2000/svg","stop"); s2.setAttribute("offset","100%"); s2.setAttribute("stop-color","#ffd166");
    grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad);
    const marker=document.createElementNS("http://www.w3.org/2000/svg","marker"); marker.setAttribute("id","arrow"); marker.setAttribute("viewBox","0 0 10 10"); marker.setAttribute("refX","5"); marker.setAttribute("refY","5"); marker.setAttribute("markerWidth","12"); marker.setAttribute("markerHeight","12"); marker.setAttribute("orient","auto-start-reverse");
    const p=document.createElementNS("http://www.w3.org/2000/svg","path"); p.setAttribute("d","M 0 0 L 10 5 L 0 10 z"); p.setAttribute("fill","#8ab4ff"); marker.appendChild(p);
    defs.appendChild(marker); svg.appendChild(defs);

    buildCenters();
    const pathShadow=document.createElementNS("http://www.w3.org/2000/svg","polyline"); pathShadow.setAttribute("id","path-shadow"); pathShadow.setAttribute("points", state.centers.map(c=>`${c.x},${c.y}`).join(" ")); svg.appendChild(pathShadow);
    const path=document.createElementNS("http://www.w3.org/2000/svg","polyline"); path.setAttribute("id","path"); path.setAttribute("points", state.centers.map(c=>`${c.x},${c.y}`).join(" ")); path.setAttribute("marker-end","url(#arrow)"); svg.appendChild(path);

    state.board.forEach((sq,i)=>{
      const g=document.createElementNS("http://www.w3.org/2000/svg","g"); g.setAttribute("class", `square${i%2===1?" dark":""} ${typeClass(sq)}${i===state.board.length-1?" finish":""}`);
      const {x,y}=state.centers[i]; const w=100, h=76;
      g.setAttribute("transform", `translate(${x-w/2},${y-h/2})`);
      const r=document.createElementNS("http://www.w3.org/2000/svg","rect"); r.setAttribute("width",w); r.setAttribute("height",h); r.setAttribute("rx","18"); r.setAttribute("ry","18");
      const t=document.createElementNS("http://www.w3.org/2000/svg","text"); t.setAttribute("x", w/2); t.setAttribute("y", h/2+8); t.setAttribute("text-anchor","middle"); t.textContent = sq.hidden ? "?" : (sq.label || i);
      const e=document.createElementNS("http://www.w3.org/2000/svg","text"); e.setAttribute("x", w/2); e.setAttribute("y", 22); e.setAttribute("text-anchor","middle"); e.setAttribute("font-size","16"); e.textContent = sq.hidden ? "?" : typeEmoji(sq);
      const title=document.createElementNS("http://www.w3.org/2000/svg","title"); title.textContent=(sq.hidden?"Mystère":(sq.label||("Case "+i)))+` (#${i})`;
      g.appendChild(r); g.appendChild(e); g.appendChild(t); g.appendChild(title); svg.appendChild(g);
    });

    placeTokens(true);
  }

  /* Goose tokens */
  function goose(color){
    const g=document.createElementNS("http://www.w3.org/2000/svg","g"); g.setAttribute("class","goose token");
    const body=document.createElementNS("http://www.w3.org/2000/svg","ellipse"); body.setAttribute("cx","0"); body.setAttribute("cy","0"); body.setAttribute("rx","18"); body.setAttribute("ry","12"); body.setAttribute("fill",color); body.setAttribute("class","body");
    const neck=document.createElementNS("http://www.w3.org/2000/svg","path"); neck.setAttribute("d","M -6 -10 C -3 -20, 8 -20, 10 -10"); neck.setAttribute("fill","none"); neck.setAttribute("stroke",color); neck.setAttribute("stroke-width","5");
    const head=document.createElementNS("http://www.w3.org/2000/svg","circle"); head.setAttribute("cx","12"); head.setAttribute("cy","-12"); head.setAttribute("r","5"); head.setAttribute("fill",color);
    const eye=document.createElementNS("http://www.w3.org/2000/svg","circle"); eye.setAttribute("cx","13.5"); eye.setAttribute("cy","-13"); eye.setAttribute("r","1"); eye.setAttribute("class","eye");
    const bill=document.createElementNS("http://www.w3.org/2000/svg","polygon"); bill.setAttribute("points","17,-12 23,-11 17,-10"); bill.setAttribute("fill","#f59e0b"); bill.setAttribute("class","bill");
    g.appendChild(neck); g.appendChild(body); g.appendChild(head); g.appendChild(bill); g.appendChild(eye);
    return g;
  }
  function placeTokens(initial=false){
    $$(".token", $("#board")).forEach(n=>n.remove());
    state.teams.forEach(tm=>{
      const {x,y}=state.centers[tm.pos];
      const g=goose(tm.color);
      g.setAttribute("transform", `translate(${x},${y-24})`);
      const title=document.createElementNS("http://www.w3.org/2000/svg","title"); title.textContent=`${tm.name} (#${tm.pos})`; g.appendChild(title);
      $("#board").appendChild(g);
    });
    if(initial) return;
  }

  /* Saisie: grosses touches */
  function makeArrowSlot(prefix, idx){
    const slot=document.createElement("div"); slot.className="arrow-slot";
    const label=document.createElement("div"); label.className="slot-label"; label.textContent=`Flèche ${idx}`;
    const vals=document.createElement("div"); vals.className="vals"; vals.dataset.for=`${prefix}-a${idx}`;
    [0,6,7,8,9,10].forEach(v=>{
      const b=document.createElement("button"); b.className="val-btn"; b.type="button"; b.textContent=String(v); b.dataset.val=String(v);
      b.addEventListener("click",()=>{
        // toggle pressed in this group, single choice
        $$(".val-btn", vals).forEach(x=>x.setAttribute("aria-pressed","false"));
        b.setAttribute("aria-pressed","true");
        computeTotals();
      });
      vals.appendChild(b);
    });
    slot.appendChild(label); slot.appendChild(vals);
    return slot;
  }
  function buildShooterUI(id, name, teamIndex){
    const host=$("#"+id); host.innerHTML="";
    const who=document.createElement("div"); who.className="who"; who.textContent=name; host.appendChild(who);
    const max=allowedForTeam(teamIndex);
    for(let i=1;i<=max;i++) host.appendChild(makeArrowSlot(id, i));
    // if penalties reduce arrows, hide extra slots
    for(let i=max+1;i<=3;i++){ const dummy=document.createElement("div"); dummy.className="arrow-slot"; dummy.innerHTML=`<div class="slot-label">Flèche ${i}</div><div class="vals muted">—</div>`; host.appendChild(dummy); }
  }
  function getArrowValue(ref){
    const g=$(`.vals[data-for="${ref}"]`);
    const p=g? $(`.val-btn[aria-pressed="true"]`, g) : null;
    return p? Number(p.dataset.val) : 0;
  }
  function bestOfShooter(prefix, teamIndex){
    const max=allowedForTeam(teamIndex);
    const vals=[]; for(let i=1;i<=max;i++) vals.push(getArrowValue(`${prefix}-a${i}`));
    return Math.max(0, ...vals);
  }

  function allowedForTeam(ti){ return Math.max(1, Math.min(3, state.teams[ti].arrowsMax||3)); }
  function applyArrowsLimits(){
    // rebuild shooters UIs with proper number of slots
    buildShooterUI("A1","A1",0); buildShooterUI("A2","A2",0);
    buildShooterUI("B1","B1",1); buildShooterUI("B2","B2",1);
  }

  function computeTotals(){
    const a1=bestOfShooter("A1",0), a2=bestOfShooter("A2",0);
    const b1=bestOfShooter("B1",1), b2=bestOfShooter("B2",1);
    $("#totalA").textContent=String(a1+a2);
    $("#totalB").textContent=String(b1+b2);
    return {A:{a1,a2,total:a1+a2}, B:{b1,b2,total:b1+b2}};
  }

  /* Animation + règles d'arrivée exacte (rebond) */
  function highlightPath(from, steps){
    const last=state.board.length-1;
    const forward=Math.min(steps, last-from);
    const delay=120;
    for(let i=1;i<=forward;i++){
      const idx=from+i;
      setTimeout(()=>{ const g=$$(".square")[idx]; g && g.classList.add("highlight"); setTimeout(()=>g&&g.classList.remove("highlight"), 900); }, i*delay);
    }
    if(steps>forward){
      const back=steps-forward;
      for(let j=1;j<=back;j++){
        const idx=last-j;
        setTimeout(()=>{ const g=$$(".square")[idx]; g && g.classList.add("highlight"); setTimeout(()=>g&&g.classList.remove("highlight"), 900); }, (forward+j)*delay);
      }
    }
  }
  function moveExact(idx, steps){
    return new Promise(resolve=>{
      if(steps===0) return resolve();
      const last=state.board.length-1;
      const t=state.teams[idx];
      let remaining=steps, dir=+1;
      const tick=()=>{
        if(dir===+1 && t.pos===last){ dir=-1; }
        t.pos = Math.max(0, Math.min(t.pos+dir, last));
        placeTokens();
        remaining--;
        if(remaining>0) setTimeout(tick, 320); else resolve();
      };
      setTimeout(tick, 220);
    });
  }

  /* Effects */
  function revealMystery(sq){
    const bag=[
      {type:"bonus", value:2, label:"+2"},
      {type:"bonus", value:4, label:"+4"},
      {type:"malus", value:2, label:"-2"},
      {type:"neutral", value:1, label:"-1🎯"},
      {type:"skip", value:1, label:"Passe 1"},
      {type:"steal", value:1, label:"Vole 1 🎯"},
      {type:"teleport", value:8, label:"→ 8"},
    ];
    Object.assign(sq, bag[Math.floor(Math.random()*bag.length)], {hidden:false});
  }
  function applyEffect(ti, sq, lastAdvance){
    const me=state.teams[ti], opp=state.teams[1-ti];
    let msg="";
    if(sq.hidden) revealMystery(sq);
    switch(sq.type){
      case "bonus": me.pos=Math.min(me.pos+(sq.value||0), state.board.length-1); msg=`Bonus +${sq.value}`; break;
      case "malus": me.pos=Math.max(me.pos-(sq.value||0), 0); msg=`Malus -${sq.value}`; break;
      case "neutral": me.arrowsNext = Math.max(1, (me.arrowsNext||3) - (sq.value||1)); msg=`Neutralisation: -${sq.value} flèche(s) au prochain tour`; break;
      case "steal": opp.arrowsNext = Math.max(1, (opp.arrowsNext||3) - 1); msg=`Vole 1 flèche à l’adversaire (pénalité prochain tour)`; break;
      case "skip": me.skip=(me.skip||0)+1; msg=`Passe 1 tour`; break;
      case "teleport": { const dest=Number(sq.value||0); me.pos = dest<=state.board.length-1 ? dest : Math.min(state.board.length-1, me.pos+dest); msg=`Téléport → #${me.pos}`; } break;
      case "replay": msg=`Rejoue immédiatement (+${lastAdvance})`; break;
      default: msg="";
    }
    return msg;
  }

  /* Round flow */
  async function runRound(){
    const tot=computeTotals();
    setView("#view-board");
    $("#hud").hidden=false;
    $("#hud-text").innerHTML = `<b>Équipe A</b>: ${tot.A.total} | <b>Équipe B</b>: ${tot.B.total}`;

    const from=[state.teams[0].pos, state.teams[1].pos];
    highlightPath(from[0], tot.A.total); highlightPath(from[1], tot.B.total);
    await moveExact(0, tot.A.total);
    const sqA=state.board[state.teams[0].pos]; const eA=applyEffect(0, sqA, tot.A.total);
    if(eA){ $("#modal-content").innerHTML=`• Équipe A: ${eA}`; $("#modal").showModal(); }
    await moveExact(1, tot.B.total);
    const sqB=state.board[state.teams[1].pos]; const eB=applyEffect(1, sqB, tot.B.total);
    if(eB){ $("#modal-content").innerHTML+=`<br>• Équipe B: ${eB}`; if(!$("#modal").open) $("#modal").showModal(); }

    // préparer les pénalités du prochain tour
    state.teams.forEach(t=>{ t.arrowsMax = t.arrowsNext; });

    // history
    state.history.push({ from, to:[state.teams[0].pos, state.teams[1].pos], snapshot: JSON.stringify(state) });
    state.round++;
  }

  function resetInputs(){
    $$(".val-btn[aria-pressed='true']").forEach(b=>b.setAttribute("aria-pressed","false"));
    $("#totalA").textContent="0"; $("#totalB").textContent="0";
  }

  $("#btn-validate").addEventListener("click", async ()=>{
    // handle skip
    if(state.teams[0].skip){ state.teams[0].skip--; $("#modal-content").innerHTML=`• Équipe A passe ce tour.`; $("#modal").showModal(); }
    if(state.teams[1].skip){ state.teams[1].skip--; $("#modal-content").innerHTML+=`<br>• Équipe B passe ce tour.`; if(!$("#modal").open) $("#modal").showModal(); }

    await runRound();
    // Retour saisie + reset auto pour le tour suivant
    setView("#view-input");
    applyArrowsLimits();
    resetInputs();
  });

  $("#btn-undo").addEventListener("click", ()=>{
    if(!state.history.length){ $("#modal-content").textContent="Rien à annuler."; $("#modal").showModal(); return; }
    const last=state.history.pop();
    state.teams[0].pos = last.from[0]; state.teams[1].pos = last.from[1]; placeTokens();
    try{ const prev=JSON.parse(last.snapshot); Object.assign(state, prev);}catch{}
    setView("#view-input"); applyArrowsLimits(); resetInputs();
  });
  $("#btn-reset").addEventListener("click", resetInputs);
  $("#modal-close").addEventListener("click", ()=>$("#modal").close());

  /* Default board similar to jeu de l'oie (mix visible/mystère) */
  function defaultBoard(){
    const N=63;
    const sp={
      2:{type:"bonus",value:2,label:"+2"},
      4:{type:"bonus",value:4,label:"+4"},
      6:{type:"bonus",value:6,label:"+6"},
      8:{type:"bonus",value:8,label:"+8"},
      9:{type:"malus",value:2,label:"-2"},
      11:{type:"malus",value:4,label:"-4"},
      14:{type:"neutral",value:1,label:"-1🎯"},
      16:{type:"skip",value:1,label:"Passe 1"},
      18:{type:"steal",value:1,label:"Vole 1 🎯"},
      20:{type:"malus",value:6,label:"-6"},
      22:{type:"mystery",value:0,label:"?",hidden:true},
      24:{type:"teleport",value:12,label:"→ 12"},
      26:{type:"bonus",value:2,label:"+2"},
      28:{type:"mystery",value:0,label:"?",hidden:true},
      30:{type:"neutral",value:2,label:"-2🎯"},
      34:{type:"replay",value:0,label:"Rejouer"},
      36:{type:"malus",value:8,label:"-8"},
      38:{type:"bonus",value:4,label:"+4"},
      41:{type:"mystery",value:0,label:"?",hidden:true},
      45:{type:"skip",value:1,label:"Passe 1"},
      48:{type:"steal",value:1,label:"Vole 1 🎯"},
      50:{type:"bonus",value:6,label:"+6"},
      54:{type:"malus",value:4,label:"-4"},
      58:{type:"teleport",value:25,label:"→ 25"},
      60:{type:"mystery",value:0,label:"?",hidden:true}
    };
    const arr=[];
    for(let i=0;i<=N;i++){
      if(i===0) arr.push({index:i,label:"Départ",type:"",value:0});
      else if(i===N) arr.push({index:i,label:"Arrivée 🎯",type:"",value:0});
      else if(sp[i]) arr.push({index:i, ...sp[i]});
      else arr.push({index:i,label:String(i),type:"",value:0});
    }
    return arr;
  }

  function init(){
    applyArrowsLimits();
    state.board=defaultBoard();
    renderBoard();
  }
  init();
})();