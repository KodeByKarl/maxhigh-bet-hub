import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
let count=0;
for(const file of fs.readdirSync('src/server/games').filter(name=>name.endsWith('.ts'))){
 const name=path.join('src/server/games',file),text=fs.readFileSync(name,'utf8'),ast=ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true),edits=[];
 function visit(node,inLoader=false){
  if(ts.isFunctionDeclaration(node))inLoader=!!node.name&&/load.*Config/i.test(node.name.text);
  if(inLoader&&ts.isCatchClause(node))edits.push({start:node.block.getStart(ast),end:node.block.end,text:'{ throw new Error("Game configuration unavailable"); }'});
  ts.forEachChild(node,child=>visit(child,inLoader));
 }
 visit(ast);let result=text;for(const edit of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,edit.start)+edit.text+result.slice(edit.end);
 if(edits.length){fs.writeFileSync(name,result);count+=edits.length;}
}
console.log('Hardened configuration error paths:',count);
