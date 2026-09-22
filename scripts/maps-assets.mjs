// Explicit asset preparation only. Never called by install/dev/build or Engine setup.
import {mkdir,readFile,writeFile,copyFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve} from 'node:path';
import {layers,namedFlavor} from '@protomaps/basemaps';
const root=resolve('.local/maps');
const revision='028c18f713baecad011301ff7a69acc39bcc2ae7';
const base=`https://raw.githubusercontent.com/protomaps/basemaps-assets/${revision}/`;
const files=['fonts/OFL.txt','sprites/v4/light.json','sprites/v4/light.png','sprites/v4/light@2x.json','sprites/v4/light@2x.png',...Array.from({length:256},(_,i)=>`fonts/Noto Sans Regular/${i*256}-${i*256+255}.pbf`)];
let next=0;const hashes={};
await Promise.all(Array.from({length:8},async()=>{while(next<files.length){const file=files[next++],path=resolve(root,file);await mkdir(dirname(path),{recursive:true});let bytes;try{bytes=await readFile(path);}catch{const response=await fetch(base+file.split('/').map(encodeURIComponent).join('/'),{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`${file}: ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());await writeFile(path,bytes);}hashes[file]=createHash('sha256').update(bytes).digest('hex');}}));
await copyFile('node_modules/@mapbox/mapbox-gl-rtl-text/dist/mapbox-gl-rtl-text.js',resolve(root,'rtl.js'));
await copyFile('node_modules/@mapbox/mapbox-gl-rtl-text/LICENSE.md',resolve(root,'RTL-LICENSE.md'));
await mkdir(resolve(root,'licenses'),{recursive:true});
for(const name of ['MapLibre-BSD.txt','Protomaps-BSD.txt','Protomaps-Data.md','Noto-OFL.txt','Tangram-Icons-MIT.md','RTL-ICU-LICENSE.md'])await copyFile(`docs/licenses/${name}`,resolve(root,'licenses',name));
const style={version:8,name:'Tawsel Cairo — Protomaps 2026-09-22',center:[31.2357,30.0444],zoom:13,
 metadata:{coverage:'Greater Cairo: 31.0,29.8,31.65,30.3; z0–15, overzoom to 18',source:'https://build.protomaps.com/20260922.pmtiles'},
 sources:{protomaps:{type:'vector',url:'pmtiles:///maps/cairo.pmtiles',attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href="https://protomaps.com">Protomaps</a> · <a href="https://esa-worldcover.org/en">ESA WorldCover</a>',bounds:[31,29.8,31.65,30.3],maxzoom:15}},
 glyphs:'/maps/fonts/{fontstack}/{range}.pbf',sprite:'/maps/sprites/v4/light',layers:layers('protomaps',namedFlavor('light'),{lang:'ar'})};
// One locally supplied Noto fontstack covers Arabic, Latin and Arabic presentation forms.
for(const layer of style.layers)if(layer.type==='symbol'&&layer.layout?.['text-field']){
 layer.layout['text-font']=['Noto Sans Regular'];
 layer.layout['text-field']=['coalesce',['get','name:ar'],['get','name'],['get','name:en']];
}
await writeFile(resolve(root,'style.json'),JSON.stringify(style,null,2)+'\n');
const archive=await readFile(resolve(root,'cairo.pmtiles'));
for(const file of ['style.json','rtl.js','RTL-LICENSE.md'])hashes[file]=createHash('sha256').update(await readFile(resolve(root,file))).digest('hex');
const manifest={archive:{source:style.metadata.source,bbox:[31,29.8,31.65,30.3],minzoom:0,maxzoom:15,bytes:(await stat(resolve(root,'cairo.pmtiles'))).size,sha256:createHash('sha256').update(archive).digest('hex')},assetsRevision:revision,hashes:Object.fromEntries(Object.entries(hashes).sort(([a],[b])=>a.localeCompare(b))),licenses:{tiles:'ODbL produced work; OpenStreetMap attribution; ESA WorldCover landcover CC BY 4.0; Natural Earth public domain',font:'SIL Open Font License 1.1',sprites:'MIT tangrams/icons',style:'BSD-3-Clause',rtl:'BSD-2-Clause with bundled ICU notices'}};
await mkdir('maps',{recursive:true});await writeFile('maps/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Prepared local map stack: ${manifest.archive.bytes} archive bytes, ${files.length} supporting assets. No runtime remote asset URLs.`);
