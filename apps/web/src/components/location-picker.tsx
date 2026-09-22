import {useEffect,useRef,useState} from 'react';
import type {Map as LibreMap,Marker} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import {Field} from './ui';
export interface Point {latitude:number;longitude:number}
let initialized=false;
/** Map movement is draft input only. The parent owns explicit confirmation. */
export function LocationPicker({point,onChange}:{point:Point|null;onChange:(p:Point)=>void}){
 const host=useRef<HTMLDivElement>(null),map=useRef<LibreMap|null>(null),marker=useRef<Marker|null>(null),change=useRef(onChange),latest=useRef(point);
 change.current=onChange;latest.current=point;
 const [failure,setFailure]=useState(''),[attempt,setAttempt]=useState(0),[loaded,setLoaded]=useState(false);
 const [lat,setLat]=useState(point?String(point.latitude):''),[lon,setLon]=useState(point?String(point.longitude):'');
 useEffect(()=>{setLat(point?String(point.latitude):'');setLon(point?String(point.longitude):'');if(point&&map.current){marker.current?.setLngLat([point.longitude,point.latitude]).addTo(map.current);if(!map.current.getBounds().contains([point.longitude,point.latitude]))map.current.jumpTo({center:[point.longitude,point.latitude]});}},[point]);
 useEffect(()=>{
  let disposed=false;setFailure('');setLoaded(false);
  void (async()=>{
   try{
    const [lib,pm]=await Promise.all([import('maplibre-gl'),import('pmtiles')]);if(disposed||!host.current)return;
    if(!initialized){lib.setWorkerUrl(mapWorkerUrl);lib.addProtocol('pmtiles',new pm.Protocol().tile);initialized=true;}
    const response=await fetch('/maps/style.json');if(!response.ok)throw new Error('style');const style=await response.json();
    style.sources.protomaps.url=`pmtiles://${location.origin}/maps/cairo.pmtiles`;
    style.glyphs=`${location.origin}/maps/fonts/{fontstack}/{range}.pbf`;style.sprite=`${location.origin}/maps/sprites/v4/light`;
    if(lib.getRTLTextPluginStatus()==='unavailable')await lib.setRTLTextPlugin(`${location.origin}/maps/rtl.js`,false);
    if(disposed)return;
    const p=latest.current;const m=new lib.Map({container:host.current,style,center:p?[p.longitude,p.latitude]:[31.2357,30.0444],zoom:13,maxZoom:18,attributionControl:{compact:false},locale:{'NavigationControl.ZoomIn':'تكبير','NavigationControl.ZoomOut':'تصغير','NavigationControl.ResetBearing':'إعادة الاتجاه'}});
    map.current=m;m.addControl(new lib.NavigationControl({showCompass:false}),'top-left');
    const pin=new lib.Marker({color:'#091426'});marker.current=pin;if(p)pin.setLngLat([p.longitude,p.latitude]).addTo(m);
    m.on('click',e=>{pin.setLngLat(e.lngLat).addTo(m);change.current({latitude:Number(e.lngLat.lat.toFixed(6)),longitude:Number(e.lngLat.lng.toFixed(6))});});
    m.on('load',()=>{setLoaded(true);if(latest.current)pin.setLngLat([latest.current.longitude,latest.current.latitude]).addTo(m);});
    m.on('error',()=>setFailure('تعذر عرض بعض أجزاء الخريطة. العنوان والإحداثيات ما زالا متاحين.'));
   }catch{if(!disposed)setFailure('تعذر تحميل الخريطة. يمكنك إدخال الإحداثيات وتأكيدها.');}
  })();
  return()=>{disposed=true;marker.current?.remove();map.current?.remove();map.current=null;marker.current=null;};
 },[attempt]);
 function apply(){if(lat.trim()&&lon.trim()&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Math.abs(Number(lat))<=90&&Math.abs(Number(lon))<=180){onChange({latitude:Number(lat),longitude:Number(lon)});const m=map.current;if(m){marker.current?.setLngLat([Number(lon),Number(lat)]).addTo(m);m.jumpTo({center:[Number(lon),Number(lat)]});}}else setFailure('اكتب خط عرض بين ‎-90 و90 وخط طول بين ‎-180 و180.');}
 const outside=point&&(point.longitude<31||point.longitude>31.65||point.latitude<29.8||point.latitude>30.3);
 return <section className="pin-picker" aria-label="اختيار موقع التوصيل">
  <div className="pin-map" ref={host} role="region" aria-label="خريطة الموقع: حرّك بالأسهم أو اضغط لاختيار نقطة" />
  {!loaded&&!failure?<p role="status">جارٍ تحميل الخريطة…</p>:null}
  <p className="field-hint">الخريطة المتاحة: القاهرة الكبرى فقط. اضغط على نقطة، أو حرّك الخريطة بالأسهم واختر وسطها.</p>
  {outside?<p role="status" className="task-blocker">النقطة خارج تغطية الخريطة المحلية. راجع الإحداثيات قبل التأكيد.</p>:null}
  {failure?<div role="status" className="task-blocker">{failure}<button type="button" className="edit-link" onClick={()=>setAttempt(n=>n+1)}>إعادة تحميل الخريطة</button></div>:null}
  <button type="button" className="cancel-button" disabled={!loaded} onClick={()=>{const m=map.current;if(m){const p=m.getCenter();marker.current?.setLngLat(p).addTo(m);onChange({latitude:Number(p.lat.toFixed(6)),longitude:Number(p.lng.toFixed(6))});}}}>اختيار وسط الخريطة</button>
  <details open={Boolean(failure)}><summary>إدخال الإحداثيات يدويًا</summary><div className="coordinate-fields"><Field id="pin-lat" label="خط العرض" value={lat} onChange={e=>setLat(e.target.value)} dir="ltr" inputMode="decimal"/><Field id="pin-lon" label="خط الطول" value={lon} onChange={e=>setLon(e.target.value)} dir="ltr" inputMode="decimal"/></div><button type="button" className="cancel-button" onClick={apply}>استخدام الإحداثيات</button></details>
  <p aria-live="polite">{point?<>النقطة المختارة: <bdi dir="ltr">{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</bdi></>:'لم تختر نقطة بعد.'}</p>
 </section>;
}
