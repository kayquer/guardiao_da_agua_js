---
name: babylon
description: Como trabalhar com o 3D (Babylon.js) do Guardião da Água — meshes de prédios, materiais, câmera, terreno, modelos OBJ, efeitos, atualização de versão e verificação visual. Use antes de criar ou mudar qualquer mesh, material, luz, câmera, efeito ou modelo 3D, ao criar um prédio novo, ao atualizar a versão do Babylon ou ao investigar algo que "aparece errado" na tela.
---

# Babylon.js no Guardião da Água

## Antes de escrever código Babylon

- **Versão fixa: 9.31.2**, via CDN em `index.html` (`cdn.babylonjs.com/v9.31.2/...`, 4 tags: core, materialsLibrary, loaders, gui). Tudo é global `BABYLON.*` — sem `import`.
- **Consulte a API atual no Context7**, não a memória: `query-docs` com `libraryId: "/babylonjs/documentation"` (uma pergunta por conceito). A API muda entre versões menores — a 9.31 passou a quebrar com `new TransformNode(nome, null)`, que a 9.30 aceitava.
- Comportamento na dúvida? Teste no console do jogo com `?debug` (`window.gameManager.scene`, `.camera`, `.buildingSystem`).

## Onde fica cada coisa

| O quê | Onde |
|---|---|
| Engine, cena, câmera `ArcRotateCamera`, luzes (Hemispheric + Directional), `ShadowGenerator` | `js/core/GameManager.js` (`gm.scene`, `gm.camera`, `gm.shadowGenerator`) |
| Controle da câmera (pan/zoom/rotação, suavização) | `js/systems/SimCityCameraControls.js` — o loop faz `camera.target` convergir para `targetPosition` e trava `beta = π/3.5`; mexer direto em `camera.target` é desfeito no frame seguinte, use `cameraControls.centerCameraOn(x, z, raio)` |
| Grid 40×40, terreno (blocos voxel em pedaços 10×10, cor de vértice), água (um ShaderMaterial) | `js/core/GridManager.js` — `cellSize` = 2 (`GAME_CONFIG.grid`), `gridToWorld(x, z)`, `worldToGrid(pos)` |
| Mesh e material de cada prédio | `js/systems/building/BuildingMeshes.js` (mixin de `BuildingSystem`) |
| Rótulos, plaquinhas, celebração, indicadores de obra | `js/systems/building/BuildingFeedback.js` |
| Escala/altura dos prédios | `BUILDINGS` em `js/config/GameConstants.js` (`SCALE_FACTOR`, `BASE_HEIGHT`, `CATEGORY_HEIGHT_MODIFIERS`) |
| Dados do prédio (`size`, `color`, `category`) | `js/data/buildings.js` |
| Retratos 3D (2ª engine + 2ª cena, modelos OBJ) | `js/systems/TutorialSystem.js`, `js/systems/GameOverSystem.js` |
| Seleção e overlay de construção | `js/core/game/SelectionVisuals.js` |
| Árvores (bosques low poly com `InstancedMesh`, técnica do QuickTreeGenerator) | `js/systems/TreeSystem.js` — modelos escondidos (`isVisible = false`) + uma instância por árvore; balanço do vento em `WeatherEffects.updateTrees` |
| Clima real no mundo 3D (chuva/neve em partículas, nuvens, vento com direção e rajadas nas árvores/nuvens/chuva, riscos de vento forte, neblina, relâmpago, sol forte) | `js/systems/WeatherEffects.js` — luz ajustada dentro de `GameManager.updateDayNightLighting()` via `applyToLighting()`; nuvens e emissor de chuva **abaixo da câmera** (~18-25 de altura) |

## Prédios: o caminho que roda de verdade

`placeBuilding()` → `createBuildingMesh()` → `createStandardizedBuildingMesh()` tenta primeiro o **modelo .glb** (`createBuildingModelMesh`, tabela `js/data/buildingModels.js`) e, sem modelo pronto, escolhe o procedural por **categoria** (`createStandardized<Categoria>Mesh(buildingType, dimensions)`); depois dá nome único (`<nome>#<uniqueId>`), posiciona, aplica material (só se o mesh não tiver), sombra, ajuste ao terreno, sombra falsa, metadata e rótulo.

