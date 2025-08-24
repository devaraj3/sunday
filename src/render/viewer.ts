import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export type Viewer = {
  loadMeshFromGeometry: (geom: THREE.BufferGeometry) => void
  clear: () => void
  setView: (preset: 'top' | 'front' | 'right' | 'iso') => void
  setProjection: (mode: 'perspective' | 'orthographic') => void
  resize: () => void
  dispose: () => void
}

export function createViewer(container: HTMLElement): Viewer {
  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  // For modern three: use ColorSpace and ToneMapping
  ;(renderer as any).outputColorSpace = (THREE as any).SRGBColorSpace ?? undefined
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.setClearColor(0x111827) // dark slate
  container.appendChild(renderer.domElement)

  // Scene
  const scene = new THREE.Scene()

  // Camera(s)
  const aspect = container.clientWidth / Math.max(1, container.clientHeight)
  const persp = new THREE.PerspectiveCamera(50, aspect, 0.1, 10_000)
  persp.position.set(250, 180, 250)

  const orthoHeight = 200
  const ortho = new THREE.OrthographicCamera(
    (-orthoHeight * aspect) / 2,
    (orthoHeight * aspect) / 2,
    orthoHeight / 2,
    -orthoHeight / 2,
    -10_000,
    10_000
  )
  ortho.position.copy(persp.position)

  let activeCamera: THREE.Camera = persp

  // Controls
  const controls = new OrbitControls(persp, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.1

  // Lights (hemisphere + directional for shape)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 0.9)
  scene.add(hemi)

  const dir = new THREE.DirectionalLight(0xffffff, 1.0)
  dir.position.set(300, 400, 300)
  dir.castShadow = false
  scene.add(dir)

  // Grid & Axes
  const grid = new THREE.GridHelper(1000, 50, 0x666666, 0x333333)
  grid.position.y = 0
  scene.add(grid)

  const axes = new THREE.AxesHelper(200)
  scene.add(axes)

  // Model root
  const modelRoot = new THREE.Group()
  scene.add(modelRoot)

  function fitCameraToBox(box: THREE.Box3, padding = 1.2) {
    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())

      // Position perspective camera so the whole box fits
      const maxDim = Math.max(size.x, size.y, size.z)
      const fov = (persp.fov * Math.PI) / 180
      const distance = (maxDim / 2) / Math.tan(fov / 2) * padding

      const dirVec = new THREE.Vector3(1, 0.8, 1).normalize() // nice iso angle
      persp.position.copy(center.clone().add(dirVec.multiplyScalar(distance)))
      persp.near = Math.max(0.1, distance * 0.01)
      persp.far = distance * 100 + maxDim
      persp.updateProjectionMatrix()

      // Ortho framing
      const half = (maxDim * padding) / 2
      const aspect = container.clientWidth / Math.max(1, container.clientHeight)
      ortho.left = -half * aspect
      ortho.right = half * aspect
      ortho.top = half
      ortho.bottom = -half
      ortho.near = -10_000
      ortho.far = 10_000
      ortho.position.copy(persp.position)
      ortho.lookAt(center)
      ortho.updateProjectionMatrix()

      controls.target.copy(center)
      controls.update()
    }
  }

  function computeBoxOf(object: THREE.Object3D) {
    const box = new THREE.Box3()
    box.setFromObject(object)
    return box
  }

  function loadMeshFromGeometry(geom: THREE.BufferGeometry) {
    // Ensure normals so lighting works
    if (!geom.getAttribute('normal')) {
      geom.computeVertexNormals()
    }
    const material = new THREE.MeshStandardMaterial({
      color: 0xb8c2ff,
      metalness: 0.1,
      roughness: 0.8
    })
    const mesh = new THREE.Mesh(geom, material)
    mesh.castShadow = false
    mesh.receiveShadow = false

    modelRoot.clear()
    modelRoot.add(mesh)

    // Ensure world matrices are current before boxing
    modelRoot.updateWorldMatrix(true, true)
    const box = computeBoxOf(modelRoot)
    fitCameraToBox(box)
  }

  function clear() {
    modelRoot.clear()
  }

  function setView(preset: 'top' | 'front' | 'right' | 'iso') {
    const target = controls.target.clone()
    const dist = persp.position.distanceTo(target)
    const up = new THREE.Vector3(0, 1, 0)

    switch (preset) {
      case 'top':
        persp.position.copy(target.clone().add(new THREE.Vector3(0, dist, 0)))
        controls.up.copy(up)
        break
      case 'front':
        persp.position.copy(target.clone().add(new THREE.Vector3(0, 0, dist)))
        controls.up.copy(up)
        break
      case 'right':
        persp.position.copy(target.clone().add(new THREE.Vector3(dist, 0, 0)))
        controls.up.copy(up)
        break
      case 'iso':
      default:
        persp.position.copy(target.clone().add(new THREE.Vector3(dist, dist * 0.6, dist)))
        controls.up.copy(up)
        break
    }
    persp.updateProjectionMatrix()
    controls.update()
  }

  function setProjection(mode: 'perspective' | 'orthographic') {
    activeCamera = mode === 'perspective' ? persp : ortho
  }

  function resize() {
    const w = container.clientWidth
    const h = container.clientHeight
    renderer.setSize(w, h)

    const aspect = w / Math.max(1, h)
    persp.aspect = aspect
    persp.updateProjectionMatrix()

    // Recompute ortho bounds proportionally
    const box = computeBoxOf(modelRoot)
    if (!box.isEmpty()) {
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const half = maxDim * 0.6
      ortho.left = -half * aspect
      ortho.right = half * aspect
      ortho.top = half
      ortho.bottom = -half
      ortho.updateProjectionMatrix()
    }
  }

  // Render loop
  const render = () => {
    controls.update()
    renderer.render(scene, activeCamera)
  }
  renderer.setAnimationLoop(render)

  // Handle window resize
  const onResize = () => resize()
  window.addEventListener('resize', onResize)

  // Initial draw
  render()

  function dispose() {
    window.removeEventListener('resize', onResize)
    renderer.setAnimationLoop(null)
    renderer.dispose()
    container.removeChild(renderer.domElement)
  }

  return { loadMeshFromGeometry, clear, setView, setProjection, resize, dispose }
}
