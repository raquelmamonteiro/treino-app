import { useState, useEffect, useCallback, useRef } from "react";
import { getSupabase, isSupabaseConfigured, getSupabaseConfigProblem, formatSupabaseNetworkError } from "./lib/supabase";
import { loadTreinoState, persistTreinoData, initTreinoData } from "./lib/treinoSync";

/** Peso “resumo” para progressão: número antigo ou última série do log novo */
function weightFromLogVal(v){if(v===undefined||v===null)return undefined;if(typeof v==="number"&&!isNaN(v))return v;if(typeof v==="object"&&v!==null&&Array.isArray(v.kg)){const k=v.kg.filter(x=>typeof x==="number"&&!isNaN(x));if(k.length)return k[k.length-1];}return undefined;}

const ACHIEV=[
  {id:"first",icon:"⭐",title:"Primeiro treino!",desc:"Completou o primeiro treino",check:l=>l.filter(e=>e.type==="workout").length>=1},
  {id:"s3",icon:"🔥",title:"3 dias seguidos",desc:"3 dias consecutivos com registo",check:(_,s)=>s>=3},
  {id:"s5",icon:"💥",title:"5 dias seguidos!",desc:"5 dias consecutivos",check:(_,s)=>s>=5},
  {id:"s7",icon:"🌋",title:"7 dias seguidos",desc:"Uma semana sem falhar",check:(_,s)=>s>=7},
  {id:"s10",icon:"🏆",title:"10 dias seguidos",desc:"Imparável",check:(_,s)=>s>=10},
  {id:"s14",icon:"🌟",title:"14 dias seguidos",desc:"Duas semanas de constância",check:(_,s)=>s>=14},
  {id:"s30",icon:"🚀",title:"30 dias seguidos",desc:"Um mês de disciplina",check:(_,s)=>s>=30},
  {id:"c1",icon:"🔄",title:"Ciclo completo",desc:"5 treinos do ciclo",check:l=>l.filter(e=>e.type==="workout").length>=5},
  {id:"w10",icon:"💪",title:"10 treinos",desc:"Dedicação!",check:l=>l.filter(e=>e.type==="workout").length>=10},
  {id:"w25",icon:"👑",title:"25 treinos",desc:"Rainha do ferro",check:l=>l.filter(e=>e.type==="workout").length>=25},
  {id:"w50",icon:"🏋️",title:"50 treinos",desc:"Volume impressionante",check:l=>l.filter(e=>e.type==="workout").length>=50},
  {id:"w75",icon:"⚔️",title:"75 treinos",desc:"Quase lá dos 100",check:l=>l.filter(e=>e.type==="workout").length>=75},
  {id:"w100",icon:"💯",title:"100 treinos",desc:"Centenário de treinos",check:l=>l.filter(e=>e.type==="workout").length>=100},
  {id:"free5",icon:"🧘",title:"5 atividades livres",desc:"Outras atividades registadas",check:l=>l.filter(e=>e.type==="free").length>=5},
  {id:"free15",icon:"🎨",title:"15 atividades livres",desc:"Exploradora do movimento",check:l=>l.filter(e=>e.type==="free").length>=15},
  {id:"mob10",icon:"🦋",title:"10 mobilidades",desc:"10 registos de descanso/mobilidade",check:l=>l.filter(e=>e.type==="rest").length>=10},
  {id:"mix3",icon:"🔀",title:"Três pilares",desc:"Pelo menos um treino, uma corrida e uma atividade livre (no total)",check:l=>l.some(e=>e.type==="workout")&&l.some(e=>e.type==="run")&&l.some(e=>e.type==="free")},
  {id:"prog",icon:"📈",title:"1ª progressão",desc:"Aumentou carga num exercício",check:l=>{const w={};for(const e of l){if(e.type==="workout"&&e.w)for(const[k,v]of Object.entries(e.w)){const x=weightFromLogVal(v);if(x===undefined)continue;if(!w[k])w[k]=[];w[k].push(x);}}return Object.values(w).some(a=>a.length>1&&a[a.length-1]>a[0]);}},
];
const RUN_MILESTONES=[
  {id:"run-3",km:3,icon:"🌱",title:"3 km",desc:"Pelo menos 3 km num treino"},
  {id:"run-5",km:5,icon:"🎯",title:"5 km",desc:"Pelo menos 5 km num treino"},
  {id:"run-8",km:8,icon:"🔷",title:"8 km",desc:"Pelo menos 8 km num treino"},
  {id:"run-10",km:10,icon:"🎖️",title:"10 km",desc:"Pelo menos 10 km num treino"},
  {id:"run-15",km:15,icon:"💎",title:"15 km",desc:"Pelo menos 15 km num treino"},
  {id:"run-21",km:21,icon:"👑",title:"Meia maratona",desc:"Pelo menos 21 km num treino"},
  {id:"run-30",km:30,icon:"🦅",title:"30 km",desc:"Pelo menos 30 km num treino"},
  {id:"run-42",km:42,icon:"🏅",title:"Maratona",desc:"Pelo menos 42 km num treino"},
];
const RUN_ACHIEV_BASE=[{id:"run-first",icon:"👟",title:"Primeira corrida",desc:"Registrou uma corrida",check:l=>l.some(e=>e.type==="run")},...RUN_MILESTONES.map(m=>({id:m.id,icon:m.icon,title:m.title,desc:m.desc,check:l=>l.some(e=>e.type==="run"&&(e.km||0)>=m.km)}))];
const MOTIV=["Mais forte que ontem 🔥","Cada série conta.","Consistência vale mais que tudo 💪","Seu corpo agradece.","Treino feito = dia ganho.","Ninguém tira isso de você.","Bora! 🚀","Disciplina vale mais que motivação."];
const FB_OPT=["💪 Me senti forte","😓 Pesado","😴 Sem energia","🔥 Perfeito!","⚡ Quero mais","🤕 Desconforto"];
const RUN_FEEL=["💪 Ótimo","😓 Pesado","😴 Cansada","🔥 No ritmo","⚡ Energia boa","🤕 Desconforto"];

const GFP="https://www.gofitnessplan.com";
/**
 * Conteúdo visual e técnico alinhado a https://www.gofitnessplan.com/exercises/…
 * Manutenção: ao atualizar um exercício, abrir `page`, copiar URL da imagem (og:image ou img#exercise-image)
 * e traduzir os passos do site para PT-BR em `steps`. Não expor link ao usuário na UI.
 */
const EX_INFO={
"hip-thrust":{img:`${GFP}/images/exercises/mixed/hip-thrust.jpg`,page:`${GFP}/exercises/barbell-hip-thrust`,steps:["Sente no chão com joelhos flexionados e um banco logo atrás de você (estável).","Apoie a barra sobre o quadril e posicione as escápulas no banco atrás.","Eleve o quadril até busto e coxas ficarem alinhados; peso repartido entre pés e escápulas.","Segure 1s no topo e desça com controle até a posição inicial."]},
"bulgaro":{img:`${GFP}/images/exercises/mixed/bulgarian-split-squat-dumbbell.jpg`,page:`${GFP}/exercises/bulgarian-dumbbell-split-squat`,steps:["Fique de frente para um banco, braços ao lado do corpo e um halter em cada mão.","Apoie um pé no banco atrás de você.","Desça o quadril até a coxa da frente ficar paralela ao chão, sem ultrapassar os dedos dos pés com o joelho.","Mantenha 1s e volte à posição inicial."]},
"rdl":{img:`${GFP}/images/exercises/mixed/romanian-deadlift-barbell.jpg`,page:`${GFP}/exercises/barbell-romanian-deadlifts`,steps:["Pés na largura do quadril, barra junto às coxas, pegada firme.","Empurre o quadril para trás mantendo pernas quase estendidas e coluna neutra.","Desça a barra rente às pernas até sentir alongamento nos isquiotibiais.","Suba estendendo o quadril, sem arredondar as costas."]},
"flexora-abd":{img:`${GFP}/images/exercises/mixed/lying-leg-curl.jpg`,page:`${GFP}/exercises/lying-leg-curls`,steps:["Supersérie — Flexora deitada: ajuste o rolete no tornozelo; flexione os joelhos levando os calcanhares ao glúteo.","Controle o excêntrico; quadril estável no banco.","Em seguida — Abdução (máquina ou caneleira): abra as pernas contra a resistência sem balançar o tronco.","Alterne conforme o protocolo do treino."]},
"lat-pull":{img:`${GFP}/images/exercises/mixed/chest-pulldown-machine.jpg`,page:`${GFP}/exercises/chest-pulldown-machine`,steps:["Ajuste a coxia e segure a barra com pegada confortável.","Mantenha peito alto e escápulas ativas.","Puxe a barra em direção ao peito, guiando com os cotovelos.","Solte com controle até os braços quase estenderem."]},
"remada-serr":{img:`${GFP}/images/exercises/mixed/dumbbell-row.jpg`,page:`${GFP}/exercises/bent-over-dumbbell-row`,steps:["Um joelho e uma mão no banco; outro pé no chão; tronco paralelo ao solo.","Segure o halter com o braço livre, cotovelo rente ao corpo.","Puxe em arco até a linha do tronco, contraindo as costas.","Desça com controle sem arquear a lombar."]},
"remada-baixa":{img:`${GFP}/images/exercises/mixed/cable-seated-row.jpg`,page:`${GFP}/exercises/seated-cable-back-rows`,steps:["Sente na máquina, pés apoiados, coluna neutra.","Puxe o pegador em direção ao abdômen, cotovelos para trás.","Aperte as escápulas no final do movimento.","Estenda os braços devagar, sem arredondar."]},
"face-pull-t":{img:`${GFP}/images/exercises/mixed/facepull-face-pull.jpg`,page:`${GFP}/exercises/face-pull`,steps:["Cabo na altura do rosto, pegada neutra ou corda.","Puxe em direção à testa/queixo, cotovelos altos e abertos.","Rotação externa no final (mãos atrás das orelhas).","Volte com controle; ótimo para postura de ombros."]},
"rosca-mm":{img:`${GFP}/images/exercises/mixed/sync-hammer-curl.jpg`,page:`${GFP}/exercises/dumbbell-hammer-biceps-curl`,steps:["Em pé, halteres ao lado, pegada neutra (martelo).","Flexione os cotovelos sem balançar o tronco.","Para a concentrada: cotovelo apoiado na coxa, movimento só no antebraço.","Desça devagar no excêntrico."]},
"supino-reto":{img:`${GFP}/images/exercises/mixed/bench-press-d.jpg`,page:`${GFP}/exercises/dumbbell-bench-press`,steps:["Deite no banco, pés no chão, halteres na linha do peito.","Escápulas fixas; cotovelos ~45° em relação ao tronco.","Desça com controle até amplitude confortável.","Empurre para cima fechando o peito, sem arquear demais a lombar."]},
"supino-inc":{img:`${GFP}/images/exercises/mixed/incline-dumbbell-chest-press.jpg`,page:`${GFP}/exercises/incline-dumbbell-bench-chest-press`,steps:["Banco inclinado ~30°; halteres na altura do peito superior.","Cotovelos ligeiramente para baixo em relação ao ombro.","Desça controlando até sentir alongamento no peitoral superior.","Estenda os braços sem travar completamente os cotovelos."]},
"crossover":{img:`${GFP}/images/exercises/mixed/cable-fly-cross-over.jpg`,page:`${GFP}/exercises/standing-cable-crossover-flyes`,steps:["Cabos altos ou médios conforme a estação; passo leve à frente.","Leve os cabos em arco em direção à linha média do corpo.","Leve leve flexão nos cotovelos; contração forte no peitoral.","Volte abrindo os braços com tensão constante."]},
"remada-alta-q":{img:`${GFP}/images/exercises/mixed/upright-row.jpg`,page:`${GFP}/exercises/barbell-upright-row`,steps:["Barra na frente das coxas, pegada estreita a média.","Leve os cotovelos altos, barra subindo rente ao corpo.","Não deixe os cotovelos passar muito da linha dos ombros se incomodar o ombro.","Desça com controle."]},
"triceps-polia":{img:`${GFP}/images/exercises/mixed/triceps-pushdown.jpg`,page:`${GFP}/exercises/triceps-pushdown`,steps:["Cabo alto, cotovelos colados ao tronco.","Estenda os antebraços para baixo até o tríceps contrair.","Evite abrir os cotovelos para os lados.","Volte até ~90° mantendo o tronco firme."]},
"deadbug-ext":{img:`${GFP}/images/exercises/mixed/dead-bug.jpg`,page:`${GFP}/exercises/dead-bug`,steps:["Deitada, braços ao teto, joelhos 90° (cotovelos opostos aos joelhos no padrão pernada alternada / dead bug).","Estenda braço e perna opostos mantendo a lombar colada ao chão.","Alterne os lados com controle.","Combine com elevação de pernas deitada: pernas estendidas, suba até ~90° sem arquear a lombar."]},
"agach-livre":{img:`${GFP}/images/exercises/mixed/squat-bar.jpg`,page:`${GFP}/exercises/barbell-squats`,steps:["Barra no rack, apoie na parte superior das costas/ trapézio.","Saia do rack com pés na largura dos ombros, abdômen firme.","Desça como se fosse sentar numa cadeira; coxas paralelas ao solo ou conforme mobilidade.","Joelhos acompanham a direção dos pés; suba empurrando o chão."]},
"hack-smith":{img:`${GFP}/images/exercises/mixed/squat-smith-machine.jpg`,page:`${GFP}/exercises/smith-machine-squats`,steps:["Pés um pouco à frente da barra para manter joelhos confortáveis.","Desça no trilho com costas apoiadas no movimento.","Quadril e joelhos flexionam juntos; controle o fundo.","Suba sem travar agressivamente os joelhos."]},
"extensora":{img:`${GFP}/images/exercises/mixed/leg-extension.jpg`,page:`${GFP}/exercises/seated-leg-extensions`,steps:["Ajuste o encosto e o rolete acima dos tornozelos.","Estenda os joelhos até alinhar as pernas sem hiperestender.","Segure 1s no topo opcionalmente.","Desça com controle sem deixar a pilha bater."]},
"aducao":{img:`${GFP}/images/exercises/mixed/seated-adductor.jpg`,page:`${GFP}/exercises/seated-adductor-machine`,steps:["Sente com pernas nas almofadas laterais da máquina.","Junte as pernas contra a resistência em movimento controlado.","Evite levantar o bumbum do assento.","Abra devagar até amplitude segura (parcial se indicado)."]},
"stepup":{img:`${GFP}/images/exercises/mixed/step-up-lunge.jpg`,page:`${GFP}/exercises/step-up`,steps:["Um pé no step/banco, halteres ao lado.","Empurre pelo calcanhar da perna de cima para subir.","Outra perna só acompanha sem impulso.","Desça com controle e repita ou alterne."]},
"desenv":{img:`${GFP}/images/exercises/mixed/seated-dumbbell-shoulders-press.jpg`,page:`${GFP}/exercises/seated-dumbbell-overhead-shoulder-press`,steps:["Sente com encosto, halteres na altura dos ombros, cotovelos sob as mãos.","Empurre para cima em arco leve até quase estender.","Não hiperextenda a lombar; abdômen firme.","Desça os halteres controlando até ~90° de cotovelo."]},
"lat-raise":{img:`${GFP}/images/exercises/mixed/side-lateral-raise.jpg`,page:`${GFP}/exercises/dumbbell-lateral-raises`,steps:["Em pé, halteres ao lado, cotovelos levemente flexionados.","Eleve os braços lateralmente até a linha dos ombros (ou um pouco abaixo).","Evite encostar o tronco para trás.","Desça devagar; polegar pode apontar levemente para cima."]},
"front-raise":{img:`${GFP}/images/exercises/mixed/front-raise.jpg`,page:`${GFP}/exercises/dumbbell-front-raises`,steps:["Halteres à frente das coxas, pegada neutra ou pronada.","Eleve um ou ambos os braços à frente até altura dos ombros.","Tronco estável, sem usar impulso.","Desça com controle."]},
"abd-maq-sex":{img:`${GFP}/images/exercises/mixed/seated-abductor.jpg`,page:`${GFP}/exercises/seated-abductor-machine`,steps:["Supersérie — Abdução na máquina: abra as pernas contra a resistência, lombar no encosto.","Controle o retorno sem deixar as placas baterem.","Em seguida — caneleira em pé/de lado: abduza a perna com tronco ereto.","Respeite a ordem e as repetições do treino."]},
"face-pull-sex":{img:`${GFP}/images/exercises/mixed/facepull-face-pull.jpg`,page:`${GFP}/exercises/face-pull`,steps:["Cabo na altura do rosto ou levemente acima.","Puxe a corda em direção ao rosto com cotovelos altos.","Finalize com rotação externa (mãos abrindo).","Excelente para postura e ombro saudável."]},
};
type ExInfo = { img: string; page: string; steps: string[] };
function exInfo(id: string): ExInfo | undefined {
  return (EX_INFO as Record<string, ExInfo>)[id];
}

