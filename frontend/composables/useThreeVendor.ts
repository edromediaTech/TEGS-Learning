// three.js r184 servi par le site lui-meme (public/vendor/three/), jamais par un CDN :
// indispensable au noeud de salle hors ligne (CDC extension, jalon C1). Les modules
// embarques s'importent entre eux en chemins relatifs (pas d'importmap necessaire).
// Le decodeur Draco est celui deja embarque pour model-viewer (meme version r184).

export const THREE_VENDOR_PATH = '/vendor/three/0.184.0/';
export const THREE_DRACO_PATH = '/vendor/draco/';

export interface ThreeKit {
  THREE: any;
  GLTFLoader: any;
  DRACOLoader: any;
  OrbitControls: any;
  RoomEnvironment: any;
}

/** API remise par CRNSSimulationViewer (evenement `ready`) a la page du TP. */
export interface CrnsViewerApi {
  getNode: (name: string) => any;
  animateRotation: (name: string, axis: 'x' | 'y' | 'z', toRad: number, ms?: number) => Promise<void>;
  setColor: (name: string, hex: number) => void;
  setEmissive: (name: string, hex: number, intensity?: number) => void;
  /** Opacite des materiaux des noeuds (1 = opaque) ; l'interieur reste visible en dessous de 1. */
  setOpacity: (names: string[], value: number) => void;
  animateOpacity: (names: string[], to: number, ms?: number) => Promise<void>;
  /** Vue eclatee : position = origine + decalage x t (decalages en metres, repere glTF : y haut, z vers l'observateur). */
  setOffsets: (offsets: Record<string, [number, number, number]>, t: number) => void;
  animateOffsets: (offsets: Record<string, [number, number, number]>, from: number, to: number, ms?: number) => Promise<void>;
  resetView: () => void;
}

let kit: Promise<ThreeKit> | null = null;

function vendorModule(file: string): Promise<any> {
  // URL calculee a l'execution : Vite ne l'embarque pas, le navigateur la charge depuis public/.
  return import(/* @vite-ignore */ `${THREE_VENDOR_PATH}${file}`);
}

export function loadThree(): Promise<ThreeKit> {
  kit ||= Promise.all([
    vendorModule('three.module.min.js'),
    vendorModule('GLTFLoader.js'),
    vendorModule('DRACOLoader.js'),
    vendorModule('OrbitControls.js'),
    vendorModule('RoomEnvironment.js'),
  ]).then(([THREE, gltf, draco, orbit, room]) => ({
    THREE,
    GLTFLoader: gltf.GLTFLoader,
    DRACOLoader: draco.DRACOLoader,
    OrbitControls: orbit.OrbitControls,
    RoomEnvironment: room.RoomEnvironment,
  })).catch((err) => {
    kit = null; // nouvel essai au prochain appel
    throw err;
  });
  return kit;
}
