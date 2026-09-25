import { useEffect, useRef, useState } from 'react';
import type { Map as LibreMap, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

type Target = { taskId: string; attemptId: string; recipientName: string; coordinates: { latitude: number; longitude: number } };
let initialized = false;

/** Read-only execution overview. Pins are destinations, never movement evidence. */
export function ActiveRouteMap({ targets, selectedTaskId, currentAttemptId, onSelect, disabled = false }: { targets: Target[]; selectedTaskId: string; currentAttemptId: string | undefined; onSelect: (taskId: string) => void; disabled?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const [failure, setFailure] = useState('');

  useEffect(() => {
    let disposed = false;
    if (!host.current || typeof window.matchMedia !== 'function') return;
    void (async () => {
      try {
        const [lib, pm] = await Promise.all([import('maplibre-gl'), import('pmtiles')]);
        if (disposed || !host.current) return;
        if (!initialized) {
          lib.setWorkerUrl(mapWorkerUrl);
          lib.addProtocol('pmtiles', new pm.Protocol().tile);
          initialized = true;
        }
        const response = await fetch('/maps/style.json');
        if (!response.ok) throw new Error('map style unavailable');
        const style = await response.json();
        style.sources.protomaps.url = `pmtiles://${location.origin}/maps/cairo.pmtiles`;
        style.glyphs = `${location.origin}/maps/fonts/{fontstack}/{range}.pbf`;
        style.sprite = `${location.origin}/maps/sprites/v4/light`;
        if (lib.getRTLTextPluginStatus() === 'unavailable') await lib.setRTLTextPlugin(`${location.origin}/maps/rtl.js`, false);
        if (disposed) return;
        const first = targets[0]?.coordinates ?? { latitude: 30.0444, longitude: 31.2357 };
        const instance = new lib.Map({ container: host.current, style, center: [first.longitude, first.latitude], zoom: 11, maxZoom: 18, attributionControl: { compact: true }, interactive: true });
        map.current = instance;
        instance.addControl(new lib.NavigationControl({ showCompass: false }), 'top-left');
        markers.current = targets.map((target, index) => {
          const button = document.createElement('button');
          button.type = 'button'; button.disabled = disabled;
          button.className = `route-marker${target.taskId === selectedTaskId ? ' route-marker--selected' : ''}${target.attemptId === currentAttemptId ? ' route-marker--current' : ''}`;
          button.textContent = String(index + 1);
          button.setAttribute('aria-label', `اختر ${target.recipientName} من الخريطة`);
          button.addEventListener('click', () => onSelect(target.taskId));
          return new lib.Marker({ element: button }).setLngLat([target.coordinates.longitude, target.coordinates.latitude]).addTo(instance);
        });
        instance.on('load', () => {
          if (targets.length > 1) {
            const bounds = new lib.LngLatBounds();
            targets.forEach(target => bounds.extend([target.coordinates.longitude, target.coordinates.latitude]));
            instance.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
          }
        });
      } catch {
        if (!disposed) setFailure('تعذّر عرض الخريطة الآن؛ قائمة المحطات كاملة ومتاحة.');
      }
    })();
    return () => { disposed = true; markers.current.forEach(marker => marker.remove()); markers.current = []; map.current?.remove(); map.current = null; };
  }, [currentAttemptId, onSelect, selectedTaskId, targets, disabled]);

  return <section className="active-route" aria-labelledby="route-overview-title">
    <div className="active-route__heading"><div><p className="eyebrow">الجولة النشطة</p><h2 id="route-overview-title">الخريطة والمحطات</h2></div><span>{targets.length} متاحة</span></div>
    <div className="active-route__layout">
      <div ref={host} className="active-route__map" role="region" aria-label="خريطة مواقع المحطات؛ لا تسجل حركة المندوب" />
      <ol className="active-route__list" aria-label="قائمة المحطات المتاحة">{targets.map((target, index) => <li key={target.attemptId}><button type="button" disabled={disabled} aria-current={target.attemptId === currentAttemptId ? 'step' : undefined} aria-pressed={target.taskId === selectedTaskId} onClick={() => onSelect(target.taskId)}><span>{index + 1}</span><span><strong><bdi>{target.recipientName}</bdi></strong><small>{target.attemptId === currentAttemptId ? 'المحطة الحالية' : target.taskId === selectedTaskId ? 'محددة للعرض' : 'لم يبدأ الاتجاه'}</small></span></button></li>)}</ol>
    </div>
    {failure ? <p className="field-hint" role="status">{failure}</p> : <p className="field-hint">الدبابيس لعرض وجهات الجولة فقط؛ فتحها أو اختيارها لا يسجل اتجاهًا أو وصولًا.</p>}
  </section>;
}
