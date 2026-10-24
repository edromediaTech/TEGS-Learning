# Bibliotheques embarquees (zero CDN)

Servies par le site lui-meme pour le fonctionnement hors ligne (mode edge, CDC TEGS-Edge) :
aucune ressource d'execution ne doit venir d'un CDN.

| Dossier | Source | Version |
|---|---|---|
| `model-viewer/3.5.0/model-viewer.min.js` | npm `@google/model-viewer@3.5.0`, `dist/` (bundle autonome, inclut three) | 3.5.0 |
| `draco/draco_wasm_wrapper.js`, `draco/draco_decoder.wasm` | npm `three@0.184.0`, `examples/jsm/libs/draco/gltf/` | decodeur Draco glTF |

`model-viewer` cherche par defaut le decodeur Draco sur www.gstatic.com : `useModelViewer()`
lui indique `/vendor/draco/` via `self.ModelViewerElement.dracoDecoderLocation`.
Mettre a jour : remplacer les fichiers et le numero de version dans `composables/useModelViewer.ts`.
