import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Viewer } from '../render/viewer';
import { loadMesh } from '../loaders/meshLoader';
import { Unit, convert, format } from '../core/units';

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Viewer>();
  const workerRef = useRef<Worker>();
  const [unit, setUnit] = useState<Unit>('mm');
  const [size, setSize] = useState<THREE.Vector3>();

  useEffect(() => {
    if (canvasRef.current) {
      viewerRef.current = new Viewer(canvasRef.current);
      workerRef.current = new Worker(new URL('../workers/occ-worker.ts', import.meta.url), { type: 'module' });
      const loop = () => {
        viewerRef.current?.render();
        requestAnimationFrame(loop);
      };
      loop();
    }
    return () => workerRef.current?.terminate();
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewerRef.current || !workerRef.current) return;
    try {
      const obj = await loadMesh(file, workerRef.current);
      viewerRef.current.scene.add(obj);
      viewerRef.current.fitToView(obj);
      const box = new THREE.Box3().setFromObject(obj);
      const s = box.getSize(new THREE.Vector3());
      setSize(s);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const displaySize = () => {
    if (!size) return '';
    const l = format(convert(size.x, 'm', unit), unit);
    const w = format(convert(size.y, 'm', unit), unit);
    const h = format(convert(size.z, 'm', unit), unit);
    return `L ${l} × W ${w} × H ${h}`;
    };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <input type="file" onChange={handleFile} style={{ position: 'absolute', top: 10, left: 10 }} />
      <div style={{ position: 'absolute', top: 50, left: 10, background: 'rgba(255,255,255,0.8)', padding: 4 }}>
        <div>{displaySize()}</div>
        <select value={unit} onChange={e => setUnit(e.target.value as Unit)}>
          <option value="mm">mm</option>
          <option value="cm">cm</option>
          <option value="m">m</option>
          <option value="in">in</option>
        </select>
        <button onClick={() => viewerRef.current?.setView('top')}>Top</button>
        <button onClick={() => viewerRef.current?.setView('front')}>Front</button>
        <button onClick={() => viewerRef.current?.setView('right')}>Right</button>
        <button onClick={() => viewerRef.current?.setView('iso')}>Iso</button>
        <button onClick={() => viewerRef.current?.toggleProjection()}>Toggle Proj</button>
      </div>
    </div>
  );
};

export default App;
