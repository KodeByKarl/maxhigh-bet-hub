import fs from 'node:fs';
const games=JSON.parse(fs.readFileSync('output/realms-thumbnail-rework/catalog.json','utf8'));
const root='output/realms-art-rework';
fs.mkdirSync(`${root}/generated`,{recursive:true});
const styles=['painterly cinematic fantasy with luminous layered brushwork','stylized polished 3D fantasy with tactile sculpted materials','storybook gouache fantasy with jewel-toned painted textures','dramatic illustrated fantasy with intricate natural textures','dreamlike concept painting with soft atmospheric light'];
const entries=[];
for(const g of games){
 const direction=`${g.name}: ${g.description} Art direction: ${styles[(g.no-1)%5]}. Palette ${g.palette.join(', ')}. Make this title visually distinctive, grounded in its own subjects and world.`;
 for(const kind of ['loading-bg','backdrop','l1','l2','l3','l4','l5','p1','p2','p3','scatter','bomb']){
  const transparent=!['loading-bg','backdrop'].includes(kind);
  let brief;
  if(kind==='loading-bg') brief='Generate a finished premium mobile game loading illustration, portrait 2:3 composition. Immersive beautifully rendered hero scene based on this game world and its premium creatures or objects. A clear focal character or signature treasure in the upper middle, rich environmental depth, elegant quiet lower quarter for an overlaid loading bar. No text, no typography, no logo, no UI, no progress bar, no framing card. A compelling full scene, not a flat icon.';
  else if(kind==='backdrop') brief='Generate a premium slot game environment background, landscape 16:9. Rich atmospheric scenery specific to this game world. Keep the middle 60 percent dark, calm and spacious for a readable overlaid reel board; arrange detailed characters, objects and scenery near the side borders and top corners. Beautiful material detail and lighting, no letters, no title, no UI, no reels, no card frame, no central emblem.';
  else {
   const ranks={l1:'10',l2:'J',l3:'Q',l4:'K',l5:'A'};
   const subject=ranks[kind]?`One large unmistakably readable sculpted playing-card rank "${ranks[kind]}". Build the letter or number out of thematic materials and small decorative details drawn from this game's world. Distinct silhouette, dimensional bevels, no extra words.`:kind.startsWith('p')?`One premium reel symbol depicting ${g.premiums[Number(kind[1])-1].name}. Render the actual beautiful object or character, not an abstract pictogram.`:kind==='scatter'?`One special scatter treasure depicting ${g.scatter.name}. Exceptional luminous centerpiece with a strong distinct silhouette, no lettering.`:`One magical multiplier symbol depicting ${g.bomb.name}. Clearly sculpted thematic form with an uncluttered darker center reserved for a live multiplier overlay. No numbers or lettering.`;
   brief=`Generate a single premium slot reel symbol: ${subject} Square composition, centered isolated cutout with genuine transparent background, object fills 82 percent of canvas with safe padding, crisp readable at 80px, attractive dimensional materials, careful highlights and shadow within the object. No solid background, no circular badge plate, no flat vector icon, no surrounding UI, no watermarks.`;
  }
  entries.push({id:`${g.id}--${kind}`,gameId:g.id,kind,transparent,prompt:`Use case: stylized-concept. Asset: ${kind} for a slot game. ${direction}\n${brief}`});
 }
}
fs.writeFileSync(`${root}/prompts.json`,JSON.stringify(entries,null,2));
console.log(JSON.stringify({games:games.length,assets:entries.length}));
