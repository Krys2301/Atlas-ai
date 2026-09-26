import { CreateMLCEngine } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.84/+esm";

const MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const $ = id => document.getElementById(id);
const chat = $("chat"), input = $("input"), send = $("send"), voice = $("voice");
const status = $("status"), progress = $("progress");
let engine = null;
let initPromise = null;
let history = JSON.parse(localStorage.getItem("atlas_memory") || "[]");

function add(text, user=false, save=true){
  const row=document.createElement("div");
  row.className="msg "+(user?"user":"");
  const b=document.createElement("div");
  b.className="bubble";
  b.textContent=text;
  row.appendChild(b); chat.appendChild(row);
  chat.scrollTop=chat.scrollHeight;
  if(save){
    history.push({role:user?"user":"assistant",content:text});
    history=history.slice(-20);
    localStorage.setItem("atlas_memory",JSON.stringify(history));
  }
}

if(history.length) history.forEach(m=>add(m.content,m.role==="user",false));
else add("Salut. Je suis A.T.L.A.S. 🧠\n\nMon cerveau est prévu pour fonctionner directement sur ton iPhone. La première initialisation télécharge le modèle local.",false,false);

async function getEngine(){
  if(engine) return engine;
  if(initPromise) return initPromise;
  if(!("gpu" in navigator)) throw new Error("WebGPU indisponible. Mets iOS à jour.");
  initPromise=(async()=>{
    progress.classList.add("on");
    status.textContent="Téléchargement du cerveau local…";
    const e=await CreateMLCEngine(MODEL,{
      initProgressCallback:r=>{
        status.textContent=r.text || "Chargement du cerveau…";
      }
    });
    engine=e;
    status.textContent="A.T.L.A.S • local";
    progress.classList.remove("on");
    return e;
  })();
  try{return await initPromise}catch(e){initPromise=null;progress.classList.remove("on");status.textContent="Erreur de chargement";throw e}
}

async function ask(){
  const text=input.value.trim();
  if(!text || send.disabled)return;
  add(text,true); input.value="";
  send.disabled=true; voice.disabled=true; progress.classList.add("on");
  try{
    const e=await getEngine();
    const messages=[
      {role:"system",content:"Tu es A.T.L.A.S, l'assistant personnel de l'utilisateur. Tu parles français. Tu es naturel, chaleureux, direct et utile. Ne parle pas comme un service client. Appelle-toi A.T.L.A.S. Ne prétends jamais avoir accès au téléphone, aux messages, aux fichiers ou à Internet si l'application ne t'en donne pas réellement l'accès."},
      ...history.slice(-12)
    ];
    const r=await e.chat.completions.create({
      messages,
      temperature:0.7,
      max_tokens:256
    });
    const answer=r.choices?.[0]?.message?.content || "Je n'ai pas réussi à répondre.";
    add(answer,false);
    speak(answer);
    status.textContent="A.T.L.A.S • local";
  }catch(err){
    add("Je n'arrive pas à démarrer mon cerveau local. Vérifie que ton iPhone est sous iOS 26 ou plus récent et recharge la page.",false);
    status.textContent="A.T.L.A.S • erreur";
  }finally{
    progress.classList.remove("on");send.disabled=false;voice.disabled=false;
  }
}

function speak(text){
  if(!("speechSynthesis" in window))return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang="fr-FR";u.rate=.98;u.pitch=.95;
  speechSynthesis.speak(u);
}

let recognition=null;
if("webkitSpeechRecognition" in window){
  recognition=new webkitSpeechRecognition();
  recognition.lang="fr-FR";recognition.interimResults=false;recognition.continuous=false;
  recognition.onstart=()=>{voice.textContent="🔴"};
  recognition.onend=()=>{voice.textContent="🎙️"};
  recognition.onresult=e=>{input.value=e.results[0][0].transcript;ask()};
  recognition.onerror=()=>{voice.textContent="🎙️"};
}
voice.onclick=()=>{
  if(recognition) recognition.start();
  else alert("La dictée vocale de Safari n'est pas disponible ici. Utilise le microphone du clavier.");
};
send.onclick=ask;
input.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();ask()}});
$("reset").onclick=()=>{
  history=[];localStorage.removeItem("atlas_memory");chat.innerHTML="";
  add("Mémoire de conversation effacée. Je repars de zéro.",false,false);
};