- `dimensions` vem de `getStandardizedBuildingDimensions()`: `width/depth = size × cellSize × SCALE_FACTOR`, `height` pela categoria. Desenhe **relativo a `dimensions`**, nunca com números absolutos — senão o prédio não acompanha `size`.
- Monte peças com `BABYLON.MeshBuilder.Create*(..., this.scene)` e junte com `this.mergeVisibleMeshes([peças], nome, material?)` (`BuildingSystem.js`) — `MergeMeshes` com `multiMultiMaterials: true`, descarta as peças. Um mesh por prédio mantém seleção, sombra e descarte simples.
- **Prévia de posicionamento** (`createPreviewMesh` em `BuildingSystem.js`): usa o **modelo .glb** (`createBuildingModelPreviewMesh`, clone do modelo-base com material próprio translúcido, não clicável) e é posicionada como o prédio final. `createSpecializedMesh` / `createBasicMesh` (parte de baixo de `BuildingMeshes.js`) são o caminho **legado**, só reserva da prévia enquanto o `.glb` carrega ou para tipos sem modelo. Prédio novo: implemente no caminho padronizado.
- **Modelos .glb** (`js/systems/building/BuildingModels.js`): para dar modelo a um prédio, ponha o `.glb` em `models/buildings/` e uma linha em `BUILDING_MODELS` (`file`, `tris` ≤ 1.500 — `tests/unit/models.test.js` confere). O encaixe é automático pela caixa envolvente (base no chão, centro, 90% do `size`, altura limitada); só use `scale`/`rotationY`/`yOffset`/`tint` se a foto pedir. Cada arquivo carrega uma vez (`fetch` + `LoadAssetContainerAsync`), vira um modelo-base escondido por tipo (`modelTemplates` — **nunca descarte**) e cada prédio é `clone()` dele (geometria compartilhada, material próprio). Enquanto carrega ou se falhar (só `console.warn`), fica o procedural; quando fica pronto, `replaceBuildingMesh(antigo, novo)` troca o mesh levando metadata, base no chão, escala/material da obra, sombras, rótulo, ícones, seleção e filhos. Água, tratamento, energia e os prédios cívicos usam modelos próprios do Blender (abaixo).
- Modelo da Kenney: textura `Textures/colormap.png` ao lado do `.glb` e `License.txt` (CC0) na pasta do kit. A fachada já olha para -Z (para a câmera isométrica).
- **Modelo próprio (Blender)**: `models/buildings/blender/<id>.glb`, gerado por `_src/<id>.py` (ajudantes em `_src/lib.py`), com o Blender 4.5 sem interface: `blender.exe -b --factory-startup --python models/buildings/blender/_src/<id>.py` (todos: `_src/gerar_todos.py`). Monte com 1 célula = 2 unidades, frente para -Y do Blender e lado +X caprichado (o export gira para a frente cair em -Z do jogo), só cores de material da `PALETA` (viram cor de vértice no carregador), ≤ 1.500 triângulos e ≤ 150 KB. O carregador junta tudo num mesh estático: nós separados (pás `pas_N` da eólica) não animam ainda. Para conferir de perto, além do `npm run screenshots`, vale montar o modelo-base numa laje plana acima do mapa (`bs.requestBuildingModel(tipo)` → `bs.createBuildingModelMesh(tipo)`) e fotografar com a câmera do jogo — o lugar do screenshot muitas vezes fica entre colinas.

## Regras que já custaram bugs

1. **`metadata.buildingId` é obrigatório** no mesh final do prédio: é como clique/toque identificam o prédio (`scene.pick`). Ao trocar ou fundir meshes, copie `metadata`.
2. **Sempre passe a cena** (`this.scene` / `this.portraitScene`) para construtores e `MeshBuilder`. Não dependa da "última cena criada" — há duas cenas (jogo + retrato).
3. **Carregamento async pode terminar depois que a cena morreu.** Guarde a cena antes do `await` e saia se mudou:
   ```js
   const scene = this.portraitScene;
   const result = await BABYLON.SceneLoader.ImportMeshAsync('', pasta, arquivo, scene);
   if (this.portraitScene !== scene) return false;
   ```
4. **Material do prédio**: `createMinecraftBuildingMaterial(tipo)` é o material **do tipo** (cacheado em `this.materials`, com a textura pixelada em `this.dynamicTextures`). Cada prédio recebe um material **próprio** (`applyStandardizedMaterial`, `metadata.perBuilding`) que só reaproveita cor e textura — porque falta de energia, piscada e destaque alteram `mesh.material` e não podem afetar os outros prédios do tipo. `performDisposal` libera esse material sem tocar na textura.
   - **`material.clone()` clona as texturas**, e a cópia de uma `DynamicTexture` nunca fica pronta → o mesh simplesmente não é desenhado. Depois de clonar, devolva a textura original (veja `applyConstructionMaterial`).
   - `mergeVisibleMeshes` sem material usa um cinza **compartilhado** (`getDefaultMergeMaterial()`), que `createBuildingMesh` troca pelo material do prédio. Para um prédio com peças de cores diferentes, dê material às peças antes do merge (aí vira `MultiMaterial` e é preservado).
