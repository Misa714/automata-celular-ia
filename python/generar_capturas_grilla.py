#!/usr/bin/env python3
"""
GENERADOR DE CAPTURAS ESPACIO-TEMPORALES DE LA CUADRÍCULA 2D
Exporta una figura comparativa con 4 momentos clave de la evolución del incendio.
"""

# Importación de módulos de sistema, Matplotlib y Colormap
import os, matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap
from simulacion_ac import AutomataIncendio

# Función que genera la secuencia visual en 4 subgráficos (Generaciones 0, 5, 12 y 25)
def generar_secuencia_grilla(output_path="graficos/evolucion_cuadricula.png"):
    # Crea la carpeta de salida si no existe
    os.makedirs("graficos", exist_ok=True)
    # Mapeo de colores: 0->Negro (Vacío), 1->Verde (Árbol), 2->Rojo (Fuego), 3->Gris (Ceniza)
    cmap = ListedColormap(['#18181b', '#22c55e', '#ef4444', '#71717a'])
    # Pasos de tiempo específicos a capturar
    pasos_objetivo = [0, 5, 12, 25]
    # Crea la figura con 1 fila y 4 columnas
    fig, axes = plt.subplots(1, 4, figsize=(15, 3.8), dpi=150)
    plt.style.use('dark_background')
    fig.suptitle("Evolucion Espacio-Temporal del Fuego en el Automata Celular 2D", fontsize=13, fontweight='bold', y=0.98)
    # Instancia el autómata con tamaño 35x35
    ac, max_paso = AutomataIncendio(35, 35, prob_propagacion=0.75, densidad=0.70), max(pasos_objetivo)

    # Itera desde la generación 0 hasta la generación máxima requerida
    for g in range(max_paso + 1):
        if g in pasos_objetivo:
            ax = axes[pasos_objetivo.index(g)] # Selecciona el subgráfico correspondiente
            ax.imshow(ac.matriz, cmap=cmap, vmin=0, vmax=3, interpolation='nearest') # Renderiza la matriz
            m = ac.metricas()
            ax.set_title(f"Gen {g} | Fuego: {m['fuego_pct']:.1f}% | Arboles: {m['arboles_pct']:.1f}%", fontsize=9, fontweight='bold')
            ax.axis('off') # Oculta los ejes para visualización limpia
        if g < max_paso: ac.paso() # Avanza un paso en la simulación

    # Ajusta márgenes y guarda la imagen en formato PNG
    plt.tight_layout(); plt.savefig(output_path, bbox_inches='tight'); plt.close()
    print(f"Secuencia guardada en: {output_path}")

# Punto de entrada para ejecución directa
if __name__ == "__main__":
    generar_secuencia_grilla()
