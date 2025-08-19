// Arcathlon Spirale v2 – visuel + scoring discret + animations + stratégie
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const SVGNS = "http://www.w3.org/2000/svg";

  const ALLOWED = [0,6,7,8,9,10];

  const state = {
    board: [], // [{index,label,type,value,target?,hidden?}]
    teams: [
      { name:"Équipe A", color:"#5ac8fa", p1:"A1", p2:"A2", pos:0, skip:0, arrowsPerShooter:3 },
      { name:"Équipe B", color:"#ff7b7b", p1:"B1", p2:"B2", pos:0, skip:0, arrowsPerShooter:3 },
    ],
    round: 1,
    history: [], // {round, from:[a,b], to:[a,b], penalties:{A,B}}
  };

  function toast(html){
    const dlg = $("#modal"); $("#modal-content").innerHTML = html; dlg.showModal();
  }
  function closeToast(){ $("#modal").close(); }
  function save(){ localStorage.setItem("arcathlon-spirale-v2", JSON.stringify(state)); }
  function load(){ const t = localStorage.getItem("arcathlon-spirale-v2"); if(!t) return false; try{ Object.assign(state, JSON.parse(t)); return true;}catch{ return false; } }

  /* Spiral positioning */
  function spiralPos(i){
    const cx=450, cy=450, step=0.45, a=28, b=10;
    const th = i*step, r = a + b*th;
    return { x: cx + r*Math.cos(th), y: cy + r*Math.sin(th) };
  }

  /* Build board (SVG) */
  function renderBoard(){
    const svg = $("#board"); svg.innerHTML = "";
    // defs gradient for finish
    const defs = document.createElementNS(SVGNS,"defs");
    const grad = document.createElementNS(SVGNS,"radialGradient"); grad.setAttribute("id","finishGrad");
    const s1=document.createElementNS(SVGNS,"stop"); s1.setAttribute("offset","0%"); s1.setAttribute("stop-color","#ffb703");
    const s2=document.createElementNS(SVGNS,"stop"); s2.setAttribute("offset","100%"); s2.setAttribute("stop-color","#7b2cbf");
    grad.appendChild(s1); grad.appendChild(s2); defs.appendChild(grad); svg.appendChild(defs);

    state.board.forEach((sq,i)=>{
      const g = document.createElementNS(SVGNS, "g");
      g.setAttribute("class","square"+(sq.type? " "+sq.type:"")+(i===state.board.length-1?" finish":""));
      const {x,y} = spiralPos(i); g.setAttribute("transform", `translate(${x-24},${y-18})`);
      const rect = document.createElementNS(SVGNS,"rect");
      rect.setAttribute("width","48"); rect.setAttribute("height","36"); rect.setAttribute("rx","10"); rect.setAttribute("ry","10");
      const t = document.createElementNS(SVGNS,"text"); t.setAttribute("x","24"); t.setAttribute("y","22"); t.setAttribute("text-anchor","middle");
      t.textContent = sq.hidden ? "?" : (sq.label || i);
      const title = document.createElementNS(SVGNS,"title"); title.textContent = sq.hidden ? "Mystère" : (sq.label || ("Case "+i));
      g.appendChild(rect); g.appendChild(t); g.appendChild(title); svg.appendChild(g);
    });

    placeTokens(true);
  }

  function placeTokens(initial=false){
    $$(".token", $("#board")).forEach(n=>n.remove());
    state.teams.forEach((tm,idx)=>{
      const {x,y} = spiralPos(tm.pos);
      const g = document.createElementNS(SVGNS,"g"); g.setAttribute("class","token duo");
      g.setAttribute("transform", `translate(${x-6},${y-34})`);
      const c1 = document.createElementNS(SVGNS,"circle"); c1.setAttribute("class","c1"); c1.setAttribute("r","7"); c1.setAttribute("cx","6"); c1.setAttribute("cy","6"); c1.setAttribute("fill",tm.color);
      const ring1 = document.createElementNS(SVGNS,"circle"); ring1.setAttribute("class","inner c1"); ring1.setAttribute("r","10"); ring1.setAttribute("cx","6"); ring1.setAttribute("cy","6");
      const c2 = document.createElementNS(SVGNS,"circle"); c2.setAttribute("class","c2"); c2.setAttribute("r","7"); c2.setAttribute("cx","6"); c2.setAttribute("cy","6"); c2.setAttribute("fill",tm.color);
      const ring2 = document.createElementNS(SVGNS,"circle"); ring2.setAttribute("class","inner c2"); ring2.setAttribute("r","10"); ring2.setAttribute("cx","6"); ring2.setAttribute("cy","6");
      const title = document.createElementNS(SVGNS,"title"); title.textContent = `${tm.name} (#${tm.pos})`;
      g.appendChild(c1); g.appendChild(ring1); g.appendChild(c2); g.appendChild(ring2); g.appendChild(title);
      $("#board").appendChild(g);
    });
    if(initial) return;
  }

  /* Animations */
  function highlightPath(from, steps){
    const delay = 80;
    for(let i=1;i<=steps;i++){
      const idx = Math.min(from + i, state.board.length-1);
      const g = $$(".square") [idx];
      setTimeout(()=> g && g.classList.add("highlight"), i*delay);
      setTimeout(()=> g && g.classList.remove("highlight"), (i*delay)+400);
    }
  }

  function moveTeamAnimated(teamIndex, steps){
    return new Promise(resolve => {
      if(steps===0) return resolve();
      const t = state.teams[teamIndex];
      let remaining = Math.abs(steps);
      const dir = Math.sign(steps);
      const interval = setInterval(()=>{
        t.pos = Math.max(0, Math.min(t.pos + dir, state.board.length-1));
        placeTokens();
        remaining--;
        if(remaining<=0){ clearInterval(interval); resolve(); }
      }, 220);
    });
  }

  /* Archer inputs (chips) */
  function buildArcherUI(id, name, teamIndex){
    const host = $("#"+id); host.innerHTML = "";
    const title = document.createElement("div"); title.className = "who"; title.textContent = name; host.appendChild(title);

    const maxArrows = state.teams[teamIndex].arrowsPerShooter || 3;
    for(let i=1;i<=maxArrows;i++){
      const row = document.createElement("div"); row.className = "arrow-row";
      const badge = document.createElement("span"); badge.className="badge"; badge.textContent = `Flèche ${i}`;
      const group = document.createElement("div"); group.className = "value-group"; group.dataset.for = `${id}-a${i}`;
      ALLOWED.forEach(v => {
        const b = document.createElement("button");
        b.className = "value-btn"; b.type="button"; b.textContent = String(v); b.dataset.val = String(v); b.setAttribute("aria-pressed","false");
        b.addEventListener("click", ()=>{
          // single-choice behaviour
          $$(".value-btn", group).forEach(x=>x.setAttribute("aria-pressed","false"));
          b.setAttribute("aria-pressed","true");
          computeLiveTotals();
        });
        group.appendChild(b);
      });
      const best = document.createElement("span"); best.className="best"; best.id = `${id}-a${i}-sel`;
      row.appendChild(badge); row.appendChild(group); row.appendChild(best);
      host.appendChild(row);
    }
  }
  function getArrowValue(ref){
    const g = $(`.value-group[data-for="${ref}"]`);
    if(!g) return 0;
    const pressed = $(`.value-btn[aria-pressed="true"]`, g);
    return pressed ? Number(pressed.dataset.val) : 0;
  }
  function bestOfShooter(prefix, teamIndex){
    const arrows = state.teams[teamIndex].arrowsPerShooter || 3;
    const vals = [];
    for(let i=1;i<=arrows;i++) vals.push(getArrowValue(`${prefix}-a${i}`));
    return Math.max(...vals, 0);
  }
  function computeTotals(){
    const bestA1 = bestOfShooter("A1",0), bestA2 = bestOfShooter("A2",0);
    const bestB1 = bestOfShooter("B1",1), bestB2 = bestOfShooter("B2",1);
    return {
      A: { shooters:[bestA1,bestA2], total: bestA1+bestA2 },
      B: { shooters:[bestB1,bestB2], total: bestB1+bestB2 }
    };
  }
  function computeLiveTotals(){
    const totals = computeTotals();
    $("#A-total").textContent = totals.A.total;
    $("#B-total").textContent = totals.B.total;
  }

  /* Board effects (including strategy/goal tiles) */
  function revealMystery(sq){
    const choices = [
      {type:"bonus", value:2, label:"+2 bonus"},
      {type:"malus", value:2, label:"-2 malus"},
      {type:"skip", value:1, label:"Saut 1 tour"},
      {type:"teleport", value:6, label:"Téléport → 6"},
      {type:"steal", value:1, label:"Vole une flèche (prochain tour)"}
    ];
    Object.assign(sq, choices[Math.floor(Math.random()*choices.length)], {hidden:false});
  }

  function applyEffect(teamIndex, sq, lastAdvance){
    const team = state.teams[teamIndex];
    let msg = "";
    if(sq.hidden) revealMystery(sq);
    switch(sq.type){
      case "bonus":
        team.pos = Math.min(team.pos + Number(sq.value||0), state.board.length-1);
        msg = `Bonus +${sq.value} ➜ avance supplémentaire.`; break;
      case "malus":
        team.pos = Math.max(team.pos - Number(sq.value||0), 0);
        msg = `Malus -${sq.value} ➜ recule.`; break;
      case "skip":
        team.skip = (team.skip||0) + 1;
        msg = `⏭️ Sautera le prochain tour.`; break;
      case "teleport":
        {
          // If value <= board length, go absolute; otherwise treat as relative
          let dest = Number(sq.value||0);
          if(dest <= state.board.length-1) team.pos = dest;
          else team.pos = Math.min(state.board.length-1, team.pos + dest);
          msg = `🌀 Téléportation vers #${team.pos}.`;
        }
        break;
      case "goal":
        // purely visible target square (no automatic effect), but can carry a sub-action in label
        msg = `🎯 Case objectif atteinte : ${sq.label}.`; break;
      case "replay":
        // immediate extra movement equal to lastAdvance
        msg = `🔁 Rejoue immédiatement (+${lastAdvance}).`; break;
      case "steal":
        // Opponent will have 2 arrows per shooter next round
        const opp = 1 - teamIndex;
        state.teams[opp].arrowsPerShooter = 2;
        msg = `🟡 Vole une flèche : l'adversaire n'aura que 2 flèches par tireur au prochain tour.`; break;
      default:
        msg = ""; break;
    }
    return msg;
  }

  async function runRoundAnimation(totals){
    // Loading modal
    toast(`<div class="loading"><span>Calcul des meilleurs tirs</span><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>`);
    await new Promise(r=>setTimeout(r, 600));
    closeToast();

    const logs = [];
    // Previews
    const fromA = state.teams[0].pos, fromB = state.teams[1].pos;
    const toA = Math.min(fromA + totals.A.total, state.board.length-1);
    const toB = Math.min(fromB + totals.B.total, state.board.length-1);

    // Preview modal
    toast(`<b>${state.teams[0].name}</b> : ${totals.A.shooters[0]} + ${totals.A.shooters[1]} = <b>${totals.A.total}</b> → #${fromA} → #${toA}<br>
           <b>${state.teams[1].name}</b> : ${totals.B.shooters[0]} + ${totals.B.shooters[1]} = <b>${totals.B.total}</b> → #${fromB} → #${toB}`);
    highlightPath(fromA, totals.A.total);
    highlightPath(fromB, totals.B.total);
    await new Promise(r=>setTimeout(r, 900));
    closeToast();

    // Move A then B with animations to visualize
    await moveTeamAnimated(0, totals.A.total);
    // Effect on A
    const sqA = state.board[state.teams[0].pos];
    let effA = applyEffect(0, sqA, totals.A.total);
    if(effA){ logs.push(`${state.teams[0].name}: ${effA}`); placeTokens(); }
    if(sqA.type === "replay"){ await moveTeamAnimated(0, totals.A.total); }

    await moveTeamAnimated(1, totals.B.total);
    const sqB = state.board[state.teams[1].pos];
    let effB = applyEffect(1, sqB, totals.B.total);
    if(effB){ logs.push(`${state.teams[1].name}: ${effB}`); placeTokens(); }
    if(sqB.type === "replay"){ await moveTeamAnimated(1, totals.B.total); }

    return logs;
  }

  function pushHistory(from,to){
    state.history.push({
      round: state.round,
      from:[...from],
      to:[...to],
      snapshot: JSON.stringify(state)
    });
  }

  async function undoAnimated(){
    if(state.history.length===0){ toast("Rien à annuler."); return; }
    const last = state.history.pop();
    // Animate reverse
    const cur = [state.teams[0].pos, state.teams[1].pos];
    const target = last.from;

    // Move tokens visually backward (without changing state first)
    const deltaA = target[0] - cur[0], deltaB = target[1] - cur[1];
    await moveTeamAnimated(0, deltaA);
    await moveTeamAnimated(1, deltaB);

    // Restore snapshot (positions, penalties, round, etc.)
    const prev = JSON.parse(last.snapshot);
    Object.assign(state, prev);
    $("#round-no").textContent = state.round;
    $("#A-debuff").hidden = state.teams[0].arrowsPerShooter !== 2 ? true : false;
    $("#B-debuff").hidden = state.teams[1].arrowsPerShooter !== 2 ? true : false;
    buildArcherUI("A1", state.teams[0].p1, 0);
    buildArcherUI("A2", state.teams[0].p2, 0);
    buildArcherUI("B1", state.teams[1].p1, 1);
    buildArcherUI("B2", state.teams[1].p2, 1);
    computeLiveTotals(); save();
  }

  /* Default board with visible goals */
  function defaultBoard(){
    const N = 63;
    const specials = {
      4:{type:"goal", label:"🎯 Objectif: Avance +4"},
      5:{type:"bonus", value:2, label:"+2 bonus"},
      8:{type:"goal", label:"🎯 Objectif: → +10"},
      9:{type:"malus", value:2, label:"-2 malus"},
      12:{type:"goal", label:"🎯 Objectif: Rejouer"},
      13:{type:"skip", value:1, label:"Saut 1 tour"},
      16:{type:"goal", label:"🎯 Objectif: Vole 1 flèche"},
      19:{type:"teleport", value:6, label:"Téléport → 6"},
      23:{type:"bonus", value:3, label:"+3 bonus"},
      27:{type:"mystery", value:0, label:"Mystère ?", hidden:true},
      31:{type:"bonus", value:2, label:"+2 bonus"},
      34:{type:"replay", value:0, label:"Rejouer"},
      36:{type:"malus", value:3, label:"-3 malus"},
      41:{type:"mystery", value:0, label:"Mystère ?", hidden:true},
      45:{type:"skip", value:1, label:"Saut 1 tour"},
      48:{type:"steal", value:1, label:"Vole 1 flèche"},
      50:{type:"bonus", value:2, label:"+2 bonus"},
      54:{type:"malus", value:4, label:"-4 malus"},
      58:{type:"teleport", value:32, label:"Téléport → 32"},
      60:{type:"mystery", value:0, label:"Mystère ?", hidden:true}
    };
    const arr = [];
    for(let i=0;i<=N;i++){
      if(i===0) arr.push({index:i,label:"Départ",type:"",value:0});
      else if(i===N) arr.push({index:i,label:"Arrivée 🎯",type:"",value:0});
      else if(specials[i]) arr.push({index:i, ...specials[i]});
      else arr.push({index:i,label:String(i),type:"",value:0});
    }
    return arr;
  }

  /* Events */
  $("#btn-start").addEventListener("click", async () => {
    state.teams[0].name = $("#teamA-name").value || "Équipe A";
    state.teams[0].p1 = $("#teamA-p1").value || "A1";
    state.teams[0].p2 = $("#teamA-p2").value || "A2";
    state.teams[0].color = $("#teamA-color").value || "#5ac8fa";
    state.teams[1].name = $("#teamB-name").value || "Équipe B";
    state.teams[1].p1 = $("#teamB-p1").value || "B1";
    state.teams[1].p2 = $("#teamB-p2").value || "B2";
    state.teams[1].color = $("#teamB-color").value || "#ff7b7b";
    state.teams.forEach(t=>{ t.pos=0; t.skip=0; t.arrowsPerShooter=3; });
    state.round = 1; state.history = [];

    $("#nameA").textContent = state.teams[0].name; $("#nameB").textContent = state.teams[1].name;
    $("#round-no").textContent = state.round;
    $("#A-debuff").hidden = true; $("#B-debuff").hidden = true;

    // Build inputs
    buildArcherUI("A1", state.teams[0].p1, 0);
    buildArcherUI("A2", state.teams[0].p2, 0);
    buildArcherUI("B1", state.teams[1].p1, 1);
    buildArcherUI("B2", state.teams[1].p2, 1);

    state.board = defaultBoard();
    renderBoard();
    $("#screen-setup").classList.remove("active");
    $("#screen-game").classList.add("active");
    save();
  });

  $("#btn-resume").addEventListener("click", () => {
    if(load()){
      $("#nameA").textContent = state.teams[0].name; $("#nameB").textContent = state.teams[1].name;
      $("#round-no").textContent = state.round;
      $("#A-debuff").hidden = state.teams[0].arrowsPerShooter !== 2;
      $("#B-debuff").hidden = state.teams[1].arrowsPerShooter !== 2;
      buildArcherUI("A1", state.teams[0].p1, 0);
      buildArcherUI("A2", state.teams[0].p2, 0);
      buildArcherUI("B1", state.teams[1].p1, 1);
      buildArcherUI("B2", state.teams[1].p2, 1);
      renderBoard();
      $("#screen-setup").classList.remove("active");
      $("#screen-game").classList.add("active");
    } else toast("Aucune sauvegarde trouvée.");
  });

  $("#btn-export").addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));
    a.download = "arcathlon-spirale-v2-save.json"; a.click(); URL.revokeObjectURL(a.href);
  });
  $("#import-save").addEventListener("change", (e) => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = () => { try{
      Object.assign(state, JSON.parse(r.result));
      $("#nameA").textContent = state.teams[0].name; $("#nameB").textContent = state.teams[1].name;
      $("#round-no").textContent = state.round;
      $("#A-debuff").hidden = state.teams[0].arrowsPerShooter !== 2;
      $("#B-debuff").hidden = state.teams[1].arrowsPerShooter !== 2;
      buildArcherUI("A1", state.teams[0].p1, 0);
      buildArcherUI("A2", state.teams[0].p2, 0);
      buildArcherUI("B1", state.teams[1].p1, 1);
      buildArcherUI("B2", state.teams[1].p2, 1);
      renderBoard();
      $("#screen-setup").classList.remove("active");
      $("#screen-game").classList.add("active");
      save();
    }catch{ toast("Sauvegarde invalide."); } };
    r.readAsText(f, "utf-8");
  });

  $("#btn-calc").addEventListener("click", computeLiveTotals);

  $("#btn-validate").addEventListener("click", async () => {
    // Skip handling
    const totals = computeTotals();
    const from = [state.teams[0].pos, state.teams[1].pos];

    // Apply skip before moving
    if(state.teams[0].skip){ totals.A.total = 0; state.teams[0].skip--; }
    if(state.teams[1].skip){ totals.B.total = 0; state.teams[1].skip--; }

    const logs = await runRoundAnimation(totals);
    const to = [state.teams[0].pos, state.teams[1].pos];

    // End of round: if a team had arrowsPerShooter=2 as penalty, it goes back to 3 for next round (one-round penalty)
    $("#A-debuff").hidden = true; $("#B-debuff").hidden = true;
    if(state.teams[0].arrowsPerShooter === 2) { $("#A-debuff").hidden = false; state.teams[0].arrowsPerShooter = 3; }
    if(state.teams[1].arrowsPerShooter === 2) { $("#B-debuff").hidden = false; state.teams[1].arrowsPerShooter = 3; }

    // Show effects log & victory check
    if(state.teams[0].pos === state.board.length-1 || state.teams[1].pos === state.board.length-1){
      const winner = state.teams[0].pos===state.board.length-1 && state.teams[1].pos===state.board.length-1 ? "Égalité" : (state.teams[0].pos===state.board.length-1 ? state.teams[0].name : state.teams[1].name);
      toast(`🏆 Fin de partie : <b>${winner}</b>`);
    }else if(logs.length){
      toast(logs.map(l=>"• "+l).join("<br>"));
    }

    // Prepare next round UI (rebuild chips if penalty changed)
    buildArcherUI("A1", state.teams[0].p1, 0);
    buildArcherUI("A2", state.teams[0].p2, 0);
    buildArcherUI("B1", state.teams[1].p1, 1);
    buildArcherUI("B2", state.teams[1].p2, 1);
    computeLiveTotals();

    pushHistory(from,to);
    state.round++; $("#round-no").textContent = state.round;
    save();
  });

  $("#btn-undo").addEventListener("click", undoAnimated);
  $("#btn-save").addEventListener("click", () => { save(); toast("Sauvegardé (navigateur)."); });
  $("#btn-help").addEventListener("click", () => $("#help").showModal());
  $("#help-close").addEventListener("click", () => $("#help").close());
  $("#modal-close").addEventListener("click", () => $("#modal").close());

})();