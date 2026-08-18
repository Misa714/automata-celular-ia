#!/usr/bin/env python3
"""
========================================================================================
GENERADOR DE SECUENCIAS DE CUADRÍCULAS 2D (Grid Evolution Snapshot Generator)
Archivo: python/generar_capturas_grilla.py
Asignatura: Inteligencia Artificial
========================================================================================

Este script ejecuta los experimentos del autómata y captura la matriz visual 2D
en pasos temporales representativos (t=0, t=8, t=16, t=32) para documentar
la evolución espacial en el informe técnico.
"""

import os
import matplotlib
# Modo headless sin GUI
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
import numpy as np

# Importamos el motor del autómata y las constantes de estados
from simulacion_ac import ForestFireAutomaton, STATE_EMPTY, STATE_GRASS, STATE_FOREST, STATE_FIRE, STATE_ASH

def generate_grid_evolution_snapshots(output_dir="graficos"):
    """Simula los escenarios y genera tiras de 4 fotos de la cuadrícula en distintos tiempos."""
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Mapa de colores del autómata:
    # 0: Slate oscuro (vacío), 1: Verde claro (pasto), 2: Verde oscuro (bosque), 3: Rojo (fuego), 4: Gris (cenizas)
    cmap = ListedColormap(['#1e293b', '#22c55e', '#15803d', '#ef4444', '#64748b'])

    # Configuración de los 3 escenarios a fotografiar en el tiempo
    scenarios = [
        {
            "name": "evolucion_exp1_isotropo",
            "title": "Experimento 1: Propagación Isótropa (Calma)",
            "preset": "dense_forest",
            "wind_speed": 0.0,
            "wind_angle": 0,
            "humidity": 0.10,
            "steps": [0, 8, 16, 32]                         # Pasos temporales a capturar
        },
        {
            "name": "evolucion_exp2_viento_este",
            "title": "Experimento 2: Viento Fuerte hacia el Este (→)",
            "preset": "mixed_forest",
            "wind_speed": 0.9,
            "wind_angle": 0,
            "humidity": 0.15,
            "steps": [0, 6, 14, 28]
        },
        {
            "name": "evolucion_exp3_cortafuegos",
            "title": "Experimento 3: Contención con Barrera Cortafuegos",
            "preset": "firebreak_demo",
            "wind_speed": 0.6,
            "wind_angle": 0,
            "humidity": 0.20,
            "steps": [0, 8, 18, 35]
        }
    ]

    # Recorremos cada escenario
    for sc in scenarios:
        # Creamos una fila de 4 subgráficos (1 fila x 4 columnas)
        fig, axes = plt.subplots(1, 4, figsize=(16, 4.2), dpi=150)
        plt.style.use('dark_background')
        fig.suptitle(sc["title"], fontsize=14, fontweight='bold', y=0.98)

        # Instanciamos el autómata celular
        ca = ForestFireAutomaton(width=45, height=30, wind_speed=sc["wind_speed"],
                                 wind_angle_deg=sc["wind_angle"], humidity=sc["humidity"])
        ca.reset(sc["preset"])

        target_steps = sc["steps"]
        step_idx = 0
        max_step = max(target_steps)

        # Avanzamos generación por generación hasta el máximo paso
        for g in range(max_step + 1):
            # Si la generación actual está en la lista de objetivos a fotografiar:
            if g in target_steps:
                ax = axes[step_idx]
                # Pintamos la matriz 2D con el mapa de colores oficial
                ax.imshow(ca.grid, cmap=cmap, vmin=0, vmax=4, interpolation='nearest')
                stats = ca.get_latest_stats()
                # Ponemos el título con la generación y el porcentaje de fuego
                ax.set_title(f"Gen {g} | Fuego: {stats['pct'][STATE_FIRE]:.1f}%", fontsize=11, fontweight='bold')
                ax.axis('off')                              # Ocultamos los ejes numéricos para limpieza visual
                step_idx += 1

            if g < max_step:
                ca.step()                                   # Avanzamos al siguiente paso

        plt.tight_layout()
        out_file = os.path.join(output_dir, f"{sc['name']}.png")
        plt.savefig(out_file, bbox_inches='tight')          # Guardamos la imagen PNG
        plt.close()
        print(f" Captura de evolución generada: {out_file}")

if __name__ == "__main__":
    generate_grid_evolution_snapshots()
