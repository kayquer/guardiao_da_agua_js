/**
 * GUARDIÃO DA ÁGUA - MODELOS 3D DOS PRÉDIOS (guia de estilo em dados)
 *
 * id do prédio (js/data/buildings.js) → modelo .glb low poly. Dado puro, sem funções.
 * Quem não está aqui usa o mesh procedural (js/systems/building/BuildingMeshes.js), que também é a
 * reserva enquanto o .glb carrega ou se ele falhar.
 *
 * Campos:
 *   file       caminho relativo a models/buildings/ (texturas são buscadas ao lado do .glb)
 *   tris       triângulos do arquivo (conferido em tests/unit/models.test.js; orçamento ≤ 1.500)
 *   scale      multiplica o encaixe automático (padrão 1)
 *   rotationY  giro em radianos aplicado ao modelo antes de encaixar (padrão 0). A fachada dos modelos
 *              dos kits próprios já fica em -Z, de frente para a câmera isométrica (CAMERA.ISOMETRIC_ALPHA = -45°)
 *   yOffset    deslocamento vertical em unidades do mundo, depois de assentar a base no chão (padrão 0)
 *   tint       '#rrggbb' multiplicado sobre a cor da textura (padrão branco = sem tinta)
 *
 * Encaixe automático (BuildingModels.js): pela caixa envolvente do modelo, base no chão, centro na
 * área do prédio e o maior lado do chão ocupando BUILDING_MODEL_FILL do `size` em células. Se a altura
 * passar de BUILDING_MODEL_MAX_HEIGHT × esse lado, o modelo inteiro encolhe até caber (torres finas
 * ficariam gigantes perto do resto da cidade).
 *
 * Modelos: Kit Prédios Brasil Low Poly (brasil/<grupo>/<id>.glb, CC0, github.com/kayquer/kit-predios-brasil-lowpoly,
 * copiados por scripts/sync-buildings.js): casas, sobrados, prédios, comércio, galpões e públicos com cara de cidade
 * brasileira — substituíram os kits da Kenney em 11/2026.
 * Modelos próprios (blender/<id>.glb): feitos no Blender por script, regeráveis por
 * models/buildings/blender/_src/<id>.py (low poly facetado, cores chapadas, sem textura).
 * Água, tratamento e energia só podem usar modelo próprio — o pack não tem nada fiel a essas peças.
 */
const BUILDING_MODEL_FILL = 0.9;
const BUILDING_MODEL_MAX_HEIGHT = 1.6;

