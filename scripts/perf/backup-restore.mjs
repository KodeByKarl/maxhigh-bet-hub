import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {pipeline} from 'node:stream/promises';import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';import {createGzip,createGunzip} from 'node:zlib';import mysql from 'mysql2/promise';
const runtime=path.resolve('audit/ph-vps-2/runtime/backup-'+Date.now());fs.mkdirSync(runtime,{recursive:true});
const evidence=process.env.PERF_OUTPUT??'audit/ph-vps-2/evidence';
const source=JSON.parse(fs.readFileSync(path.join(evidence,'optimized-load.json'),'utf8')).databaseName;
if(!/^audit_phvps2_optimized_\d+$/.test(source))throw Error('Disposable source database required');
const target='audit_phvps2_restore_'+Date.now(),connection={host:'127.0.0.1',port:19307,user:'root',password:'audit-local-only'};
const db=await mysql.createConnection(connection);await db.query('CREATE DATABASE `'+target+'`');
const credentials=path.join(runtime,'client.cnf');fs.writeFileSync(credentials,'[client]\nhost=127.0.0.1\nport=19307\nuser=root\npassword=audit-local-only\n',{mode:0o600});
const tools=process.env.MARIADB_BIN??(process.platform==='win32'?'D:/DeveloperTools/Databases/MariaDB/mariadb-13.0.2-winx64/bin':'/usr/bin');const suffix=process.platform==='win32'?'.exe':'';
function child(binary,args){const process=spawn(path.join(tools,binary+suffix),['--defaults-extra-file='+credentials,...args],{windowsHide:true,stdio:['pipe','pipe','pipe']});let stderr='';process.stderr.on('data',d=>stderr=(stderr+d).slice(-1000));process.stdout.on('error',()=>{});const completion=new Promise((resolve,reject)=>{process.on('error',reject);process.on('exit',code=>code===0?resolve():reject(Error(binary+' failed; fixture diagnostics retained privately')));});return {process,completion};}
try{
 const key=randomBytes(32),iv=randomBytes(12),archive=path.join(runtime,'fixture.sql.gz.enc');fs.writeFileSync(path.join(runtime,'fixture.key'),key,{mode:0o600});fs.writeFileSync(archive,iv,{mode:0o600});
 const cipher=createCipheriv('aes-256-gcm',key,iv);const dump=child('mariadb-dump',['--single-transaction','--quick','--skip-lock-tables','--skip-add-drop-table','--hex-blob','--routines','--events','--triggers',source]);dump.process.stdin.end();
 await pipeline(dump.process.stdout,createGzip(),cipher,fs.createWriteStream(archive,{flags:'a'}));await dump.completion;const tag=cipher.getAuthTag();fs.writeFileSync(path.join(runtime,'fixture.auth'),tag,{mode:0o600});
 const damaged=fs.readFileSync(archive).subarray(12);damaged[damaged.length-1]^=1;const bad=createDecipheriv('aes-256-gcm',key,iv);bad.setAuthTag(tag);bad.update(damaged);assert.throws(()=>bad.final());
 const decipher=createDecipheriv('aes-256-gcm',key,iv);decipher.setAuthTag(tag);const plaintext=path.join(runtime,'verified-fixture.sql');await pipeline(fs.createReadStream(archive,{start:12}),decipher,createGunzip(),fs.createWriteStream(plaintext,{mode:0o600}));
 // Authentication is completely verified before any SQL is applied to a new,
 // disposable schema. No live database is a permitted target.
 const restore=child('mariadb',[target]);restore.process.stdout.resume();await pipeline(fs.createReadStream(plaintext),restore.process.stdin);await restore.completion;
 const [tables]=await db.query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME',[source]);const checks=[];
 for(const {TABLE_NAME:table} of tables){if(!/^[a-zA-Z0-9_]+$/.test(table))throw Error('Unexpected table name');const snapshots=[];for(const database of [source,target]){const [rows]=await db.query('SELECT * FROM `'+database+'`.`'+table+'`');const canonical=rows.map(row=>JSON.stringify(row)).sort().join('\n');snapshots.push({count:rows.length,sha256:createHash('sha256').update(canonical).digest('hex')});}assert.deepEqual(snapshots[0],snapshots[1],table);checks.push({table,...snapshots[0]});}
 const [[settings]]=await db.query('SELECT @@foreign_key_checks AS foreignKeys,@@innodb_flush_log_at_trx_commit AS durability');assert.equal(Number(settings.foreignKeys),1);assert.equal(Number(settings.durability),1);
 const result={passed:true,scope:'Local encrypted disposable-fixture roundtrip; no remote backup transport or Ubuntu restore certification',source,target,archiveBytes:fs.statSync(archive).size,plaintextBytes:fs.statSync(plaintext).size,corruptionRejected:true,tables:checks,settings};fs.writeFileSync(path.join(evidence,'backup-restore.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,tables:checks.length,corruptionRejected:true,archiveBytes:result.archiveBytes}));
}finally{await db.end();}
