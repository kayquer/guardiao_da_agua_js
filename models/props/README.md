# Kit Cidade Sustentável (props low-poly)

Peças pequenas de cenário no mesmo estilo dos prédios próprios (`models/buildings/blender/`): cor lisa da
`PALETA`, flat shading, bevel leve, sem textura nem UV, frente para -Y no Blender (vira -Z no jogo, como os prédios).
Ainda **não** são carregadas pelo jogo.

| Peça | Grupo | Tris |
|---|---|---|
| `lixeira_seletiva` | rua | 936 |
| `poste_solar` | rua | 320 |
| `banco_praca` | rua | 420 |
| `bicicletario` | rua | 476 |
| `ponto_onibus` (telhado verde) | rua | 480 |
| `bebedouro` | rua | 472 |
| `hidrante` | rua | 422 |
| `barril_chuva` | água | 672 |
| `cisterna` (de placas) | água | 600 |
| `boia_rio` (monitoramento) | água | 364 |
| `canoa` | água | 296 |
| `placa_educativa` | água | 274 |
| `ipe_amarelo` | natureza | 388 |
| `araucaria` | natureza | 548 |
| `buriti` | natureza | 636 |
| `arbustos` | natureza | 200 |
| `pedras` | natureza | 108 |
| `horta` | natureza | 494 |
| `composteira` | natureza | 1332 |

## Gerar

```bash
BLENDER="C:/Program Files/Blender Foundation/Blender 4.5/blender.exe"
"$BLENDER" -b --factory-startup --python models/props/_src/<id>.py        # uma peça → models/props/<id>.glb
"$BLENDER" -b --factory-startup --python models/props/_src/gerar_todos.py # todas + tabela tris/KB
"$BLENDER" -b --factory-startup --python models/props/_src/vitrine.py -- saida.png [cena.blend]
```

- `_src/_base.py` importa a `lib.py` dos prédios: mesmas peças (`caixa`, `cilindro`, `cano`, `esfera`…) e paleta.
- Orçamento igual ao dos prédios: ≤ 1.500 triângulos e ≤ 150 KB por peça.
- Escala: a mesma dos prédios (1 célula = 2 unidades); a lixeira tem a altura dos contêineres do Ponto de Coleta.
- `vitrine.py` põe as peças em fileiras (altas ao fundo); peça nova fora da lista `FILEIRAS` entra numa fileira extra.
