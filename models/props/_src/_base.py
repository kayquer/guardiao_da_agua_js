"""Ponte para a lib dos prédios: os props usam as mesmas peças, paleta e exportação (models/buildings/blender/_src/lib.py)."""
import os
import sys

LIB = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'buildings', 'blender', '_src')
sys.path.insert(0, os.path.abspath(LIB))
import lib as L  # noqa: E402,F401
