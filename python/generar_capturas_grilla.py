#!/usr/bin/env python3
import os, matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
from simulacion_ac import AutomataIncendio

def generar_secuencia_grilla(output_path="graficos/evolucion_cuadricula.png"):
    os.makedirs("graficos", exist_ok=True)
    cmap = ListedColormap(['#18181b', '#22c55e', '#ef4444', '#71717a'])
    pasos_objetivo = [0, 5, 12, 25]
    fig, axes = plt.subplots(1, 4, figsize=(15, 3.8), dpi=150)
    plt.style.use('dark_background')
    fig.suptitle("Evolucion Espacio-Temporal del Fuego en el Automata Celular 2D", fontsize=13, fontweight='bold', y=0.98)
    ac, max_paso = AutomataIncendio(35, 35, prob_propagacion=0.75, densidad=0.70), max(pasos_objetivo)

    for g in range(max_paso + 1):
        if g in pasos_objetivo:
            ax = axes[pasos_objetivo.index(g)]
            ax.imshow(ac.matriz, cmap=cmap, vmin=0, vmax=3, interpolation='nearest')
            m = ac.metricas()
            ax.set_title(f"Gen {g} | Fuego: {m['fuego_pct']:.1f}% | Arboles: {m['arboles_pct']:.1f}%", fontsize=9, fontweight='bold')
            ax.axis('off')
        if g < max_paso: ac.paso()

    plt.tight_layout(); plt.savefig(output_path, bbox_inches='tight'); plt.close()
    print(f"Secuencia guardada en: {output_path}")

if __name__ == "__main__":
    generar_secuencia_grilla()
