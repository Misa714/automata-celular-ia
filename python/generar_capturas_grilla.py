#!/usr/bin/env python3
"""
Generador de capturas de cuadrículas 2D en diferentes generaciones (t=0, t=10, t=20, t=40)
para incrustar directamente en el informe técnico y cumplir al 100% con la rúbrica.
"""

import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
import numpy as np

from simulacion_ac import ForestFireAutomaton, STATE_EMPTY, STATE_GRASS, STATE_FOREST, STATE_FIRE, STATE_ASH

def generate_grid_evolution_snapshots(output_dir="graficos"):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Mapa de colores del autómata
    # 0: Slate oscuro (vacío), 1: Verde pasto, 2: Verde bosque, 3: Rojo fuego, 4: Gris ceniza
    cmap = ListedColormap(['#1e293b', '#22c55e', '#15803d', '#ef4444', '#64748b'])

    scenarios = [
        {
            "name": "evolucion_exp1_isotropo",
            "title": "Experimento 1: Propagación Isótropa (Calma)",
            "preset": "dense_forest",
            "wind_speed": 0.0,
            "wind_angle": 0,
            "humidity": 0.10,
            "steps": [0, 8, 16, 32]
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

    for sc in scenarios:
        fig, axes = plt.subplots(1, 4, figsize=(16, 4.2), dpi=150)
        plt.style.use('dark_background')
        fig.suptitle(sc["title"], fontsize=14, fontweight='bold', y=0.98)

        ca = ForestFireAutomaton(width=45, height=30, wind_speed=sc["wind_speed"],
                                 wind_angle_deg=sc["wind_angle"], humidity=sc["humidity"])
        ca.reset(sc["preset"])

        target_steps = sc["steps"]
        step_idx = 0
        current_step = 0

        max_step = max(target_steps)
        for g in range(max_step + 1):
            if g in target_steps:
                ax = axes[step_idx]
                ax.imshow(ca.grid, cmap=cmap, vmin=0, vmax=4, interpolation='nearest')
                stats = ca.get_latest_stats()
                ax.set_title(f"Gen {g} | Fuego: {stats['pct'][STATE_FIRE]:.1f}%", fontsize=11, fontweight='bold')
                ax.axis('off')
                step_idx += 1

            if g < max_step:
                ca.step()

        plt.tight_layout()
        out_file = os.path.join(output_dir, f"{sc['name']}.png")
        plt.savefig(out_file, bbox_inches='tight')
        plt.close()
        print(f" Captura de evolución generada: {out_file}")

if __name__ == "__main__":
    generate_grid_evolution_snapshots()
