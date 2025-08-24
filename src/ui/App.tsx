import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { createViewer } from '../render/viewer'

type Units = 'mm' | 'cm' | 'm' | 'in'

function convert(valMM: number, to: Units) {
  switch (to) {
    case 'mm': return valMM
    case 'cm': return valMM / 10
    case 'm':  return valMM / 1000
    case 'in': return valMM / 25.4
  }
}
function fmt(n: number) {
  return Number.isFinite(n) ? n.toFixed(2) : '-'
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<ReturnType<typeof createViewer> | null>(null)

  const [dimsMM, setDimsMM] = useState<{ x: number, y: number, z: number } | null>(null)
  const [units, setUnits] = useState<Units>('mm')

  useEffect(() => {
    if (!containerRef.current) return
    viewerRef.current = createViewer(containerRef.current)
    return () => viewerRef.current?.dispose()
  }, [])

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !viewerRef.current) return

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'stl') {
      alert('For now, please use an STL file. STEP/IGES need tessellation (not implemented yet).')
      return
    }

    const buf = await file.arrayBuffer()
    const loader = new STLLoader()
    const geom = loader.parse(buf as ArrayBuffer)

    // Compute dimensions in mm (STL is unit-less; many CAD export in mm)
    geom.computeBoundingBox()
    const size = new THREE.Vector3()
    geom.boundingBox!.getSize(size)
    setDimsMM({ x: size.x, y: size.y, z: size.z })

    // Hand geometry to viewer (viewer recenters + grounds + fits)
    viewerRef.current.loadMeshFromGeometry(geom)
  }

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px', background: '#0b1220', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="file" accept=".stl,.STL" onChange={onFile} />
        <button onClick={() => viewerRef.current?.setView('iso')}>Iso</button>
        <button onClick={() => viewerRef.current?.setView('top')}>Top</button>
        <button onClick={() => viewerRef.current?.setView('front')}>Front</button>
        <button onClick={() => viewerRef.current?.setView('right')}>Right</button>

        <div style={{ marginLeft: 16 }}>
          <label style={{ marginRight: 6, opacity: 0.8 }}>Units</label>
          <select value={units} onChange={(e) => setUnits(e.target.value as Units)}>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="m">m</option>
            <option value="in">in</option>
          </select>
        </div>

        <div style={{ marginLeft: 16, opacity: 0.9 }}>
          {dimsMM ? (
            <>
              <strong>Dimensions:</strong>{' '}
              L {fmt(convert(dimsMM.x, units))} {units} ·
              W {fmt(convert(dimsMM.z, units))} {units} ·
              H {fmt(convert(dimsMM.y, units))} {units}
            </>
          ) : (
            <span>Dimensions: —</span>
          )}
        </div>
      </div>
      <div id="viewport" ref={containerRef} />
    </div>
  )
}
