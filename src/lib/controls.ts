import * as THREE from 'three';
import { EYE_HEIGHT, MOVE_SPEED, MOUSE_SENSITIVITY } from './constants';

export class FirstPersonControls {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  enabled: boolean = false;

  private yaw: number = 0;
  private pitch: number = 0;
  private moveForward: boolean = false;
  private moveBackward: boolean = false;
  private moveLeft: boolean = false;
  private moveRight: boolean = false;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private direction: THREE.Vector3 = new THREE.Vector3();
  private wallBoxes: THREE.Box3[] = [];
  private playerRadius: number = 0.3;

  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;
  private onMouseMove: (e: MouseEvent) => void;
  private onPointerLockChange: () => void;
  private onClick: () => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);
    this.onMouseMove = this.handleMouseMove.bind(this);
    this.onPointerLockChange = this.handlePointerLockChange.bind(this);
    this.onClick = this.handleClick.bind(this);

    this.init();
  }

  private init() {
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.domElement.addEventListener('click', this.onClick);
  }

  setWallBoxes(boxes: THREE.Box3[]) {
    this.wallBoxes = boxes;
  }

  private handleClick() {
    if (!this.enabled) {
      this.domElement.requestPointerLock();
    }
  }

  private handlePointerLockChange() {
    this.enabled = document.pointerLockElement === this.domElement;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!this.enabled) return;
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = true;
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.moveForward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.moveBackward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.moveLeft = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.moveRight = false;
        break;
    }
  }

  private handleMouseMove(e: MouseEvent) {
    if (!this.enabled) return;

    this.yaw -= e.movementX * MOUSE_SENSITIVITY;
    this.pitch -= e.movementY * MOUSE_SENSITIVITY;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  update(delta: number) {
    if (!this.enabled) return;

    // Calculate movement direction
    this.direction.set(0, 0, 0);

    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    if (this.moveForward) this.direction.add(forward);
    if (this.moveBackward) this.direction.sub(forward);
    if (this.moveLeft) this.direction.sub(right);
    if (this.moveRight) this.direction.add(right);

    if (this.direction.length() > 0) {
      this.direction.normalize();
    }

    const speed = MOVE_SPEED * delta;
    const newPosition = this.camera.position.clone();
    newPosition.x += this.direction.x * speed;
    newPosition.z += this.direction.z * speed;
    newPosition.y = EYE_HEIGHT;

    // Collision detection
    if (!this.checkCollision(newPosition)) {
      this.camera.position.copy(newPosition);
    } else {
      // Try sliding along walls
      const slideX = this.camera.position.clone();
      slideX.x += this.direction.x * speed;
      if (!this.checkCollision(slideX)) {
        this.camera.position.x = slideX.x;
      }

      const slideZ = this.camera.position.clone();
      slideZ.z += this.direction.z * speed;
      if (!this.checkCollision(slideZ)) {
        this.camera.position.z = slideZ.z;
      }
    }

    // Update camera rotation
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  private checkCollision(position: THREE.Vector3): boolean {
    const playerBox = new THREE.Box3(
      new THREE.Vector3(
        position.x - this.playerRadius,
        0,
        position.z - this.playerRadius
      ),
      new THREE.Vector3(
        position.x + this.playerRadius,
        EYE_HEIGHT + 0.3,
        position.z + this.playerRadius
      )
    );

    for (const wallBox of this.wallBoxes) {
      if (playerBox.intersectsBox(wallBox)) {
        return true;
      }
    }
    return false;
  }

  unlock() {
    if (document.pointerLockElement === this.domElement) {
      document.exitPointerLock();
    }
  }

  dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.domElement.removeEventListener('click', this.onClick);
    this.unlock();
  }
}
