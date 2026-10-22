"""
Regera todos os modelos próprios (cada <id>.py desta pasta → ../<id>.glb) numa única execução do Blender:

    blender.exe -b --factory-startup --python models/buildings/blender/_src/gerar_todos.py

No fim imprime a tabela id → triângulos/KB para conferir `tris` em js/data/buildingModels.js.
"""
import glob
import importlib.util
import os
import sys

PASTA = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PASTA)
import lib as L  # noqa: E402

resumo = []
for caminho in sorted(glob.glob(os.path.join(PASTA, '*.py'))):
    nome = os.path.basename(caminho)
    if nome in ('lib.py', 'gerar_todos.py'):
        continue
    spec = importlib.util.spec_from_file_location(nome[:-3], caminho)
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)  # L.principal não gera ao importar (o script do Blender é este arquivo)
    tris = L.gerar(caminho, modulo.construir)
    kb = os.path.getsize(os.path.join(os.path.dirname(PASTA), nome[:-3] + '.glb')) / 1024
    resumo.append((nome[:-3], tris, kb))

print('\nid'.ljust(26) + 'tris'.rjust(6) + 'KB'.rjust(8))
for nome, tris, kb in resumo:
    alerta = '  <-- acima do orçamento' if tris > 1500 or kb > 150 else ''
    print(nome.ljust(25) + str(tris).rjust(6) + f'{kb:8.1f}' + alerta)