5. **Descarte**: remova prédio com `removeBuilding(id)` (libera grid, efeitos, rótulo e põe o mesh em `queueForDisposal`). Todo efeito temporário novo precisa se descartar sozinho (mesh, material **e** textura) — cada `DynamicTexture` esquecida vaza memória de GPU.
6. **Overlays 3D** (rótulos, plaquinhas) usam `renderingGroupId = 2` e `billboardMode = BILLBOARDMODE_ALL`; use `createCartoonTextPlate(id, posição, texto, opções)` em vez de criar outro sistema de texto. Nomeie meshes com prefixo + id do prédio (`cartoonText_completion_building_3`) — o script de screenshots e a limpeza dependem disso.
7. **Logs** com `log(...)`, nunca `console.log`; `console.error` reprova o smoke test.
8. **Modelos OBJ** ficam em `models/`; as animações procedurais dos retratos acham partes pelo **nome do mesh** (`eye/olho`, `hair/cabelo`, `arm/braco`, `head/cabeca`, `body/torso`).
9. **Luz nova recompila o shader de todos os materiais** (engasgo): não crie/apague luz por ação — reaproveite uma e limite com `includedOnlyMeshes` (veja `getSelectionLight` em `SelectionVisuals.js`). Efeito pesado novo deve respeitar a qualidade gráfica (`GraphicsQuality.preset()`: sombras, partículas, nuvens; aplicado ao vivo em `GameManager.applyGraphicsQuality`).

## Terreno e altura dos prédios

- Colinas são ~5% do mapa (`determineTerrainType` + `removeIsolatedHills`); a câmera começa em `gridManager.startArea` (`findStartArea`, ≥ 80% construível).
- Os blocos cinza altos são **colinas** (`hill`, cor de pedra), não água — a água é azul e fica nas bordas. Os blocos ocupam a célula inteira (sem fresta; a borda escura do topo é um chanfro em cor de vértice) e são montados sem Babylon em `buildTerrainGeometry`/`buildWaterGeometry` (testados em `world.test.js`), um mesh por pedaço de 10×10 células. O mesh `terrain` é o chão sob os blocos voxel (aparece só sob a água): cada vértice fica `GridManager.TERRAIN_FLOOR_GAP` abaixo do topo mais baixo dos blocos que toca (`getTerrainFloorHeight`), então nunca passa por cima de um bloco. Mudou vértice de um mesh do `CreateGround`? Use `setVerticesData` (o buffer não é atualizável: `updateVerticesData` só muda a cópia da CPU, que o pick usa e a GPU não desenha) e `refreshBoundingInfo()`.
- Pick de célula do terreno (posicionar, prévia, informações): `GameManager.pickTerrainCell(x, y)` — acerta os blocos, a água e o chão; não filtre por nome de mesh à mão.
- A altura de cada bloco vem de `GridManager.getTerrainBlockHeight(x, z)` (colina ≫ pastagem > planície). `adjustBuildingToTerrain` assenta o prédio no bloco **mais alto da área que ele ocupa** — use sempre essa função, nunca uma fórmula de elevação própria.
- Sombras: casters vão em `gameManager.shadowGenerator` (não existe `scene.shadowGenerator`).

## Verificar o resultado

1. `npm run test:unit` e `npm test` (E2E com `--workers=1` local; `npm run test:headed -- --workers=1` para ver o navegador). O E2E `todo prédio visível pode ser construído` garante que todo prédio gera mesh — mas **não** que ele fica bonito.
2. **Verificação visual**: `npm run screenshots -- <ids...>` fotografa cada prédio sozinho (sem HUD, sem rótulo, sem efeitos de conclusão) em `screenshots/buildings/<id>.png` + `index.html` com a grade. Sem ids = todos os visíveis (~2 min). `--labels` mantém os rótulos; `--out <pasta>` muda o destino.
   - **Antes/depois**: rode `--out screenshots/antes` antes da mudança e `--out screenshots/depois` depois; abra as duas imagens com Read e compare.
   - O script sai com código 1 se algum prédio ficar sem foto ou houver `console.error`.
3. Depois de mudar `js/` ou `css/`, `npm run cache-bust` e comite o `index.html` junto.

## Atualizar a versão do Babylon

1. `npm view babylonjs dist-tags` → versão `latest`.
2. Confirme que existe no CDN: `https://cdn.babylonjs.com/v<versão>/babylon.js` (nem toda versão do npm é publicada no CDN).
3. Troque as **4** URLs no `index.html` e a versão nesta skill e no `CLAUDE.md`.
4. Rode `npm test -- --workers=1` **e** `npm run screenshots -- --out screenshots/v<versão>`, comparando com as fotos da versão anterior.
5. Quebrou? Leia o changelog (`https://github.com/BabylonJS/Babylon.js/releases`) e consulte o Context7.

## MCP oficial do Babylon (quando valer a pena)

`@babylonjs/mcp-servers` edita grafos dos editores visuais (NME materiais, NPE partículas, NGE geometria, GUI, Flow Graph). O jogo hoje não usa nenhum desses — tudo é `MeshBuilder` em código. Só vale configurar ao criar um efeito específico (ex.: material de água animada no NME, chuva/fumaça no NPE): `claude mcp add babylon-nme -- npx -y @babylonjs/mcp-servers nme`.
