import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { createViewer } from '../render/viewer'

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<ReturnType<typeof createViewer> | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    viewerRef.current = createViewer(containerRef.current)
    return () => viewerRef.current?.dispose()
  }, [])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !viewerRef.current) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'stl') {
      const buf = await file.arrayBuffer()
      const loader = new STLLoader()
      const geom = loader.parse(buf as ArrayBuffer)

      // OPTIONAL: if your STL units are millimeters and look huge/small, you can scale here.
      // geom.scale(0.1, 0.1, 0.1)

      viewerRef.current.loadMeshFromGeometry(geom)
    } else {
      alert('For now, please try an STL file. STEP/IGES need tessellation which is not implemented yet.')
    }
  }

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px', background: '#0b1220', borderBottom: '1px solid #1f2937' }}>
        <input type="file" accept=".stl,.STL" onChange={onFile} />
        <button onClick={() => viewerRef.current?.setView('iso')} style={{ marginLeft: 8 }}>Iso</button>
        <button onClick={() => viewerRef.current?.setView('top')} style={{ marginLeft: 4 }}>Top</button>
        <button onClick={() => viewerRef.current?.setView('front')} style={{ marginLeft: 4 }}>Front</button>
        <button onClick={() => viewerRef.current?.setView('right')} style={{ marginLeft: 4 }}>Right</button>
      </div>
      <div id="viewport" ref={containerRef} />
    </div>
  )
}
