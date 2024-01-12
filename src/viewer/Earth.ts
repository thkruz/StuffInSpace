import { ShaderMaterial, UniformsUtils, Texture } from 'three';
import { Color, TextureLoader, MeshPhongMaterial, SphereGeometry, Mesh, Group, BackSide, AdditiveBlending } from '../utils/three';
import SceneComponent from './interfaces/SceneComponent';
import SatelliteOrbitScene from './SatelliteOrbitScene';
import { ViewerContext } from './interfaces/ViewerContext';

class Earth implements SceneComponent {
  baseUrl = '';
  basePath = '/StuffInSpace/images';
  radiusInKm = 6371.0;
  pxToRadius = 3185.5;
  addAtmosphere = false;
  addClouds = true;

  sphere: Mesh | undefined = undefined;
  group: Group | undefined = undefined;

  private async loadTexture (textureUrl: string): Promise<Texture> {
    const loader = new TextureLoader();
    return new Promise ((resolve, reject) => {
      loader.load(
        textureUrl,
        texture => resolve(texture),
        undefined,
        error => reject(error)
      );
    });
  }

  async initClouds (scene: SatelliteOrbitScene, group: Group) {
    // this isn't a great implementation of the clouds,
    // so will leave off by default
    const texture = await this.loadTexture(`${this.basePath}/Earth_Cloud.jpg`);

    const radius = scene.km2pixels(this.radiusInKm + 0.02);
    const geometry = new SphereGeometry(radius, 32, 32);

    const material = new MeshPhongMaterial({
      map: texture,
      opacity: 0.3,
      transparent: true
    });

    const mesh = new Mesh(geometry, material);
    const scale = 1.01;
    mesh.scale.set(scale, scale, scale);

    group.add(mesh);
  }

  initAtmosphere (scene: SatelliteOrbitScene, group: Group) {
    // this isn't a great implementation of the atmospheric effect,
    // so will leave off by default
    const vertexShader = [
      'varying vec3 vNormal;',
      'varying vec3 vPosition;',
      'void main() {',
      'vNormal = normalize( normalMatrix * normal );',
      'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
      'vPosition = gl_Position.xyz;',
      '}'
    ].join('\n');

    const fragmentShader = [
      'varying vec3 vNormal;',
      'varying vec3 vPosition;',
      'void main() {',
      '  float intensity = pow( 0.8 + dot( vNormal, vec3( 0, 0, 1.0 ) ), 12.0 );',
      '  intensity = min(intensity, 1.7);',
      '  gl_FragColor = vec4( 0.37, 0.71, 0.93, 0.6 ) * intensity;',
      '}'
    ].join('\n');

    const uniforms = UniformsUtils.clone({});

    const material = new ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: BackSide,
      blending: AdditiveBlending,
      transparent: true,
    });

    const radius = scene.km2pixels(this.radiusInKm + 0.1);
    const geometry = new SphereGeometry(radius, 32, 32);

    const mesh = new Mesh(geometry, material);
    const scale = 1.019;
    mesh.scale.set(scale, scale, scale);

    group.add(mesh);
  }

  async init (scene: SatelliteOrbitScene, context: ViewerContext) {
    if (context.config) {
      this.baseUrl = context.config.baseUrl;
      this.baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;
    }

    this.group = new Group();

    this.basePath = `${this.baseUrl}images`;
    const dayTexture = await this.loadTexture(`${this.basePath}/earth-blue-marble.jpg`);
    const nightTexture = await this.loadTexture(`${this.basePath}/nightearth-4096.png`);
    const bumpTexture = await this.loadTexture(`${this.basePath}/8081_earthbump4k.jpg`);
    const earthSpecularMap = await this.loadTexture(`${this.basePath}/earth-water.png`);

    const dayMaterial = new MeshPhongMaterial({
      map: dayTexture,
      bumpMap: bumpTexture,
      emissiveMap: nightTexture,
      emissive: new Color(0x888888),
      emissiveIntensity: 5,
      specularMap: earthSpecularMap,
      specular: 1,
      shininess: 15,
      bumpScale: 1
    });

    const radius = scene.km2pixels(this.radiusInKm);
    const geometry = new SphereGeometry(radius, 32, 32);
    this.sphere = new Mesh( geometry, dayMaterial );
    this.group.add(this.sphere);

    if (this.addClouds) {
      this.initClouds(scene, this.group).catch(error => {
        console.error('Error loading clouds', error);
      });
    }

    if (this.addAtmosphere) {
      this.initAtmosphere(scene, this.group);
    }

    scene.add(this.group);

    this.sphere.geometry.computeBoundingBox();
    this.sphere.geometry.computeBoundingSphere();
  }

  update (): void {
    // do nothing
  }

  getMesh () {
    return this.sphere;
  }
}

export default Earth;