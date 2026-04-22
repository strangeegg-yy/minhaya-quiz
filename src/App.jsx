import { useState, useEffect } from "react";

const KEY = "minhaya_v3";
function loadData() {
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveData(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {}
}

const CATS = ["自然科学","生活・雑学","地理・歴史","スポーツ・趣味","芸術・エンタメ","社会","文学・ことば"];
const CM = {
  "自然科学":     { c:"#0891b2", bg:"#ecfeff", e:"🔬" },
  "生活・雑学":   { c:"#7c3aed", bg:"#f5f3ff", e:"🏠" },
  "地理・歴史":   { c:"#d97706", bg:"#fffbeb", e:"🗺️" },
  "スポーツ・趣味":{ c:"#2563eb", bg:"#eff6ff", e:"⚽" },
  "芸術・エンタメ":{ c:"#db2777", bg:"#fdf2f8", e:"🎨" },
  "社会":         { c:"#059669", bg:"#ecfdf5", e:"🌍" },
  "文学・ことば": { c:"#dc2626", bg:"#fef2f2", e:"📖" },
  "その他":       { c:"#64748b", bg:"#f8fafc", e:"📚" },
};
const cm = (cat) => CM[cat] || CM["その他"];

const Badge = ({ cat }) => (
  <span style={{ background:cm(cat).bg, color:cm(cat).c, border:`1px solid ${cm(cat).c}33`,
    padding:"2px 8px", borderRadius:999, fontSize:11, fontWeight:700,
    display:"inline-flex", alignItems:"center", gap:3, whiteSpace:"nowrap" }}>
    {cm(cat).e} {cat}
  </span>
);

const blank = { cat:"その他", q:"", a:"", reading:"", rate:"" };

export default function App() {
  const [quizzes, setQuizzes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("list");
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [filterCat, setFilterCat] = useState("すべて");
  const [search, setSearch] = useState("");
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [showA, setShowA] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const [clipMsg, setClipMsg] = useState("");
  const [charLimit, setCharLimit] = useState(20);
  const [hayaoshiMode, setHayaoshiMode] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [checkOnly, setCheckOnly] = useState(false);

  useEffect(() => { setQuizzes(loadData()); setLoaded(true); }, []);
  useEffect(() => { if (loaded) saveData(quizzes); }, [quizzes, loaded]);

  const upd = (id, changes) => setQuizzes(p => p.map(q => q.id === id ? { ...q, ...changes } : q));
  const del = (id) => setQuizzes(p => p.filter(q => q.id !== id));

  const importFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      let added = 0;
      for (const p of items) {
        if (p.question && p.answer) {
          setQuizzes(prev => {
            if (prev.some(q => q.answer === p.answer)) return prev;
            return [{
              id: Date.now() + Math.random(),
              category: p.category || "その他",
              question: p.question,
              answer: p.answer,
              reading: p.reading || "",
              correctRate: p.correctRate != null ? Number(p.correctRate) : null,
              createdAt: new Date().toISOString(),
              reviewCount: 0,
              correctCount: 0,
            }, ...prev];
          });
          added++;
        }
      }
      setClipMsg(added > 0 ? `✅ ${added}問を追加しました！` : "⚠️ 有効なデータが見つかりません");
    } catch (e) {
      setClipMsg(`❌ 失敗: ${e.message}`);
    }
    setTimeout(() => setClipMsg(""), 3000);
  };

  const exportData = async () => {
    try {
      const json = JSON.stringify(quizzes);
      await navigator.clipboard.writeText(json);
      setSaveMsg("✅ クリップボードにコピーしました！メモアプリに貼り付けて保存してください");
    } catch (e) {
      setSaveMsg(`❌ ${e.message}`);
    }
    setTimeout(() => setSaveMsg(""), 5000);
  };

  const startEdit = (quiz) => {
    setForm({ cat: quiz.category, q: quiz.question, a: quiz.answer,
      reading: quiz.reading || "", rate: quiz.correctRate != null ? String(quiz.correctRate) : "" });
    setEditId(quiz.id); setTab("add");
  };

  const submit = () => {
    if (!form.q.trim() || !form.a.trim()) return;
    const base = { category:form.cat, question:form.q, answer:form.a,
      reading:form.reading, correctRate:form.rate ? Number(form.rate) : null };
    if (editId) { upd(editId, base); setEditId(null); }
    else setQuizzes(p => [{ id:Date.now()+Math.random(), ...base,
      createdAt:new Date().toISOString(), reviewCount:0, correctCount:0 }, ...p]);
    setForm(blank); setTab("list");
  };

  const startReview = (list) => {
    setQueue([...list].sort(() => Math.random() - 0.5));
    setIdx(0); setShowA(false); setShowFull(false); setResults([]); setDone(false); setTab("review");
  };

  const startHayaoshi = (list, chars) => {
    setCharLimit(chars);
    setHayaoshiMode(true);
    setQueue([...list].sort(() => Math.random() - 0.5));
    setIdx(0); setShowA(false); setShowFull(false); setResults([]); setDone(false); setTab("review");
  };

  const answer = (ok) => {
    const qBase = queue[idx];
    const q = quizzes.find(x => x.id === qBase.id) || qBase;
    upd(q.id, { reviewCount:(q.reviewCount||0)+1, correctCount:(q.correctCount||0)+(ok?1:0) });
    const nr = [...results, ok?"ok":"ng"];
    setResults(nr);
    if (idx+1 >= queue.length) setDone(true);
    else { setIdx(idx+1); setShowA(false); setShowFull(false); }
  };

  const filtered = quizzes.filter(q => {
    if (checkOnly && !q.checked) return false;
    if (filterCat !== "すべて" && q.category !== filterCat) return false;
    if (search && !q.question.includes(search) && !q.answer.includes(search)) return false;
    return true;
  });

  const card = { background:"white", borderRadius:14, padding:14, marginBottom:10,
    boxShadow:"0 1px 4px rgba(0,0,0,0.06)", border:"1px solid #f1f5f9" };
  const tabBtnS = (a) => ({
    flex:1, padding:"8px 0", fontSize:10, fontWeight:a?700:400,
    color:a?"#38bdf8":"#475569", background:"none", border:"none", cursor:"pointer",
    display:"flex", flexDirection:"column", alignItems:"center", gap:2,
    borderBottom:a?"2px solid #38bdf8":"2px solid transparent",
  });

  const renderList = () => (
    <>
      <div style={{ background:"linear-gradient(135deg,#0f172a,#1e3a5f)", borderRadius:14,
        padding:16, marginBottom:12, textAlign:"center" }}>
        <div style={{ fontSize:13, color:"#93c5fd", marginBottom:8 }}>
          ショートカットで解析後 →
        </div>
        <button onClick={importFromClipboard} style={{
          width:"100%", padding:12, borderRadius:10, fontSize:15, fontWeight:800,
          background:"#38bdf8", color:"white", border:"none", cursor:"pointer",
          boxShadow:"0 2px 8px rgba(56,189,248,0.4)" }}>
          📋 クリップボードから取り込む
        </button>
        {clipMsg && (
          <div style={{ marginTop:8, fontSize:13, fontWeight:700,
            color: clipMsg.startsWith("✅") ? "#86efac" : "#fca5a5" }}>
            {clipMsg}
          </div>
        )}
      </div>

      {quizzes.length > 0 && (
        <div style={{ background:"#0f172a", borderRadius:10, padding:"10px 14px", marginBottom:10 }}>
          <button onClick={exportData} style={{
            width:"100%", padding:9, borderRadius:8, fontSize:13, fontWeight:700,
            background:"#334155", color:"#94a3b8", border:"none", cursor:"pointer" }}>
            💾 データをバックアップ（{quizzes.length}問）
          </button>
          {saveMsg && <div style={{ marginTop:6, fontSize:12, color:"#86efac" }}>{saveMsg}</div>}
        </div>
      )}

      <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:10, paddingBottom:2 }}>
        {["すべて",...CATS].map(c => (
          <button key={c} onClick={()=>setFilterCat(c)} style={{
            flexShrink:0, padding:"5px 12px", borderRadius:999, fontSize:11, cursor:"pointer",
            fontWeight:filterCat===c?700:400,
            background:filterCat===c?"#0f172a":"white",
            color:filterCat===c?"white":"#64748b",
            border:`1px solid ${filterCat===c?"#0f172a":"#e2e8f0"}`,
          }}>{c==="すべて"?`すべて(${quizzes.length})`:cm(c).e+c}</button>
        ))}
      </div>

      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 検索"
        style={{ width:"100%", padding:"9px 12px", borderRadius:10, border:"1.5px solid #e2e8f0",
          fontSize:13, marginBottom:8, boxSizing:"border-box", outline:"none" }} />
      <button onClick={()=>setCheckOnly(f=>!f)} style={{
        width:"100%", padding:"9px 12px", borderRadius:10, fontSize:13, fontWeight:700,
        marginBottom:10, cursor:"pointer", border:"2px solid #f59e0b",
        background:checkOnly?"#f59e0b":"white",
        color:checkOnly?"#0f172a":"#d97706",
      }}>
        ⭐ 要チェックのみ表示 {checkOnly ? "（ON）" : "（OFF）"} — {quizzes.filter(q=>q.checked).length}問
      </button>

      {filtered.length > 0 && (<>
        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
          <button onClick={()=>{ setHayaoshiMode(false); startReview(filtered); }} style={{
            flex:1, padding:11, borderRadius:10, fontSize:13, fontWeight:700,
            background:"#0ea5e9", color:"white", border:"none", cursor:"pointer" }}>
            🎴 ランダム
          </button>
          <button onClick={()=>{
            setHayaoshiMode(false);
            const sorted = [...filtered].sort((a,b) => {
              const ra = a.reviewCount>0 ? a.correctCount/a.reviewCount : -1;
              const rb = b.reviewCount>0 ? b.correctCount/b.reviewCount : -1;
              return ra - rb;
            });
            setQueue(sorted); setIdx(0); setShowA(false); setShowFull(false); setResults([]); setDone(false); setTab("review");
          }} style={{
            flex:1, padding:11, borderRadius:10, fontSize:13, fontWeight:700,
            background:"#7c3aed", color:"white", border:"none", cursor:"pointer" }}>
            📉 正解率順
          </button>
          <button onClick={()=>{
            setHayaoshiMode(false);
            const zero = filtered.filter(q => q.correctCount === 0);
            if (!zero.length) return alert("正解数0の問題はありません");
            setQueue([...zero].sort(()=>Math.random()-0.5));
            setIdx(0); setShowA(false); setShowFull(false); setResults([]); setDone(false); setTab("review");
          }} style={{
            flex:1, padding:11, borderRadius:10, fontSize:13, fontWeight:700,
            background:"#dc2626", color:"white", border:"none", cursor:"pointer" }}>
            🔴 正解0のみ<br/>({filtered.filter(q=>q.correctCount===0).length}問)
          </button>
        </div>
        <div style={{ background:"#1e293b", borderRadius:12, padding:"12px 14px", marginBottom:10 }}>
          <div style={{ fontSize:12, color:"#94a3b8", marginBottom:8, fontWeight:600 }}>⚡ 早押し練習モード（冒頭N文字のみ表示）</div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            {[5,10,15,20,25,30].map(n => (
              <button key={n} onClick={()=>setCharLimit(n)} style={{
                padding:"4px 10px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer",
                background:charLimit===n?"#f59e0b":"#334155",
                color:charLimit===n?"#0f172a":"#94a3b8", border:"none",
              }}>{n}字</button>
            ))}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>startHayaoshi(filtered, charLimit)} style={{
              flex:1, padding:10, borderRadius:10, fontSize:13, fontWeight:700,
              background:"#f59e0b", color:"#0f172a", border:"none", cursor:"pointer" }}>
              ⚡ ランダム
            </button>
            <button onClick={()=>{
              const sorted = [...filtered].sort((a,b)=>{
                const aReviewed = a.reviewCount > 0;
                const bReviewed = b.reviewCount > 0;
                if (aReviewed && !bReviewed) return -1;
                if (!aReviewed && bReviewed) return 1;
                if (!aReviewed && !bReviewed) return 0;
                return (a.correctCount/a.reviewCount)-(b.correctCount/b.reviewCount);
              });
              setCharLimit(charLimit); setHayaoshiMode(true);
              setQueue(sorted); setIdx(0); setShowA(false); setShowFull(false); setResults([]); setDone(false); setTab("review");
            }} style={{
              flex:1, padding:10, borderRadius:10, fontSize:13, fontWeight:700,
              background:"#92400e", color:"white", border:"none", cursor:"pointer" }}>
              📉 正解率順
            </button>
          </div>
        </div>
      </>)}

      <button onClick={()=>{ setForm(blank); setEditId(null); setTab("add"); }} style={{
        width:"100%", padding:11, borderRadius:10, fontSize:14, fontWeight:700,
        background:"white", color:"#334155", border:"2px dashed #cbd5e1", cursor:"pointer", marginBottom:12 }}>
        ＋ 手動で問題を追加
      </button>

      {filtered.length === 0
        ? <div style={{ textAlign:"center", color:"#94a3b8", padding:"48px 0" }}>
            <div style={{ fontSize:40 }}>📭</div>
            <div style={{ marginTop:8 }}>問題がありません</div>
            <div style={{ fontSize:12, marginTop:4 }}>ショートカットで解析して取り込みましょう</div>
          </div>
        : filtered.map(q => (
          <div key={q.id} style={card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
              <Badge cat={q.category} />
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <button onClick={()=>upd(q.id, {checked:!q.checked})} style={{
                  background:"none", border:"none", fontSize:18, cursor:"pointer",
                  opacity:q.checked?1:0.3 }}>⭐</button>
                <button onClick={()=>startEdit(q)} style={{ background:"none", border:"none", fontSize:15, cursor:"pointer" }}>✏️</button>
                <button onClick={()=>del(q.id)} style={{ background:"none", border:"none", fontSize:15, cursor:"pointer" }}>🗑️</button>
              </div>
            </div>
            <div style={{ fontSize:13, color:"#334155", lineHeight:1.6, marginBottom:6 }}>{q.question}</div>
            <div style={{ fontSize:19, fontWeight:800, color:"#0f172a", marginBottom:2 }}>▶ {q.answer}</div>
            {q.reading && <div style={{ fontSize:11, color:"#94a3b8" }}>読み: {q.reading}</div>}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:6 }}>
              {q.correctRate != null && (
                <span style={{ fontSize:11, padding:"2px 8px", borderRadius:999, fontWeight:700,
                  background:q.correctRate<=10?"#fef2f2":q.correctRate<=30?"#fffbeb":"#f0fdf4",
                  color:q.correctRate<=10?"#dc2626":q.correctRate<=30?"#d97706":"#16a34a" }}>
                  公式正解率 {q.correctRate}%
                </span>
              )}
              {q.reviewCount > 0 && (
                <span style={{ fontSize:11, color:"#94a3b8" }}>復習{q.reviewCount}回 / 正解{q.correctCount}回</span>
              )}
            </div>
          </div>
        ))
      }
    </>
  );

  const renderAdd = () => (
    <div style={card}>
      <div style={{ fontSize:15, fontWeight:800, marginBottom:14 }}>{editId?"✏️ 編集":"➕ 問題を追加"}</div>
      <div style={{ fontSize:11, fontWeight:700, color:"#64748b", marginBottom:6 }}>カテゴリ</div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
        {CATS.map(c => (
          <button key={c} onClick={()=>setForm(f=>({...f,cat:c}))} style={{
            padding:"5px 10px", borderRadius:999, fontSize:12, cursor:"pointer",
            fontWeight:form.cat===c?700:400,
            background:form.cat===c?cm(c).c:cm(c).bg, color:form.cat===c?"white":cm(c).c,
            border:`1.5px solid ${cm(c).c}`,
          }}>{cm(c).e} {c}</button>
        ))}
      </div>
      {[
        { label:"問題文 *", key:"q", ph:"問題文を入力…", multi:true },
        { label:"解答 *", key:"a", ph:"解答" },
        { label:"読み仮名", key:"reading", ph:"よみかた" },
        { label:"正解率 (%)", key:"rate", ph:"例: 15", type:"number" },
      ].map(({label,key,ph,multi,type}) => (
        <div key={key} style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#64748b", marginBottom:3 }}>{label}</div>
          {multi
            ? <textarea value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #e2e8f0",
                  fontSize:14, resize:"none", height:80, boxSizing:"border-box", fontFamily:"inherit", outline:"none" }} />
            : <input type={type||"text"} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                style={{ width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #e2e8f0",
                  fontSize:14, boxSizing:"border-box", outline:"none" }} />
          }
        </div>
      ))}
      <div style={{ display:"flex", gap:10, marginTop:4 }}>
        <button onClick={()=>{ setEditId(null); setForm(blank); setTab("list"); }} style={{
          flex:1, padding:11, borderRadius:10, fontSize:14, fontWeight:700,
          background:"transparent", color:"#64748b", border:"2px solid #64748b", cursor:"pointer" }}>
          キャンセル
        </button>
        <button onClick={submit} disabled={!form.q.trim()||!form.a.trim()} style={{
          flex:1, padding:11, borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer",
          background:form.q.trim()&&form.a.trim()?"#0ea5e9":"#e2e8f0",
          color:form.q.trim()&&form.a.trim()?"white":"#94a3b8", border:"none" }}>
          {editId?"更新する":"追加する"}
        </button>
      </div>
    </div>
  );

  const renderReview = () => {
    if (queue.length === 0) return (
      <div style={{ textAlign:"center", padding:"60px 20px", color:"#94a3b8" }}>
        <div style={{ fontSize:40 }}>📋</div>
        <div style={{ marginTop:12 }}>一覧から復習を開始してください</div>
        <button onClick={()=>setTab("list")} style={{ marginTop:16, padding:"10px 24px", borderRadius:10,
          background:"#0ea5e9", color:"white", border:"none", fontWeight:700, fontSize:14, cursor:"pointer" }}>
          一覧へ
        </button>
      </div>
    );
    if (done) {
      const ok = results.filter(r=>r==="ok").length;
      return (
        <div style={{ textAlign:"center", padding:"40px 20px" }}>
          <div style={{ fontSize:48 }}>🎉</div>
          <div style={{ fontSize:26, fontWeight:800, marginTop:12 }}>{ok} / {results.length} 正解</div>
          <div style={{ fontSize:14, color:"#64748b", marginTop:4 }}>正解率: {Math.round(ok/results.length*100)}%</div>
          <div style={{ display:"flex", gap:10, marginTop:24 }}>
            <button onClick={()=>startReview(queue)} style={{ flex:1, padding:12, borderRadius:10, fontSize:14, fontWeight:700, background:"#0ea5e9", color:"white", border:"none", cursor:"pointer" }}>もう一度</button>
            <button onClick={()=>setTab("list")} style={{ flex:1, padding:12, borderRadius:10, fontSize:14, fontWeight:700, background:"#64748b", color:"white", border:"none", cursor:"pointer" }}>一覧へ</button>
          </div>
        </div>
      );
    }
    const qBase = queue[idx];
    const q = quizzes.find(x => x.id === qBase.id) || qBase;
    return (
      <>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16 }}>
          <div style={{ flex:1, height:6, background:"#e2e8f0", borderRadius:3, overflow:"hidden" }}>
            <div style={{ width:`${(idx/queue.length)*100}%`, height:"100%", background:"#0ea5e9", transition:"width 0.3s" }} />
          </div>
          <span style={{ fontSize:12, color:"#64748b" }}>{idx+1}/{queue.length}</span>
        </div>
        <div style={{ ...card, minHeight:280 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <Badge cat={q.category} />
            {hayaoshiMode && (
              <span style={{ fontSize:11, background:"#fef3c7", color:"#d97706", padding:"2px 8px", borderRadius:999, fontWeight:700 }}>
                ⚡ 冒頭{charLimit}文字
              </span>
            )}
          </div>
          {hayaoshiMode ? (
            <div style={{ margin:"12px 0 0" }}>
              {showFull ? (
                <div style={{ fontSize:16, color:"#1e293b", lineHeight:1.7 }}>{q.question}</div>
              ) : (
                <>
                  <div style={{ fontSize:16, color:"#1e293b", lineHeight:1.7 }}>
                    {q.question.slice(0, charLimit)}
                    <span style={{ color:"#cbd5e1" }}>{"…"}</span>
                  </div>
                  <div style={{ marginTop:6, fontSize:12, color:"#94a3b8" }}>
                    （全{q.question.length}文字中{charLimit}文字）
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ fontSize:16, color:"#1e293b", lineHeight:1.7, margin:"12px 0 0" }}>{q.question}</div>
          )}
          {!showA
            ? hayaoshiMode && !showFull
              ? <button onClick={()=>setShowFull(true)} style={{ width:"100%", padding:12, borderRadius:10, fontSize:15, fontWeight:700, background:"#475569", color:"white", border:"none", cursor:"pointer", marginTop:16 }}>全文を見る 📖</button>
              : <button onClick={()=>setShowA(true)} style={{ width:"100%", padding:12, borderRadius:10, fontSize:15, fontWeight:700, background:"#0f172a", color:"white", border:"none", cursor:"pointer", marginTop:16 }}>答えを見る 👁️</button>
            : <div style={{ marginTop:16 }}>
                <div style={{ height:1, background:"#f1f5f9", marginBottom:12 }} />
                <div style={{ fontSize:22, fontWeight:800, color:"#0f172a" }}>{q.answer}</div>
                {q.reading && <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>読み: {q.reading}</div>}
                <button onClick={()=>upd(q.id,{checked:!q.checked})} style={{
                  background:"none", border:"none", cursor:"pointer", marginTop:4,
                  fontSize:13, color:q.checked?"#f59e0b":"#94a3b8", fontWeight:700, padding:0 }}>
                  {q.checked ? "⭐ 要チェック済み" : "☆ 要チェックに追加"}
                </button>
                {q.correctRate != null && (
                  <span style={{ fontSize:12, padding:"2px 10px", borderRadius:999, fontWeight:700, display:"inline-block", marginTop:6,
                    background:q.correctRate<=10?"#fef2f2":q.correctRate<=30?"#fffbeb":"#f0fdf4",
                    color:q.correctRate<=10?"#dc2626":q.correctRate<=30?"#d97706":"#16a34a" }}>
                    公式正解率 {q.correctRate}%
                  </span>
                )}
                <div style={{ display:"flex", gap:10, marginTop:18 }}>
                  <button onClick={()=>answer(false)} style={{ flex:1, padding:12, borderRadius:10, fontSize:15, fontWeight:700, background:"#fef2f2", color:"#dc2626", border:"2px solid #fca5a5", cursor:"pointer" }}>❌ 不正解</button>
                  <button onClick={()=>answer(true)} style={{ flex:1, padding:12, borderRadius:10, fontSize:15, fontWeight:700, background:"#f0fdf4", color:"#16a34a", border:"2px solid #86efac", cursor:"pointer" }}>✅ 正解</button>
                </div>
              </div>
          }
        </div>
      </>
    );
  };

  const renderStats = () => {
    const reviewed = quizzes.filter(q=>q.reviewCount>0);
    const totalOk = reviewed.reduce((s,q)=>s+q.correctCount,0);
    const totalAtt = reviewed.reduce((s,q)=>s+q.reviewCount,0);
    const weak = [...quizzes].filter(q=>q.reviewCount>=2)
      .sort((a,b)=>(a.correctCount/a.reviewCount)-(b.correctCount/b.reviewCount)).slice(0,5);
    return (
      <>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
          {[
            { l:"総問題数", v:quizzes.length, i:"📚" },
            { l:"復習済み", v:reviewed.length, i:"🔄" },
            { l:"正解率", v:totalAtt>0?`${Math.round(totalOk/totalAtt*100)}%`:"—", i:"🎯" },
          ].map(({l,v,i})=>(
            <div key={l} style={{ ...card, textAlign:"center", padding:"12px 8px" }}>
              <div style={{ fontSize:22 }}>{i}</div>
              <div style={{ fontSize:20, fontWeight:800, color:"#0f172a" }}>{v}</div>
              <div style={{ fontSize:10, color:"#94a3b8" }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={card}>
          <div style={{ fontSize:14, fontWeight:800, marginBottom:12 }}>カテゴリ別</div>
          {CATS.map(cat => {
            const qs = quizzes.filter(q=>q.category===cat);
            if (!qs.length) return null;
            const m = cm(cat);
            const rev = qs.filter(q=>q.reviewCount>0);
            const ok = rev.reduce((s,q)=>s+q.correctCount,0);
            const att = rev.reduce((s,q)=>s+q.reviewCount,0);
            const pct = att>0?Math.round(ok/att*100):null;
            return (
              <div key={cat} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>{m.e} {cat}</span>
                  <span style={{ fontSize:12, color:"#94a3b8" }}>{qs.length}問{pct!=null?` / 正解率${pct}%`:""}</span>
                </div>
                <div style={{ height:6, background:"#f1f5f9", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${pct||0}%`, height:"100%", background:m.c, transition:"width 0.4s" }} />
                </div>
              </div>
            );
          }).filter(Boolean)}
        </div>
        {weak.length > 0 && (
          <div style={card}>
            <div style={{ fontSize:14, fontWeight:800, marginBottom:10 }}>苦手問題 Top {weak.length}</div>
            {weak.map(q => (
              <div key={q.id} style={{ borderBottom:"1px solid #f1f5f9", paddingBottom:8, marginBottom:8 }}>
                <Badge cat={q.category} />
                <div style={{ fontSize:13, fontWeight:700, color:"#0f172a", marginTop:4 }}>{q.answer}</div>
                <div style={{ fontSize:11, color:"#dc2626" }}>
                  正解率 {Math.round(q.correctCount/q.reviewCount*100)}%（{q.correctCount}/{q.reviewCount}）
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div style={{ fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif", minHeight:"100vh",
      background:"#f1f5f9", maxWidth:430, margin:"0 auto", display:"flex", flexDirection:"column" }}>
      <div style={{ background:"linear-gradient(135deg,#0f172a,#1e3a5f)", color:"white",
        padding:"14px 16px 10px", position:"sticky", top:0, zIndex:20, boxShadow:"0 2px 12px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize:17, fontWeight:800 }}>⚡ みんはや問題帳</div>
        <div style={{ fontSize:11, color:"#93c5fd", marginTop:2 }}>{quizzes.length}問収録</div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:12, paddingBottom:76 }}>
        {tab==="list" && renderList()}
        {tab==="add" && renderAdd()}
        {tab==="review" && renderReview()}
        {tab==="stats" && renderStats()}
      </div>
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:430, background:"#0f172a", display:"flex",
        borderTop:"1px solid #1e3a5f", zIndex:20 }}>
        {[
          { k:"list", i:"📋", l:"一覧" },
          { k:"add",  i:"➕", l:"追加" },
          { k:"review",i:"🎴",l:"復習" },
          { k:"stats", i:"📊",l:"統計" },
        ].map(({k,i,l}) => (
          <button key={k} style={tabBtnS(tab===k)}
            onClick={()=>{ if(k==="add"){ setForm(blank); setEditId(null); } setTab(k); }}>
            <span style={{ fontSize:18 }}>{i}</span>
            <span>{l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
