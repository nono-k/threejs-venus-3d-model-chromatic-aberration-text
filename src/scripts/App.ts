import * as THREE from 'three';
import { DRACOLoader, GLTFLoader, RoomEnvironment } from 'three/examples/jsm/Addons.js';
// import fragment from './shaders/fragment.glsl?raw';
// import vertex from './shaders/vertex.glsl?raw';
import venus from '../assets/model/venus.glb?url';
import { Controls, PerspectiveCamera } from './core/Camera';
import { Three } from './core/Three';

export class App extends Three {
  private readonly camera: PerspectiveCamera;
  private raycaster: THREE.Raycaster;

  private glassModel!: THREE.Group;
  private textPlane!: THREE.Mesh;
  private contentGroup!: THREE.Group;

  // 初期状態は画面外に設定
  private mouse: THREE.Vector2 = new THREE.Vector2(-1000, -1000);
  private targetRotation: THREE.Vector2 = new THREE.Vector2(0, 0);
  private currentRotation: THREE.Vector2 = new THREE.Vector2(0, 0);

  private isHovered = false;
  private currentScale = 0;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.camera = new PerspectiveCamera();
    this.raycaster = new THREE.Raycaster();

    const _controls = new Controls(this.renderer, this.camera);

    this.init();

    window.addEventListener('resize', this.resize.bind(this));
    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  private init() {
    this.scene.background = new THREE.Color(0x000000);
    this.setupLighting();

    this.contentGroup = new THREE.Group();
    this.scene.add(this.contentGroup);

    this.setupText('VENUS');
    this.loadModel(venus);
    this.bindEvents();
  }

  private setupLighting() {
    // 2. 環境マップの設定（ガラスの反射・立体感を出すために必須）
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. ライティング（ガラスの陰影とハイライト）
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(5, 5, 5);
    this.scene.add(mainLight);

    // 影側にほんのり色をつけることで、白背景でもガラスの輪郭（3D感）を立体的に浮き立たせる
    const subLight = new THREE.DirectionalLight(0xddf0ff, 1.5);
    subLight.position.set(-5, -5, -2);
    this.scene.add(subLight);
  }

  private setupText(text: string) {
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.fillStyle = '#000000';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 200px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '10px';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const geometry = new THREE.PlaneGeometry(8, 4);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      // transparent: true,
      alphaTest: 0.01,
      // depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.textPlane = new THREE.Mesh(geometry, material);
    this.textPlane.position.z = -0.8;
    this.textPlane.renderOrder = 0;
    this.contentGroup.add(this.textPlane);
  }

  private loadModel(url: string) {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/threejs-text-hover-display-3d-model/assets/draco/');

    loader.setDRACOLoader(dracoLoader);

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 1.0,
      metalness: 0.0,
      roughness: 0.05,
      ior: 1.52,
      thickness: 2.5,
      dispersion: 15.0,
      opacity: 1,
      // transparent: true,
    });

    loader.load(
      url,
      gltf => {
        this.glassModel = gltf.scene;

        this.glassModel.traverse(child => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).material = glassMaterial;
          }
        });

        this.glassModel.renderOrder = 1;
        this.glassModel.scale.setScalar(0);
        this.glassModel.position.set(0, -1.8, 0);
        this.contentGroup.add(this.glassModel);
        dracoLoader.dispose();
      },
      progress => {
        console.log(`Loading progress: ${(progress.loaded / progress.total) * 100}%`);
      },
      error => {
        console.error('An error occurred while loading the model:', error);
        dracoLoader.dispose();
      },
    );
  }

  private bindEvents() {
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseleave', this.onMouseLeave);
  }

  private onMouseMove = (event: MouseEvent) => {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.targetRotation.x = this.mouse.y * 0.6;
    this.targetRotation.y = -this.mouse.x * 0.6;
  };

  private onMouseLeave = () => {
    this.mouse.set(-1000, -1000);
  };

  private checkRaycast() {
    if (!this.textPlane) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.textPlane);
    this.isHovered = intersects.length > 0;
    // document.body.style.cursor = this.isHovered ? 'pointer' : 'default';
  }

  private animate() {
    this.checkRaycast();

    if (this.glassModel) {
      const targetScale = this.isHovered ? 10.0 : 0.0;
      this.currentScale += (targetScale - this.currentScale) * 0.08;
      this.glassModel.scale.setScalar(this.currentScale);

      if (this.currentScale > 0.01) {
        this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.1;
        this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.1;

        this.contentGroup.rotation.x = this.currentRotation.x;
        this.contentGroup.rotation.y = this.currentRotation.y;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  private resize() {
    this.camera.update();
  }
}

const app = new App(document.getElementById('webgl') as HTMLCanvasElement);

window.addEventListener('beforeunload', () => {
  app.dispose();
});
