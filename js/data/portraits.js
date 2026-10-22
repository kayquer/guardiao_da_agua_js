/**
 * Manifesto dos retratos animados (AnimatedPortrait), gerado a partir das imagens de IA (ver assets/images/_prompts.json).
 * Arquivos em assets/characters/<id>/: portrait.webp (base, PORTRAIT_SIZE x PORTRAIT_SIZE) e <camada>.webp.
 * Caixas em px da base: layers[nome] = [x, y, w, h]; face = quadrado do rosto (recorte dos retratos pequenos).
 * Camadas: eyes (piscar), mouth-a / mouth-o (fala), worried / happy (expressões).
 */
const PORTRAIT_SIZE = 640;
const PORTRAIT_MANIFEST = {
    claudia: {
        face: [228, 43, 245, 245],
        layers: { 'eyes': [313, 116, 141, 72], 'mouth-a': [316, 205, 90, 74], 'mouth-o': [314, 203, 93, 64], 'worried': [191, 0, 319, 334], 'happy': [191, 0, 319, 334] }
    },
    marcia: {
        face: [238, 133, 197, 197],
        layers: { 'eyes': [284, 176, 142, 69], 'mouth-a': [322, 247, 80, 91], 'mouth-o': [249, 250, 156, 90], 'worried': [197, 84, 279, 295], 'happy': [197, 84, 279, 295] }
    },
    jose: {
        face: [202, 82, 269, 269],
        layers: { 'eyes': [230, 117, 211, 109], 'mouth-a': [274, 224, 121, 123], 'mouth-o': [244, 205, 183, 142], 'worried': [181, 37, 311, 359], 'happy': [181, 37, 311, 359] }
    }
};
