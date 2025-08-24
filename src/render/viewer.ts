import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type ViewOrientation = 'top' | 'front' | 'right' | 'iso';

export class Viewer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  readonly controls: OrbitControls;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this.camera.position.set(3, 3, 3);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;

    const grid = new THREE.GridHelper(10, 10);
    this.scene.add(grid);
    const axes = new THREE.AxesHelper(1);
    this.scene.add(axes);

    window.addEventListener('resize', () => this.onResize());
  }

  private onResize() {
    const { clientWidth, clientHeight } = this.canvas;
    this.renderer.setSize(clientWidth, clientHeight);
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = clientWidth / clientHeight;
    } else {
      this.camera.left = -clientWidth / 200;
      this.camera.right = clientWidth / 200;
      this.camera.top = clientHeight / 200;
      this.camera.bottom = -clientHeight / 200;
    }
    this.camera.updateProjectionMatrix();
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  fitToView(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    const distance = size * 1.5;
    this.controls.target.copy(center);
    if (this.camera instanceof THREE.PerspectiveCamera) {
      const dir = new THREE.Vector3(1, 1, 1).normalize().multiplyScalar(distance);
      this.camera.position.copy(center).add(dir);
    } else {
      this.camera.position.set(center.x + distance, center.y + distance, center.z + distance);
    }
    this.controls.update();
  }

  setView(orientation: ViewOrientation) {
    const target = new THREE.Vector3(0, 0, 0);
    let pos: THREE.Vector3;
    switch (orientation) {
      case 'top':
        pos = new THREE.Vector3(0, 1, 0);
        break;
      case 'front':
        pos = new THREE.Vector3(0, 0, 1);
        break;
      case 'right':
        pos = new THREE.Vector3(1, 0, 0);
        break;
      default:
        pos = new THREE.Vector3(1, 1, 1);
    }
    this.camera.position.copy(pos.multiplyScalar(5));
    this.controls.target.copy(target);
    this.controls.update();
  }

  toggleProjection() {
    const { clientWidth, clientHeight } = this.canvas;
    if (this.camera instanceof THREE.PerspectiveCamera) {
      const persp = this.camera;
      const aspect = clientWidth / clientHeight;
      const ortho = new THREE.OrthographicCamera(-aspect * 5, aspect * 5, 5, -5, 0.1, 1000);
      ortho.position.copy(persp.position);
      ortho.zoom = 1;
      this.camera = ortho;
    } else {
      const ortho = this.camera;
      const aspect = clientWidth / clientHeight;
      const persp = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
      persp.position.copy(ortho.position);
      this.camera = persp;
    }
    this.controls.object = this.camera;
    this.onResize();
  }
}
