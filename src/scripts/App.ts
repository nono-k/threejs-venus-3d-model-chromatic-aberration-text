import { gsap } from 'gsap';
import * as THREE from 'three';
import { DRACOLoader, GLTFLoader, RoomEnvironment } from 'three/examples/jsm/Addons.js';
import venus from '../assets/model/venus.glb?url';
import { PerspectiveCamera } from './core/Camera';
import { Three } from './core/Three';

const basePath = 'threejs-venus-3d-model-chromatic-aberration-text';

export class App extends Three {
  private readonly camera: PerspectiveCamera;

  private glassModel!: THREE.Group;
  private textPlane!: THREE.Mesh;
  private contentGroup!: THREE.Group;

  private mouse: THREE.Vector2 = new THREE.Vector2(0, 0);
  private targetRotation: THREE.Vector2 = new THREE.Vector2(0, 0);
  private currentRotation: THREE.Vector2 = new THREE.Vector2(0, 0);

  private isIntroPlayed = false;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.camera = new PerspectiveCamera();

    this.init();

    window.addEventListener('resize', this.resize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove);

    this.renderer.setAnimationLoop(this.animate.bind(this));
  }

  private init() {
    this.scene.background = new THREE.Color(0x000000);
    this.setupLighting();

    this.contentGroup = new THREE.Group();
    this.scene.add(this.contentGroup);

    this.setupText('VENUS');
    this.loadModel(venus);
  }

  private setupLighting() {
    // 環境マップの設定
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    pmremGenerator.dispose();

    // ライティング（ガラスの陰影とハイライト）
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(5, 5, 5);
    this.scene.add(mainLight);
  }

  private setupText(text: string) {
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
      side: THREE.DoubleSide,
    });

    this.textPlane = new THREE.Mesh(geometry, material);
    this.textPlane.position.z = -0.8;
    this.contentGroup.add(this.textPlane);
  }

  private loadModel(url: string) {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(`/${basePath}/assets/draco/`);

    loader.setDRACOLoader(dracoLoader);

    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xeeeeee,
      transmission: 1.0,
      metalness: 0.01,
      roughness: 0.05,
      ior: 1.52,
      thickness: 1.8,
      dispersion: 15.0,
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

        this.glassModel.scale.setScalar(0);
        this.glassModel.position.set(0, -1.8, 0);
        this.glassModel.rotation.set(0, -2.8, 0);
        this.contentGroup.add(this.glassModel);

        this.playModelIntro();

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

  playModelIntro() {
    const timeline = gsap.timeline({
      defaults: { ease: 'power3.out' },
    });

    timeline
      .to(this.glassModel.scale, {
        x: 10,
        y: 10,
        z: 10,
        duration: 1.4,
      })
      .to(
        this.glassModel.rotation,
        {
          y: 0.1,
          duration: 1.5,
          onComplete: () => {
            this.isIntroPlayed = true;
          },
        },
        '<',
      );
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.isIntroPlayed) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.targetRotation.x = this.mouse.y * 0.4;
    this.targetRotation.y = -this.mouse.x * 0.4;
  };

  private animate() {
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.1;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.1;

    this.contentGroup.rotation.x = this.currentRotation.x;
    this.contentGroup.rotation.y = this.currentRotation.y;

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
