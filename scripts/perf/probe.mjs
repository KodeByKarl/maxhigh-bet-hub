import {monitorEventLoopDelay,performance} from 'node:perf_hooks';
const lag=monitorEventLoopDelay({resolution:20});lag.enable();let cpu=process.cpuUsage(),wall=performance.now(),enqueues=0,connected=false;
const timer=setInterval(()=>{
 const pool=globalThis.__maxhighMysqlPool?.pool;
 if(pool&&!connected){connected=true;pool.on('enqueue',()=>enqueues++);
 const instrument=connection=>{if(connection.__perfInstrumented)return connection;connection.__perfInstrumented=true;for(const name of ['query','execute']){const original=connection[name].bind(connection);connection[name]=(...args)=>original(...args).catch(error=>{process.send?.({type:'perf:dbError',code:error.code,errno:error.errno,sqlState:error.sqlState,at:Date.now()});throw error;});}return connection;};
 instrument(globalThis.__maxhighMysqlPool);const original=globalThis.__maxhighMysqlPool.getConnection.bind(globalThis.__maxhighMysqlPool);globalThis.__maxhighMysqlPool.getConnection=async(...args)=>instrument(await original(...args));
 }
 const now=performance.now(),next=process.cpuUsage();
 const sample={type:'perf:sample',at:Date.now(),rss:process.memoryUsage().rss,heapUsed:process.memoryUsage().heapUsed,cpuPercent:(next.user-cpu.user+next.system-cpu.system)/(now-wall)/10,eventLoopP95Ms:lag.percentile(95)/1e6,pool:pool?{total:pool._allConnections.length,free:pool._freeConnections.length,queued:pool._connectionQueue.length,enqueues}:null};
 process.send?.(sample);cpu=next;wall=now;lag.reset();
},500);timer.unref();