const BUILDING_MODELS = {
    // ===== ÁGUA (modelos próprios) =====
    water_pump:            { file: 'blender/water_pump.glb', tris: 440 },
    water_well:            { file: 'blender/water_well.glb', tris: 656 },
    rain_garden:           { file: 'blender/rain_garden.glb', tris: 776 },
    floating_garden:       { file: 'blender/floating_garden.glb', tris: 1212 },
    monitoring_station:    { file: 'blender/monitoring_station.glb', tris: 684 },
    water_quality_monitor: { file: 'blender/water_quality_monitor.glb', tris: 508 },

    // ===== TRATAMENTO (modelos próprios) =====
    treatment_plant:       { file: 'blender/treatment_plant.glb', tris: 1232 }, // ETE (esgoto); a ponte do decantador gira (gira_1)
    water_treatment_plant: { file: 'blender/water_treatment_plant.glb', tris: 1268 }, // ETA (água de rio/lago)
    filter_station:        { file: 'blender/filter_station.glb', tris: 984 },
    // lixo e reciclagem ("gira_N" = peça que gira: exaustor da cooperativa, tambor da composteira)
    recycling_point:       { file: 'blender/recycling_point.glb', tris: 832 },
    recycling_coop:        { file: 'blender/recycling_coop.glb', tris: 1302 },
    landfill:              { file: 'blender/landfill.glb', tris: 1482 },
    composting_yard:       { file: 'blender/composting_yard.glb', tris: 1158 },
    biodigester:           { file: 'blender/biodigester.glb', tris: 1408 },
    water_reuse_plant:     { file: 'blender/water_reuse_plant.glb', tris: 938 },
    loss_control_center:   { file: 'blender/loss_control_center.glb', tris: 964 },
    underground_dam:       { file: 'blender/underground_dam.glb', tris: 592 },
    desalination_plant:    { file: 'blender/desalination_plant.glb', tris: 1468 },
    ecopark:               { file: 'blender/ecopark.glb', tris: 1480 },

    // ===== ARMAZENAMENTO (reservatório = modelo próprio) =====
    water_tower:           { file: 'brasil/industrial/caixa_dagua_taca.glb', tris: 1300 },
    water_tank:            { file: 'blender/water_tank.glb', tris: 868 },

    // ===== ENERGIA (modelos próprios; as pás da eólica são nós "pas_N" no .glb e giram no jogo) =====
    hydroelectric_plant:   { file: 'blender/hydroelectric_plant.glb', tris: 972 },
    tidal_plant:           { file: 'blender/tidal_plant.glb', tris: 640 },
    solar_farm:            { file: 'blender/solar_farm.glb', tris: 944 },
    wind_farm:             { file: 'blender/wind_farm.glb', tris: 846 },
    nuclear_plant:         { file: 'blender/nuclear_plant.glb', tris: 1488 },
    biomass_plant:         { file: 'blender/biomass_plant.glb', tris: 1056 },
    sugarcane_mill:        { file: 'blender/sugarcane_mill.glb', tris: 1440 },
    solar_micro:           { file: 'blender/solar_micro.glb', tris: 956 },
    wind_small:            { file: 'blender/wind_small.glb', tris: 854 },
    small_hydro:           { file: 'blender/small_hydro.glb', tris: 1060 },
    solar_tracker:         { file: 'blender/solar_tracker.glb', tris: 1484 },
    grid_battery:          { file: 'blender/grid_battery.glb', tris: 1280 },
    wind_offshore:         { file: 'blender/wind_offshore.glb', tris: 1490 },
    gas_combined:          { file: 'blender/gas_combined.glb', tris: 1408 },   // ventiladores "gira_N" giram
    solar_floating:        { file: 'blender/solar_floating.glb', tris: 1384 },
    // escondidas em FEATURE_FLAGS.HIDDEN_BUILDINGS (prontas para quando voltarem)
    power_pole:            { file: 'blender/power_pole.glb', tris: 264 },
    thermal_plant:         { file: 'blender/thermal_plant.glb', tris: 844 },
    coal_plant:            { file: 'blender/coal_plant.glb', tris: 512 },

    // ===== RESIDENCIAL =====
    house:                 { file: 'brasil/residencial/casa_terrea.glb', tris: 1048 },
    apartment:             { file: 'brasil/comercial/predio_apartamentos.glb', tris: 1176 },

    // ===== COMERCIAL =====
    restaurant:            { file: 'brasil/comercial/padaria_toldo.glb', tris: 1024 },
    office_building:       { file: 'brasil/comercial/torre_escritorios.glb', tris: 984 },
    bank:                  { file: 'brasil/comercial/predio_banco.glb', tris: 964 },
    shopping_center:       { file: 'brasil/comercial/shopping.glb', tris: 992 },

    // ===== TURISMO =====
    hotel:                 { file: 'brasil/comercial/predio_hotel.glb', tris: 1328 },
    museum:                { file: 'blender/museum.glb', tris: 1238 },
    park:                  { file: 'blender/park.glb', tris: 1484 },
    monument:              { file: 'blender/monument.glb', tris: 1154 },

    // ===== PÚBLICOS =====
    city_hall:             { file: 'blender/city_hall.glb', tris: 1146 },
    school:                { file: 'brasil/publico/escola_estadual.glb', tris: 1176 },
    technical_school:      { file: 'brasil/publico/escola_tecnica.glb', tris: 1128 },
    hospital:              { file: 'blender/hospital.glb', tris: 1224 },
    university:            { file: 'blender/university.glb', tris: 1352 },
    fire_station:          { file: 'brasil/publico/quartel_bombeiros.glb', tris: 1096 },
    police_station:        { file: 'brasil/publico/delegacia.glb', tris: 808 },
    research_center:       { file: 'brasil/industrial/centro_pesquisa.glb', tris: 1344 },
    water_research_center: { file: 'blender/water_research_center.glb', tris: 1112 },
    linear_park:           { file: 'blender/linear_park.glb', tris: 900 },
    green_roof:            { file: 'blender/green_roof.glb', tris: 1332 },
    green_wall:            { file: 'blender/green_wall.glb', tris: 876 },

    // ===== INDUSTRIAL =====
    tech_center:           { file: 'brasil/industrial/galpao_tecnologia.glb', tris: 1272 },
    factory:               { file: 'brasil/industrial/fabrica.glb', tris: 1392 },
    port:                  { file: 'brasil/publico/porto.glb', tris: 1460 }
};
