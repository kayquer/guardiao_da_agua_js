# Props de cenário

Cópias dos modelos do **Kit Props Brasil Low Poly** (repositório próprio, `../kit-props-brasil-lowpoly`,
CC0) e, para os bichos com `kit: 'fauna/…'` em `js/data/props.js`, do **Kit Fauna Ameaçada Low Poly**
(`../kit-fauna-ameacada-lowpoly`, CC0), gerados no Blender por um script por peça. **Não edite aqui**:
mude o script no kit, gere de novo e copie com

```bash
node scripts/sync-props.js            # ou: node scripts/sync-props.js <pasta do kit>
```

O script copia só os ids de `js/data/props.js` e apaga os `.glb` que saíram da tabela. Orçamento:
`PROP_SETTINGS.MAX_TRIS` (150 triângulos; bichos do kit de fauna `MAX_TRIS_FAUNA`, 800), sem textura (`tests/unit/props.test.js`). Onde e quando cada um
aparece: `js/data/props.js` + `js/systems/props/PropPlanner.js`; desenho: `js/systems/PropSystem.js`.
