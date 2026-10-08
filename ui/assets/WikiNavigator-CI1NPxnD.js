import{r as a,j as e,k as y,F as j,B as v,S as z,f as g,V as S,h as C,i as L,g as b}from"./index-DAvGYkZ9.js";const $=[{key:"wiki",label:"Wiki Pages",icon:e.jsx(v,{size:13}),prefix:"wiki/"},{key:"inbox",label:"Inbox",icon:e.jsx(z,{size:13}),prefix:"inbox/"},{key:"articles",label:"Articles",icon:e.jsx(g,{size:13}),prefix:"notes/articles/"},{key:"videos",label:"Videos",icon:e.jsx(g,{size:13}),prefix:"notes/videos/"},{key:"audio",label:"Audio",icon:e.jsx(g,{size:13}),prefix:"notes/audio/"},{key:"pdfs",label:"PDFs",icon:e.jsx(g,{size:13}),prefix:"notes/pdfs/"},{key:"projects",label:"Projects",icon:e.jsx(S,{size:13}),prefix:"projects/"},{key:"journal",label:"Journal",icon:e.jsx(g,{size:13}),prefix:"journal/"}];b.setOptions({gfm:!0,breaks:!0});function F(t){return t.toLowerCase().replace(/[^\w\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-")}function D(t){const p=t.startsWith("---")?t.replace(/^---[\s\S]*?---\n?/,"").trim():t,s=[],r={},o=new b.Renderer;return o.heading=({text:i,depth:d})=>{const h=i.replace(/<[^>]+>/g,""),l=F(h);r[l]=(r[l]??0)+1;const x=r[l]>1?`${l}-${r[l]}`:l;return d<=3&&s.push({level:d,text:h,id:x}),`<h${d} id="${x}">${i}</h${d}>`},{html:b.parse(p,{renderer:o}),toc:s}}function R(t){return t.length<2?"":`<div class="wiki-toc"><p style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;font-weight:600">Contents</p><ul style="list-style:none;margin:0;padding:0">${t.map(({level:s,text:r,id:o})=>`<li style="margin:0;padding:2px 0 2px ${s===1?0:s===2?16:32}px"><a href="#${o}" style="color:#4ec9b0;text-decoration:none;font-size:12px;opacity:0.85">${r}</a></li>`).join("")}</ul></div>`}function I({group:t,selectedPath:p,onSelect:s,defaultOpen:r}){const[o,f]=a.useState(r);return e.jsxs("div",{children:[e.jsxs("button",{onClick:()=>f(i=>!i),style:{width:"100%",display:"flex",alignItems:"center",gap:6,padding:"5px 12px",background:"transparent",border:"none",color:"#888",fontSize:11,cursor:"pointer",textAlign:"left"},children:[o?e.jsx(C,{size:11}):e.jsx(L,{size:11}),t.icon,e.jsx("span",{children:t.label}),e.jsx("span",{style:{marginLeft:"auto",color:"#444",fontSize:10},children:t.notes.length})]}),o&&e.jsxs("div",{children:[t.notes.length===0&&e.jsx("div",{style:{padding:"4px 12px 4px 28px",color:"#444",fontSize:11},children:"Empty"}),t.notes.map(i=>e.jsx("button",{onClick:()=>s(i),style:{width:"100%",display:"block",textAlign:"left",padding:"5px 12px 5px 28px",background:p===i.path?"rgba(78,201,176,0.1)":"transparent",border:"none",borderLeft:p===i.path?"2px solid #4ec9b0":"2px solid transparent",color:p===i.path?"#e2e2e2":"#888",fontSize:11,cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},title:i.name,children:i.name.replace(/^\d{4}-\d{2}-\d{2}-/,"")},i.path))]})]})}function E(){const[t,p]=a.useState([]),[s,r]=a.useState(!0),[o,f]=a.useState(null),[i,d]=a.useState(null),[h,l]=a.useState(!1),x=a.useCallback(async()=>{r(!0);try{const c=await(await fetch("/api/knowledge/notes?limit=200")).json();p(c.notes||[])}catch{}finally{r(!1)}},[]);a.useEffect(()=>{x()},[x]),a.useEffect(()=>{if(!o){d(null);return}l(!0),fetch(`/api/knowledge/notes/content?path=${encodeURIComponent(o.path)}`).then(n=>n.json()).then(n=>d(n.content||"")).catch(()=>d("*Failed to load note content.*")).finally(()=>l(!1))},[o]);const m=$.map(({key:n,label:c,icon:u,prefix:k})=>({key:n,label:c,icon:u,notes:t.filter(w=>w.path.startsWith(k))})).filter(n=>n.notes.length>0||n.key==="wiki"||n.key==="inbox");return e.jsxs("div",{style:{display:"flex",height:"100%"},children:[e.jsxs("div",{style:{width:220,background:"#0a0a0a",borderRight:"1px solid #1e1e1e",display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px 6px",borderBottom:"1px solid #1e1e1e"},children:[e.jsx("span",{style:{fontSize:11,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"},children:"Vault"}),e.jsx("button",{onClick:x,style:{background:"transparent",border:"none",color:"#444",cursor:"pointer",padding:2},title:"Refresh",children:e.jsx(y,{size:11})})]}),s&&e.jsx("div",{style:{padding:16,color:"#444",fontSize:11},children:"Loading…"}),!s&&e.jsx("div",{style:{flex:1},children:m.map((n,c)=>e.jsx(I,{group:n,selectedPath:(o==null?void 0:o.path)??null,onSelect:u=>f(u),defaultOpen:c<2},n.key))}),e.jsxs("div",{style:{padding:"8px 12px",borderTop:"1px solid #1a1a1a",color:"#444",fontSize:10},children:[t.length," notes total"]})]}),e.jsxs("div",{style:{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"},children:[!o&&e.jsxs("div",{style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10,color:"#333"},children:[e.jsx(j,{size:36}),e.jsx("p",{style:{fontSize:13},children:"Select a note from the sidebar"})]}),o&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{padding:"10px 24px",borderBottom:"1px solid #1e1e1e",background:"#0f0f0f",flexShrink:0},children:[e.jsx("div",{style:{fontSize:13,color:"#e2e2e2",fontWeight:500},children:o.name.replace(/^\d{4}-\d{2}-\d{2}-/,"")}),e.jsxs("div",{style:{fontSize:10,color:"#555",marginTop:2},children:[o.path," · modified ",new Date(o.modified).toLocaleDateString()]})]}),e.jsxs("div",{style:{flex:1,overflowY:"auto",padding:"20px 24px"},children:[h&&e.jsx("div",{style:{color:"#555",fontSize:12},children:"Loading…"}),!h&&i!==null&&(()=>{const{html:n,toc:c}=D(i);return e.jsx("div",{className:"wiki-prose",dangerouslySetInnerHTML:{__html:R(c)+n}})})()]})]})]}),e.jsx("style",{children:`
        .wiki-prose {
          color: #c8c8c8;
          font-size: 13px;
          line-height: 1.75;
          max-width: 720px;
          counter-reset: h2 0 h3 0;
        }
        .wiki-toc {
          background: #0f0f0f;
          border: 1px solid #1e1e1e;
          border-left: 3px solid #4ec9b0;
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 24px;
        }
        .wiki-toc a:hover { opacity: 1 !important; text-decoration: underline !important; }
        .wiki-prose h1 {
          font-size: 20px; color: #4ec9b0; margin-bottom: 12px; font-weight: 600;
        }
        .wiki-prose h2 {
          font-size: 15px; color: #4ec9b0; margin: 24px 0 8px; font-weight: 600;
          border-bottom: 1px solid #1e2e2b; padding-bottom: 4px;
          counter-increment: h2; counter-reset: h3;
        }
        .wiki-prose h2::before {
          content: counter(h2) ". ";
          color: #2a7a6a;
          font-weight: 400;
        }
        .wiki-prose h3 {
          font-size: 13px; color: #3ab89a; margin: 14px 0 6px; font-weight: 600;
          counter-increment: h3;
        }
        .wiki-prose h3::before {
          content: counter(h2) "." counter(h3) "  ";
          color: #2a6a5a;
          font-weight: 400;
        }
        .wiki-prose p  { margin-bottom: 10px; }
        .wiki-prose ul, .wiki-prose ol { padding-left: 20px; margin-bottom: 10px; }
        .wiki-prose li { margin-bottom: 3px; }
        .wiki-prose code { font-family: 'JetBrains Mono', monospace; font-size: 11px; background: #1a1a1a; border: 1px solid #2a2a2a; padding: 1px 5px; border-radius: 3px; color: #4ec9b0; }
        .wiki-prose pre { background: #111; border: 1px solid #1e1e1e; border-radius: 6px; padding: 12px; overflow-x: auto; margin-bottom: 12px; }
        .wiki-prose pre code { background: none; border: none; padding: 0; color: #c8c8c8; }
        .wiki-prose blockquote { border-left: 3px solid #4ec9b0; padding-left: 12px; color: #888; margin: 12px 0; }
        .wiki-prose strong { color: #e2e2e2; }
        .wiki-prose a { color: #4ec9b0; }
        .wiki-prose hr { border: none; border-top: 1px solid #1e1e1e; margin: 20px 0; }
        .wiki-prose table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 12px; }
        .wiki-prose th { background: #141414; border: 1px solid #2a2a2a; padding: 6px 10px; color: #aaa; text-align: left; }
        .wiki-prose td { border: 1px solid #1e1e1e; padding: 5px 10px; color: #888; }
      `})]})}export{E as default};
