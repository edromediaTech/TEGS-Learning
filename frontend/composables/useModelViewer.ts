// Charge <model-viewer> et son decodeur Draco depuis le site lui-meme (public/vendor/),
// jamais depuis un CDN : indispensable au mode edge hors ligne (CDC TEGS-Edge, zero
// dependance externe). Sans dracoDecoderLocation, model-viewer va chercher le decodeur
// sur www.gstatic.com, et aucune simulation CRNS (compressees en Draco) ne s'affiche.

export const MODEL_VIEWER_SRC = '/vendor/model-viewer/3.5.0/model-viewer.min.js';
export const DRACO_DECODER_PATH = '/vendor/draco/';

export function useModelViewer(): void {
  useHead({
    script: [
      {
        // Lu par model-viewer au chargement : doit s'executer avant le module ci-dessous
        // (script classique, donc avant les modules differes).
        key: 'model-viewer-config',
        innerHTML: `self.ModelViewerElement=Object.assign(self.ModelViewerElement||{},{dracoDecoderLocation:'${DRACO_DECODER_PATH}'});`,
      },
      { key: 'model-viewer-script', src: MODEL_VIEWER_SRC, type: 'module' },
    ],
  });
}
