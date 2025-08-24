import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export interface WorkerMeshMessage {
  id: number;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  error?: string;
}

export async function loadMesh(file: File, worker: Worker): Promise<THREE.Object3D> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext) throw new Error('Unable to determine file extension');

  if (ext === 'stl') {
    const buf = await file.arrayBuffer();
    const geom = new STLLoader().parse(buf);
    return new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0xcccccc }));
  }

  if (ext === 'obj') {
    const text = await file.text();
    const obj = new OBJLoader().parse(text);
    return obj;
  }

  // STEP/IGES handled by worker
  const buffer = await file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const id = Date.now();
    const listener = (e: MessageEvent<WorkerMeshMessage>) => {
      if (e.data.id !== id) return;
      worker.removeEventListener('message', listener);
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(e.data.positions, 3));
        geom.setAttribute('normal', new THREE.BufferAttribute(e.data.normals, 3));
        geom.setIndex(new THREE.BufferAttribute(e.data.indices, 1));
        resolve(new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0xcccccc }))); 
      }
    };
    worker.addEventListener('message', listener);
    worker.postMessage({ id, type: 'tessellate', ext, buffer }, [buffer]);
  });
}
