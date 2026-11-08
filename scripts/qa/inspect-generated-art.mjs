import fs from 'node:fs';
import path from 'node:path';
const folder='output/realms-art-rework/generated';
const rows=fs.readdirSync(folder).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(folder,f),'utf8')));
const sourceDir=path.dirname(rows[0].sourcePath);
const used=new Set(rows.map(row=>row.sourcePath));
const extras=fs.readdirSync(sourceDir).filter(f=>f.endsWith('.png')&&!used.has(path.join(sourceDir,f)));
const inspected=[];
for(const name of extras.slice(-3)){
 const file=path.join(sourceDir,name),png=fs.readFileSync(file),chunks=[];
 for(let offset=8;offset<png.length;){const size=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);if(type!=='IDAT')chunks.push({type,size,text:/tEXt|iTXt|zTXt/.test(type)?png.toString('utf8',offset+8,Math.min(offset+8+size,offset+1000)):undefined});offset+=12+size;}
 inspected.push({file,modified:fs.statSync(file).mtime.toISOString(),chunks});
}
console.log(JSON.stringify({used:used.size,extras:extras.length,inspected},null,2));