const WP=[
  {id:"glut-post",label:"Glúteos + Posterior",focus:"Bumbum redondo",emoji:"🍑",warmup:["Ponte isométrica 30s","Abdução com banda 2x15"],exercises:[{id:"hip-thrust",name:"Hip thrust (barra)",sets:4,reps:10,rest:90,dw:40,tech:"Pausar 2s no topo, excêntrico 3s",cues:"Escápulas no banco / contração máxima"},{id:"bulgaro",name:"Agachamento búlgaro",sets:3,reps:12,rest:75,dw:12,tech:"Excêntrico 3s",cues:"Tronco inclinado / joelho não passa da ponta do pé"},{id:"rdl",name:"Levantamento terra romeno (RDL)",sets:3,reps:10,rest:75,dw:30,tech:"Subir rápido / 3s descendo",cues:"Barra na canela / quadril para trás"},{id:"flexora-abd",name:"Flexora + abdução (SS)",sets:3,reps:12,rest:60,dw:25,tech:"Supersérie",cues:"Flexora 3x12 → abdução 3x15"}],finisher:"HIIT bicicleta 8x(20s/40s)",posture:["Face pull 3x15","Rotação externa 2x15","Gato-vaca 10 ciclos","Postura da criança 30s+30s","Quadril 90/90 30s","Alongamento do flexor 30s"]},
  {id:"costas-bi",label:"Costas + Bíceps",focus:"Definição, postura",emoji:"🦅",warmup:["Rotação externa 2x15","Face pull leve 2x12","Livro aberto 8x","Alongamento peitoral 30s","Gato-vaca 8"],exercises:[{id:"lat-pull",name:"Puxada na polia alta",sets:4,reps:10,rest:75,dw:35,tech:"Excêntrico 3s",cues:"Puxar com cotovelos / escápulas"},{id:"remada-serr",name:"Remada serrote",sets:3,reps:10,rest:60,dw:16,tech:"Contração 1s no topo",cues:"Cotovelo rente / tronco estável"},{id:"remada-baixa",name:"Remada baixa",sets:3,reps:12,rest:60,dw:30,cues:"Puxar até o abdômen"},{id:"face-pull-t",name:"Face pull",sets:4,reps:15,rest:45,dw:15,tech:"Rotação externa",cues:"Cotovelos altos / escápulas"},{id:"rosca-mm",name:"Rosca martelo + concentrada",sets:3,reps:12,rest:60,dw:8,tech:"SS: martelo → concentrada"}],finisher:null,posture:["Alongamento peitoral no banco 2x30s","Postura da criança 45s","Suspensão passiva na barra 2x20s"]},
  {id:"peito-tri",label:"Peito + Tríceps + tronco",focus:"Braços, abdômen",emoji:"🫁",warmup:["Alongamento peitoral + rotação de ombros"],exercises:[{id:"supino-reto",name:"Supino com halteres",sets:4,reps:10,rest:75,dw:12,tech:"Excêntrico 3s",cues:"Escápulas retraídas / cotovelos 45°"},{id:"supino-inc",name:"Supino inclinado",sets:3,reps:12,rest:60,dw:10,cues:"Banco 30° / peito aberto"},{id:"crossover",name:"Crossover (cabo)",sets:3,reps:12,rest:60,dw:10,cues:"Cotovelos flexionados / contração forte"},{id:"remada-alta-q",name:"Remada alta (postural)",sets:3,reps:12,rest:45,dw:12,tech:"Compensar o peito"},{id:"triceps-polia",name:"Tríceps na polia",sets:3,reps:12,rest:45,dw:15,tech:"Drop na última série",cues:"⚠️ Cotovelo direito"},{id:"deadbug-ext",name:"Dead bug + elevação de pernas",sets:3,reps:10,rest:45,dw:0,tech:"Tronco / abdômen",cues:"Lombar colada"}],finisher:null,posture:["Alongamento peitoral na porta 30s","Livro aberto 8x","Cobra 3x10s","Fio da agulha 8x"]},
  {id:"quad-adut",label:"Quadríceps + Adutores",focus:"Pernas, reab. virilha",emoji:"🦵",warmup:["Bicicleta 5 min","Adução leve 2x12 (parcial)"],exercises:[{id:"agach-livre",name:"Agachamento livre",sets:4,reps:8,rest:90,dw:40,tech:"Pausar 1s no fundo",cues:"Joelhos acompanham os pés"},{id:"hack-smith",name:"Agachamento hack no Smith",sets:3,reps:10,rest:75,dw:30,cues:"Pés à frente / controlado"},{id:"extensora",name:"Extensora",sets:3,reps:12,rest:60,dw:25,tech:"Rest-pause na última"},{id:"aducao",name:"Adução na máquina",sets:3,reps:15,rest:45,dw:20,tech:"⚠️ Amplitude parcial"},{id:"stepup",name:"Subida no step",sets:3,reps:10,rest:60,dw:10,cues:"Pisar firme / calcanhar"}],finisher:null,posture:["Remada baixa leve 2x15","Rotação externa 2x15","Gato-vaca 8","Alongamento do flexor 30s","Pombo 30s","Borboleta 30s"]},
  {id:"ombro-gmed",label:"Ombros + Glúteo Médio",focus:"Postura, queima",emoji:"🔥",warmup:["Dislocamento de ombro 10x","Livro aberto 6x","Gato-vaca 6","Rotação externa 2x15","Abdução com banda 2x12"],exercises:[{id:"desenv",name:"Desenvolvimento com halteres",sets:4,reps:10,rest:75,dw:10,cues:"Cotovelos 90° / abdômen firme"},{id:"lat-raise",name:"Elevação lateral",sets:3,reps:15,rest:45,dw:5,tech:"Excêntrico 3s",cues:"Polegar leve para cima"},{id:"front-raise",name:"Elevação frontal",sets:3,reps:12,rest:45,dw:5},{id:"abd-maq-sex",name:"Abdução máq. + caneleira",sets:3,reps:15,rest:45,dw:20,tech:"SS: máq. → caneleira"},{id:"face-pull-sex",name:"Face pull",sets:3,reps:15,rest:45,dw:12,cues:"Postural"}],finisher:"HIIT corrida 10x(30s/60s)",posture:["Postura da criança 45s","Cobra 3x10s","Alongamento do flexor 30s","Suspensão passiva na barra 2x20s"]},
];
const MOB=["Gato-vaca 10 ciclos","Postura da criança 45s","Livro aberto 10x","Fio da agulha 8x","Cobra 5x10s","Pombo 45s","Alongamento peitoral 30s","Flexor do quadril 30s","Borboleta 45s","Suspensão passiva na barra 30s"];
function exNameById(id){const x=WP.flatMap(w=>w.exercises).find(e=>e.id===id);return x?.name||id;}
function formatLogEntryWeight(k,v){const name=exNameById(k);if(typeof v==="number")return v>0?`${name}: ${v}kg`:null;if(v&&typeof v==="object"&&Array.isArray(v.kg)){const kg=v.kg.filter(x=>typeof x==="number"&&!isNaN(x)&&x>0);if(!kg.length)return null;const rp=Array.isArray(v.reps)?v.reps.filter(x=>typeof x==="number"&&!isNaN(x)&&x>0):[];const rpS=rp.length?` · ${rp.join("/")} reps`:"";return `${name}: ${kg.join("/")} kg${rpS}`;}return null;}
const PW=5;
/** Fuso usado para “hoje”, streak e datas dos registros (Brasil). */
const TZ_BR="America/Sao_Paulo";
/** Hoje no calendário de Brasília (YYYY-MM-DD). */
function td(){const p=new Intl.DateTimeFormat("en-CA",{timeZone:TZ_BR,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const y=p.find(x=>x.type==="year")?.value;const m=p.find(x=>x.type==="month")?.value;const d=p.find(x=>x.type==="day")?.value;return`${y}-${m}-${d}`;}
/** Meio-dia em Brasília como instante estável para iterar dias. */
function parseBRNoonUTC(iso){return new Date(iso+"T15:00:00.000Z");}
/** Data YYYY-MM-DD em São Paulo a partir de um instante. */
function isoFromMsBR(ms){const p=new Intl.DateTimeFormat("en-CA",{timeZone:TZ_BR,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(ms));return`${p.find(x=>x.type==="year")?.value}-${p.find(x=>x.type==="month")?.value}-${p.find(x=>x.type==="day")?.value}`;}
/** Segunda-feira da semana corrente (Brasil), YYYY-MM-DD. */
function mondayThisWeekISO(){
  let ms=parseBRNoonUTC(td()).getTime();
  const fmt=new Intl.DateTimeFormat("en-US",{timeZone:TZ_BR,weekday:"short"});
  for(let i=0;i<7;i++){
    if(fmt.format(new Date(ms))==="Mon")return isoFromMsBR(ms);
    ms-=864e5;
  }
  return td();
}
/** Data longa no topo (Brasil), com ano. */
function formatHomeDate(){const s=new Date().toLocaleDateString("pt-BR",{timeZone:TZ_BR,weekday:"long",day:"numeric",month:"long",year:"numeric"});return s.charAt(0).toUpperCase()+s.slice(1);}
function dbs(a,b){return Math.floor((new Date(b)-new Date(a))/864e5);}
function fd(d){return parseBRNoonUTC(d).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",weekday:"short",timeZone:TZ_BR});}
function cStreak(log){const days=[...new Set(log.map(e=>e.date))].sort().reverse();if(!days.length)return 0;const t=td();if(days[0]!==t&&dbs(days[0],t)>1)return 0;let s=1;for(let i=0;i<days.length-1;i++){if(dbs(days[i+1],days[i])===1)s++;else break;}return s;}
function getXP(l){return l.filter(e=>e.type==="workout").length*100+l.filter(e=>e.type==="free").length*40+l.filter(e=>e.type==="rest").length*10+l.filter(e=>e.type==="run").length*50;}
/** Tempo: um número = minutos; mm:ss; ou h:mm:ss */
function parseRunDuration(input){
  const t=String(input||"").trim().replace(",", ".");if(!t)return NaN;
  if(/^\d+(\.\d+)?$/.test(t)){return Math.round(parseFloat(t)*60);}
  const p=t.split(":").map(x=>parseInt(x,10));
  if(p.some(x=>isNaN(x)))return NaN;
  if(p.length===3)return p[0]*3600+p[1]*60+p[2];
  if(p.length===2)return p[0]*60+p[1];
  return NaN;
}
function formatDurationSec(sec){if(!isFinite(sec)||sec<0)return"—";const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=Math.floor(sec%60);return h>0?`${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`:`${m}:${String(s).padStart(2,"0")}`;}
/** Pace em min/km → texto "5:24 /km" */
function formatPaceMinPerKm(minPerKm){if(!isFinite(minPerKm)||minPerKm<=0)return"—";const t=Math.round(minPerKm*60);const m=Math.floor(t/60),s=t%60;return`${m}:${String(s).padStart(2,"0")} /km`;}
function paceMinPerKm(km,durSec){if(!km||km<=0||!durSec||durSec<=0)return NaN;return durSec/60/km;}
function runEntries(log){return(log||[]).filter(e=>e.type==="run");}
/** Menor min/km = ritmo mais rápido entre treinos com km ≥ limiar */
function bestPaceForMinKm(log,minKm){const r=runEntries(log).filter(e=>(e.km||0)>=minKm&&isFinite(e.paceMinPerKm)&&e.paceMinPerKm>0);if(!r.length)return null;return Math.min(...r.map(e=>e.paceMinPerKm));}
function totalRunKm(log){return runEntries(log).reduce((a,e)=>a+(Number(e.km)||0),0);}
const RUN_EXTRA=[
  {id:"run-n5",icon:"✋",title:"5 corridas",desc:"5 registos de corrida",check:l=>l.filter(e=>e.type==="run").length>=5},
  {id:"run-n10",icon:"🔟",title:"10 corridas",desc:"10 registos de corrida",check:l=>l.filter(e=>e.type==="run").length>=10},
  {id:"run-n25",icon:"📒",title:"25 corridas",desc:"25 registos de corrida",check:l=>l.filter(e=>e.type==="run").length>=25},
  {id:"run-km50",icon:"📏",title:"50 km corridos",desc:"Soma total de km ≥ 50",check:l=>totalRunKm(l)>=50},
  {id:"run-km100",icon:"🛣️",title:"100 km corridos",desc:"Soma total de km ≥ 100",check:l=>totalRunKm(l)>=100},
  {id:"run-km250",icon:"🌍",title:"250 km corridos",desc:"Soma total de km ≥ 250",check:l=>totalRunKm(l)>=250},
  {id:"run-pace55",icon:"⚡",title:"Ritmo abaixo de 5:30/km",desc:"Pelo menos uma corrida mais rápida que 5:30 /km",check:l=>l.some(e=>e.type==="run"&&isFinite(e.paceMinPerKm)&&e.paceMinPerKm>0&&e.paceMinPerKm<5.5)},
  {id:"run-double",icon:"🏃‍♀️",title:"Dois no mesmo dia",desc:"Dois registos de corrida no mesmo dia",check:l=>{const by={};l.filter(e=>e.type==="run").forEach(e=>{by[e.date]=(by[e.date]||0)+1;});return Object.values(by).some(n=>n>=2);}},
];
const RUN_ACHIEV=[...RUN_ACHIEV_BASE,...RUN_EXTRA];
const ALL_ACHIEV=[...ACHIEV,...RUN_ACHIEV];
const RUN_PACE_BANDS=[5,8,10,15,21];
const CAL_WD=["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
/** Dias (YYYY-MM-DD) com pelo menos um registo */
function activeDaysSet(log){const s=new Set();(log||[]).forEach(e=>{if(e.date&&/^\d{4}-\d{2}-\d{2}$/.test(String(e.date)))s.add(e.date);});return s;}
function calendarCells(year,month1){const first=new Date(year,month1-1,1);const pad=(first.getDay()+6)%7;const dim=new Date(year,month1,0).getDate();const cells=[];for(let i=0;i<pad;i++)cells.push(null);for(let d=1;d<=dim;d++)cells.push(d);return cells;}
function shiftMonthStr(ym,dir){const[y,m]=ym.split("-").map(Number);const d=new Date(y,m-1+dir,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;}
function gLvl(xp){return Math.floor(xp/500)+1;}
function xpFor(l){return(l-1)*500;}
function xpN(xp){return xpFor(gLvl(xp)+1)-xp;}
function gProg(id,log,cw){const ws=[];log.forEach(e=>{if(e.type==="workout"&&e.w?.[id]!==undefined){const x=weightFromLogVal(e.w[id]);if(x!==undefined)ws.push(x);}});if(ws.length<2)return{tip:"Continue treinando",color:"#6b6280",icon:"📊"};const l3=ws.slice(-3);if(l3.every(w=>w===l3[0])&&l3.length>=2){const u=["rosca-mm","triceps-polia","lat-raise","front-raise","desenv","face-pull-t","face-pull-sex"].includes(id);return{tip:`${l3.length}x mesma carga → tente ${cw+(u?1.25:2.5)}kg`,color:"#22c55e",icon:"⬆️"};}if(ws[ws.length-1]>ws[ws.length-2])return{tip:"Boa progressão! Mantenha.",color:"#a78bfa",icon:"✨"};if(ws[ws.length-1]<ws[ws.length-2])return{tip:"Carga caiu. Dor? Ok. Senão, recupere.",color:"#f59e0b",icon:"⚠️"};return{tip:"Mantendo — foque na execução.",color:"#6b6280",icon:"👌"};}

/** Segundos inferidos de textos do protocolo: "5 min", "30s", "2x30s", etc. */
function parseSecondsFromText(t){
  const s=String(t||"").toLowerCase();
  let total=0;
  const minM=s.match(/(\d+(?:[.,]\d+)?)\s*(?:min(?:utos?)?|min\.)/);
  if(minM)total+=Math.round(parseFloat(minM[1].replace(",","."))*60);
  const secRe=/(\d+)\s*s(?:eg)?/gi;
  let m;while((m=secRe.exec(s))!==null){total+=parseInt(m[1],10);}
  return total;
}
/** Aquecimento ou postural: usa tempos do texto quando existem; senão fallback por linha */
function estimateBlockSeconds(lines,fallbackPerLine){
  let sum=0;
  for(const line of lines||[]){
    const p=parseSecondsFromText(line);
    sum+=p>0?p:fallbackPerLine;
  }
  return sum;
}
/** HIIT tipo Nx(as/b s) ou valor por defeito para bloco final */
function estimateFinisherSeconds(fin){
  if(!fin)return 0;
  const str=String(fin);
  const hiit=str.match(/(\d+)x\((\d+)s\/(\d+)s\)/i);
  if(hiit)return parseInt(hiit[1],10)*(parseInt(hiit[2],10)+parseInt(hiit[3],10));
  if(/hiit|intervalo/i.test(str))return 10*60;
  return 8*60;
}
/**
 * Estimativa do tempo total da sessão: aquecimento, todas as séries (execução + descanso),
 * deslocamentos entre exercícios, finalizador HIIT quando existir, postural e pequena folga.
 */
function estimateWorkoutMinutes(wo){
  const wu=estimateBlockSeconds(wo.warmup,95);
  let work=0;
  (wo.exercises||[]).forEach(ex=>{
    const reps=typeof ex.reps==="number"&&!isNaN(ex.reps)?ex.reps:10;
    const execSec=Math.min(150,30+reps*2.5);
    work+=ex.sets*(execSec+ex.rest);
    const blob=`${ex.name||""}${ex.tech||""}`;
    if(/ss|supersérie|super serie/i.test(blob))work+=ex.sets*35;
  });
  const nEx=(wo.exercises||[]).length;
  const betweenEx=Math.max(0,nEx-1)*42;
  const fin=estimateFinisherSeconds(wo.finisher);
  const post=estimateBlockSeconds(wo.posture,85);
  const buffer=120;
  const totalSec=wu+work+betweenEx+fin+post+buffer;
  return Math.max(25,Math.round(totalSec/60));
}
/** Treino do dia condensado: menos séries, descansos curtos, sem HIIT final, menos postural */
function buildQuickWorkout(wo){
  const base=wo.label.replace(/\s*\(rápido\)\s*$/i,"").trim();
  const exercises=wo.exercises.map(ex=>({...ex,sets:ex.sets>=4?2:ex.sets>=3?2:ex.sets,reps:ex.reps>=15?12:ex.reps,rest:Math.max(35,Math.round(ex.rest*0.55))}));
  const warmup=wo.warmup?.length?wo.warmup.slice(0,2).concat(["Pode ir direto aos exercícios se já estiver aquecida."]):["Mobilidade geral 3 min"];
  return{...wo,label:`${base} (rápido)`,quick:true,warmup,exercises,finisher:null,posture:(wo.posture&&wo.posture.slice(0,2))||[]};
}

export default function App(){
  const[data,setData]=useState(null);
  const[view,setView]=useState("home");
  const[loading,setLoading]=useState(true);
  const[sP,sSP]=useState(false);
  const[fTxt,sFTxt]=useState("");
  const[fDur,sFDur]=useState("");
  const[showF,sShowF]=useState(false);
  const[selQ,sSelQ]=useState(null);
  const[rId,sRId]=useState(null);
  const[rL,sRL]=useState(0);
  const[confetti,setConfetti]=useState(false);
  const[newAch,setNewAch]=useState(null);
  const[fbNote,setFbNote]=useState("");
  const[fbTags,setFbTags]=useState([]);
  const[authUser,setAuthUser]=useState(null);
  const[authOpen,setAuthOpen]=useState(false);
  const[authEmail,setAuthEmail]=useState("");
  const[authHint,setAuthHint]=useState("");
  const[quickRun,setQuickRun]=useState(false);
  const[runKm,sRunKm]=useState("");
  const[runTimeStr,sRunTimeStr]=useState("");
  const[runFeel,sRunFeel]=useState(RUN_FEEL[0]);
  const[histCalYM,sHistCalYM]=useState(()=>td().slice(0,7));
  const tRef=useRef(null);
  const prevAch=useRef(new Set());

  const load=useCallback(async()=>{try{const sb=getSupabase();if(sb)await sb.auth.getSession();const{data,session}=await loadTreinoState();setData(data);setAuthUser(session?.user?{id:session.user.id,email:session.user.email??undefined}:null);prevAch.current=new Set(data.ach||[]);if(session?.user){try{await persistTreinoData(data);}catch(e){console.warn("[treino] enviar para nuvem ao abrir:",e);}}}catch(e){const i=initTreinoData();try{await persistTreinoData(i);}catch(e2){}setData(i);setAuthUser(null);prevAch.current=new Set([]);}setLoading(false);},[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{const sb=getSupabase();if(!sb)return;const{data:{subscription}}=sb.auth.onAuthStateChange(async(event,session)=>{setAuthUser(session?.user?{id:session.user.id,email:session.user.email??undefined}:null);if(event==="TOKEN_REFRESHED"||event==="USER_UPDATED")return;if(!session?.user)return;try{const{data}=await loadTreinoState();setData(data);prevAch.current=new Set(data.ach||[]);if(event==="SIGNED_IN"||event==="INITIAL_SESSION"){try{await persistTreinoData(data);}catch(e){console.warn("[treino] sync após auth:",e);}}}catch(e){console.warn(e);}});return()=>subscription.unsubscribe();},[]);
  useEffect(()=>{const onVis=()=>{if(document.visibilityState==="visible")void getSupabase()?.auth.getSession();};document.addEventListener("visibilitychange",onVis);return()=>document.removeEventListener("visibilitychange",onVis);},[]);
  useEffect(()=>{if(rId&&rL>0){tRef.current=setTimeout(()=>sRL(t=>t-1),1000);return()=>clearTimeout(tRef.current);}if(rL===0&&rId)sRId(null);},[rId,rL]);

  async function save(nd){const s=cStreak(nd.log||[]);const ul=ALL_ACHIEV.filter(a=>a.check(nd.log||[],s)).map(a=>a.id);const nw=ul.filter(id=>!prevAch.current.has(id));nd.ach=ul;if(nw.length>0){setNewAch(ALL_ACHIEV.find(x=>x.id===nw[0]));setTimeout(()=>setNewAch(null),3500);}prevAch.current=new Set(ul);setData(nd);try{await persistTreinoData(nd);}catch(e){}}

  // KEY FIX: gw reads from data.ew (last saved weights) first
  function gw(id){
    if(data?.ew?.[id]!==undefined) return data.ew[id];
    const ex=WP.flatMap(w=>w.exercises).find(e=>e.id===id);
    return ex?.dw??0;
  }
  function cur(){return data?WP[data.qi%WP.length]:null;}
  function cycle(){return data?Math.floor(data.qi/WP.length)+1:1;}
  function pos(){return data?(data.qi%WP.length)+1:1;}
  function weeks(){return data?.sd?Math.max(0,Math.floor(dbs(data.sd,td())/7)):0;}
  function stale(){return weeks()>=PW;}
  function wH(id){return(data?.log||[]).filter(e=>e.type==="workout"&&e.w?.[id]!==undefined).map(e=>({date:e.date,weight:weightFromLogVal(e.w[id])})).filter(e=>e.weight!==undefined);}
  function wkCt(){const s=mondayThisWeekISO();return(data?.log||[]).filter(e=>e.type==="workout"&&e.date>=s).length;}
  function totW(){return(data?.log||[]).filter(e=>e.type==="workout").length;}
  function todayHasW(){return(data?.log||[]).some(e=>e.date===td()&&e.type==="workout");}

  async function complete(wo,weights,fb){
    const skipped=fb?.skipped?.length?fb.skipped:[];
    const ewNext={...(data.ew||{})};
    const wLog={};
    wo.exercises.forEach(ex=>{
      if(skipped.includes(ex.id))return;
      const raw=weights[ex.id];
      wLog[ex.id]=raw;
      const sum=weightFromLogVal(raw);
      ewNext[ex.id]=sum!==undefined?sum:(typeof raw==="number"?raw:gw(ex.id));
    });
    const nd={...data,log:[...(data.log||[]),{type:"workout",date:td(),label:wo.label,wid:wo.id,w:wLog,fb:fb?.tags?.length||fb?.note?{tags:fb.tags||[],note:fb.note||""}:null,skipped:skipped.length?skipped:undefined}],ew:ewNext,qi:(data.qi||0)+1};
    await save(nd);setConfetti(true);setTimeout(()=>{setConfetti(false);setView("done");},1500);
  }
  async function logFree(){if(!fTxt.trim())return;await save({...data,log:[...(data.log||[]),{type:"free",date:td(),desc:fTxt.trim(),dur:fDur.trim()||null}]});sFTxt("");sFDur("");sShowF(false);}
  async function logRest(){await save({...data,log:[...(data.log||[]),{type:"rest",date:td(),desc:"Descanso / mobilidade"}]});}
  async function logRun(){const km=parseFloat(String(runKm).replace(",","."));const durSec=parseRunDuration(runTimeStr);if(!km||km<=0||!isFinite(durSec)||durSec<=0)return;const p=paceMinPerKm(km,durSec);const entry={type:"run",date:td(),km,durSec,paceMinPerKm:p,feel:runFeel};await save({...data,log:[...(data.log||[]),entry]});sRunKm("");sRunTimeStr("");sRunFeel(RUN_FEEL[0]);setView("runProg");}
  async function delLog(idx){const nd={...data};nd.log=[...(nd.log||[])];nd.log.splice(idx,1);await save(nd);}
  async function reset(){const f=initTreinoData();f.ew=data?.ew||{};await save(f);setView("home");}

  if(loading)return<div style={S.lw}><div style={S.spin}/></div>;
  if(!data)return null;
  const wo=cur();const streak=cStreak(data.log||[]);const xp=getXP(data.log||[]);const lvl=gLvl(xp);

  if(confetti)return(<div style={S.root}><div style={S.cW}>{Array.from({length:25}).map((_,i)=><div key={i} style={{...S.cP,left:`${Math.random()*100}%`,animationDelay:`${Math.random()*.5}s`,backgroundColor:["#a78bfa","#22c55e","#f59e0b","#ec4899","#06b6d4"][i%5]}}/>)}<div style={S.cT}>{MOTIV[Math.floor(Math.random()*MOTIV.length)]}</div></div><style>{`@keyframes cF{0%{transform:translateY(-10vh) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style></div>);

  const ap=newAch?<div style={S.ap}><span style={{fontSize:24}}>{newAch.icon}</span><div><div style={{fontWeight:800,fontSize:13,color:"#fff"}}>{newAch.title}</div><div style={{fontSize:10,color:"#ffffffaa"}}>{newAch.desc}</div></div></div>:null;

  if(view==="done")return(<div style={S.root}>{ap}<div style={S.ds}><div style={S.cb}>✓</div><h2 style={S.dh}>Treino concluído!</h2><div style={S.dx}>+100 XP</div><p style={S.dp}>Próximo: <b>{WP[data.qi%WP.length]?.label}</b></p>{streak>=2&&<div style={S.sb}>🔥 {streak} dias seguidos!</div>}<button style={S.bp} onClick={()=>setView("home")}>Voltar</button></div></div>);

  if(view==="workout"&&wo){const wSession=quickRun?buildQuickWorkout(wo):wo;return<WO wo={wSession} gw={gw} wH={wH} onDone={complete} onBack={()=>{setQuickRun(false);setView("home");}} sP={sP} sSP={sSP} rId={rId} sRId={sRId} rL={rL} sRL={sRL} log={data.log||[]} popup={ap} fbNote={fbNote} setFbNote={setFbNote} fbTags={fbTags} setFbTags={setFbTags}/>;}
  if(view==="qd"&&selQ!==null){const wq=WP[selQ];const wSession=quickRun?buildQuickWorkout(wq):wq;return<WO wo={wSession} gw={gw} wH={wH} onDone={complete} onBack={()=>{setQuickRun(false);setView("queue");}} sP={sP} sSP={sSP} rId={rId} sRId={sRId} rL={rL} sRL={sRL} ro={selQ!==(data.qi%WP.length)} log={data.log||[]} popup={ap} fbNote={fbNote} setFbNote={setFbNote} fbTags={fbTags} setFbTags={setFbTags}/>;}

  if(view==="queue")return(<div style={S.root}>{ap}<Hd t="Fila de Treinos" back={()=>setView("home")}/><div style={S.pd}><p style={S.hint}>Só avança quando concluir o treino atual.</p>{WP.map((w,i)=>{const rel=i-(data.qi%WP.length);const ic=rel===0;const past=rel<0;const estQ=estimateWorkoutMinutes(buildQuickWorkout(w));return(<div key={w.id} style={{marginBottom:10}}><div style={{...S.qC,borderLeftColor:ic?"#a78bfa":past?"#22c55e44":"#1f1b2e",opacity:past?0.4:1,cursor:"pointer"}} onClick={()=>{sSelQ(i);setQuickRun(false);setView("qd");}}><div style={S.qL}><div style={{...S.qD,background:ic?"#a78bfa":past?"#22c55e":"#2a2535"}}>{past?"✓":w.emoji}</div><div><div style={S.qN}>{w.label}</div><div style={S.qF}>{w.focus}</div></div></div>{ic&&<span style={S.nb}>PRÓXIMO</span>}<span style={S.ch}>›</span></div>{!past&&<button type="button" style={S.qQuick} onClick={e=>{e.stopPropagation();sSelQ(i);setQuickRun(true);setView("qd");}}>⚡ Versão rápida (~{estQ} min)</button>}</div>);})}</div></div>);

  if(view==="history"){const sorted=[...(data.log||[])].map((e,i)=>({...e,_i:i})).reverse();const[cy,cm]=histCalYM.split("-").map(Number);const cells=calendarCells(cy,cm);const active=activeDaysSet(data.log||[]);const today=td();const monthTitle=new Date(cy,cm-1,15).toLocaleDateString("pt-BR",{month:"long",year:"numeric",timeZone:TZ_BR});return(<div style={S.root}>{ap}<Hd t="Histórico" back={()=>setView("home")}/><div style={S.pd}><div style={S.calWrap}><div style={S.calNav}><button type="button" style={S.calNavBtn} aria-label="Mês anterior" onClick={()=>sHistCalYM(m=>shiftMonthStr(m,-1))}>‹</button><span style={S.calTitle}>{monthTitle}</span><button type="button" style={S.calNavBtn} aria-label="Próximo mês" onClick={()=>sHistCalYM(m=>shiftMonthStr(m,1))}>›</button></div><div style={S.calWeekRow}>{CAL_WD.map(w=><div key={w} style={S.calWD}>{w}</div>)}</div><div style={S.calGrid}>{cells.map((day,idx)=>{if(day===null)return<div key={`e${idx}`} style={S.calCellEmpty}/>;const iso=`${cy}-${String(cm).padStart(2,"0")}-${String(day).padStart(2,"0")}`;const on=active.has(iso);const isToday=iso===today;return<div key={iso} style={{...S.calCell,...(on?S.calCellOn:{}),...(isToday&&!on?S.calCellToday:{}),...(isToday&&on?S.calCellTodayOn:{})}}>{day}</div>;})}</div><p style={S.calLegend}>Roxo = dia com registo (treino, corrida, mobilidade ou outra atividade)</p></div>{sorted.length===0&&<p style={S.em}>Nenhum registro.</p>}{sorted.map(e=>{const ty=e.type;const bc=ty==="workout"?"#a78bfa":ty==="free"?"#f59e0b":ty==="run"?"#06b6d4":"#6b7280";const tl=ty==="workout"?"TREINO":ty==="free"?"ATIVIDADE":ty==="run"?"CORRIDA":"DESCANSO";const tc=ty==="workout"?"#a78bfa":ty==="free"?"#f59e0b":ty==="run"?"#06b6d4":"#6b7280";return(<div key={e._i} style={{...S.hC,borderLeftColor:bc}}><div style={S.hT}><span style={S.hD}>{fd(e.date)}</span><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:9,fontWeight:800,letterSpacing:1,color:tc}}>{tl}</span><button style={S.del} onClick={()=>{if(confirm("Excluir este registro?"))delLog(e._i);}}>✕</button></div></div>{ty==="run"?<><div style={{fontSize:14,fontWeight:700}}>Corrida · {Number(e.km||0).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:2})} km</div><div style={{fontSize:11,color:"#6b6280",marginTop:2}}>{formatDurationSec(e.durSec)} · pace {formatPaceMinPerKm(e.paceMinPerKm)}</div>{e.feel&&<div style={{fontSize:11,color:"#22d3d8",marginTop:4}}>{e.feel}</div>}</>:<><div style={{fontSize:14,fontWeight:700}}>{e.label||e.desc}</div>{e.dur&&<div style={{fontSize:11,color:"#6b6280",marginTop:2}}>{e.dur}</div>}</>}{e.skipped?.length>0&&<div style={{fontSize:10,color:"#f59e0b",marginTop:4}}>⊘ Não realizados: {e.skipped.map(id=>exNameById(id)).join(" · ")}</div>}{e.fb&&<div style={{fontSize:11,color:"#a78bfa",marginTop:4,fontStyle:"italic"}}>{e.fb.tags?.join(" ")} {e.fb.note&&`— ${e.fb.note}`}</div>}{e.w&&Object.keys(e.w).length>0&&<div style={S.hTg}>{Object.entries(e.w).map(([k,v])=>{const t=formatLogEntryWeight(k,v);return t?<span key={k} style={S.tg}>{t}</span>:null;}).filter(Boolean)}</div>}</div>);})}</div></div>);}

  if(view==="progress"){const allEx=[...new Map(WP.flatMap(w=>w.exercises).map(e=>[e.id,e])).values()];return(<div style={S.root}>{ap}<Hd t="Progressão" back={()=>setView("home")}/><div style={S.pd}>{allEx.map(ex=>{const h=wH(ex.id);if(!h.length)return null;const last=h[h.length-1].weight;const diff=last-h[0].weight;const mx=Math.max(...h.map(x=>x.weight),1);const p=gProg(ex.id,data.log||[],last);return(<div key={ex.id} style={S.pC}><div style={S.pN}>{ex.name}</div><div style={S.pR}><span style={S.pW}>{last}kg</span>{diff!==0&&<span style={{fontSize:12,fontWeight:800,color:diff>0?"#22c55e":"#ef4444"}}>{diff>0?"+":""}{diff}kg</span>}<span style={{fontSize:10,color:"#4a4260"}}>{h.length} sessões</span></div><div style={S.pB}>{h.map((x,j)=><div key={j} style={{width:7,borderRadius:3,minHeight:3,height:`${Math.max(15,(x.weight/mx)*100)}%`,background:j===h.length-1?"#a78bfa":"#4a4458",transition:"height .3s"}}/>)}</div><div style={{fontSize:12,marginTop:10,fontWeight:600,color:p.color}}>{p.icon} {p.tip}</div></div>);})}</div></div>);}

  if(view==="achiev")return(<div style={S.root}>{ap}<Hd t="Conquistas" back={()=>setView("home")}/><div style={S.pd}><p style={{...S.hint,marginTop:0}}>Treino & consistência</p>{ACHIEV.map(a=>{const u=(data.ach||[]).includes(a.id);return(<div key={a.id} style={{...S.aC,opacity:u?1:.35}}><span style={{fontSize:28}}>{a.icon}</span><div><div style={{fontWeight:800,fontSize:14}}>{a.title}</div><div style={{fontSize:11,color:"#6b6280",marginTop:1}}>{a.desc}</div></div>{u&&<span style={{color:"#22c55e",fontWeight:800,fontSize:18,marginLeft:"auto"}}>✓</span>}</div>);})}<p style={{...S.hint,marginTop:20}}>Corrida</p>{RUN_ACHIEV.map(a=>{const u=(data.ach||[]).includes(a.id);return(<div key={a.id} style={{...S.aC,opacity:u?1:.35,borderColor:"#06b6d433"}}><span style={{fontSize:28}}>{a.icon}</span><div><div style={{fontWeight:800,fontSize:14}}>{a.title}</div><div style={{fontSize:11,color:"#6b6280",marginTop:1}}>{a.desc}</div></div>{u&&<span style={{color:"#22c55e",fontWeight:800,fontSize:18,marginLeft:"auto"}}>✓</span>}</div>);})}</div></div>);

  if(view==="mob")return(<div style={S.root}>{ap}<Hd t="Mobilidade" back={()=>setView("home")}/><div style={S.pd}><p style={S.hint}>20 min no chão.</p>{MOB.map((m,i)=><div key={i} style={S.mI}><span style={S.mN}>{i+1}</span><span style={S.mT}>{m}</span></div>)}<button style={{...S.bs,marginTop:20}} onClick={()=>{logRest();setView("home");}}>Registrar descanso ativo</button></div></div>);

  if(view==="run"){const kmN=parseFloat(String(runKm).replace(",","."));const ds=parseRunDuration(runTimeStr);const prevP=paceMinPerKm(kmN,isFinite(ds)&&ds>0?ds:NaN);const can=!!(kmN>0&&isFinite(ds)&&ds>0);return(<div style={S.root}>{ap}<Hd t="Corrida" sub="Distância, tempo e sensação — pace calculado automaticamente" back={()=>setView("home")}/><div style={S.pd}><p style={S.hint}>Tempo: minutos (ex: 32) ou mm:ss ou h:mm:ss</p><label style={S.runLbl}>Distância (km)</label><input style={S.fI} inputMode="decimal" placeholder="ex: 5,2" value={runKm} onChange={e=>sRunKm(e.target.value)}/><label style={S.runLbl}>Tempo</label><input style={S.fI} placeholder="ex: 32 ou 32:15" value={runTimeStr} onChange={e=>sRunTimeStr(e.target.value)}/><label style={S.runLbl}>Como se sentiu</label><div style={S.fbTs}>{RUN_FEEL.map(t=><button key={t} type="button" style={{...S.fbT,borderColor:runFeel===t?"#06b6d4":"#a78bfa33",background:runFeel===t?"#06b6d422":"#1a1528",color:runFeel===t?"#a5f3fc":"#b0a8c4"}} onClick={()=>sRunFeel(t)}>{t}</button>)}</div>{can&&<div style={S.runPacePrev}>Pace: <b>{formatPaceMinPerKm(prevP)}</b></div>}<button type="button" style={{...S.bp,marginTop:18,background:"linear-gradient(135deg,#06b6d4,#0891b2)"}} onClick={logRun} disabled={!can}>Registrar corrida</button><button type="button" style={{...S.bg2,marginTop:8}} onClick={()=>setView("runProg")}>Ver progressão e pace por distância</button></div></div>);}

  if(view==="runProg"){const runs=runEntries(data.log||[]);const rev=[...runs].reverse();const kmTot=totalRunKm(data.log||[]);return(<div style={S.root}>{ap}<Hd t="Corridas" sub={`${runs.length} treinos · ${kmTot.toLocaleString("pt-BR",{maximumFractionDigits:1})} km no total`} back={()=>setView("home")}/><div style={S.pd}><p style={{...S.hint,marginTop:0}}>Melhor pace (mais rápido) em corridas com pelo menos:</p>{RUN_PACE_BANDS.map(km=>{const bp=bestPaceForMinKm(data.log||[],km);return(<div key={km} style={S.runBand}><span style={S.runBandK}>≥ {km} km</span><span style={S.runBandV}>{bp!=null?formatPaceMinPerKm(bp):"—"}</span></div>);})}{rev.length===0&&<p style={S.em}>Ainda não há corridas registadas.</p>}{rev.length>0&&<><p style={{...S.hint,marginTop:16}}>Últimas corridas</p>{rev.slice(0,12).map((e,i)=><div key={i} style={{...S.hC,borderLeftColor:"#06b6d4",marginBottom:8}}><div style={S.hT}><span style={S.hD}>{fd(e.date)}</span><span style={{fontSize:11,color:"#22d3d8",fontWeight:700}}>{Number(e.km||0).toLocaleString("pt-BR",{maximumFractionDigits:2})} km</span></div><div style={{fontSize:12,color:"#b0a8c4"}}>{formatDurationSec(e.durSec)} · {formatPaceMinPerKm(e.paceMinPerKm)}{e.feel&&` · ${e.feel}`}</div></div>)}</>}</div></div>);}

  const xpPct=((xp-xpFor(lvl))/500)*100;
  const estFull=estimateWorkoutMinutes(wo);
  const estQuick=estimateWorkoutMinutes(buildQuickWorkout(wo));
  const supabaseCfgWarn=getSupabaseConfigProblem();
  return(<div style={S.root}>{ap}
    <div style={S.top}><div><h1 style={S.logo}>TREINO</h1><p style={S.date}>{formatHomeDate()}</p>{data.sd&&<p style={S.dateSub}>Semanas desde o início: <b>{weeks()}</b> · primeiro dia: {fd(data.sd)}</p>}</div><div style={S.tR}>{streak>0&&<div style={S.sC}>🔥 {streak}</div>}<div style={S.badge}>Ciclo {cycle()} · {pos()}/5</div></div></div>
    <div style={S.xW}><div style={S.xR}><span style={S.xL}>Nível {lvl}</span><span style={S.xT}>{xpN(xp)} XP → nível {lvl+1}</span></div><div style={S.xBg}><div style={{...S.xF,width:`${Math.min(xpPct,100)}%`}}/></div></div>
    {supabaseCfgWarn&&<div style={S.syncWarn}><span style={{fontSize:18}}>⚠️</span><p style={S.syncWarnT}>{supabaseCfgWarn}</p></div>}
    {isSupabaseConfigured()&&<div style={S.syncBox}>{authUser?(<><div style={S.syncRow}><span style={S.syncOk}>☁️ Conta ligada</span><span style={S.syncEm}>{authUser.email||"—"}</span><button type="button" style={S.syncOut} onClick={async()=>{setAuthHint("");await getSupabase()?.auth.signOut();}}>Sair</button></div><p style={S.syncSub}>A sessão fica guardada neste aparelho. Ao abrir o app, sincroniza automaticamente com a nuvem.</p></>):(!authOpen?<><button type="button" style={S.syncBtn} onClick={()=>{setAuthOpen(true);setAuthHint("");}}>☁️ Ligar conta (uma vez)</button><p style={S.syncSub}>Depois do primeiro login com o e-mail, não precisa repetir — abre já ligada e envia os dados ao abrir.</p></>:<div style={S.syncForm}><input type="email" style={S.syncInp} placeholder="Seu e-mail" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} autoComplete="email"/><button type="button" style={S.syncSend} onClick={async()=>{const sb=getSupabase();if(!sb||!authEmail.trim())return;setAuthHint("");const redirect=`${window.location.origin}${window.location.pathname||""}`;try{const{error}=await sb.auth.signInWithOtp({email:authEmail.trim(),options:{emailRedirectTo:redirect}});if(error)setAuthHint(formatSupabaseNetworkError(error));else setAuthHint("Link enviado — verifique o e-mail (e a caixa de spam).");}catch(e){setAuthHint(formatSupabaseNetworkError(e));}}}>Enviar link mágico</button><button type="button" style={S.syncMini} onClick={()=>setAuthOpen(false)}>Fechar</button>{authHint&&<p style={S.syncHint}>{authHint}</p>}</div>)}</div>}
    {stale()&&<div style={S.al}><span style={{fontSize:26}}>🔄</span><div style={{flex:1}}><div style={{fontWeight:800,fontSize:13}}>Passaram {PW} semanas no calendário</div><p style={{fontSize:11,color:"#6b6280",margin:"3px 0 0"}}>Hora de variar o protocolo — o corpo adaptou.</p><button style={S.alB} onClick={reset}>Resetar</button></div></div>}
    <div style={S.sts}><div style={S.st}><div style={S.stN}>{wkCt()}</div><div style={S.stL}>treinos nesta semana</div></div><div style={S.st}><div style={S.stN}>{totW()}</div><div style={S.stL}>treinos no total</div></div><div style={S.st} onClick={()=>setView("achiev")}><div style={S.stN}>{(data.ach||[]).length}/{ALL_ACHIEV.length}</div><div style={S.stL}>conquistas</div></div></div>
    <div style={S.sec}><h2 style={S.sT}>Próximo treino</h2>
      <div style={S.nC}>
        <div style={S.nT}><div><div style={{fontSize:28,marginBottom:4}}>{wo.emoji}</div><div style={S.nL}>{wo.label}</div><div style={S.nF}>{wo.focus}</div><div style={S.nQ}>Treino {pos()} de 5</div></div><div style={S.nCt}>{wo.exercises.length} ex.</div></div>
        <button style={{...S.bp,marginTop:20}} onClick={()=>{setFbNote("");setFbTags([]);setQuickRun(false);setView("workout");}}>Treino completo (~{estFull} min)</button>
        <button type="button" style={{...S.bQuick,marginTop:10}} onClick={()=>{setFbNote("");setFbTags([]);setQuickRun(true);setView("workout");}}>⚡ Treino rápido (~{estQuick} min)</button>
        <p style={S.quickHint}>Tempo completo (~{estFull} min): inclui aquecimento, todas as séries (execução + descanso), deslocamento entre exercícios, finalizador HIIT quando existir e bloco postural.</p>
        <p style={S.quickHint}>Rápido (~{estQuick} min): menos séries, descansos mais curtos, sem finalizador HIIT e menos postural — mesmos exercícios e cargas.</p>
        {todayHasW()&&<p style={{fontSize:11,color:"#a78bfa",marginTop:8,textAlign:"center"}}>Já treinou hoje — pode fazer outro!</p>}
        <div style={S.div}><span style={S.dL}/><span style={S.dT}>ou</span><span style={S.dL}/></div>
        <div style={S.aR}><button style={S.bg} onClick={()=>sShowF(!showF)}>Outra atividade</button><button style={S.bg} onClick={()=>setView("mob")}>Mobilidade</button><button type="button" style={S.bgRun} onClick={()=>setView("run")}>Corrida</button></div>
        {showF&&<div style={S.fF}><input style={S.fI} placeholder="O que fez? (ex: Corrida 5km)" value={fTxt} onChange={e=>sFTxt(e.target.value)}/><input style={S.fIS} placeholder="Duração (ex: 40 min)" value={fDur} onChange={e=>sFDur(e.target.value)}/><button style={S.bA} onClick={logFree} disabled={!fTxt.trim()}>Registrar</button><p style={S.fH}>Musculação continua na fila.</p></div>}
      </div>
    </div>
    <div style={S.nav}><button style={S.nB} onClick={()=>setView("queue")}><span style={S.nI}>📋</span>Fila</button><button style={S.nB} onClick={()=>setView("progress")}><span style={S.nI}>📈</span>Progressão</button><button style={S.nB} onClick={()=>setView("runProg")}><span style={S.nI}>🏃</span>Corridas</button><button style={S.nB} onClick={()=>setView("history")}><span style={S.nI}>📅</span>Histórico</button><button style={S.nB} onClick={()=>setView("achiev")}><span style={S.nI}>🏆</span>Conquistas</button></div>
  </div>);
}

function WO({wo,gw,wH,onDone,onBack,sP,sSP,rId,sRId,rL,sRL,ro,log,popup,fbNote,setFbNote,fbTags,setFbTags}){
  const[swBySet,sSwBySet]=useState(()=>{const w={};wo.exercises.forEach(e=>{const b=gw(e.id);w[e.id]=Array.from({length:e.sets},()=>b);});return w;});
  const[srBySet,sSrBySet]=useState(()=>{const r={};wo.exercises.forEach(e=>{r[e.id]=Array.from({length:e.sets},()=>e.reps);});return r;});
  const[ds,sDs]=useState(()=>{const s={};wo.exercises.forEach(e=>{s[e.id]=0});return s;});
  const[warmDone,setWarmDone]=useState(false);
  const[finisherDone,setFinisherDone]=useState(false);
  const[postDone,setPostDone]=useState(false);
  const[showFb,setShowFb]=useState(false);
  const[exModal,setExModal]=useState(null);
  const[skip,sSkip]=useState(()=>{const o={};wo.exercises.forEach(e=>{o[e.id]=false;});return o;});

  function tick(id,total,rest){if(ro||skip[id])return;sDs(p=>{const c=p[id]||0;const n=c<total?c+1:0;if(n>0&&n<total){sRId(id);sRL(rest);}return{...p,[id]:n};});}
  function toggleSkip(id){if(ro)return;sSkip(p=>{const nv=!p[id];if(nv)sDs(q=>({...q,[id]:0}));return{...p,[id]:nv};});}
  const activeEx=wo.exercises.filter(e=>!skip[e.id]);
  const doneSets=activeEx.reduce((a,e)=>a+(ds[e.id]||0),0);
  const totalSets=activeEx.reduce((a,e)=>a+e.sets,0);
  const allSkipped=wo.exercises.length>0&&wo.exercises.every(e=>skip[e.id]);
  const pct=totalSets>0?(doneSets/totalSets)*100:(allSkipped?100:0);
  const hasAny=doneSets>0||allSkipped;

  function doFinish(){const skippedIds=wo.exercises.filter(e=>skip[e.id]).map(e=>e.id);const weights={};wo.exercises.forEach(ex=>{if(skip[ex.id])return;weights[ex.id]={kg:swBySet[ex.id]||[],reps:srBySet[ex.id]||[]};});onDone(wo,weights,{tags:fbTags,note:fbNote,skipped:skippedIds});}
  function toggleFb(t){setFbTags(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t]);}
  const modalInfo=exModal?exInfo(exModal):undefined;
  const modalEx=exModal?wo.exercises.find(e=>e.id===exModal):undefined;

  if(showFb)return(<div style={S.root}>{popup}<Hd t="Avaliação do treino" back={()=>setShowFb(false)}/><div style={S.pd}><p style={{fontSize:14,color:"#b0a8c4",marginBottom:16}}>Como foi <b>{wo.label}</b>?</p><div style={S.fbTs}>{FB_OPT.map(t=><button key={t} style={{...S.fbT,background:fbTags.includes(t)?"#a78bfa":"#1a1528",color:fbTags.includes(t)?"#0c0a14":"#b0a8c4"}} onClick={()=>toggleFb(t)}>{t}</button>)}</div><textarea style={S.fbI} placeholder="Observações (opcional)..." value={fbNote} onChange={e=>setFbNote(e.target.value)} rows={3}/><button style={{...S.bp,marginTop:16}} onClick={doFinish}>Salvar e concluir 🎉</button><button style={{...S.bg2,marginTop:10}} onClick={doFinish}>Continuar sem comentários</button></div></div>);

  return(<div style={S.root}>{popup}
    <Hd t={wo.label} sub={wo.quick?`${wo.focus} · ⚡ Modo rápido (menos séries, descansos curtos)`:wo.focus} back={onBack}/>
    {wo.quick&&<div style={S.quickStrip}>Prioridade: completar o essencial no menor tempo. Ajuste as cargas se precisar.</div>}
    <div style={S.wPBg}><div style={{...S.wPF,width:`${pct}%`}}/></div>
    {rId&&rL>0&&<div style={S.tmr}><span>⏱ <b>{rL}s</b></span><button style={S.tmrS} onClick={()=>{sRId(null);sRL(0);}}>Pular</button></div>}
    <div style={S.pd}>
      {wo.warmup?.length>0&&<div style={{...S.blk,borderLeft:warmDone?"3px solid #22c55e":"3px solid transparent"}}><div style={S.blkR} onClick={()=>setWarmDone(!warmDone)}><div style={{...S.chk,background:warmDone?"#22c55e":"#2a2535"}}>{warmDone&&"✓"}</div><div style={S.blkH}>🔥 Aquecimento</div></div>{wo.warmup.map((w,i)=><div key={i} style={S.blkI}>• {w}</div>)}</div>}

      <div style={S.blkH}>💪 Exercícios</div>
      {wo.exercises.map((ex,i)=>{const sk=skip[ex.id];const fin=!sk&&(ds[ex.id]||0)>=ex.sets;const h=wH(ex.id);const kgs=swBySet[ex.id]||[];const rps=srBySet[ex.id]||[];const cw=kgs.length?kgs[kgs.length-1]:gw(ex.id);const lastW=h.length?h[h.length-1].weight:null;const p=gProg(ex.id,log,cw);const ei=exInfo(ex.id);const bc=sk?"#6b7280":fin?"#22c55e":"#a78bfa";
        return(<div key={ex.id} style={{...S.eC,borderLeftColor:bc,opacity:sk?0.72:1}}>
          <div style={S.eT}>{ei?(<button type="button" style={S.eThWrap} onClick={()=>!sk&&setExModal(ex.id)} aria-label={`Ilustração: ${ex.name}`} disabled={sk}><img src={ei.img} alt="" style={{...S.eThImg,filter:sk?"grayscale(0.6)":undefined}} loading="lazy" decoding="async"/><span style={S.eThBadge}>{i+1}</span></button>):(<div style={S.eI} onClick={()=>!sk&&setExModal(ex.id)}>{i+1}</div>)}<div style={{flex:1}}><div style={S.eN}>{ex.name}{sk&&<span style={S.eSkip}> · não feito</span>} <button type="button" style={S.eInfoBt} onClick={()=>setExModal(ex.id)} aria-label="Instruções">📷</button></div><div style={S.eM}>{ex.sets} séries · sugerido {ex.reps} reps · {ex.rest}s</div>{ex.tech&&<div style={S.eTc}>{ex.tech}</div>}{!sk&&h.length>=2&&<div style={{fontSize:10,marginTop:6,fontWeight:600,color:p.color}}>{p.icon} {p.tip}</div>}{!sk&&lastW!==null&&lastW!==cw&&<div style={{fontSize:10,marginTop:4,fontWeight:700,color:cw>lastW?"#22c55e":"#ef4444"}}>vs último treino: {cw>lastW?"+":""}{(cw-lastW).toFixed(1).replace(/\.0$/,"")} kg (última série)</div>}</div></div>
          {!ro&&<div style={S.eSkipRow}><button type="button" style={{...S.eSkipBt,background:sk?"#3a3348":"transparent",color:sk?"#ede9f7":"#6b7280"}} onClick={()=>toggleSkip(ex.id)}>{sk?"↩ Desfazer":"⊘ Não realizado"}</button></div>}
          {!sk?(<><div style={S.eSetWrap}>{Array.from({length:ex.sets}).map((_,si)=>{const kgV=kgs[si]??gw(ex.id);const rpV=rps[si]??ex.reps;const done=si<(ds[ex.id]||0);return(<div key={si} style={{...S.eSetRow,opacity:done?1:0.92}}><span style={S.eSetLbl}>S{si+1}</span><input type="number" min={0} step="0.5" style={S.eSetIn} value={kgV} readOnly={!!ro} disabled={ro} onChange={e=>{const n=parseFloat(e.target.value);if(isNaN(n)||n<0)return;sSwBySet(p=>{const a=[...(p[ex.id]||[])];while(a.length<ex.sets)a.push(gw(ex.id));a[si]=n;return{...p,[ex.id]:a};});}}/><span style={S.eSetUnit}>kg</span><input type="number" min={0} step={1} style={S.eSetInR} value={rpV} readOnly={!!ro} disabled={ro} onChange={e=>{const n=parseInt(e.target.value,10);if(isNaN(n)||n<0)return;sSrBySet(p=>{const a=[...(p[ex.id]||[])];while(a.length<ex.sets)a.push(ex.reps);a[si]=n;return{...p,[ex.id]:a};});}}/><span style={S.eSetUnit}>reps</span></div>);})}</div><div style={S.eB}><div style={S.wGhost}/><div style={S.sR}>{Array.from({length:ex.sets}).map((_,si)=><div key={si} style={{...S.sD,background:sk?"#2a2535":si<(ds[ex.id]||0)?"#22c55e":"#2a2535",opacity:sk?0.35:1,cursor:sk||ro?"default":"pointer"}} onClick={()=>tick(ex.id,ex.sets,ex.rest)}/>)}<span style={S.sCtn}>{sk?"—":`${ds[ex.id]||0}/${ex.sets}`}</span></div></div></>):<div style={S.eB}><div style={S.wGhost}>—</div></div>}
        </div>);})}

      {wo.finisher&&<div style={{...S.blk,borderLeft:finisherDone?"3px solid #22c55e":"3px solid transparent"}}><div style={S.blkR} onClick={()=>setFinisherDone(!finisherDone)}><div style={{...S.chk,background:finisherDone?"#22c55e":"#2a2535"}}>{finisherDone&&"✓"}</div><div style={S.blkH}>🏃 Finalizador</div></div><div style={S.blkI}>{wo.finisher}</div></div>}

      {wo.posture?.length>0&&<div style={{...S.blk,borderLeft:postDone?"3px solid #22c55e":"3px solid transparent",marginTop:8}}><div style={S.blkR} onClick={()=>setPostDone(!postDone)}><div style={{...S.chk,background:postDone?"#22c55e":"#2a2535"}}>{postDone&&"✓"}</div><button style={S.pBtn} onClick={e=>{e.stopPropagation();sSP(!sP);}}>{sP?"▾":"▸"} 🧘 Postural ({wo.posture.length})</button></div>{sP&&wo.posture.map((p,i)=><div key={i} style={S.blkI}>• {p}</div>)}</div>}

      {!ro&&<><p style={S.doneHint}>A barra e “Encerrar” contam só <b>exercícios</b> (séries). Aquecimento, finalizador e postural são opcionais — os ✓ são só para te organizares.</p><button style={{...S.bp,marginTop:12,width:"100%",opacity:hasAny?1:.4}} onClick={()=>{if(hasAny)setShowFb(true);}}>{hasAny?"Encerrar treino":"Marca séries ou ‘Não realizado’"}</button>{!hasAny&&<p style={{fontSize:11,color:"#4a4260",textAlign:"center",marginTop:6}}>Pelo menos uma série num exercício, ou todos como não realizado.</p>}</>}
      {ro&&<p style={{fontSize:12,color:"#4a4260",textAlign:"center",marginTop:22,fontStyle:"italic"}}>Somente visualização.</p>}
    </div>
    {modalInfo&&modalEx&&<div style={S.mdOv} onClick={()=>setExModal(null)} role="presentation"><div style={S.mdBox} onClick={e=>e.stopPropagation()}><button type="button" style={S.mdX} onClick={()=>setExModal(null)} aria-label="Fechar">✕</button><img src={modalInfo.img} alt="" style={S.mdImg} loading="lazy"/><h2 style={S.mdT}>{modalEx.name}</h2><p style={S.mdSub}>Como executar</p><ol style={S.mdOl}>{modalInfo.steps.map((st,si)=><li key={si} style={S.mdLi}>{st}</li>)}</ol></div></div>}
  </div>);
}

function Hd({t,sub,back}){return(<div style={S.bar}><button style={S.bk} onClick={back}>←</button><div><div style={{fontSize:18,fontWeight:800}}>{t}</div>{sub&&<div style={{fontSize:11,color:"#6b6280"}}>{sub}</div>}</div></div>);}

const S={
  root:{fontFamily:"'Outfit','Figtree',system-ui,sans-serif",background:"#0c0a14",color:"#ede9f7",minHeight:"100vh",maxWidth:500,margin:"0 auto",paddingBottom:48,position:"relative"},
  lw:{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh",background:"#0c0a14"},
  spin:{width:36,height:36,borderRadius:"50%",border:"3px solid #2a2535",borderTopColor:"#a78bfa",animation:"spin .8s linear infinite"},
  top:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"28px 20px 10px"},
  logo:{fontSize:24,fontWeight:900,letterSpacing:8,color:"#c4b5fd",margin:0},
  date:{fontSize:12,color:"#6b6280",marginTop:4},
  dateSub:{fontSize:10,color:"#5c5475",marginTop:6,lineHeight:1.4,maxWidth:280},
  tR:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6},
  sC:{background:"linear-gradient(135deg,#f59e0b,#ef4444)",padding:"4px 12px",borderRadius:20,fontSize:13,fontWeight:800,color:"#fff"},
  badge:{background:"#16132144",padding:"5px 14px",borderRadius:20,fontSize:10,fontWeight:700,color:"#a78bfa",border:"1px solid #a78bfa15"},
  syncWarn:{margin:"0 20px 12px",padding:"12px 14px",background:"#2a1518",borderRadius:16,border:"1px solid #f59e0b44",display:"flex",gap:10,alignItems:"flex-start"},
  syncWarnT:{fontSize:11,color:"#fcd34d",margin:0,lineHeight:1.45,flex:1},
  syncBox:{margin:"0 20px 12px",padding:"12px 14px",background:"#13101e",borderRadius:16,border:"1px solid #1a1528"},
  syncRow:{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",justifyContent:"space-between"},
  syncOk:{fontSize:12,fontWeight:800,color:"#22c55e"},
  syncEm:{fontSize:11,color:"#6b6280",flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  syncOut:{background:"transparent",border:"1px solid #2a2535",color:"#b0a8c4",padding:"6px 12px",borderRadius:10,fontSize:11,fontWeight:700,cursor:"pointer"},
  syncBtn:{width:"100%",background:"#1d1735",border:"1px solid #a78bfa33",color:"#c4b5fd",padding:"10px 14px",borderRadius:14,fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"center"},
  syncForm:{display:"flex",flexDirection:"column",gap:8},
  syncInp:{background:"#16132188",border:"1px solid #1f1b2e",borderRadius:12,padding:"10px 14px",color:"#ede9f7",fontSize:13,outline:"none"},
  syncSend:{background:"linear-gradient(135deg,#a78bfa,#7c3aed)",border:"none",color:"#fff",padding:"11px 16px",borderRadius:14,fontWeight:800,fontSize:13,cursor:"pointer"},
  syncMini:{background:"transparent",border:"none",color:"#6b6280",fontSize:12,cursor:"pointer",padding:4},
  syncHint:{fontSize:11,color:"#a78bfa",margin:0,lineHeight:1.4},
  syncSub:{fontSize:10,color:"#5c5475",margin:"8px 0 0",lineHeight:1.45},
  xW:{padding:"0 20px",marginBottom:4},xR:{display:"flex",justifyContent:"space-between",marginBottom:5},xL:{fontSize:12,fontWeight:800,color:"#c4b5fd"},xT:{fontSize:10,color:"#5c5475"},xBg:{height:6,borderRadius:3,background:"#1a1528"},xF:{height:6,borderRadius:3,background:"linear-gradient(90deg,#7c3aed,#a78bfa)",transition:"width .5s"},
  al:{margin:"10px 20px 0",background:"linear-gradient(135deg,#231740,#18132a)",borderRadius:18,padding:16,display:"flex",gap:12,border:"1px solid #7c3aed33"},alB:{marginTop:10,background:"#a78bfa",color:"#0c0a14",border:"none",padding:"8px 18px",borderRadius:12,fontWeight:800,fontSize:11,cursor:"pointer"},
  sts:{display:"flex",gap:8,padding:"14px 20px 4px"},st:{flex:1,background:"#13101e",borderRadius:16,padding:"14px 8px",textAlign:"center",border:"1px solid #1a1528",cursor:"pointer"},stN:{fontSize:24,fontWeight:900,color:"#c4b5fd"},stL:{fontSize:9,color:"#4a4260",marginTop:2,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700},
  sec:{padding:"10px 20px 0"},sT:{fontSize:11,textTransform:"uppercase",letterSpacing:3,color:"#4a4260",marginBottom:12,fontWeight:700},
  nC:{background:"#13101e",borderRadius:20,padding:20,border:"1px solid #1a1528"},nT:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"},nL:{fontSize:18,fontWeight:800},nF:{fontSize:12,color:"#6b6280",marginTop:2},nQ:{fontSize:11,color:"#a78bfa",marginTop:5,fontWeight:600},nCt:{fontSize:10,color:"#a78bfa",background:"#1d1735",padding:"4px 12px",borderRadius:10,fontWeight:700,height:"fit-content"},
  div:{display:"flex",alignItems:"center",gap:12,margin:"16px 0"},dL:{flex:1,height:1,background:"#1a1528"},dT:{fontSize:10,color:"#4a4260",fontWeight:600},aR:{display:"flex",flexWrap:"wrap",gap:8},
  bp:{background:"linear-gradient(135deg,#a78bfa,#7c3aed)",color:"#fff",border:"none",padding:"14px 26px",borderRadius:16,fontWeight:800,fontSize:15,cursor:"pointer",width:"100%",textAlign:"center"},
  bQuick:{background:"linear-gradient(135deg,#f59e0b,#ea580c)",color:"#fff",border:"none",padding:"12px 22px",borderRadius:16,fontWeight:800,fontSize:14,cursor:"pointer",width:"100%",textAlign:"center",boxSizing:"border-box"},
  quickHint:{fontSize:10,color:"#6b6280",margin:"10px 0 0",lineHeight:1.45,textAlign:"center"},
  quickStrip:{margin:"0 20px",padding:"8px 12px",background:"#f59e0b18",borderLeft:"3px solid #f59e0b",fontSize:11,color:"#fcd34d",lineHeight:1.4},
  qQuick:{width:"100%",marginTop:6,background:"#1a1528",border:"1px solid #f59e0b44",color:"#fbbf24",padding:"8px 10px",borderRadius:12,fontSize:11,fontWeight:700,cursor:"pointer",textAlign:"center"},
  bg:{flex:"1 1 28%",minWidth:100,background:"transparent",color:"#6b6280",border:"1px solid #1f1b2e",padding:"11px 12px",borderRadius:14,fontWeight:700,fontSize:11,cursor:"pointer",textAlign:"center"},
  bgRun:{flex:"1 1 28%",minWidth:100,background:"#06b6d414",color:"#67e8f9",border:"1px solid #06b6d466",padding:"11px 12px",borderRadius:14,fontWeight:700,fontSize:11,cursor:"pointer",textAlign:"center"},
  runLbl:{display:"block",fontSize:10,fontWeight:700,color:"#5c5475",textTransform:"uppercase",letterSpacing:1,margin:"12px 0 6px"},
  runPacePrev:{fontSize:15,fontWeight:700,color:"#22d3d8",marginTop:12,textAlign:"center"},
  runBand:{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#13101e",borderRadius:14,padding:"12px 14px",marginBottom:8,border:"1px solid #06b6d422"},runBandK:{fontSize:13,fontWeight:700,color:"#b0a8c4"},runBandV:{fontSize:14,fontWeight:800,color:"#22d3d8"},
  bg2:{background:"transparent",color:"#6b6280",border:"none",padding:"10px",fontSize:13,cursor:"pointer",textAlign:"center",width:"100%"},
  bs:{background:"#1a1528",color:"#c4b5fd",border:"1px solid #a78bfa22",padding:"12px 22px",borderRadius:14,fontWeight:700,fontSize:13,cursor:"pointer",width:"100%",textAlign:"center"},
  bA:{background:"#f59e0b",color:"#0c0a14",border:"none",padding:"11px 22px",borderRadius:14,fontWeight:800,fontSize:12,cursor:"pointer",width:"100%"},
  fF:{marginTop:14,display:"flex",flexDirection:"column",gap:8},fI:{background:"#16132188",border:"1px solid #1f1b2e",borderRadius:12,padding:"11px 14px",color:"#ede9f7",fontSize:13,outline:"none"},fIS:{background:"#16132188",border:"1px solid #1f1b2e",borderRadius:12,padding:"9px 14px",color:"#ede9f7",fontSize:12,outline:"none"},fH:{fontSize:10,color:"#4a4260",margin:0,fontStyle:"italic"},
  nav:{display:"flex",flexWrap:"wrap",gap:8,padding:"24px 20px 0"},nB:{flex:"1 1 30%",minWidth:88,maxWidth:"calc(50% - 4px)",background:"#13101e",border:"1px solid #1a1528",borderRadius:16,padding:"12px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:"#ede9f7",cursor:"pointer",fontSize:9,fontWeight:700},nI:{fontSize:18},
  bar:{display:"flex",alignItems:"center",gap:12,padding:"24px 20px 12px",borderBottom:"1px solid #161321"},bk:{background:"#13101e",border:"1px solid #1a1528",color:"#a78bfa",fontSize:18,width:40,height:40,borderRadius:14,cursor:"pointer",fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"},
  pd:{padding:"16px 20px"},hint:{fontSize:12,color:"#4a4260",marginBottom:16,lineHeight:1.5},em:{fontSize:13,color:"#4a4260",textAlign:"center",padding:40},
  qC:{display:"flex",alignItems:"center",background:"#13101e",borderRadius:16,padding:"14px 16px",marginBottom:8,cursor:"pointer",borderLeft:"4px solid #a78bfa",gap:8},qL:{display:"flex",alignItems:"center",gap:12,flex:1},qD:{width:34,height:34,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,color:"#fff",flexShrink:0},qN:{fontWeight:800,fontSize:13},qF:{fontSize:10,color:"#4a4260",marginTop:1},nb:{background:"#a78bfa18",color:"#c4b5fd",padding:"3px 10px",borderRadius:8,fontSize:9,fontWeight:800,letterSpacing:1},ch:{fontSize:18,color:"#4a4260",flexShrink:0},
  hC:{background:"#13101e",borderRadius:16,padding:14,marginBottom:8,borderLeft:"4px solid #a78bfa"},hT:{display:"flex",justifyContent:"space-between",marginBottom:4},hD:{fontSize:11,color:"#6b6280",fontWeight:600,textTransform:"capitalize"},hTg:{display:"flex",flexWrap:"wrap",gap:5,marginTop:6},tg:{background:"#1d1735",padding:"2px 8px",borderRadius:6,fontSize:9,color:"#c4b5fd"},del:{background:"transparent",border:"none",color:"#ef444488",fontSize:14,cursor:"pointer",padding:"2px 6px"},
  calWrap:{marginBottom:20,background:"#13101e",borderRadius:16,padding:14,border:"1px solid #1a1528"},calNav:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12},calNavBtn:{background:"#1d1735",border:"1px solid #2a2535",color:"#a78bfa",width:38,height:38,borderRadius:12,cursor:"pointer",fontSize:20,fontWeight:800,lineHeight:1},calTitle:{fontSize:15,fontWeight:800,textTransform:"capitalize",color:"#ede9f7"},calWeekRow:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:6},calWD:{fontSize:9,color:"#5c5475",textAlign:"center",fontWeight:700},calGrid:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4},calCellEmpty:{minHeight:34},calCell:{minHeight:34,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:10,fontSize:12,fontWeight:700,color:"#6b7280",background:"#161321"},calCellOn:{background:"linear-gradient(145deg,#6d28d9,#7c3aed)",color:"#fff",boxShadow:"0 2px 10px #7c3aed44"},calCellToday:{outline:"2px solid #a78bfa",outlineOffset:1},calCellTodayOn:{outline:"2px solid #fde68a",outlineOffset:1,boxShadow:"0 2px 12px #7c3aed55"},calLegend:{fontSize:10,color:"#4a4260",marginTop:12,textAlign:"center",lineHeight:1.4},
  pC:{background:"#13101e",borderRadius:16,padding:16,marginBottom:10},pN:{fontWeight:800,fontSize:13,marginBottom:6},pR:{display:"flex",alignItems:"center",gap:10},pW:{fontSize:22,fontWeight:900,color:"#c4b5fd"},pB:{display:"flex",alignItems:"flex-end",gap:3,marginTop:12,height:36},
  aC:{display:"flex",alignItems:"center",gap:14,background:"#13101e",borderRadius:16,padding:16,marginBottom:8,border:"1px solid #1a1528"},
  ap:{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:"linear-gradient(135deg,#7c3aed,#a78bfa)",padding:"12px 22px",borderRadius:20,display:"flex",alignItems:"center",gap:12,zIndex:100,boxShadow:"0 8px 32px #7c3aed66"},
  blk:{background:"#161321",borderRadius:16,padding:14,marginBottom:12},blkH:{fontWeight:800,fontSize:11,marginBottom:8,textTransform:"uppercase",letterSpacing:2,color:"#6b6280"},blkI:{fontSize:12,color:"#b0a8c4",paddingLeft:4,marginBottom:4,lineHeight:1.5},blkR:{display:"flex",alignItems:"center",gap:10,marginBottom:4,cursor:"pointer"},
  chk:{width:24,height:24,borderRadius:7,border:"2px solid #3a3348",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,color:"#fff",flexShrink:0,transition:"all .15s",cursor:"pointer"},
  wPBg:{height:3,background:"#161321"},wPF:{height:3,background:"linear-gradient(90deg,#7c3aed,#22c55e)",transition:"width .3s"},
  eC:{background:"#13101e",borderRadius:16,padding:16,marginBottom:10,borderLeft:"4px solid #a78bfa"},eT:{display:"flex",gap:10},eI:{width:56,height:56,borderRadius:12,background:"#1d1735",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:12,color:"#a78bfa",flexShrink:0,cursor:"pointer"},eThWrap:{position:"relative",width:56,height:56,borderRadius:12,overflow:"hidden",flexShrink:0,cursor:"pointer",border:"1px solid #2a2535",padding:0,background:"#1d1735",display:"block"},eThImg:{width:"100%",height:"100%",objectFit:"cover",display:"block"},eThBadge:{position:"absolute",bottom:3,right:3,background:"#0c0a14cc",color:"#c4b5fd",fontSize:10,fontWeight:800,minWidth:18,height:18,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"},eInfoBt:{background:"transparent",border:"none",cursor:"pointer",fontSize:12,opacity:.65,padding:0,lineHeight:1,verticalAlign:"middle"},eN:{fontWeight:800,fontSize:14},eM:{fontSize:11,color:"#a78bfa",marginTop:2},eTc:{fontSize:10,color:"#c084fc",marginTop:4,fontStyle:"italic"},eB:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8},
  eSetWrap:{display:"flex",flexDirection:"column",gap:6,marginTop:10},eSetRow:{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"},eSetLbl:{fontSize:10,fontWeight:800,color:"#5c5475",minWidth:22,flexShrink:0},eSetIn:{width:54,background:"#1d1735",border:"1px solid #2a2535",borderRadius:8,padding:"5px 6px",color:"#ede9f7",fontSize:13,fontWeight:700,outline:"none",boxSizing:"border-box"},eSetInR:{width:42,background:"#1d1735",border:"1px solid #2a2535",borderRadius:8,padding:"5px 4px",color:"#ede9f7",fontSize:13,fontWeight:700,outline:"none",boxSizing:"border-box"},eSetUnit:{fontSize:9,color:"#4a4260",fontWeight:600,marginRight:2},
  eSkip:{fontSize:11,fontWeight:700,color:"#f59e0b",fontStyle:"italic"},eSkipRow:{marginTop:8,marginBottom:2},eSkipBt:{border:"1px solid #3a3348",borderRadius:10,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",width:"100%",textAlign:"center"},wGhost:{padding:"6px 14px",fontSize:13,color:"#4a4260",fontStyle:"italic"},doneHint:{fontSize:10,color:"#5c5475",margin:"16px 0 0",lineHeight:1.45,textAlign:"center"},
  mdOv:{position:"fixed",inset:0,background:"#0c0a14e6",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16,boxSizing:"border-box"},mdBox:{background:"#13101e",borderRadius:20,maxWidth:420,width:"100%",maxHeight:"92vh",overflow:"auto",border:"1px solid #2a2535",position:"relative",boxShadow:"0 24px 64px #0008"},mdX:{position:"absolute",top:10,right:10,zIndex:2,background:"#1a1528",border:"1px solid #2a2535",color:"#b0a8c4",width:36,height:36,borderRadius:12,cursor:"pointer",fontSize:16,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"},mdImg:{width:"100%",height:"auto",display:"block",background:"#0c0a14"},mdT:{padding:"14px 20px 4px",fontSize:17,fontWeight:800,margin:0},mdSub:{padding:"0 20px 10px",fontSize:11,color:"#6b6280",margin:0},mdOl:{padding:"0 20px 18px 38px",margin:0,fontSize:13,color:"#b0a8c4",lineHeight:1.55},mdLi:{marginBottom:8},
  wSh:{display:"flex",alignItems:"center",gap:6,cursor:"pointer",background:"#1d1735",padding:"6px 14px",borderRadius:12},wV:{fontSize:16,fontWeight:800,color:"#c4b5fd"},wE:{display:"flex",alignItems:"center",gap:5},wIn:{width:52,background:"#1d1735",border:"1px solid #a78bfa",borderRadius:10,padding:"6px 8px",color:"#ede9f7",fontSize:15,fontWeight:800,outline:"none"},wSv:{background:"#22c55e",border:"none",color:"#fff",width:30,height:30,borderRadius:10,fontWeight:800,cursor:"pointer",fontSize:15},
  sR:{display:"flex",alignItems:"center",gap:5},sD:{width:24,height:24,borderRadius:7,cursor:"pointer",border:"2px solid #2a2535",transition:"all .15s"},sCtn:{fontSize:11,color:"#4a4260",marginLeft:4,fontWeight:600},
  pBtn:{background:"transparent",border:"none",color:"#6b6280",fontSize:13,fontWeight:700,cursor:"pointer",padding:0,textAlign:"left",flex:1},
  tmr:{position:"sticky",top:0,zIndex:10,background:"linear-gradient(135deg,#7c3aed,#a78bfa)",padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",fontWeight:700,fontSize:14},tmrS:{background:"#ffffff25",border:"none",color:"#fff",padding:"5px 14px",borderRadius:10,fontWeight:700,cursor:"pointer",fontSize:11},
  ds:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"80vh",padding:40,textAlign:"center"},cb:{width:76,height:76,borderRadius:"50%",background:"linear-gradient(135deg,#22c55e,#16a34a)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,color:"#fff",fontWeight:800,marginBottom:20},dh:{fontSize:22,fontWeight:900,marginBottom:6},dx:{background:"linear-gradient(135deg,#a78bfa,#7c3aed)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",fontSize:18,fontWeight:900,marginBottom:8},dp:{fontSize:13,color:"#6b6280",marginBottom:16},sb:{fontSize:18,fontWeight:800,color:"#f59e0b",marginBottom:16},
  mI:{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12},mN:{width:26,height:26,borderRadius:8,background:"#1d1735",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#a78bfa",flexShrink:0},mT:{fontSize:13,color:"#b0a8c4",lineHeight:1.5},
  fbTs:{display:"flex",flexWrap:"wrap",gap:8,marginBottom:16},fbT:{border:"1px solid #a78bfa33",borderRadius:12,padding:"8px 14px",fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s"},fbI:{background:"#1a1528",border:"1px solid #1f1b2e",borderRadius:14,padding:"12px 16px",color:"#ede9f7",fontSize:13,outline:"none",resize:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit"},
  cW:{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"#0c0a14"},cP:{position:"absolute",top:"-5vh",width:10,height:10,borderRadius:2,animation:"cF 2s ease forwards"},cT:{fontSize:22,fontWeight:900,color:"#fff",textAlign:"center",zIndex:301,padding:20},
};
