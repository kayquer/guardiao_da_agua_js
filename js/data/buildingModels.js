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
 *              da Kenney já fica em -Z, de frente para a câmera isométrica (CAMERA.ISOMETRIC_ALPHA = -45°)
 *   yOffset    deslocamento vertical em unidades do mundo, depois de assentar a base no chão (padrão 0)
 *   tint       '#rrggbb' multiplicado sobre a cor da textura (padrão branco = sem tinta)
 *
 * Encaixe automático (BuildingModels.js): pela caixa envolvente do modelo, base no chão, centro na
 * área do prédio e o maior lado do chão ocupando BUILDING_MODEL_FILL do `size` em células. Se a altura
 * passar de BUILDING_MODEL_MAX_HEIGHT × esse lado, o modelo inteiro encolhe até caber (torres finas
 * ficariam gigantes perto do resto da cidade).
 *
 * Modelos: Kenney (www.kenney.nl), City Kit Commercial 2.1, Suburban 2.0 e Industrial 2.0 — CC0
 * (models/buildings/kenney/<kit>/License.txt).
 * Modelos próprios (blender/<id>.glb): feitos no Blender por script, regeráveis por
 * models/buildings/blender/_src/<id>.py (estilo Kenney: low poly facetado, cores chapadas, sem textura).
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
    treatment_plant:       { file: 'blender/treatment_plant.glb', tris: 1142 },
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
    water_tower:           { file: 'kenney/industrial/water-tower.glb', tris: 968 },
    water_tank:            { file: 'blender/water_tank.glb', tris: 868 },

    // ===== ENERGIA (modelos próprios; as pás da eólica são nós "pas_N" no .glb e giram no jogo) =====
    hydroelectric_plant:   { file: 'blender/hydroelectric_plant.glb', tris: 972 },
    tidal_plant:           { file: 'blender/tidal_plant.glb', tris: 640 },
    solar_farm:            { file: 'blender/solar_farm.glb', tris: 944 },
    wind_farm:             { file: 'blender/wind_farm.glb', tris: 846 },
    nuclear_plant:         { file: 'blender/nuclear_plant.glb', tris: 1488 },
    biomass_plant:         { file: 'blender/biomass_plant.glb', tris: 1056 },
    sugarcane_mill:        { file: 'blender/sugarcane_mill.glb', tris: 1440 },
    // escondidas em FEATURE_FLAGS.HIDDEN_BUILDINGS (prontas para quando voltarem)
    power_pole:            { file: 'blender/power_pole.glb', tris: 264 },
    thermal_plant:         { file: 'blender/thermal_plant.glb', tris: 844 },
    coal_plant:            { file: 'blender/coal_plant.glb', tris: 512 },

    // ===== RESIDENCIAL =====
    house:                 { file: 'kenney/suburban/building-type-a.glb', tris: 1174 },
    apartment:             { file: 'kenney/commercial/building-a.glb', tris: 1252 },

    // ===== COMERCIAL =====
    restaurant:            { file: 'kenney/commercial/building-c.glb', tris: 1195 },
    office_building:       { file: 'kenney/commercial/building-skyscraper-a.glb', tris: 1292 },
    bank:                  { file: 'kenney/commercial/building-d.glb', tris: 1100 },
    shopping_center:       { file: 'kenney/industrial/building-p.glb', tris: 1162 },

    // ===== TURISMO =====
    hotel:                 { file: 'kenney/commercial/building-b.glb', tris: 1276 },
    museum:                { file: 'blender/museum.glb', tris: 1238 },
    park:                  { file: 'blender/park.glb', tris: 1484 },
    monument:              { file: 'blender/monument.glb', tris: 1154 },

    // ===== PÚBLICOS =====
    city_hall:             { file: 'blender/city_hall.glb', tris: 1146 },
    school:                { file: 'kenney/suburban/building-type-m.glb', tris: 1112 },
    technical_school:      { file: 'kenney/commercial/building-c.glb', tris: 1195, tint: '#c5cae9' }, // mesmo prédio do restaurante, azulado
    hospital:              { file: 'blender/hospital.glb', tris: 1224 },
    university:            { file: 'blender/university.glb', tris: 1352 },
    fire_station:          { file: 'kenney/industrial/building-h.glb', tris: 698 },
    police_station:        { file: 'kenney/industrial/building-o.glb', tris: 868 },
    research_center:       { file: 'kenney/industrial/building-g.glb', tris: 1242 },
    water_research_center: { file: 'blender/water_research_center.glb', tris: 1112 },
    linear_park:           { file: 'blender/linear_park.glb', tris: 900 },
    green_roof:            { file: 'blender/green_roof.glb', tris: 1332 },
    green_wall:            { file: 'blender/green_wall.glb', tris: 876 },

    // ===== INDUSTRIAL =====
    tech_center:           { file: 'kenney/industrial/building-d.glb', tris: 1158 },
    factory:               { file: 'kenney/industrial/building-e.glb', tris: 1484 },
    port:                  { file: 'kenney/industrial/building-s.glb', tris: 876 }
};
