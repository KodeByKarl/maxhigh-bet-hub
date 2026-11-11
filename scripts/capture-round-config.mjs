import fs from 'node:fs';import path from 'node:path';import ts from 'typescript';
let count=0;
for(const entry of fs.readdirSync('src/server/games').filter(x=>x.endsWith('.ts'))){const file=path.join('src/server/games',entry),source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true),edits=[];
function visit(node,loader=false){if(ts.isFunctionDeclaration(node))loader=!!node.name&&/load.*Config/i.test(node.name.text);
if(loader&&ts.isReturnStatement(node)&&node.expression&&!node.expression.getText(ast).startsWith('recordRoundConfig('))edits.push({start:node.expression.getStart(ast),end:node.expression.end,text:'recordRoundConfig('+node.expression.getText(ast)+')'});
ts.forEachChild(node,child=>visit(child,loader));}visit(ast);if(!edits.length)continue;let result=source;for(const edit of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,edit.start)+edit.text+result.slice(edit.end);if(!source.includes('import { recordRoundConfig }'))result='import { recordRoundConfig } from "../round-random.server";\n'+result;fs.writeFileSync(file,result);count+=edits.length;}console.log('Captured effective configuration returns:',count);
