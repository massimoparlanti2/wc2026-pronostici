import React, { useState, useEffect, useMemo, useRef } from 'react'
import { db } from './firebase.js'
import { ref, onValue, set, remove } from 'firebase/database'

// ─── DEADLINE ──────────────────────────────────────────────────────
const DEADLINE = new Date("2026-06-11T18:00:00Z").getTime()

// ─── DATA ──────────────────────────────────────────────────────────
const GROUPS = {
  A:{teams:[{name:"Mexico",flag:"🇲🇽"},{name:"Sud Africa",flag:"🇿🇦"},{name:"Corea del Sud",flag:"🇰🇷"},{name:"Cechia",flag:"🇨🇿"}]},
  B:{teams:[{name:"Canada",flag:"🇨🇦"},{name:"Bosnia-Erzegovina",flag:"🇧🇦"},{name:"Qatar",flag:"🇶🇦"},{name:"Svizzera",flag:"🇨🇭"}]},
  C:{teams:[{name:"Brasile",flag:"🇧🇷"},{name:"Marocco",flag:"🇲🇦"},{name:"Haiti",flag:"🇭🇹"},{name:"Scozia",flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿"}]},
  D:{teams:[{name:"USA",flag:"🇺🇸"},{name:"Paraguay",flag:"🇵🇾"},{name:"Australia",flag:"🇦🇺"},{name:"Turchia",flag:"🇹🇷"}]},
  E:{teams:[{name:"Germania",flag:"🇩🇪"},{name:"Curaçao",flag:"🇨🇼"},{name:"Costa d'Avorio",flag:"🇨🇮"},{name:"Ecuador",flag:"🇪🇨"}]},
  F:{teams:[{name:"Olanda",flag:"🇳🇱"},{name:"Giappone",flag:"🇯🇵"},{name:"Svezia",flag:"🇸🇪"},{name:"Tunisia",flag:"🇹🇳"}]},
  G:{teams:[{name:"Belgio",flag:"🇧🇪"},{name:"Egitto",flag:"🇪🇬"},{name:"Iran",flag:"🇮🇷"},{name:"Nuova Zelanda",flag:"🇳🇿"}]},
  H:{teams:[{name:"Spagna",flag:"🇪🇸"},{name:"Capo Verde",flag:"🇨🇻"},{name:"Arabia Saudita",flag:"🇸🇦"},{name:"Uruguay",flag:"🇺🇾"}]},
  I:{teams:[{name:"Francia",flag:"🇫🇷"},{name:"Senegal",flag:"🇸🇳"},{name:"Iraq",flag:"🇮🇶"},{name:"Norvegia",flag:"🇳🇴"}]},
  J:{teams:[{name:"Argentina",flag:"🇦🇷"},{name:"Algeria",flag:"🇩🇿"},{name:"Austria",flag:"🇦🇹"},{name:"Giordania",flag:"🇯🇴"}]},
  K:{teams:[{name:"Portogallo",flag:"🇵🇹"},{name:"DR Congo",flag:"🇨🇩"},{name:"Uzbekistan",flag:"🇺🇿"},{name:"Colombia",flag:"🇨🇴"}]},
  L:{teams:[{name:"Inghilterra",flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},{name:"Croazia",flag:"🇭🇷"},{name:"Ghana",flag:"🇬🇭"},{name:"Panama",flag:"🇵🇦"}]},
}
const ALL_TEAMS = Object.values(GROUPS).flatMap(g => g.teams)
const getFlag = n => ALL_TEAMS.find(t => t.name === n)?.flag || '🏳️'

// ─── BRACKET UFFICIALE FIFA 2026 (M73–M88) ─────────────────────────
const R32_T = [
  [{g:'A',p:'second'},{g:'B',p:'second'}],[{g:'E',p:'first'},{third:0}],
  [{g:'F',p:'first'},{g:'C',p:'second'}],[{g:'C',p:'first'},{g:'F',p:'second'}],
  [{g:'I',p:'first'},{third:1}],[{g:'E',p:'second'},{g:'I',p:'second'}],
  [{g:'A',p:'first'},{third:2}],[{g:'L',p:'first'},{third:3}],
  [{g:'D',p:'first'},{third:4}],[{g:'G',p:'first'},{third:5}],
  [{g:'K',p:'second'},{g:'L',p:'second'}],[{g:'H',p:'first'},{g:'J',p:'second'}],
  [{g:'B',p:'first'},{third:6}],[{g:'J',p:'first'},{g:'H',p:'second'}],
  [{g:'K',p:'first'},{third:7}],[{g:'D',p:'second'},{g:'G',p:'second'}],
]
const R32_LABELS = ["M73","M74","M75","M76","M77","M78","M79","M80","M81","M82","M83","M84","M85","M86","M87","M88"]
const R16F = [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]]
const QFF  = [[0,1],[2,3],[4,5],[6,7]]
const SFF  = [[0,1],[2,3]]
const slotTeam = (slot,g,t) => slot.g ? g?.[slot.g]?.[slot.p]||null : t?.[slot.third]||null
const slotLabel = slot => slot.g ? `${slot.p==='first'?'1°':'2°'} ${slot.g}` : 'Migliore 3a'

// ─── PUNTEGGI ──────────────────────────────────────────────────────
const PTS = { g1:3, g2:2, t3:2, r32:5, r16:8, qf:11, sf:14, champion:20, tp:6 }
const MAX_PTS = { g1:36, g2:24, t3:16, r32:80, r16:64, qf:44, sf:28, champion:20, tp:6 }

function calcBreakdown(preds, res) {
  const b = { g1:0, g2:0, t3:0, r32:0, r16:0, qf:0, sf:0, champion:0, tp:0 }
  if (!res || !preds) return b
  for (const g of Object.keys(GROUPS)) {
    if (res.groups?.[g]?.first  && preds.groups?.[g]?.first  === res.groups[g].first)  b.g1  += PTS.g1
    if (res.groups?.[g]?.second && preds.groups?.[g]?.second === res.groups[g].second) b.g2  += PTS.g2
  }
  for (const t of (res.thirds||[])) if (preds.thirds?.includes(t)) b.t3 += PTS.t3
  for (let i=0;i<16;i++) if (res.r32?.[i]  && preds.r32?.[i]  === res.r32[i])  b.r32 += PTS.r32
  for (let i=0;i<8;i++)  if (res.r16?.[i]  && preds.r16?.[i]  === res.r16[i])  b.r16 += PTS.r16
  for (let i=0;i<4;i++)  if (res.qf?.[i]   && preds.qf?.[i]   === res.qf[i])   b.qf  += PTS.qf
  for (let i=0;i<2;i++)  if (res.sf?.[i]   && preds.sf?.[i]   === res.sf[i])   b.sf  += PTS.sf
  if (res.champion   && preds.champion   === res.champion)   b.champion += PTS.champion
  if (res.thirdPlace && preds.thirdPlace === res.thirdPlace) b.tp       += PTS.tp
  return b
}
function calcScore(preds, res) {
  const b = calcBreakdown(preds, res)
  return Object.values(b).reduce((s,v) => s+v, 0)
}

// Punti ancora raggiungibili (partite non ancora decise nel res)
function calcPotential(preds, res) {
  if (!preds) return 0
  let potential = 0
  for (const g of Object.keys(GROUPS)) {
    if (!res?.groups?.[g]?.first  && preds.groups?.[g]?.first)  potential += PTS.g1
    if (!res?.groups?.[g]?.second && preds.groups?.[g]?.second) potential += PTS.g2
  }
  const thirdsLeft = 8 - (res?.thirds?.length || 0)
  potential += thirdsLeft * PTS.t3
  for (let i=0;i<16;i++) if (!res?.r32?.[i]  && preds.r32?.[i])  potential += PTS.r32
  for (let i=0;i<8;i++)  if (!res?.r16?.[i]  && preds.r16?.[i])  potential += PTS.r16
  for (let i=0;i<4;i++)  if (!res?.qf?.[i]   && preds.qf?.[i])   potential += PTS.qf
  for (let i=0;i<2;i++)  if (!res?.sf?.[i]   && preds.sf?.[i])   potential += PTS.sf
  if (!res?.champion   && preds.champion)   potential += PTS.champion
  if (!res?.thirdPlace && preds.thirdPlace) potential += PTS.tp
  return potential
}

function calcProgress(preds) {
  if (!preds) return 0
  const g  = Object.values(preds.groups||{}).filter(g=>g.first&&g.second).length
  const t  = (preds.thirds||[]).length
  const r32= (preds.r32||[]).filter(Boolean).length
  const r16= (preds.r16||[]).filter(Boolean).length
  const qf = (preds.qf||[]).filter(Boolean).length
  const sf = (preds.sf||[]).filter(Boolean).length
  const ch = preds.champion ? 1 : 0
  return Math.round(((g+t+r32+r16+qf+sf+ch)/51)*100)
}

function emptyPreds() {
  return {
    groups: Object.fromEntries(Object.keys(GROUPS).map(g=>[g,{first:null,second:null}])),
    thirds: [], r32: Array(16).fill(null), r16: Array(8).fill(null),
    qf: Array(4).fill(null), sf: Array(2).fill(null),
    champion: null, thirdPlace: null,
  }
}
function sanitize(p) {
  const q = JSON.parse(JSON.stringify(p))
  for (let m=0;m<16;m++) {
    const [hs,as]=R32_T[m], h=slotTeam(hs,q.groups,q.thirds), a=slotTeam(as,q.groups,q.thirds)
    if (q.r32[m]&&q.r32[m]!==h&&q.r32[m]!==a) q.r32[m]=null
  }
  for (let i=0;i<8;i++) { const [a,b]=R16F[i]; if (q.r16[i]&&q.r16[i]!==q.r32[a]&&q.r16[i]!==q.r32[b]) q.r16[i]=null }
  for (let i=0;i<4;i++) { const [a,b]=QFF[i];  if (q.qf[i]&&q.qf[i]!==q.r16[a]&&q.qf[i]!==q.r16[b])   q.qf[i]=null }
  for (let i=0;i<2;i++) { const [a,b]=SFF[i];  if (q.sf[i]&&q.sf[i]!==q.qf[a]&&q.sf[i]!==q.qf[b])     q.sf[i]=null }
  if (q.champion&&q.champion!==q.sf[0]&&q.champion!==q.sf[1]) q.champion=null
  const s1l=[q.qf[0],q.qf[1]].find(t=>t&&t!==q.sf[0])||null
  const s2l=[q.qf[2],q.qf[3]].find(t=>t&&t!==q.sf[1])||null
  if (q.thirdPlace&&q.thirdPlace!==s1l&&q.thirdPlace!==s2l) q.thirdPlace=null
  return q
}

// ─── FIREBASE HOOKS ────────────────────────────────────────────────
function useFirebase(path, fallback) {
  const [data, setData] = useState(fallback)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const r = ref(db, path)
    const unsub = onValue(r, snap => {
      const v = snap.val()
      setData(v !== null && v !== undefined ? v : fallback)
      setLoading(false)
    })
    return () => unsub()
  }, [path])
  const write = val => set(ref(db, path), val)
  const del   = ()  => remove(ref(db, path))
  return [data, write, loading, del]
}

