// Arcathlon – Jeu de l'Oie (Multijoueurs local) – GitHub Pages compatible
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const state = {
    board: [],
    players: [],
    turn: 0,
    dice: 2,
    finished: false,
    zoom: 1
  };

  const randColor = () => `hsl(${Math.floor(Math.random()*360)},85%,60%)`;

  function toast(msg){
    const dlg = $("#modal");
    $("#modal-content").innerHTML = `<p>${msg}</p>`;
    dlg.showModal();
  }
  function saveToLocal(){ localStorage.setItem("arcathlon-save", JSON.stringify(state)); }
  function loadFromLocal(){
    const raw = localStorage.getItem("arcathlon-save"); if(!raw) return false;
    try{ Object.assign(state, JSON.parse(raw)); return true; }catch(e){ console.error(e); return false; }
  }
  function download(filename, content, type="application/json"){
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], {type}));
    a.download = filename; a.click(); URL.revokeObjectURL(a.href);
  }
  function parseCSV(text){
    const sep = text.includes(";") && !text.includes(",") ? ";" : ",";
    const lines = text.trim().split(/\r?\n/);
    const headers = lines.shift().split(sep).map(h => h.trim().toLowerCase());
    return lines.map(line => {
      const cols = line.split(sep).map(c => c.trim());
      const obj = {}; headers.forEach((h,i)=> obj[h] = cols[i]);
      return obj;
    });
  }

  function applyEffect(player, square){
    switch(square.type){
      case "advance": player.pos = Math.min(player.pos + Number(square.value||0), state.board.length-1);
        return `➡️ ${player.name} avance de ${square.value} case(s).`;
      case "back": player.pos = Math.max(player.pos - Number(square.value||0), 0);
        return `⬅️ ${player.name} recule de ${square.value} case(s).`;
      case "skip": player.skip = 1; return `⏭️ ${player.name} passera son prochain tour.`;
      case "roll_again": return `🎲 ${player.name} relance immédiatement !`;
      case "teleport":
        const dest = Math.max(0, Math.min(Number(square.value||0), state.board.length-1));
        player.pos = dest; return `🌀 ${player.name} est téléporté à la case ${dest}.`;
      default: return "";
    }
  }

  // ---------- Setup Screen ----------
  const playersWrap = document.getElementById("players-list");
  playersWrap.addEventListener("input", (ev) => {
    const i = Number(ev.target.dataset.i);
    if (Number.isNaN(i)) return;
    if (ev.target.type === "text") { state.players[i].name = ev.target.value; }
    if (ev.target.type === "color") { state.players[i].color = ev.target.value; renderSetupPlayers(); }
  });

  function renderSetupPlayers(){
    const count = Math.max(2, Math.min(8, Number($("#player-count").value||2)));
    const wrap = playersWrap;
    wrap.innerHTML = "";
    while(state.players.length < count){
      const id = state.players.length;
      state.players.push({ id, name:`Joueur ${id+1}`, color: randColor(), pos:0, skip:0 });
    }
    while(state.players.length > count) state.players.pop();

    state.players.forEach((p,i) => {
      const item = document.createElement("div");
      item.className = "player-item";
      item.innerHTML = `
        <span class="color-dot" style="background:${p.color}"></span>
        <input type="text" value="${p.name}" data-i="${i}" aria-label="Nom du joueur ${i+1}" />
        <input type="color" value="${rgbToHex(p.color)}" data-i="${i}" aria-label="Couleur du joueur ${i+1}" />
      `;
      wrap.appendChild(item);
    });
  }

  function rgbToHex(input){
    if(input.startsWith("#")) return input;
    if(input.startsWith("hsl")){
      const m = input.match(/hsl\((\d+),\s*([\d.]+)%?,\s*([\d.]+)%?\)/i);
      if(m){
        const [h,s,l] = [Number(m[1]), Number(m[2])/100, Number(m[3])/100];
        const c = (1 - Math.abs(2*l-1)) * s;
        const x = c * (1 - Math.abs((h/60)%2 - 1));
        const m0 = l - c/2;
        let [r,g,b] = [0,0,0];
        if(h<60) [r,g,b] = [c,x,0];
        else if(h<120) [r,g,b] = [x,c,0];
        else if(h<180) [r,g,b] = [0,c,x];
        else if(h<240) [r,g,b] = [0,x,c];
        else if(h<300) [r,g,b] = [x,0,c];
        else [r,g,b] = [c,0,x];
        const to255 = v => Math.round((v+m0)*255);
        return "#"+[to255(r),to255(g),to255(b)].map(n=>n.toString(16).padStart(2,"0")).join("");
      }
    }
    return "#"+input;
  }

  async function loadBoardFrom(url){
    try{
      const res = await fetch(url, {cache:"no-store"});
      if(!res.ok) throw new Error("HTTP "+res.status);
      const json = await res.json();
      state.board = normalizeBoard(json);
    }catch(e){
      console.warn("Fetch board failed, using fallback:", e);
      state.board = defaultBoard();
      toast("Plateau par défaut chargé (fichier introuvable).");
    }
  }

  function importBoardFromFile(file){
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result;
      if(file.name.endsWith(".json")){
        try{
          const arr = JSON.parse(text);
          if(Array.isArray(arr)){ state.board = normalizeBoard(arr); renderBoard(); }
          else toast("JSON invalide pour le plateau.");
        }catch(e){ console.error(e); toast("Erreur de lecture JSON."); }
      }else{
        const rows = parseCSV(text);
        const arr = rows.map(r => ({
          index: Number(r.index),
          label: r.label || "",
          type: (r.type||"").toLowerCase(),
          value: Number(r.valeur || r.value || 0)
        }));
        state.board = normalizeBoard(arr);
        renderBoard();
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function normalizeBoard(arr){
    const maxIndex = arr.reduce((m, r) => Math.max(m, Number(r.index||0)), 0);
    const out = [];
    for(let i=0;i<=maxIndex;i++){
      out[i] = { index:i, label:"", type:"", value:0 };
    }
    for(const r of arr){
      const idx = Number(r.index||0);
      out[idx] = {
        index: idx,
        label: r.label || "",
        type: (r.type||"").toLowerCase(),
        value: Number(r.value || r.valeur || 0)
      };
    }
    out[out.length-1].label = out[out.length-1].label || "Arrivée";
    return out;
  }

  function defaultBoard(){
    const N = 63;
    const specials = {
      3:["advance",2,"Pont +2"], 6:["advance",2,"Oie +2"], 9:["roll_again",0,"Rejoue"],
      12:["back",2,"Glissade -2"], 14:["advance",3,"Turbo +3"], 18:["skip",1,"Passe 1 tour"],
      19:["teleport",6,"Retour #6"], 23:["advance",2,"Oie +2"], 26:["back",3,"Ornière -3"],
      27:["roll_again",0,"Rejoue"], 31:["advance",2,"Oie +2"], 36:["skip",1,"Passe 1 tour"],
      40:["advance",3,"Turbo +3"], 42:["back",2,"Boulet -2"], 45:["roll_again",0,"Rejoue"],
      50:["advance",2,"Oie +2"], 54:["back",4,"Tempête -4"], 57:["skip",1,"Passe 1 tour"],
      59:["advance",2,"Oie +2"]
    };
    const board = [];
    for(let i=0;i<=N;i++){
      if(i===0) board.push({index:i,label:"Départ",type:"",value:0});
      else if(i===N) board.push({index:i,label:"Arrivée 🎯",type:"",value:0});
      else if(specials[i]){
        const [t,v,name] = specials[i];
        board.push({index:i,label:name,type:t,value:v});
      }else board.push({index:i,label:"",type:"",value:0});
    }
    return board;
  }

  // ---------- Game UI ----------
  function renderBoard(){
    const el = $("#board"); el.innerHTML = "";
    state.board.forEach((sq, i) => {
      const d = document.createElement("div");
      d.className = "square";
      if(i === state.board.length-1) d.classList.add("finish");
      if(sq.type === "advance") d.classList.add("effect-advance");
      if(sq.type === "back") d.classList.add("effect-back");
      if(sq.type === "skip") d.classList.add("effect-skip");
      if(sq.type === "roll_again") d.classList.add("effect-roll");
      d.innerHTML = `<div class="idx">#${i}</div><div>${sq.label || ""}</div><div class="token" id="t-${i}"></div>`;
      el.appendChild(d);
    });
    state.players.forEach(p => placeToken(p));
  }

  function renderPlayersBar(){
    const bar = $("#players-bar"); bar.innerHTML = "";
    state.players.forEach((p,i) => {
      const card = document.createElement("div");
      card.className = "player-card"+(i===state.turn ? " turn" : "");
      card.style.borderLeftColor = p.color;
      card.innerHTML = `<div class="name">${p.name}</div><div class="meta">Position: ${p.pos} / ${state.board.length-1} ${p.skip? " • ⏭️ Tour sauté":""}</div>`;
      bar.appendChild(card);
    });
    $("#turn-name").textContent = state.players[state.turn]?.name || "—";
  }

  function placeToken(p){
    const container = $(`#t-${p.pos}`); if(!container) return;
    const dot = document.createElement("div"); dot.className = "p"; dot.style.background = p.color; dot.title = p.name;
    container.appendChild(dot);
    container.parentElement.scrollIntoView({behavior:"smooth", inline:"center", block:"nearest"});
  }

  function nextTurn(){ state.turn = (state.turn + 1) % state.players.length; renderPlayersBar(); }
  function rollDice(){
    const dice = Number($("#dice-count").value || state.dice);
    const roll = () => 1 + Math.floor(Math.random()*6);
    const r1 = roll(), r2 = dice===2 ? roll() : 0, sum = dice===2 ? r1+r2 : r1;
    $("#dice-result").textContent = dice===2 ? `${r1} + ${r2} = ${sum}` : `${r1}`;
    return {r1,r2,sum};
  }

  function gameStep(){
    const current = state.players[state.turn]; if(!current || state.finished) return;
    if(current.skip){ toast(`⏭️ ${current.name} saute son tour.`); current.skip = 0; renderPlayersBar(); nextTurn(); saveToLocal(); return; }
    const { sum } = rollDice();
    current.pos = Math.min(current.pos + sum, state.board.length-1);
    renderBoard(); renderPlayersBar();
    const arrived = state.board[current.pos];
    let msg = `${current.name} avance de ${sum} case(s) et arrive sur #${current.pos} – ${arrived.label || "case neutre"}.`;
    const effectMsg = applyEffect(current, arrived);
    if(effectMsg) msg += "<br>"+effectMsg;
    renderBoard(); renderPlayersBar();
    if(current.pos >= state.board.length-1){ state.finished = true; toast(`🏆 ${current.name} a gagné !`); saveToLocal(); return; }
    if(arrived.type === "roll_again"){ toast(msg + "<br><b>Relance immédiate !</b>"); saveToLocal(); return; }
    toast(msg); nextTurn(); saveToLocal();
  }

  // ---------- Events ----------
  $("#player-count").addEventListener("input", renderSetupPlayers);
  $("#dice-count").addEventListener("change", e => state.dice = Number(e.target.value));
  $("#btn-colors").addEventListener("click", () => { state.players.forEach(p => p.color = randColor()); renderSetupPlayers(); });
  $("#import-players").addEventListener("change", (e) => {
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCSV(reader.result);
      state.players = rows.map((r,i) => ({
        id:i, name: r.nom || r.name || `Joueur ${i+1}`,
        color: r.couleur || r.color || randColor(), pos:0, skip:0
      }));
      $("#player-count").value = state.players.length; renderSetupPlayers();
    };
    reader.readAsText(f, "utf-8");
  });
  $("#import-board").addEventListener("change", (e) => { const f = e.target.files[0]; if(!f) return; importBoardFromFile(f); });
  $("#btn-start").addEventListener("click", async () => {
    if(state.board.length === 0) await loadBoardFrom($("#board-select").value);
    state.players = state.players.slice(0, Math.max(2, Math.min(8, state.players.length)));
    state.players.forEach(p => { p.pos=0; p.skip=0; });
    state.turn = 0; state.finished = false;
    renderBoard(); renderPlayersBar(); show("#screen-game"); saveToLocal();
  });
  $("#btn-new").addEventListener("click", () => {
    localStorage.removeItem("arcathlon-save");
    state.players = []; $("#player-count").value = 2; $("#dice-count").value = String(state.dice || 2);
    renderSetupPlayers(); show("#screen-setup");
  });
  $("#btn-resume").addEventListener("click", () => { if(loadFromLocal()){ renderBoard(); renderPlayersBar(); show("#screen-game"); } else toast("Aucune sauvegarde locale trouvée."); });
  $("#btn-export").addEventListener("click", () => download("arcathlon-sauvegarde.json", JSON.stringify(state, null, 2)));
  $("#btn-save").addEventListener("click", () => { saveToLocal(); toast("Sauvegardé localement (navigateur)."); });
  $("#btn-reset").addEventListener("click", () => {
    if(confirm("Réinitialiser la partie ?")){ state.players.forEach(p => { p.pos=0; p.skip=0; });
      state.turn=0; state.finished=false; renderBoard(); renderPlayersBar(); saveToLocal(); }
  });
  $("#btn-home").addEventListener("click", () => show("#screen-setup"));
  $("#btn-roll").addEventListener("click", gameStep);
  $("#btn-toggle-zoom").addEventListener("click", () => {
    state.zoom = state.zoom === 1 ? 0.6 : 1;
    $("#board").style.transform = `scale(${state.zoom})`;
    $("#board").style.transformOrigin = "left center";
  });
  $("#import-save").addEventListener("change", (e) => {
    const f = e.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{ Object.assign(state, JSON.parse(reader.result)); renderBoard(); renderPlayersBar(); show("#screen-game"); saveToLocal(); }
      catch(e){ toast("Sauvegarde invalide."); }
    };
    reader.readAsText(f, "utf-8");
  });
  $("#btn-help").addEventListener("click", () => $("#help").showModal());
  $("#help-close").addEventListener("click", () => $("#help").close());
  $("#modal-close").addEventListener("click", () => $("#modal").close());

  function show(id){ $$(".screen").forEach(s=>s.classList.remove("active")); $(id).classList.add("active"); }

  // init
  (function init(){
    $("#dice-count").value = "2";
    renderSetupPlayers();
  })();
})();