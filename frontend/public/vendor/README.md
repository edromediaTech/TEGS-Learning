# Bibliotheques embarquees (zero CDN)

Servies par le site lui-meme pour le fonctionnement hors ligne (mode edge, CDC TEGS-Edge) :
aucune ressource d'execution ne doit venir d'un CDN.

| Dossier | Source | Version |
|---|---|---|
| `model-viewer/3.5.0/model-viewer.min.js` | npm `@google/model-viewer@3.5.0`, `dist/` (bundle autonome, inclut three) | 3.5.0 |
| `draco/draco_wasm_wrapper.js`, `draco/draco_decoder.wasm` | npm `three@0.184.0`, `examples/jsm/libs/draco/gltf/` | decodeur Draco glTF |
| `three/0.184.0/` : `three.module.min.js`, `three.core.min.js`, `GLTFLoader.js`, `DRACOLoader.js`, `OrbitControls.js`, `RoomEnvironment.js` (+ `BufferGeometryUtils.js`, `SkeletonUtils.js` importes par GLTFLoader) | npm `three@0.184.0`, `build/` et `examples/jsm/` ; imports `'three'` reecrits en `./three.module.min.js` (et `../utils/` en `./`) : aucune importmap necessaire | r184 |

`model-viewer` cherche par defaut le decodeur Draco sur www.gstatic.com : `useModelViewer()`
lui indique `/vendor/draco/` via `self.ModelViewerElement.dracoDecoderLocation`.
Mettre a jour : remplacer les fichiers et le numero de version dans `composables/useModelViewer.ts`.

three.js (jalon C1, branche `feature/threejs-engine`) : `composables/useThreeVendor.ts` charge ces modules
une fois par page ; le DRACOLoader utilise le meme decodeur `/vendor/draco/` (meme version r184).
Depuis r160, three.js ne publie plus de `three.min.js` (format UMD) : seuls les modules ES existent.
