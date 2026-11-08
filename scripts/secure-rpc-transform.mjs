// One-time source transformation: keep RPC exports statically visible to TanStack.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
let count=0;
for(const file of fs.readdirSync('src/functions').filter(f=>f.endsWith('.ts'))) {
 const full=path.join('src/functions',file), source=fs.readFileSync(full,'utf8');
 const ast=ts.createSourceFile(full,source,ts.ScriptTarget.Latest,true);const edits=[];
 function visit(node){
  if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name===undefined){/* property handled below */}
  if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='handler'){
   const arrow=node.arguments[0];if(!arrow||!ts.isArrowFunction(arrow)||!ts.isBlock(arrow.body))return;
   const text=arrow.body.getText(ast);
   const game=text.match(/import\(["']\.\.\/server\/games\/([^"']+)\.server["']\)/);
   const cash=/return (adminAdjustUserBalance|superAdjustBalance|assignJackpotToPlayer|createWalletRequest|reviewWalletRequest)\(/.test(text);
   if((game||cash)&&!text.includes('withFinancialOperation')&&/method:\s*["']POST/.test(node.expression.getText(ast))){
    let name='';let parent=node;while(parent&&!ts.isVariableDeclaration(parent))parent=parent.parent;if(parent)name=parent.name.getText(ast);
    const input=arrow.parameters.length&&arrow.parameters[0].getText(ast).includes('data')?'data':'null';
    const gameId=game?game[1]==='realms'?'data.gameId':JSON.stringify(game[1]):'undefined';
    const prefix=`{ const { withFinancialOperation } = await import("../server/operation.server"); return withFinancialOperation(${JSON.stringify(name)}, ${input}, async () => `;
    edits.push({start:arrow.body.getStart(ast),end:arrow.body.end,text:prefix+text+`, ${gameId}); }`});count++;
   }
  }
  ts.forEachChild(node,visit);
 }
 visit(ast);let result=source;for(const e of edits.sort((a,b)=>b.start-a.start))result=result.slice(0,e.start)+e.text+result.slice(e.end);
 if(edits.length){result='import { operationIdentity } from "@/lib/operation-identity";\n'+result;result=result.replace(/createServerFn\(\{ method: "POST" \}\)/g,'createServerFn({ method: "POST" }).middleware([operationIdentity])');fs.writeFileSync(full,result);}
}
console.log('Wrapped financial/game RPCs:',count);
