import fs from 'node:fs';
const games=JSON.parse(fs.readFileSync('output/realms-thumbnail-rework/catalog.json','utf8'));
const ready=JSON.parse(fs.readFileSync('src/lib/realms-art-ready.json','utf8'));
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const kinds=['loading-bg','backdrop','l1','l2','l3','l4','l5','p1','p2','p3','scatter','bomb'];
const cards=games.filter(g=>ready.includes(g.id)).map(g=>{
 const base=`http://localhost:8080/images/symbols/realms/${g.id}-v20261102-r2`;
 return `<section data-world="${g.world}"><h2>${escape(g.name)}</h2><div class="assets">${kinds.map(kind=>`<figure class="${kind}"><img loading="lazy" src="${base}/${kind}.webp" alt="${escape(g.name)} ${kind}"><figcaption>${kind}</figcaption></figure>`).join('')}</div></section>`;
}).join('');
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Realms artwork review</title><style>body{margin:0;padding:24px;background:#0a1020;color:#eaf5ff;font:15px system-ui}header{position:sticky;top:0;background:#0a1020ee;padding:12px 0;z-index:1}h1{margin:0 0 12px;font-size:24px}select{padding:10px;background:#18263a;color:inherit;border:1px solid #456;border-radius:8px}section{padding:18px 0;border-top:1px solid #345}h2{font-size:19px}.assets{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}figure{margin:0;background:#172338;border-radius:8px;overflow:hidden}img{width:100%;aspect-ratio:1;object-fit:contain;display:block}.loading-bg img{aspect-ratio:2/3;object-fit:cover}.backdrop{grid-column:span 3}.backdrop img{aspect-ratio:16/9;object-fit:cover}figcaption{padding:7px;color:#a9c4dc;font-size:12px}@media(max-width:700px){.assets{grid-template-columns:repeat(3,minmax(0,1fr))}.backdrop{grid-column:span 2}}</style><header><h1>Realms artwork — ${ready.length}/50 complete</h1><label>World <select id="world"><option value="all">All worlds</option>${[...new Set(games.map(g=>g.world))].map(w=>`<option>${w}</option>`).join('')}</select></label></header>${cards}<script>document.querySelector('select').addEventListener('change',event=>document.querySelectorAll('section').forEach(section=>section.hidden=event.target.value!=='all'&&section.dataset.world!==event.target.value))</script></html>`;
fs.mkdirSync('output/realms-art-rework/review',{recursive:true});
fs.writeFileSync('output/realms-art-rework/review/index.html',html);
console.log(JSON.stringify({previewGames:ready.length}));
