(()=>{
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const state={
    board:[],
    teams:[{name:"Équipe A",color:"#4dabf7",p1:"A1",p2:"A2",pos:0,skip:0},{name:"Équipe B",color:"#ff6b6b",p1:"B1",p2:"B2",pos:0,skip:0}],
    round:1, history:[]
  };
  function toast(html){const d=$("#modal");$("#modal-content").innerHTML=html;d.showModal();}
  function save(){localStorage.setItem("arcathlon-spirale",JSON.stringify(state));}
  function load(){const t=localStorage.getItem("arcathlon-spirale");if(!t)return false;try{Object.assign(state,JSON.parse(t));return true;}catch{return false;}}

  function spiralPos(i){const cx=400,cy=400,step=.5,a=10,b=12,th=i*step,r=a+b*th;return {x:cx+r*Math.cos(th),y:cy+r*Math.sin(th)};}
  function renderBoard(){
    const svg=$("#board"); svg.innerHTML="";
    state.board.forEach((sq,i)=>{
      const g=document.createElementNS(svg.namespaceURI,"g");
      g.setAttribute("class","square"+(sq.type?" "+sq.type:"")+(i===state.board.length-1?" finish":""));
      const {x,y}=spiralPos(i); g.setAttribute("transform",`translate(${x-20},${y-14})`);
      const r=document.createElementNS(svg.namespaceURI,"rect"); r.setAttribute("width","40"); r.setAttribute("height","28"); r.setAttribute("rx","8"); r.setAttribute("ry","8");
      const t=document.createElementNS(svg.namespaceURI,"text"); t.setAttribute("x","20"); t.setAttribute("y","18"); t.setAttribute("text-anchor","middle");
      t.textContent=sq.hidden?"?":(sq.label||i);
      const title=document.createElementNS(svg.namespaceURI,"title"); title.textContent=sq.hidden?"Mystère":(sq.label||("Case "+i));
      g.appendChild(r); g.appendChild(t); g.appendChild(title); svg.appendChild(g);
    });
    placeTokens();
  }
  function placeTokens(){
    $$(".token",$("#board")).forEach(e=>e.remove());
    state.teams.forEach((tm,idx)=>{
      const {x,y}=spiralPos(tm.pos); const g=document.createElementNS("http://www.w3.org/2000/svg","g");
      g.setAttribute("class","token"); g.setAttribute("transform",`translate(${x-6+(idx?8:-8)},${y-30})`);
      const c=document.createElementNS(g.namespaceURI,"circle"); c.setAttribute("r","6"); c.setAttribute("cx","6"); c.setAttribute("cy","6"); c.setAttribute("fill",tm.color);
      const title=document.createElementNS(g.namespaceURI,"title"); title.textContent=`${tm.name} (#${tm.pos})`;
      g.appendChild(c); g.appendChild(title); $("#board").appendChild(g);
    });
  }
  const best3=(a,b,c)=>Math.max(+a||0,+b||0,+c||0);
  const compute=pre=>{const b1=best3($("#"+pre+"1-a1").value,$("#"+pre+"1-a2").value,$("#"+pre+"1-a3").value);
    const b2=best3($("#"+pre+"2-a1").value,$("#"+pre+"2-a2").value,$("#"+pre+"2-a3").value);
    $("#"+pre+"1-best").textContent=b1; $("#"+pre+"2-best").textContent=b2; $("#"+pre+"-total").textContent=b1+b2; return b1+b2; };
  const calcBoth=()=>[compute("A"),compute("B")];
  function revealMystery(sq){const arr=[{type:"bonus",value:2,label:"+2 bonus"},{type:"malus",value:2,label:"-2 malus"},{type:"skip",value:1,label:"Saut 1 tour"},{type:"teleport",value:6,label:"Téléport → 6"}];
    Object.assign(sq,arr[Math.floor(Math.random()*arr.length)],{hidden:false});}
  function applyEffect(team,sq){if(sq.hidden)revealMystery(sq);let msg="";
    switch(sq.type){case"bonus":team.pos=Math.min(team.pos+(sq.value||0),state.board.length-1);msg=`Bonus +${sq.value}`;break;
    case"malus":team.pos=Math.max(team.pos-(sq.value||0),0);msg=`Malus -${sq.value}`;break;
    case"skip":team.skip=(team.skip||0)+1;msg="Sautera 1 tour";break;
    case"teleport":team.pos=Math.max(0,Math.min(sq.value||0,state.board.length-1));msg=`Téléport → ${team.pos}`;break;}
    return msg;}
  function validateRound(){
    const [a,b]=calcBoth(), logs=[];
    if(state.teams[0].skip){state.teams[0].skip--;logs.push("A saute le tour");}
    else{state.teams[0].pos=Math.min(state.teams[0].pos+a,state.board.length-1);const e=applyEffect(state.teams[0],state.board[state.teams[0].pos]); if(e)logs.push("A: "+e);}
    if(state.teams[1].skip){state.teams[1].skip--;logs.push("B saute le tour");}
    else{state.teams[1].pos=Math.min(state.teams[1].pos+b,state.board.length-1);const e=applyEffect(state.teams[1],state.board[state.teams[1].pos]); if(e)logs.push("B: "+e);}
    placeTokens(); state.history.push(JSON.stringify(state)); state.round++; $("#round-no").textContent=state.round; save();
    if(state.teams[0].pos===state.board.length-1||state.teams[1].pos===state.board.length-1){const win=(state.teams[0].pos===state.board.length-1&&state.teams[1].pos===state.board.length-1)?"Égalité !":(state.teams[0].pos===state.board.length-1?state.teams[0].name:state.teams[1].name); toast("🏆 "+win);}
    else toast(logs.map(x=>"• "+x).join("<br>"));
    ["A1","A2","B1","B2"].forEach(id=>["a1","a2","a3"].forEach(a=>$("#"+id+"-"+a).value="")); calcBoth();
  }
  function undo(){ if(state.history.length===0){toast("Rien à annuler");return;} state.history.pop(); const prev=state.history[state.history.length-1];
    if(prev){Object.assign(state,JSON.parse(prev));}else{const t0=state.teams[0],t1=state.teams[1]; state.round=1; state.teams=[{...t0,pos:0,skip:0},{...t1,pos:0,skip:0}];}
    $("#round-no").textContent=state.round; placeTokens(); save(); }
  async function loadBoardFrom(url){ try{const r=await fetch(url,{cache:"no-store"}); if(!r.ok) throw 0; state.board=normalizeBoard(await r.json());}catch{state.board=defaultBoard();} }
  function normalizeBoard(arr){ const max=arr.reduce((m,r)=>Math.max(m,+r.index||0),0), out=[]; for(let i=0;i<=max;i++) out[i]={index:i,label:String(i),type:"",value:0};
    for(const r of arr){const i=+r.index||0; out[i]={index:i,label:r.label||String(i),type:(r.type||"").toLowerCase(),value:+(r.value||0),hidden:!!r.hidden};}
    out[out.length-1].label=out[out.length-1].label||"Arrivée 🎯"; return out; }
  function defaultBoard(){ const N=63, sp={5:["bonus",2,"+2 bonus"],9:["malus",2,"-2 malus"],13:["skip",1,"Saut 1 tour"],19:["teleport",6,"Téléport → 6"],27:["mystery",0,"Mystère ?",true],41:["mystery",0,"Mystère ?",true],54:["malus",4,"-4 malus"],58:["teleport",32,"Téléport → 32"]};
    const out=[]; for(let i=0;i<=N;i++){ if(i===0) out.push({index:i,label:"Départ",type:"",value:0}); else if(i===N) out.push({index:i,label:"Arrivée 🎯",type:"",value:0});
      else if(sp[i]){const [t,v,l,h]=sp[i]; out.push({index:i,label:l,type:t,value:v,hidden:!!h});} else out.push({index:i,label:String(i),type:"",value:0}); } return out; }
  // Events
  $("#btn-start").addEventListener("click", async ()=>{
    state.teams[0].name=$("#teamA-name").value||"Équipe A"; state.teams[0].p1=$("#teamA-p1").value||"A1"; state.teams[0].p2=$("#teamA-p2").value||"A2"; state.teams[0].color=$("#teamA-color").value||"#4dabf7";
    state.teams[1].name=$("#teamB-name").value||"Équipe B"; state.teams[1].p1=$("#teamB-p1").value||"B1"; state.teams[1].p2=$("#teamB-p2").value||"B2"; state.teams[1].color=$("#teamB-color").value||"#ff6b6b";
    state.teams.forEach(t=>{t.pos=0;t.skip=0}); state.round=1; state.history=[];
    $("#nameA").textContent=state.teams[0].name; $("#nameB").textContent=state.teams[1].name;
    $("#A1-name").textContent=state.teams[0].p1; $("#A2-name").textContent=state.teams[0].p2;
    $("#B1-name").textContent=state.teams[1].p1; $("#B2-name").textContent=state.teams[1].p2;
    $("#round-no").textContent=state.round;
    if(state.board.length===0) await loadBoardFrom($("#board-select").value);
    renderBoard(); $("#screen-setup").classList.remove("active"); $("#screen-game").classList.add("active"); save();
  });
  $("#btn-new").addEventListener("click",()=>{localStorage.removeItem("arcathlon-spirale"); location.reload();});
  $("#btn-resume").addEventListener("click",()=>{ if(load()){ $("#nameA").textContent=state.teams[0].name; $("#nameB").textContent=state.teams[1].name;
    $("#A1-name").textContent=state.teams[0].p1; $("#A2-name").textContent=state.teams[0].p2;
    $("#B1-name").textContent=state.teams[1].p1; $("#B2-name").textContent=state.teams[1].p2;
    $("#round-no").textContent=state.round; renderBoard(); $("#screen-setup").classList.remove("active"); $("#screen-game").classList.add("active"); } else toast("Aucune sauvegarde"); });
  $("#btn-export").addEventListener("click",()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:"application/json"}));a.download="arcathlon-spirale-save.json";a.click();URL.revokeObjectURL(a.href);});
  $("#import-save").addEventListener("change",e=>{const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{try{Object.assign(state,JSON.parse(r.result)); renderBoard(); $("#screen-setup").classList.remove("active"); $("#screen-game").classList.add("active"); save();}catch{toast("Sauvegarde invalide");}}; r.readAsText(f,"utf-8");});
  $("#btn-calc").addEventListener("click",calcBoth);
  $("#btn-validate").addEventListener("click",validateRound);
  $("#btn-undo").addEventListener("click",undo);
  $("#btn-save").addEventListener("click",()=>{save(); toast("Sauvegardé");});
  $("#btn-help").addEventListener("click",()=>$("#help").showModal());
  $("#modal-close").addEventListener("click",()=>$("#modal").close());
})();