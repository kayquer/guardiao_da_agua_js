/**
 * Retratos animados dos funcionários da prefeitura (gerado por scripts/portraits/staff.js; não edite à mão).
 * Mesmo formato de PORTRAIT_MANIFEST (js/data/portraits.js): arquivos em assets/characters/<id>/, caixas em px de 640.
 * Id = staff/<cargo>-<f|m>-<n> (n = variante de aparência). lazy = fora do preload crítico
 * (AssetLoader.criticalImages): são muitos e só aparecem quando o funcionário entra em cena.
 */
const STAFF_PORTRAITS = {
    "staff/economista-f-1": { lazy: true, face: [183, 135, 276, 276], layers: { "eyes": [168, 195, 256, 93], "mouth-a": [229, 237, 181, 216], "mouth-o": [144, 228, 288, 229], "happy": [99, 43, 394, 488], "worried": [99, 43, 394, 488] } },
    "staff/economista-f-2": { lazy: true, face: [163, 147, 256, 256], layers: { "eyes": [156, 206, 224, 80], "mouth-a": [200, 246, 176, 197], "mouth-o": [154, 241, 221, 197], "happy": [128, 171, 287, 267], "worried": [161, 159, 222, 277] } },
    "staff/economista-m-1": { lazy: true, face: [149, 107, 289, 289], layers: { "eyes": [138, 174, 264, 88], "mouth-a": [184, 207, 205, 245], "mouth-o": [126, 215, 277, 189], "happy": [125, 31, 270, 348], "worried": [116, 29, 332, 368] } },
    "staff/eng_agronomo-f-1": { lazy: true, face: [256, 116, 238, 238], layers: { "eyes": [247, 176, 216, 64], "mouth-a": [271, 201, 197, 197], "mouth-o": [270, 188, 200, 176], "happy": [260, 154, 186, 241], "worried": [257, 120, 238, 313] } },
    "staff/eng_agronomo-f-2": { lazy: true, face: [184, 119, 254, 254], layers: { "eyes": [188, 175, 213, 85], "mouth-a": [178, 228, 240, 173], "mouth-o": [180, 227, 229, 125], "happy": [203, 153, 186, 248], "worried": [193, 223, 205, 114] } },
    "staff/eng_agronomo-f-3": { lazy: true, face: [220, 138, 289, 289], layers: { "eyes": [233, 211, 237, 77], "mouth-a": [264, 281, 152, 160], "mouth-o": [245, 253, 229, 149], "happy": [244, 164, 241, 241], "worried": [247, 129, 277, 261] } },
    "staff/eng_agronomo-m-1": { lazy: true, face: [192, 160, 247, 247], layers: { "eyes": [179, 221, 232, 80], "mouth-a": [218, 258, 184, 160], "mouth-o": [137, 247, 285, 189], "happy": [177, 92, 283, 342], "worried": [174, 94, 238, 365] } },
    "staff/eng_agronomo-m-2": { lazy: true, face: [140, 109, 303, 303], layers: { "eyes": [162, 186, 216, 80], "mouth-a": [177, 236, 205, 213], "mouth-o": [153, 214, 253, 232], "happy": [105, 59, 313, 407], "worried": [140, 86, 257, 293] } },
    "staff/eng_agronomo-m-3": { lazy: true, face: [157, 136, 278, 278], layers: { "eyes": [164, 203, 221, 80], "mouth-a": [200, 247, 173, 205], "mouth-o": [155, 225, 229, 229], "happy": [185, 182, 186, 251], "worried": [105, 84, 342, 309] } },
    "staff/eng_ambiental-f-1": { lazy: true, face: [229, 78, 190, 190], layers: { "eyes": [213, 113, 184, 80], "mouth-a": [254, 151, 141, 141], "mouth-o": [253, 158, 133, 133], "happy": [225, 103, 166, 160], "worried": [173, 5, 274, 355] } },
    "staff/eng_ambiental-f-2": { lazy: true, face: [221, 92, 209, 209], layers: { "eyes": [212, 138, 192, 69], "mouth-a": [252, 173, 136, 160], "mouth-o": [211, 160, 184, 176], "happy": [228, 115, 163, 166], "worried": [186, 27, 267, 345] } },
    "staff/eng_ambiental-f-3": { lazy: true, face: [206, 90, 238, 238], layers: { "eyes": [191, 135, 224, 96], "mouth-a": [255, 175, 136, 192], "mouth-o": [173, 184, 256, 152], "happy": [194, 115, 222, 254], "worried": [205, 96, 215, 261] } },
    "staff/eng_ambiental-m-1": { lazy: true, face: [244, 97, 242, 242], layers: { "eyes": [254, 154, 197, 72], "mouth-a": [281, 191, 133, 184], "mouth-o": [259, 207, 197, 125], "happy": [265, 130, 170, 209], "worried": [242, 45, 209, 319] } },
    "staff/eng_ambiental-m-2": { lazy: true, face: [252, 84, 196, 196], layers: { "eyes": [246, 129, 168, 61], "mouth-a": [263, 143, 176, 184], "mouth-o": [226, 144, 221, 141], "happy": [215, 37, 225, 254], "worried": [211, 34, 248, 280] } },
    "staff/eng_ambiental-m-3": { lazy: true, face: [186, 77, 238, 238], layers: { "eyes": [182, 127, 216, 85], "mouth-a": [165, 149, 256, 224], "mouth-o": [164, 152, 277, 192], "happy": [157, 48, 254, 293], "worried": [180, 5, 270, 358] } },
    "staff/eng_civil-f-1": { lazy: true, face: [226, 122, 199, 199], layers: { "eyes": [218, 165, 184, 69], "mouth-a": [258, 196, 120, 160], "mouth-o": [219, 191, 181, 160], "happy": [231, 151, 160, 199], "worried": [170, 77, 274, 238] } },
    "staff/eng_civil-f-2": { lazy: true, face: [218, 124, 215, 215], layers: { "eyes": [204, 168, 205, 80], "mouth-a": [259, 216, 128, 141], "mouth-o": [204, 222, 197, 101], "happy": [213, 133, 183, 228], "worried": [209, 133, 196, 183] } },
    "staff/eng_civil-m-1": { lazy: true, face: [208, 115, 196, 196], layers: { "eyes": [197, 159, 189, 64], "mouth-a": [209, 181, 181, 168], "mouth-o": [206, 179, 184, 141], "happy": [149, 77, 283, 300], "worried": [152, 98, 238, 244] } },
    "staff/eng_civil-m-2": { lazy: true, face: [232, 100, 186, 186], layers: { "eyes": [229, 141, 152, 61], "mouth-a": [256, 167, 144, 152], "mouth-o": [220, 164, 189, 152], "happy": [244, 125, 134, 186], "worried": [190, 77, 228, 257] } },
    "staff/eng_civil-m-3": { lazy: true, face: [175, 127, 222, 222], layers: { "eyes": [194, 181, 152, 64], "mouth-a": [222, 238, 112, 120], "mouth-o": [191, 213, 157, 120], "happy": [197, 166, 150, 199], "worried": [196, 153, 163, 160] } },
    "staff/obras-m-1": { lazy: true, face: [195, 130, 243, 243], layers: { "eyes": [180, 186, 229, 77], "mouth-a": [231, 216, 168, 197], "mouth-o": [163, 210, 264, 200], "happy": [127, 88, 326, 332], "worried": [119, 58, 352, 355] } },
    "staff/obras-m-2": { lazy: true, face: [201, 112, 218, 218], layers: { "eyes": [198, 164, 184, 64], "mouth-a": [236, 201, 144, 157], "mouth-o": [200, 181, 189, 184], "happy": [201, 152, 176, 209], "worried": [149, 55, 277, 342] } },
    "staff/servicos-f-1": { lazy: true, face: [250, 118, 253, 253], layers: { "eyes": [236, 186, 237, 64], "mouth-a": [250, 193, 245, 229], "mouth-o": [233, 170, 264, 253], "happy": [245, 171, 215, 179], "worried": [261, 64, 218, 306] } },
    "staff/servicos-f-3": { lazy: true, face: [178, 137, 243, 243], layers: { "eyes": [168, 193, 229, 77], "mouth-a": [206, 224, 168, 197], "mouth-o": [155, 217, 245, 205], "happy": [139, 127, 267, 238], "worried": [126, 78, 329, 355] } },
    "staff/servicos-m-2": { lazy: true, face: [189, 106, 252, 252], layers: { "eyes": [189, 167, 208, 72], "mouth-a": [215, 192, 192, 216], "mouth-o": [185, 192, 229, 165], "happy": [132, 45, 322, 387], "worried": [132, 48, 322, 355] } },
    "staff/servicos-m-3": { lazy: true, face: [194, 87, 203, 203], layers: { "eyes": [191, 137, 184, 56], "mouth-a": [218, 151, 133, 184], "mouth-o": [170, 162, 200, 136], "happy": [189, 31, 192, 309], "worried": [177, 30, 212, 319] } },
    "staff/veterinario-f-1": { lazy: true, face: [209, 109, 248, 248], layers: { "eyes": [197, 162, 232, 85], "mouth-a": [232, 197, 189, 205], "mouth-o": [214, 187, 208, 205], "happy": [203, 122, 231, 212], "worried": [205, 100, 228, 251] } },
    "staff/veterinario-f-2": { lazy: true, face: [203, 99, 237, 237], layers: { "eyes": [191, 151, 221, 80], "mouth-a": [235, 203, 165, 157], "mouth-o": [183, 188, 229, 176], "happy": [207, 139, 192, 176], "worried": [136, 34, 335, 371] } },
    "staff/veterinario-f-3": { lazy: true, face: [175, 148, 224, 224], layers: { "eyes": [167, 192, 208, 85], "mouth-a": [214, 228, 128, 184], "mouth-o": [182, 238, 181, 176], "happy": [147, 114, 215, 348], "worried": [136, 71, 293, 397] } },
    "staff/veterinario-m-1": { lazy: true, face: [202, 114, 209, 209], layers: { "eyes": [188, 156, 200, 77], "mouth-a": [228, 199, 149, 152], "mouth-o": [211, 191, 168, 133], "happy": [201, 119, 176, 238], "worried": [140, 44, 257, 322] } },
    "staff/veterinario-m-2": { lazy: true, face: [193, 111, 229, 229], layers: { "eyes": [187, 165, 208, 69], "mouth-a": [202, 189, 192, 197], "mouth-o": [195, 198, 200, 133], "happy": [186, 121, 205, 261], "worried": [133, 52, 319, 300] } },
    "staff/veterinario-m-3": { lazy: true, face: [173, 86, 237, 237], layers: { "eyes": [174, 143, 205, 69], "mouth-a": [205, 160, 149, 216], "mouth-o": [166, 171, 197, 160], "happy": [173, 45, 189, 342], "worried": [170, 20, 189, 381] } }
};