// ─── COUNTDOWN ─────────────────────────────────────────────────────
function useCountdown() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const diff = Math.max(0, DEADLINE - now), locked = diff === 0
  return { locked, d:Math.floor(diff/86400000), h:Math.floor((diff%86400000)/3600000), m:Math.floor((diff%3600000)/60000), s:Math.floor((diff%60000)/1000) }
}

// ─── ANIMATED COUNTER ──────────────────────────────────────────────
function AnimatedScore({ value, color }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    if (value === prev.current) return
    const diff = value - prev.current, steps = 20, step = diff / steps
    let cur = prev.current, i = 0
    const t = setInterval(() => {
      i++; cur += step
      setDisplay(Math.round(cur))
      if (i >= steps) { setDisplay(value); prev.current = value; clearInterval(t) }
    }, 30)
    return () => clearInterval(t)
  }, [value])
  return (
    <span style={{ fontFamily:"'Bebas Neue',sans-serif", color, fontSize:28, lineHeight:1, letterSpacing:1 }}>
      {display}
    </span>
  )
}

// ─── STYLES ────────────────────────────────────────────────────────
const FONT = { d: "'Bebas Neue',sans-serif", b: "'Outfit',sans-serif" }
const COLORS = ["#FF6B6B","#4ECDC4","#45B7D1","#96E6A1","#FFEAA7","#DDA0DD","#F0A500","#FF8C94","#88D8B0","#B5EAD7","#C7B2FF","#FFB347"]
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700;800&display=swap');
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0;padding:0}
body{background:#06070F;font-family:'Outfit',sans-serif}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes popIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
@keyframes fall{0%{transform:translateY(-10px) rotate(0deg);opacity:1}100%{transform:translateY(105vh) rotate(540deg);opacity:0}}
@keyframes glow{0%,100%{box-shadow:0 0 14px rgba(240,165,0,0.3)}50%{box-shadow:0 0 30px rgba(240,165,0,0.7)}}
@keyframes pulse{0%,100%{opacity:.7}50%{opacity:1}}
@keyframes slideRight{from{width:0}to{width:100%}}
.fu{animation:fadeUp .35s ease both}
.pi{animation:popIn .2s cubic-bezier(.34,1.56,.64,1) both}
`

function Styles() {
  return <style dangerouslySetInnerHTML={{ __html: CSS }} />
}

// ─── CONFETTI ──────────────────────────────────────────────────────
function Confetti({ active }) {
  const cols = ["#F0A500","#FF6B35","#4ECDC4","#FF6B6B","#96E6A1","#C7B2FF","#FFB347"]
  if (!active) return null
  return (
    <div style={{ position:'fixed',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:9999,overflow:'hidden' }}>
      {Array.from({length:70}, (_,i) => {
        const size=Math.random()*9+4, dur=Math.random()*2.5+2, delay=Math.random()*0.8
        return (
          <div key={i} style={{ position:'absolute',left:`${Math.random()*100}%`,top:-20,
            width:size,height:size,background:cols[i%cols.length],
            borderRadius:Math.random()>.5?'50%':2,
            animation:`fall ${dur}s ${delay}s ease-in forwards` }}/>
        )
      })}
    </div>
  )
}

// ─── COUNTDOWN BANNER ──────────────────────────────────────────────
function CountdownBanner() {
  const { locked,d,h,m,s } = useCountdown()
  const pad = n => String(n).padStart(2,'0')
  const urgent = !locked && d===0 && h<2
  if (locked) return (
    <div style={{ background:'rgba(255,60,60,0.12)',border:'1px solid rgba(255,60,60,0.35)',borderRadius:16,padding:16,textAlign:'center',marginBottom:16 }}>
      <p style={{ fontFamily:FONT.d,color:'#ff6b6b',fontSize:22,letterSpacing:2,marginBottom:4 }}>⛔ PRONOSTICI CHIUSI</p>
      <p style={{ color:'rgba(255,150,150,0.6)',fontSize:12 }}>🇲🇽 Mexico vs Sud Africa 🇿🇦 — In corso!</p>
    </div>
  )
  return (
    <div style={{ background:urgent?'rgba(255,107,53,0.1)':'rgba(240,165,0,0.07)',border:`1px solid ${urgent?'rgba(255,107,53,0.4)':'rgba(240,165,0,0.2)'}`,borderRadius:16,padding:16,marginBottom:16 }}>
      <p style={{ color:'rgba(255,255,255,0.35)',fontSize:10,fontWeight:700,letterSpacing:2,textAlign:'center',marginBottom:4,textTransform:'uppercase' }}>Pronostici si chiudono tra</p>
      <p style={{ color:'rgba(255,255,255,0.3)',fontSize:11,textAlign:'center',marginBottom:12 }}>🇲🇽 Mexico vs Sud Africa 🇿🇦 · 11 Giugno ore 20:00 CEST</p>
      <div style={{ display:'flex',justifyContent:'center',gap:8 }}>
        {[[d,'GG'],[h,'HH'],[m,'MM'],[s,'SS']].map(([val,lbl]) => (
          <div key={lbl} style={{ flex:1,maxWidth:64,textAlign:'center' }}>
            <div style={{ background:'rgba(0,0,0,0.4)',border:`1px solid ${urgent?'rgba(255,107,53,0.35)':'rgba(240,165,0,0.2)'}`,borderRadius:10,padding:'10px 4px',position:'relative',overflow:'hidden' }}>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:'50%',background:'rgba(255,255,255,0.025)',borderRadius:'10px 10px 0 0' }}/>
              <p style={{ fontFamily:FONT.d,color:urgent?'#FF6B35':'#F0A500',fontSize:30,lineHeight:1,letterSpacing:1 }}>{pad(val)}</p>
            </div>
            <p style={{ fontFamily:FONT.d,color:'rgba(255,255,255,0.3)',fontSize:11,letterSpacing:2,marginTop:5 }}>{lbl}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MATCH CARD ────────────────────────────────────────────────────
function MatchCard({ homeTeam,awayTeam,homeLabel,awayLabel,winner,onPick,label,resWinner,locked }) {
  const correct = resWinner ? (winner===resWinner ? true : winner ? false : null) : null
  return (
    <div style={{ background:correct===true?'rgba(34,197,94,0.06)':correct===false?'rgba(255,71,87,0.05)':'rgba(255,255,255,0.025)',border:`1px solid ${correct===true?'rgba(34,197,94,0.3)':correct===false?'rgba(255,71,87,0.2)':'rgba(255,255,255,0.07)'}`,borderRadius:12,padding:'10px 12px' }}>
      {label && <p style={{ color:'rgba(255,255,255,0.22)',fontSize:9,fontWeight:700,letterSpacing:1.5,marginBottom:6,textTransform:'uppercase' }}>{label}</p>}
      <div style={{ display:'flex',gap:5 }}>
        {[{team:homeTeam,lbl:homeLabel},{team:awayTeam,lbl:awayLabel}].map(({team,lbl},idx) => {
          const sel=winner===team&&!!team, other=!!winner&&winner!==team&&!!team
          return (
            <button key={idx} onClick={()=>!locked&&team&&onPick&&onPick(sel?null:team)}
              style={{ flex:1,display:'flex',alignItems:'center',gap:7,background:sel?'rgba(240,165,0,0.18)':'rgba(255,255,255,0.04)',border:`1.5px solid ${sel?'#F0A500':'rgba(255,255,255,0.07)'}`,borderRadius:10,padding:'7px 9px',cursor:locked||!team?'default':'pointer',opacity:other?.38:1,transition:'all .15s',transform:sel?'scale(1.01)':'scale(1)' }}>
              <span style={{ fontSize:20 }}>{team?getFlag(team):'❓'}</span>
              <div style={{ flex:1,minWidth:0 }}>
                <p style={{ color:sel?'#F0A500':'rgba(255,255,255,0.85)',fontSize:12,fontWeight:sel?700:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{team||'TBD'}</p>
                {!team&&lbl&&<p style={{ color:'rgba(255,255,255,0.2)',fontSize:9,fontStyle:'italic' }}>{lbl}</p>}
              </div>
              {sel && <span style={{ color:'#F0A500',fontSize:13 }}>{locked?'🔒':'✓'}</span>}
            </button>
          )
        })}
      </div>
      {resWinner&&winner&&<p style={{ fontSize:10,marginTop:5,textAlign:'right',color:correct?'#22C55E':'#FF4757' }}>{correct?`✓ ${getFlag(resWinner)} ${resWinner} — Corretto!`:`✗ Ha vinto ${getFlag(resWinner)} ${resWinner}`}</p>}
    </div>
  )
}

// ─── GROUP CARD ────────────────────────────────────────────────────
function GroupCard({ letter,group,pred,onChange,resGroup,locked }) {
  const click = n => {
    if (locked) return
    const {first,second}=pred
    if (first===n)       onChange({first:second,second:null})
    else if (second===n) onChange({first,second:null})
    else if (!first)     onChange({first:n,second})
    else if (!second)    onChange({first,second:n})
    else                 onChange({first:n,second:null})
  }
  const rank = n => pred.first===n?1:pred.second===n?2:null
  const both = pred.first&&pred.second
  const rc = {1:'#F0A500',2:'#94A3B8'}
  return (
    <div style={{ background:'rgba(255,255,255,0.03)',border:`1px solid ${both?'rgba(240,165,0,0.2)':'rgba(255,255,255,0.07)'}`,borderRadius:14,padding:14,position:'relative',overflow:'hidden' }}>
      {both && <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${rc[1]},${rc[2]})` }}/>}
      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:10 }}>
        <div style={{ background:'linear-gradient(135deg,#F0A500,#FF6B35)',color:'#1a1a2e',borderRadius:8,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:FONT.d,fontSize:16,flexShrink:0 }}>{letter}</div>
        <p style={{ color:'rgba(255,255,255,0.35)',fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase' }}>Girone {letter}</p>
        <div style={{ marginLeft:'auto',fontSize:14 }}>{both?(locked?'🔒':'✅'):null}</div>
      </div>
      {group.teams.map(team => {
        const r=rank(team.name), dis=!!(both&&!r)||locked
        return (
          <button key={team.name} onClick={()=>click(team.name)} disabled={dis}
            style={{ display:'flex',alignItems:'center',gap:9,background:r?`${rc[r]}15`:'rgba(255,255,255,0.03)',border:`1.5px solid ${r?rc[r]:'rgba(255,255,255,0.07)'}`,borderRadius:10,padding:'9px 12px',cursor:dis?'not-allowed':'pointer',width:'100%',marginBottom:6,opacity:dis&&!r?.28:1,transition:'all .15s',transform:r?'scale(1.01)':'scale(1)' }}>
            <span style={{ fontSize:21 }}>{team.flag}</span>
            <span style={{ color:r?rc[r]:'rgba(255,255,255,0.85)',fontSize:13,fontWeight:r?700:400,flex:1,textAlign:'left' }}>{team.name}</span>
            {resGroup?.first===team.name  && <span style={{ fontSize:9,color:'rgba(255,255,255,0.25)',marginRight:4 }}>1°</span>}
            {resGroup?.second===team.name && <span style={{ fontSize:9,color:'rgba(255,255,255,0.25)',marginRight:4 }}>2°</span>}
            {r && <span style={{ background:rc[r],color:'#111',borderRadius:5,padding:'2px 8px',fontFamily:FONT.d,fontSize:12,letterSpacing:1 }}>{r===1?'1°':'2°'}</span>}
          </button>
        )
      })}
      {!locked&&!pred.first&&<p style={{ color:'rgba(255,255,255,0.2)',fontSize:11,textAlign:'center',marginTop:4 }}>Seleziona 1° e 2° classificato</p>}
      {!locked&&pred.first&&!pred.second&&<p style={{ color:'#F0A500',fontSize:11,textAlign:'center',marginTop:4,fontWeight:600 }}>Ora scegli il 2° classificato →</p>}
    </div>
  )
}

