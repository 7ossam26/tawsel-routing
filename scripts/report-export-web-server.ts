import {existsSync} from 'node:fs';
import {unlink} from 'node:fs/promises';
import {createServer} from 'vite';

const stop='.local/phase-37-web.stop';if(existsSync(stop))await unlink(stop);const server=await createServer({root:'apps/web',configFile:'apps/web/vite.config.ts',server:{host:'localhost',port:5174,strictPort:true}});await server.listen();let stopping=false;process.once('SIGINT',()=>{stopping=true;});process.once('SIGTERM',()=>{stopping=true;});while(!stopping&&!existsSync(stop))await new Promise(resolve=>setTimeout(resolve,200));await server.close();if(existsSync(stop))await unlink(stop);process.exit(0);