/** Quem é cada retrato: cargo, gênero (f/m), variante (n do id) e idade usada no prompt. */
const STAFF_PEOPLE = {
    "staff/economista-f-1": {"role": "economista", "gender": "f", "variant": 1, "age": 31},
    "staff/economista-f-2": {"role": "economista", "gender": "f", "variant": 2, "age": 42},
    "staff/economista-m-1": {"role": "economista", "gender": "m", "variant": 1, "age": 38},
    "staff/eng_agronomo-f-1": {"role": "eng_agronomo", "gender": "f", "variant": 1, "age": 41},
    "staff/eng_agronomo-f-2": {"role": "eng_agronomo", "gender": "f", "variant": 2, "age": 52},
    "staff/eng_agronomo-f-3": {"role": "eng_agronomo", "gender": "f", "variant": 3, "age": 27},
    "staff/eng_agronomo-m-1": {"role": "eng_agronomo", "gender": "m", "variant": 1, "age": 48},
    "staff/eng_agronomo-m-2": {"role": "eng_agronomo", "gender": "m", "variant": 2, "age": 59},
    "staff/eng_agronomo-m-3": {"role": "eng_agronomo", "gender": "m", "variant": 3, "age": 34},
    "staff/eng_ambiental-f-1": {"role": "eng_ambiental", "gender": "f", "variant": 1, "age": 28},
    "staff/eng_ambiental-f-2": {"role": "eng_ambiental", "gender": "f", "variant": 2, "age": 39},
    "staff/eng_ambiental-f-3": {"role": "eng_ambiental", "gender": "f", "variant": 3, "age": 50},
    "staff/eng_ambiental-m-1": {"role": "eng_ambiental", "gender": "m", "variant": 1, "age": 35},
    "staff/eng_ambiental-m-2": {"role": "eng_ambiental", "gender": "m", "variant": 2, "age": 46},
    "staff/eng_ambiental-m-3": {"role": "eng_ambiental", "gender": "m", "variant": 3, "age": 57},
    "staff/eng_civil-f-1": {"role": "eng_civil", "gender": "f", "variant": 1, "age": 51},
    "staff/eng_civil-f-2": {"role": "eng_civil", "gender": "f", "variant": 2, "age": 26},
    "staff/eng_civil-m-1": {"role": "eng_civil", "gender": "m", "variant": 1, "age": 58},
    "staff/eng_civil-m-2": {"role": "eng_civil", "gender": "m", "variant": 2, "age": 33},
    "staff/eng_civil-m-3": {"role": "eng_civil", "gender": "m", "variant": 3, "age": 44},
    "staff/obras-m-1": {"role": "obras", "gender": "m", "variant": 1, "age": 32},
    "staff/obras-m-2": {"role": "obras", "gender": "m", "variant": 2, "age": 43},
    "staff/servicos-f-1": {"role": "servicos", "gender": "f", "variant": 1, "age": 38},
    "staff/servicos-f-3": {"role": "servicos", "gender": "f", "variant": 3, "age": 60},
    "staff/servicos-m-2": {"role": "servicos", "gender": "m", "variant": 2, "age": 56},
    "staff/servicos-m-3": {"role": "servicos", "gender": "m", "variant": 3, "age": 31},
    "staff/veterinario-f-1": {"role": "veterinario", "gender": "f", "variant": 1, "age": 54},
    "staff/veterinario-f-2": {"role": "veterinario", "gender": "f", "variant": 2, "age": 29},
    "staff/veterinario-f-3": {"role": "veterinario", "gender": "f", "variant": 3, "age": 40},
    "staff/veterinario-m-1": {"role": "veterinario", "gender": "m", "variant": 1, "age": 25},
    "staff/veterinario-m-2": {"role": "veterinario", "gender": "m", "variant": 2, "age": 36},
    "staff/veterinario-m-3": {"role": "veterinario", "gender": "m", "variant": 3, "age": 47}
};

Object.assign(PORTRAIT_MANIFEST, STAFF_PORTRAITS);