// ─── THIRD PICKER ──────────────────────────────────────────────────
function ThirdPicker({ groups,thirds,onChange,locked }) {
  const qualified = useMemo(() => {
    const q=new Set()
    for (const p of Object.values(groups||{})) { if(p.first)q.add(p.first); if(p.second)q.add(p.second) }
    return q
  }, [groups])
  const done = Object.values(groups||{}).filter(g=>g.first&&g.second).length
  return (
    <div>
      <div style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:12,marginBottom:14 }}>
        <p style={{ color:'rgba(255,255,255,0.55)',fontSize:12,fontWeight:600,marginBottom:5 }}>ℹ️ Le migliori terze classificate</p>
        <p style={{ color:'rgba(255,255,255,0.3)',fontSize:12,lineHeight:1.55 }}>Le 8 migliori terze (su 12 gironi) si qualificano ai Sedicesimi. Scegli le 8 che pensi avanzino. ({thirds.length}/8)</p>
        {done<12&&<p style={{ color:'#F0A500',fontSize:11,marginTop:8,fontWeight:600 }}>⚠️ Completa prima tutti i gironi ({done}/12)</p>}
      </div>
      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
        <div style={{ flex:1,height:5,background:'rgba(255,255,255,0.07)',borderRadius:3,overflow:'hidden' }}>
          <div style={{ width:`${(thirds.length/8)*100}%`,height:'100%',background:'linear-gradient(90deg,#F0A500,#FF6B35)',borderRadius:3,transition:'width .4s cubic-bezier(.34,1.56,.64,1)' }}/>
        </div>
        <span style={{ fontFamily:FONT.d,color:'#F0A500',fontSize:16,minWidth:32,textAlign:'right',letterSpacing:1 }}>{thirds.length}/8</span>
      </div>
      {Object.entries(GROUPS).map(([letter,group]) => {
        const avail = group.teams.filter(t=>!qualified.has(t.name))
        if (!avail.length) return null
        return (
          <div key={letter} style={{ marginBottom:12 }}>
            <p style={{ color:'rgba(255,255,255,0.22)',fontSize:10,fontWeight:700,letterSpacing:1.5,marginBottom:6,textTransform:'uppercase' }}>Girone {letter}</p>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {avail.map(team => {
                const sel=thirds.includes(team.name)
                return (
                  <button key={team.name}
                    onClick={()=>!locked&&(sel?onChange(thirds.filter(t=>t!==team.name)):thirds.length<8&&onChange([...thirds,team.name]))}
                    disabled={(!sel&&thirds.length>=8)||locked}
                    style={{ display:'flex',alignItems:'center',gap:6,background:sel?'rgba(240,165,0,0.15)':'rgba(255,255,255,0.04)',border:`1.5px solid ${sel?'#F0A500':'rgba(255,255,255,0.08)'}`,borderRadius:9,padding:'7px 11px',cursor:(!sel&&thirds.length>=8)||locked?'not-allowed':'pointer',opacity:(!sel&&thirds.length>=8)||(locked&&!sel)?.32:1,transition:'all .15s',transform:sel?'scale(1.02)':'scale(1)' }}>
                    <span style={{ fontSize:18 }}>{team.flag}</span>
                    <span style={{ color:sel?'#F0A500':'rgba(255,255,255,0.75)',fontSize:12,fontWeight:sel?700:400 }}>{team.name}</span>
                    {sel&&<span style={{ color:'#F0A500',fontSize:11 }}>{locked?'🔒':'✓'}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── ROUND SECTION ─────────────────────────────────────────────────
function RoundSection({ title,badge,color,done,children }) {
  const [open,setOpen] = useState(true)
  return (
    <div style={{ border:`1px solid ${color}22`,borderRadius:16,overflow:'hidden',background:`linear-gradient(180deg,${color}06 0%,transparent 60%)` }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ display:'flex',alignItems:'center',gap:10,width:'100%',background:'none',border:'none',padding:'14px 14px',cursor:'pointer',borderBottom:open?`1px solid ${color}18`:'none' }}>
        <span style={{ width:9,height:9,borderRadius:'50%',background:color,flexShrink:0,boxShadow:`0 0 8px ${color}88` }}/>
        <span style={{ fontFamily:FONT.d,color:'#fff',fontSize:17,flex:1,textAlign:'left',letterSpacing:.5 }}>{title}</span>
        <span style={{ color:done?'#22C55E':color,fontSize:11,fontWeight:700 }}>{badge}</span>
        {done&&<span style={{ fontSize:12 }}>✅</span>}
        <span style={{ color:'rgba(255,255,255,0.3)',fontSize:18,transform:open?'rotate(90deg)':'',transition:'transform .2s' }}>›</span>
      </button>
      {open&&<div style={{ padding:'10px 12px 14px',display:'flex',flexDirection:'column',gap:7 }}>{children}</div>}
    </div>
  )
}

// ─── BRACKET ROUNDS ────────────────────────────────────────────────
function BracketRounds({ preds,onChange,res,locked }) {
  const {groups,thirds,r32,r16,qf,sf,champion,thirdPlace}=preds
  const upd=(key,i,t)=>{if(locked)return;const a=[...(preds[key]||[])];a[i]=t;onChange(sanitize({...preds,[key]:a}))}
  const s1l=[qf[0],qf[1]].find(t=>t&&t!==sf[0])||null
  const s2l=[qf[2],qf[3]].find(t=>t&&t!==sf[1])||null
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
      <RoundSection title="Sedicesimi di Finale" badge={`${r32.filter(Boolean).length}/16`} color="#45B7D1" done={r32.filter(Boolean).length===16}>
        <div style={{ background:'rgba(69,183,209,0.08)',borderRadius:8,padding:'6px 10px',marginBottom:2 }}><p style={{ color:'rgba(69,183,209,0.7)',fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase' }}>📌 Tabellone ufficiale FIFA 2026</p></div>
        <p style={{ color:'rgba(255,255,255,0.22)',fontSize:9,fontWeight:700,letterSpacing:1.5,marginBottom:2,textTransform:'uppercase' }}>Percorso 1 — M73–M80</p>
        {[0,1,2,3,4,5,6,7].map(m=>{const[hs,as]=R32_T[m];return(<MatchCard key={m} homeTeam={slotTeam(hs,groups,thirds)} awayTeam={slotTeam(as,groups,thirds)} homeLabel={slotLabel(hs)} awayLabel={slotLabel(as)} winner={r32[m]} onPick={t=>upd('r32',m,t)} resWinner={res?.r32?.[m]} label={R32_LABELS[m]} locked={locked}/>)})}
        <p style={{ color:'rgba(255,255,255,0.22)',fontSize:9,fontWeight:700,letterSpacing:1.5,margin:'8px 0 2px',textTransform:'uppercase' }}>Percorso 2 — M81–M88</p>
        {[8,9,10,11,12,13,14,15].map(m=>{const[hs,as]=R32_T[m];return(<MatchCard key={m} homeTeam={slotTeam(hs,groups,thirds)} awayTeam={slotTeam(as,groups,thirds)} homeLabel={slotLabel(hs)} awayLabel={slotLabel(as)} winner={r32[m]} onPick={t=>upd('r32',m,t)} resWinner={res?.r32?.[m]} label={R32_LABELS[m]} locked={locked}/>)})}
      </RoundSection>
      <RoundSection title="Ottavi di Finale" badge={`${r16.filter(Boolean).length}/8`} color="#4ECDC4" done={r16.filter(Boolean).length===8}>
        {Array.from({length:8},(_,i)=>{const[a,b]=R16F[i];return(<MatchCard key={i} homeTeam={r32[a]} awayTeam={r32[b]} homeLabel={`Vince ${R32_LABELS[a]}`} awayLabel={`Vince ${R32_LABELS[b]}`} winner={r16[i]} onPick={t=>upd('r16',i,t)} resWinner={res?.r16?.[i]} label={`Ottavi M${i+1}`} locked={locked}/>)})}
      </RoundSection>
      <RoundSection title="Quarti di Finale" badge={`${qf.filter(Boolean).length}/4`} color="#96E6A1" done={qf.filter(Boolean).length===4}>
        {Array.from({length:4},(_,i)=>{const[a,b]=QFF[i];return(<MatchCard key={i} homeTeam={r16[a]} awayTeam={r16[b]} homeLabel={`Ott. M${a+1}`} awayLabel={`Ott. M${b+1}`} winner={qf[i]} onPick={t=>upd('qf',i,t)} resWinner={res?.qf?.[i]} label={`Quarti M${i+1}`} locked={locked}/>)})}
      </RoundSection>
      <RoundSection title="Semifinali, Finalina & Finale" badge={`${sf.filter(Boolean).length}/2 · Finale`} color="#F0A500" done={sf.filter(Boolean).length===2&&!!champion}>
        {Array.from({length:2},(_,i)=>{const[a,b]=SFF[i];return(<MatchCard key={i} homeTeam={qf[a]} awayTeam={qf[b]} homeLabel={`Quarti M${a+1}`} awayLabel={`Quarti M${b+1}`} winner={sf[i]} onPick={t=>upd('sf',i,t)} resWinner={res?.sf?.[i]} label={`Semifinale ${i+1}`} locked={locked}/>)})}
        <div style={{ padding:10,background:'rgba(148,163,184,0.07)',border:'1px solid rgba(148,163,184,0.15)',borderRadius:12 }}>
          <p style={{ color:'#94A3B8',fontWeight:700,fontSize:11,marginBottom:7 }}>🥉 Finalina 3°/4° · 18 Luglio</p>
          <MatchCard homeTeam={s1l} awayTeam={s2l} homeLabel="Perdente SF1" awayLabel="Perdente SF2" winner={thirdPlace} onPick={t=>!locked&&onChange(sanitize({...preds,thirdPlace:t}))} resWinner={res?.thirdPlace} locked={locked}/>
        </div>
        <div style={{ padding:12,background:'rgba(240,165,0,0.06)',border:'1px solid rgba(240,165,0,0.25)',borderRadius:14 }}>
          <p style={{ fontFamily:FONT.d,color:'#F0A500',fontSize:18,marginBottom:8,letterSpacing:1 }}>🏆 FINALE · 19 LUGLIO</p>
          <MatchCard homeTeam={sf[0]} awayTeam={sf[1]} homeLabel="Vincitore SF1" awayLabel="Vincitore SF2" winner={champion} onPick={t=>!locked&&onChange({...preds,champion:t})} resWinner={res?.champion} locked={locked}/>
        </div>
      </RoundSection>
    </div>
  )
}

// ─── LIVE LEADERBOARD ──────────────────────────────────────────────
function LiveLeaderboard({ participants, res, onSelect }) {
  const [expanded, setExpanded] = useState(null)
  const hasResults = res && (
    Object.values(res.groups||{}).some(g=>g.first) ||
    (res.r32||[]).some(Boolean)
  )

  const ranked = useMemo(() => {
    return [...participants]
      .map(p => {
        const preds = p.predictions || emptyPreds()
        const score = calcScore(preds, res)
        const breakdown = calcBreakdown(preds, res)
        const potential = calcPotential(preds, res)
        const pct = calcProgress(preds)
        return { ...p, score, breakdown, potential, pct }
      })
      .sort((a,b) => b.score - a.score)
  }, [participants, res])

  const maxScore = ranked[0]?.score || 1

  const catLabels = [
    { key:'g1',      label:'Gironi 1°',    max:MAX_PTS.g1,      color:'#F0A500' },
    { key:'g2',      label:'Gironi 2°',    max:MAX_PTS.g2,      color:'#F0A500' },
    { key:'t3',      label:'Terze qual.',  max:MAX_PTS.t3,      color:'#45B7D1' },
    { key:'r32',     label:'Sedicesimi',   max:MAX_PTS.r32,     color:'#4ECDC4' },
    { key:'r16',     label:'Ottavi',       max:MAX_PTS.r16,     color:'#96E6A1' },
    { key:'qf',      label:'Quarti',       max:MAX_PTS.qf,      color:'#DDA0DD' },
    { key:'sf',      label:'Semifinali',   max:MAX_PTS.sf,      color:'#FF8C94' },
    { key:'champion',label:'Campione',     max:MAX_PTS.champion,color:'#FFEAA7' },
    { key:'tp',      label:'Finalina',     max:MAX_PTS.tp,      color:'#94A3B8' },
  ]

  return (
    <div>
      {/* Live badge */}
      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
        <div style={{ display:'flex',alignItems:'center',gap:6,background:hasResults?'rgba(34,197,94,0.12)':'rgba(255,255,255,0.05)',border:`1px solid ${hasResults?'rgba(34,197,94,0.3)':'rgba(255,255,255,0.1)'}`,borderRadius:20,padding:'5px 12px' }}>
          <div style={{ width:7,height:7,borderRadius:'50%',background:hasResults?'#22C55E':'rgba(255,255,255,0.3)',animation:hasResults?'pulse 1.5s infinite':'none' }}/>
          <span style={{ fontSize:11,fontWeight:700,color:hasResults?'#22C55E':'rgba(255,255,255,0.3)',letterSpacing:.5 }}>{hasResults?'AGGIORNAMENTO IN TEMPO REALE':'IN ATTESA DEI RISULTATI'}</span>
        </div>
        <span style={{ fontSize:11,color:'rgba(255,255,255,0.25)' }}>{participants.length} partecipanti</span>
      </div>

      {ranked.length === 0 && (
        <p style={{ color:'rgba(255,255,255,0.2)',textAlign:'center',padding:'32px 0',fontSize:14 }}>Nessun partecipante ancora.</p>
      )}

      {ranked.map((p, i) => {
        const isExp = expanded === p.id
        const medals = ['🥇','🥈','🥉']
        return (
          <div key={p.id} className="fu" style={{ background:'rgba(255,255,255,0.03)',border:`1px solid ${p.color}2a`,borderRadius:16,marginBottom:8,overflow:'hidden',animationDelay:`${i*0.05}s` }}>
            <div style={{ height:2,background:`linear-gradient(90deg,${p.color},${p.color}00)` }}/>
            <div style={{ padding:'12px 14px' }}>
              {/* Header row */}
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <span style={{ fontFamily:FONT.d,color:i<3?['#F0A500','#C0C0C0','#CD7F32'][i]:'rgba(255,255,255,0.25)',fontSize:i<3?22:14,width:24,textAlign:'center',flexShrink:0 }}>
                  {medals[i]||i+1}
                </span>
                <div style={{ width:42,height:42,borderRadius:'50%',background:`linear-gradient(135deg,${p.color},${p.color}66)`,display:'flex',alignItems:'center',justifyContent:'center',color:'#1a1a2e',fontFamily:FONT.d,fontSize:20,flexShrink:0,boxShadow:p.score>0?`0 0 14px ${p.color}44`:'none',cursor:'pointer' }} onClick={()=>onSelect(p)}>
                  {p.name[0].toUpperCase()}
                </div>
                <div style={{ flex:1,minWidth:0,cursor:'pointer' }} onClick={()=>onSelect(p)}>
                  <p style={{ color:'#fff',fontWeight:700,fontSize:14,marginBottom:3 }}>{p.name}</p>
                  <div style={{ display:'flex',gap:3 }}>
                    {p.pct < 100 && (
                      <span style={{ fontSize:9,color:'#FF4757',background:'rgba(255,71,87,0.12)',borderRadius:4,padding:'1px 5px',border:'1px solid rgba(255,71,87,0.25)' }}>
                        {p.pct}% completato
                      </span>
                    )}
                    {p.pct === 100 && (
                      <span style={{ fontSize:9,color:'#22C55E',background:'rgba(34,197,94,0.1)',borderRadius:4,padding:'1px 5px',border:'1px solid rgba(34,197,94,0.2)' }}>
                        ✓ Completo
                      </span>
                    )}
                    {hasResults && p.potential > 0 && (
                      <span style={{ fontSize:9,color:'#45B7D1',background:'rgba(69,183,209,0.1)',borderRadius:4,padding:'1px 5px',border:'1px solid rgba(69,183,209,0.2)' }}>
                        +{p.potential}pt possibili
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign:'right',flexShrink:0 }}>
                  <AnimatedScore value={p.score} color={p.color}/>
                  <p style={{ color:'rgba(255,255,255,0.22)',fontSize:9,letterSpacing:.5 }}>PUNTI</p>
                </div>
                <button onClick={()=>setExpanded(isExp?null:p.id)}
                  style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,width:30,height:30,color:'rgba(255,255,255,0.5)',fontSize:14,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',transform:isExp?'rotate(180deg)':'',transition:'transform .2s' }}>
                  ▾
                </button>
              </div>

              {/* Score bar vs max */}
              {hasResults && (
                <div style={{ marginTop:8,display:'flex',alignItems:'center',gap:6 }}>
                  <div style={{ flex:1,height:3,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden' }}>
                    <div style={{ width:`${(p.score/maxScore)*100}%`,height:'100%',background:`linear-gradient(90deg,${p.color},${p.color}aa)`,borderRadius:3,transition:'width .5s ease' }}/>
                  </div>
                </div>
              )}
            </div>

            {/* Breakdown panel */}
            {isExp && (
              <div style={{ padding:'0 14px 14px',borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ color:'rgba(255,255,255,0.3)',fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',marginBottom:10,marginTop:10 }}>Dettaglio punti</p>
                {catLabels.map(cat => {
                  const earned = p.breakdown[cat.key] || 0
                  if (earned === 0 && !hasResults) return null
                  return (
                    <div key={cat.key} style={{ display:'flex',alignItems:'center',gap:8,marginBottom:6 }}>
                      <span style={{ color:'rgba(255,255,255,0.4)',fontSize:11,minWidth:90 }}>{cat.label}</span>
                      <div style={{ flex:1,height:4,background:'rgba(255,255,255,0.05)',borderRadius:2,overflow:'hidden' }}>
                        <div style={{ width:`${(earned/cat.max)*100}%`,height:'100%',background:cat.color,borderRadius:2,transition:'width .4s ease' }}/>
                      </div>
                      <span style={{ color:cat.color,fontSize:11,fontWeight:700,minWidth:48,textAlign:'right' }}>{earned}/{cat.max}</span>
                    </div>
                  )
                })}
                {p.predictions?.champion && (
                  <div style={{ marginTop:10,display:'flex',alignItems:'center',gap:6,background:'rgba(240,165,0,0.06)',borderRadius:8,padding:'7px 10px',border:'1px solid rgba(240,165,0,0.15)' }}>
                    <span style={{ fontSize:18 }}>{getFlag(p.predictions.champion)}</span>
                    <span style={{ color:'rgba(255,255,255,0.5)',fontSize:12 }}>Campione scelto: <strong style={{ color:'#F0A500' }}>{p.predictions.champion}</strong></span>
                    {res?.champion && <span style={{ marginLeft:'auto',fontSize:13 }}>{res.champion===p.predictions.champion?'✅':'❌'}</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── PREDICT VIEW ──────────────────────────────────────────────────
function PredictView({ participant,onSave,onBack,res,locked }) {
  const [preds,setPreds] = useState(() => ({ ...emptyPreds(), ...(participant.predictions||{}) }))
  const [tab,setTab] = useState('gironi')
  const [saved,setSaved] = useState(false)
  const [confetti,setConfetti] = useState(false)
  const gDone = Object.values(preds.groups).filter(g=>g.first&&g.second).length
  const tDone = preds.thirds.length
  const r32D  = preds.r32.filter(Boolean).length
  const score = calcScore(preds, res)
  const pct   = calcProgress(preds)
  const allDone = pct === 100
  const setGroup = (g,val) => { if(!locked) setPreds(sanitize({...preds,groups:{...preds.groups,[g]:val}})) }
  const setThirds = t => { if(!locked) setPreds(sanitize({...preds,thirds:t})) }
  const save = () => {
    if (locked) return
    onSave(preds); setSaved(true)
    if (allDone) { setConfetti(true); setTimeout(()=>setConfetti(false),3500) }
    setTimeout(()=>setSaved(false),2500)
  }
  const tabs = [
    {key:'gironi', label:'⚽', sub:'Gironi',   badge:`${gDone}/12`},
    {key:'terze',  label:'🥉', sub:'Terze',    badge:`${tDone}/8`},
    {key:'bracket',label:'🏆', sub:'Bracket',  badge:`${r32D}/16`},
  ]
  return (
    <div style={{ maxWidth:500,margin:'0 auto',padding:'14px 13px 130px' }}>
      <Confetti active={confetti}/>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:10,width:38,height:38,color:'#fff',fontSize:18,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center' }}>‹</button>
        <div style={{ flex:1,minWidth:0 }}>
          <h2 style={{ fontFamily:FONT.d,color:'#fff',fontSize:22,letterSpacing:.5,marginBottom:2 }}>{participant.name}</h2>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            {res && <span style={{ color:'#F0A500',fontSize:12,fontWeight:700 }}>⭐ {score} pt</span>}
            <span style={{ color:'rgba(255,255,255,0.3)',fontSize:11 }}>{pct}% completato</span>
          </div>
        </div>
        {!locked
          ? <button onClick={save} style={{ background:saved?'rgba(34,197,94,0.18)':'linear-gradient(135deg,#F0A500,#FF6B35)',border:saved?'1px solid #22C55E':'none',borderRadius:10,padding:'9px 16px',color:saved?'#22C55E':'#1a1a2e',fontWeight:800,fontSize:12,cursor:'pointer',transition:'all .2s',flexShrink:0 }}>{saved?'✓ Salvato':'💾 Salva'}</button>
          : <span style={{ fontSize:22 }}>🔒</span>}
      </div>
      <div style={{ height:3,background:'rgba(255,255,255,0.06)',borderRadius:3,marginBottom:16,overflow:'hidden' }}>
        <div style={{ height:'100%',width:`${pct}%`,background:`linear-gradient(90deg,${participant.color||'#F0A500'},#FF6B35)`,borderRadius:3,transition:'width .5s ease' }}/>
      </div>
      {locked && (
        <div style={{ background:'rgba(255,60,60,0.08)',border:'1px solid rgba(255,60,60,0.25)',borderRadius:12,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10 }}>
          <span style={{ fontSize:20 }}>🔒</span>
          <div><p style={{ color:'#ff6b6b',fontWeight:700,fontSize:13 }}>Pronostici bloccati</p><p style={{ color:'rgba(255,150,150,0.5)',fontSize:11 }}>I Mondiali sono iniziati</p></div>
        </div>
      )}
      <div style={{ display:'flex',gap:3,background:'rgba(255,255,255,0.04)',borderRadius:12,padding:4,marginBottom:14 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ flex:1,background:tab===t.key?`${participant.color||'#F0A500'}18`:'transparent',border:tab===t.key?`1px solid ${participant.color||'#F0A500'}55`:'1px solid transparent',borderRadius:9,padding:'8px 3px',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,transition:'all .15s' }}>
            <span style={{ fontSize:16 }}>{t.label}</span>
            <span style={{ color:tab===t.key?participant.color||'#F0A500':'rgba(255,255,255,0.4)',fontSize:10,fontWeight:700 }}>{t.sub}</span>
            <span style={{ color:tab===t.key?participant.color||'#F0A500':'rgba(255,255,255,0.25)',fontSize:9 }}>{t.badge}</span>
          </button>
        ))}
      </div>
      {tab==='gironi'  && <div style={{ display:'flex',flexDirection:'column',gap:9 }}>{Object.entries(GROUPS).map(([l,g])=>(<GroupCard key={l} letter={l} group={g} pred={preds.groups[l]||{first:null,second:null}} onChange={v=>setGroup(l,v)} resGroup={res?.groups?.[l]} locked={locked}/>))}</div>}
      {tab==='terze'   && <ThirdPicker groups={preds.groups} thirds={preds.thirds} onChange={setThirds} locked={locked}/>}
      {tab==='bracket' && (gDone<12||tDone<8
        ? <div style={{ textAlign:'center',padding:'40px 16px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16 }}>
            <p style={{ fontSize:36,marginBottom:10 }}>🔒</p>
            <p style={{ fontFamily:FONT.d,color:'rgba(255,255,255,0.55)',fontSize:20 }}>Completa prima Gironi e Terze</p>
            <p style={{ color:'rgba(255,255,255,0.3)',fontSize:12,marginTop:4 }}>Gironi {gDone}/12 · Terze {tDone}/8</p>
          </div>
        : <BracketRounds preds={preds} onChange={setPreds} res={res} locked={locked}/>
      )}
      {!locked && allDone && (
        <div onClick={save} style={{ position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'linear-gradient(135deg,#F0A500,#FF6B35)',borderRadius:16,padding:'14px 32px',boxShadow:'0 8px 36px rgba(240,165,0,0.45)',cursor:'pointer',zIndex:100,animation:'glow 2s infinite' }}>
          <span style={{ fontFamily:FONT.d,color:'#1a1a2e',fontSize:18,letterSpacing:1 }}>{saved?'✓ PRONOSTICI SALVATI!':'🏆 SALVA TUTTI I PRONOSTICI'}</span>
        </div>
      )}
    </div>
  )
}

// ─── ADMIN VIEW ────────────────────────────────────────────────────
function AdminView({ res,onSave,onBack }) {
  const empty = { groups:Object.fromEntries(Object.keys(GROUPS).map(g=>[g,{first:null,second:null}])),thirds:[],r32:Array(16).fill(null),r16:Array(8).fill(null),qf:Array(4).fill(null),sf:Array(2).fill(null),champion:null,thirdPlace:null }
  const [data,setData] = useState(() => res||empty)
  const [saved,setSaved] = useState(false)
  const setGroup = (g,val) => setData(d=>({...d,groups:{...d.groups,[g]:val}}))
  const setBracket = (key,i,team) => setData(d=>{const a=[...(d[key]||[])];a[i]=team;return{...d,[key]:a}})
  const s1l = [data.qf[0],data.qf[1]].find(t=>t&&t!==data.sf[0])||null
  const s2l = [data.qf[2],data.qf[3]].find(t=>t&&t!==data.sf[1])||null
  const save = () => { onSave(data); setSaved(true); setTimeout(()=>setSaved(false),2000) }
  return (
    <div style={{ maxWidth:500,margin:'0 auto',padding:'14px 13px 60px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:18 }}>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:10,width:38,height:38,color:'#fff',fontSize:18,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center' }}>‹</button>
        <div style={{ flex:1 }}>
          <h2 style={{ fontFamily:FONT.d,color:'#fff',fontSize:22,letterSpacing:.5 }}>⚙️ Risultati Reali</h2>
          <p style={{ color:'rgba(255,255,255,0.3)',fontSize:11 }}>Aggiorna man mano che avanzano i Mondiali</p>
        </div>
        <button onClick={save} style={{ background:saved?'rgba(34,197,94,0.18)':'linear-gradient(135deg,#F0A500,#FF6B35)',border:saved?'1px solid #22C55E':'none',borderRadius:10,padding:'9px 14px',color:saved?'#22C55E':'#1a1a2e',fontWeight:800,fontSize:12,cursor:'pointer',flexShrink:0 }}>{saved?'✓ Salvato':'💾 Salva'}</button>
      </div>
      <p style={{ color:'rgba(255,255,255,0.35)',fontSize:10,fontWeight:700,letterSpacing:2,marginBottom:10,textTransform:'uppercase' }}>Gironi</p>
      <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:20 }}>{Object.entries(GROUPS).map(([l,g])=>(<GroupCard key={l} letter={l} group={g} pred={data.groups[l]||{first:null,second:null}} onChange={v=>setGroup(l,v)}/>))}</div>
      <p style={{ color:'rgba(255,255,255,0.35)',fontSize:10,fontWeight:700,letterSpacing:2,marginBottom:10,textTransform:'uppercase' }}>Terze Qualificate</p>
      <div style={{ marginBottom:20 }}><ThirdPicker groups={data.groups} thirds={data.thirds||[]} onChange={t=>setData(d=>({...d,thirds:t}))}/></div>
      <p style={{ color:'rgba(255,255,255,0.35)',fontSize:10,fontWeight:700,letterSpacing:2,marginBottom:10,textTransform:'uppercase' }}>Fase Eliminazione</p>
      <div style={{ display:'flex',flexDirection:'column',gap:7 }}>
        {Array.from({length:16},(_,m)=>{const[hs,as]=R32_T[m];return(<MatchCard key={m} homeTeam={slotTeam(hs,data.groups,data.thirds)} awayTeam={slotTeam(as,data.groups,data.thirds)} homeLabel={slotLabel(hs)} awayLabel={slotLabel(as)} winner={data.r32[m]} onPick={t=>setBracket('r32',m,t)} label={`Sedicesimi ${R32_LABELS[m]}`}/>)})}
        {Array.from({length:8},(_,i)=>{const[a,b]=R16F[i];return(<MatchCard key={i} homeTeam={data.r32[a]} awayTeam={data.r32[b]} winner={data.r16[i]} onPick={t=>setBracket('r16',i,t)} label={`Ottavi M${i+1}`}/>)})}
        {Array.from({length:4},(_,i)=>{const[a,b]=QFF[i];return(<MatchCard key={i} homeTeam={data.r16[a]} awayTeam={data.r16[b]} winner={data.qf[i]} onPick={t=>setBracket('qf',i,t)} label={`Quarti M${i+1}`}/>)})}
        {Array.from({length:2},(_,i)=>{const[a,b]=SFF[i];return(<MatchCard key={i} homeTeam={data.qf[a]} awayTeam={data.qf[b]} winner={data.sf[i]} onPick={t=>setBracket('sf',i,t)} label={`Semifinale ${i+1}`}/>)})}
        <div style={{ padding:10,background:'rgba(148,163,184,0.07)',border:'1px solid rgba(148,163,184,0.15)',borderRadius:12 }}>
          <p style={{ color:'#94A3B8',fontWeight:700,fontSize:11,marginBottom:7 }}>🥉 Finalina 3°/4°</p>
          <MatchCard homeTeam={s1l} awayTeam={s2l} winner={data.thirdPlace} onPick={t=>setData(d=>({...d,thirdPlace:t}))}/>
        </div>
        <div style={{ padding:12,background:'rgba(240,165,0,0.06)',border:'1px solid rgba(240,165,0,0.22)',borderRadius:14 }}>
          <p style={{ fontFamily:FONT.d,color:'#F0A500',fontSize:18,marginBottom:8,letterSpacing:1 }}>🏆 CAMPIONE</p>
          <MatchCard homeTeam={data.sf[0]} awayTeam={data.sf[1]} winner={data.champion} onPick={t=>setData(d=>({...d,champion:t}))}/>
        </div>
      </div>
    </div>
  )
}

// ─── HOME VIEW ─────────────────────────────────────────────────────
function HomeView({ participants,onAdd,onSelect,onDelete,onLeaderboard,onAdmin,res,locked }) {
  const [name,setName] = useState('')
  const [confirmDelete,setConfirmDelete] = useState(null)
  return (
    <div style={{ maxWidth:480,margin:'0 auto',padding:'22px 14px 40px' }}>
      <div style={{ textAlign:'center',marginBottom:22 }}>
        <div style={{ fontSize:54,marginBottom:8,filter:'drop-shadow(0 0 20px rgba(240,165,0,0.4))' }}>⚽</div>
        <h1 style={{ fontFamily:FONT.d,background:'linear-gradient(135deg,#F0A500 20%,#FF6B35 80%)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',fontSize:38,letterSpacing:2,marginBottom:4 }}>MONDIALI 2026</h1>
        <p style={{ color:'rgba(255,255,255,0.28)',fontSize:11,letterSpacing:3,textTransform:'uppercase' }}>USA · Canada · Mexico</p>
      </div>

      <CountdownBanner/>

      {/* Points legend */}
      <div style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'12px 14px',marginBottom:14 }}>
        <p style={{ color:'rgba(255,255,255,0.35)',fontSize:10,fontWeight:700,letterSpacing:2,marginBottom:10,textTransform:'uppercase' }}>🎯 Sistema Punti</p>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px 0' }}>
          {[['1° girone','3'],['2° girone','2'],['Terza','2'],['Sedicesimi','5'],['Ottavi','8'],['Quarti','11'],['Semifinale','14'],['Campione','20']].map(([l,v])=>(
            <div key={l} style={{ textAlign:'center' }}>
              <div style={{ fontFamily:FONT.d,color:'#F0A500',fontSize:20,lineHeight:1,letterSpacing:.5 }}>{v}</div>
              <div style={{ color:'rgba(255,255,255,0.28)',fontSize:9,marginTop:2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Add participant */}
      {!locked && (
        <div style={{ background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:'12px 14px',marginBottom:14 }}>
          <p style={{ color:'rgba(255,255,255,0.35)',fontSize:10,fontWeight:700,letterSpacing:2,marginBottom:8,textTransform:'uppercase' }}>➕ Aggiungi partecipante</p>
          <div style={{ display:'flex',gap:8 }}>
            <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&name.trim()){onAdd(name.trim());setName('')}}} placeholder="Il tuo nome..."
              style={{ flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'10px 12px',color:'#fff',fontSize:14,outline:'none',fontFamily:FONT.b }}/>
            <button onClick={()=>{if(name.trim()){onAdd(name.trim());setName('')}}} style={{ background:'linear-gradient(135deg,#F0A500,#FF6B35)',border:'none',borderRadius:10,padding:'0 18px',color:'#1a1a2e',fontWeight:900,fontSize:18,cursor:'pointer',flexShrink:0 }}>✓</button>
          </div>
        </div>
      )}

      {/* Participant list */}
      <div style={{ display:'flex',flexDirection:'column',gap:8,marginBottom:14 }}>
        {participants.length===0 && <p style={{ color:'rgba(255,255,255,0.2)',textAlign:'center',padding:'28px 0',fontSize:14 }}>Nessun partecipante. Aggiungiti!</p>}
        {participants.map((p,i) => {
          const pct = calcProgress(p.predictions)
          const isConf = confirmDelete===p.id
          return (
            <div key={p.id} className="fu" style={{ background:'rgba(255,255,255,0.03)',border:`1px solid ${p.color}2a`,borderRadius:16,overflow:'hidden',animationDelay:`${i*0.05}s` }}>
              <div style={{ height:2,background:`linear-gradient(90deg,${p.color},${p.color}00)` }}/>
              <div style={{ padding:'12px 14px',display:'flex',alignItems:'center',gap:12 }}>
                <div onClick={()=>!isConf&&onSelect(p)} style={{ display:'flex',alignItems:'center',gap:12,flex:1,cursor:'pointer',minWidth:0 }}>
                  <div style={{ width:44,height:44,borderRadius:'50%',background:`linear-gradient(135deg,${p.color},${p.color}66)`,display:'flex',alignItems:'center',justifyContent:'center',color:'#1a1a2e',fontFamily:FONT.d,fontSize:20,flexShrink:0 }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ color:'#fff',fontWeight:700,fontSize:14,marginBottom:5 }}>{p.name}</p>
                    <div style={{ display:'flex',alignItems:'center',gap:7 }}>
                      <div style={{ flex:1,height:3,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${p.color},${p.color}aa)`,borderRadius:3 }}/>
                      </div>
                      <span style={{ color:'rgba(255,255,255,0.3)',fontSize:10,minWidth:28 }}>{pct}%</span>
                    </div>
                  </div>
                </div>
                <span style={{ color:'rgba(255,255,255,0.3)',fontSize:12 }}>›</span>
                {isConf
                  ? <div style={{ display:'flex',gap:5,flexShrink:0 }}>
                      <button onClick={()=>{onDelete(p.id);setConfirmDelete(null)}} style={{ background:'rgba(255,71,87,0.2)',border:'1px solid rgba(255,71,87,0.4)',borderRadius:8,padding:'6px 10px',color:'#FF4757',fontWeight:700,fontSize:11,cursor:'pointer' }}>Sì</button>
                      <button onClick={()=>setConfirmDelete(null)} style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'6px 10px',color:'rgba(255,255,255,0.5)',fontSize:11,cursor:'pointer' }}>No</button>
                    </div>
                  : <button onClick={()=>setConfirmDelete(p.id)} style={{ background:'transparent',border:'none',color:'rgba(255,255,255,0.15)',fontSize:16,cursor:'pointer',padding:4,flexShrink:0 }}>🗑️</button>}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display:'flex',gap:8 }}>
        <button onClick={onLeaderboard} style={{ flex:2,background:'linear-gradient(135deg,rgba(240,165,0,0.15),rgba(255,107,53,0.1))',border:'1px solid rgba(240,165,0,0.3)',borderRadius:12,padding:'13px',color:'#F0A500',fontWeight:700,fontSize:13,cursor:'pointer' }}>
          🏅 Classifica Live
        </button>
        <button onClick={onAdmin} style={{ flex:1,background:'rgba(255,100,100,0.05)',border:'1px solid rgba(255,100,100,0.18)',borderRadius:12,padding:'13px',color:'rgba(255,150,150,0.75)',fontWeight:700,fontSize:13,cursor:'pointer' }}>⚙️</button>
      </div>
    </div>
  )
}

// ─── LEADERBOARD VIEW ──────────────────────────────────────────────
function LeaderboardView({ participants,res,onBack,onSelect }) {
  return (
    <div style={{ maxWidth:500,margin:'0 auto',padding:'14px 13px 40px' }}>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:20 }}>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:10,width:38,height:38,color:'#fff',fontSize:18,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center' }}>‹</button>
        <div>
          <h2 style={{ fontFamily:FONT.d,color:'#fff',fontSize:22,letterSpacing:.5 }}>🏅 Classifica Live</h2>
          <p style={{ color:'rgba(255,255,255,0.3)',fontSize:11 }}>Si aggiorna in automatico ad ogni risultato</p>
        </div>
      </div>
      <LiveLeaderboard participants={participants} res={res} onSelect={onSelect}/>
    </div>
  )
}

// ─── APP ───────────────────────────────────────────────────────────
export default function App() {
  const [participantsMap, setParticipantsMap, pLoading] = useFirebase('wc2026/participants', {})
  const [predictionsMap,  setPredictionsMap,  predLoading] = useFirebase('wc2026/predictions', {})
  const [res, setRes, resLoading] = useFirebase('wc2026/results', null)
  const [view,   setView]   = useState('home')
  const [active, setActive] = useState(null)
  const { locked } = useCountdown()

  // Merge participants with their predictions
  const participants = useMemo(() => {
    return Object.entries(participantsMap || {}).map(([id, p]) => ({
      ...p, id,
      predictions: predictionsMap?.[id] || emptyPreds(),
    }))
  }, [participantsMap, predictionsMap])

  const addParticipant = name => {
    if (locked) return
    const id    = Date.now().toString()
    const color = COLORS[Object.keys(participantsMap||{}).length % COLORS.length]
    setParticipantsMap({ ...(participantsMap||{}), [id]: { name, color } })
  }

  const deleteParticipant = id => {
    const updated = { ...(participantsMap||{}) }
    delete updated[id]
    setParticipantsMap(updated)
    const updatedPreds = { ...(predictionsMap||{}) }
    delete updatedPreds[id]
    setPredictionsMap(updatedPreds)
  }

  const selectParticipant = p => { setActive(p); setView('predict') }

  const savePreds = preds => {
    if (locked) return
    setPredictionsMap({ ...(predictionsMap||{}), [active.id]: preds })
    setActive(prev => ({ ...prev, predictions: preds }))
  }

  if (pLoading || predLoading || resLoading) return (
    <div style={{ background:'#06070F',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:40,marginBottom:12 }}>⚽</div>
        <p style={{ fontFamily:FONT.b,color:'rgba(255,255,255,0.3)',fontSize:14 }}>Connessione a Firebase...</p>
      </div>
    </div>
  )

  return (
    <div style={{ background:'#06070F',backgroundImage:'radial-gradient(ellipse at 10% 0%,rgba(240,165,0,0.09) 0%,transparent 55%),radial-gradient(ellipse at 90% 100%,rgba(255,107,53,0.07) 0%,transparent 55%)',minHeight:'100vh' }}>
      <Styles/>
      {view==='home'        && <HomeView        participants={participants} onAdd={addParticipant} onSelect={selectParticipant} onDelete={deleteParticipant} onLeaderboard={()=>setView('leaderboard')} onAdmin={()=>setView('admin')} res={res} locked={locked}/>}
      {view==='predict'     && active && <PredictView participant={active} onSave={savePreds} onBack={()=>setView('home')} res={res} locked={locked}/>}
      {view==='leaderboard' && <LeaderboardView participants={participants} res={res} onBack={()=>setView('home')} onSelect={p=>{selectParticipant(p)}}/>}
      {view==='admin'       && <AdminView       res={res} onSave={r=>{setRes(r);setView('home')}} onBack={()=>setView('home')}/>}
    </div>
  )
}
