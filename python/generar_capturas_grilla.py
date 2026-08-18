#!/usr/bin/env python3
"""
========================================================================================
GENERADOR DE SECUENCIAS DE CUADRÍCULAS 2D (Grid Evolution Snapshot Generator)
Archivo: python/generar_capturas_grilla.py
Asignatura: Inteligencia Artificial
========================================================================================

Este script ejecuta los experimentos del autómata celular y captura la matriz visual 2D
en pasos temporales representativos (ej. t=0, t=8, t=16, t=32) para documentar
la evolución espacial y los frentes de fuego en el informe técnico.
"""

# Importamos el módulo 'os' para manejo de directorios y rutas del sistema operativo
import os
# Importamos la librería 'matplotlib' para la creación y renderizado de gráficos e imágenes
import matplotlib
# Activamos el backend 'Agg' (modo sin interfaz gráfica / headless) para generar PNGs en segundo plano
matplotlib.use('Agg')
# Importamos el módulo 'pyplot' con el alias 'plt' para construir las figuras y los subgráficos
import matplotlib.pyplot as plt
# Importamos 'ListedColormap' para crear un mapa de colores discreto personalizado para los 5 estados
from matplotlib.colors import ListedColormap
# Importamos NumPy para operaciones numéricas y matrices
import numpy as np

# Importamos la clase del autómata celular y las constantes numéricas de los 5 estados desde 'simulacion_ac.py'
from simulacion_ac import ForestFireAutomaton, STATE_EMPTY, STATE_GRASS, STATE_FOREST, STATE_FIRE, STATE_ASH

# Definimos la función principal para generar las imágenes de evolución en cuadrícula
def generate_grid_evolution_snapshots(output_dir="graficos"):
    """Simula los escenarios y genera tiras de 4 fotos de la cuadrícula en distintos tiempos."""
    
    # Verificamos si la carpeta de destino 'graficos' existe en el disco
    if not os.path.exists(output_dir):
        # Si no existe, creamos la carpeta en el sistema
        os.makedirs(output_dir)

    # Creamos un mapa de colores personalizado asociando cada entero (0 al 4) con su color hexadecimal:
    # 0 -> '#1e293b' (Pizarra oscura / Suelo vacío o roca mineral)
    # 1 -> '#22c55e' (Verde esmeralda vivo / Pastizal)
    # 2 -> '#15803d' (Verde bosque profundo / Bosque denso)
    # 3 -> '#ef4444' (Rojo fuego / Foco de llamas activas)
    # 4 -> '#64748b' (Gris ceniza / Terreno quemado)
    cmap = ListedColormap(['#1e293b', '#22c55e', '#15803d', '#ef4444', '#64748b'])

    # Definimos la lista de los 3 escenarios científicos que vamos a fotografiar paso a paso:
    scenarios = [
        # Escenario 1: Expansión radial simétrica sin viento
        {
            "name": "evolucion_exp1_isotropo",                               # Nombre base del archivo de imagen
            "title": "Experimento 1: Propagación Isótropa (Calma)",          # Título superior de la figura
            "preset": "dense_forest",                                         # Tipo de bosque inicial
            "wind_speed": 0.0,                                                # Velocidad del viento: 0 (Calma)
            "wind_angle": 0,                                                  # Dirección del viento: 0 grados
            "humidity": 0.10,                                                 # Humedad ambiental baja: 10%
            "steps": [0, 8, 16, 32]                                           # Generaciones exactas a fotografiar
        },
        # Escenario 2: Deformación elíptica por viento fuerte hacia el Este (→)
        {
            "name": "evolucion_exp2_viento_este",
            "title": "Experimento 2: Viento Fuerte hacia el Este (→)",
            "preset": "mixed_forest",
            "wind_speed": 0.9,                                                # Viento muy fuerte: 90%
            "wind_angle": 0,                                                  # Dirección Este (0 grados)
            "humidity": 0.15,                                                 # Humedad: 15%
            "steps": [0, 6, 14, 28]                                           # Pasos temporales a capturar
        },
        # Escenario 3: Detención y contención en la barrera cortafuegos central
        {
            "name": "evolucion_exp3_cortafuegos",
            "title": "Experimento 3: Contención con Barrera Cortafuegos",
            "preset": "firebreak_demo",                                       # Escenario con franja mineral
            "wind_speed": 0.6,                                                # Viento moderado: 60%
            "wind_angle": 0,                                                  # Dirección Este (0 grados)
            "humidity": 0.20,                                                 # Humedad: 20%
            "steps": [0, 8, 18, 35]                                           # Pasos temporales a capturar
        }
    ]

    # Recorremos cada uno de los 3 escenarios configurados arriba:
    for sc in scenarios:
        # Creamos una figura dividida en 1 fila y 4 columnas de subgráficos con tamaño de 16x4.2 pulgadas y 150 DPI
        fig, axes = plt.subplots(1, 4, figsize=(16, 4.2), dpi=150)
        # Aplicamos fondo negro/oscuro elegante a la figura
        plt.style.use('dark_background')
        # Colocamos el título principal arriba centrado
        fig.suptitle(sc["title"], fontsize=14, fontweight='bold', y=0.98)

        # Instanciamos el motor del autómata celular con las dimensiones (45x30) y parámetros del escenario
        ca = ForestFireAutomaton(width=45, height=30, wind_speed=sc["wind_speed"],
                                 wind_angle_deg=sc["wind_angle"], humidity=sc["humidity"])
        # Inicializamos la cuadrícula con el patrón correspondiente
        ca.reset(sc["preset"])

        # Obtenemos la lista de los 4 pasos temporales que queremos fotografiar (ej. [0, 8, 16, 32])
        target_steps = sc["steps"]
        # Índice para saber en cuál de los 4 subgráficos (de 0 a 3) vamos a dibujar
        step_idx = 0
        # Calculamos la generación máxima a la que debemos llegar
        max_step = max(target_steps)

        # Bucle temporal: avanzamos generación por generación desde 0 hasta el paso máximo
        for g in range(max_step + 1):
            # Si la generación actual 'g' coincide con uno de los pasos que queremos fotografiar:
            if g in target_steps:
                # Seleccionamos el subgráfico correspondiente de la columna
                ax = axes[step_idx]
                # Pintamos la matriz bidimensional de estados usando el mapa de colores oficial
                ax.imshow(ca.grid, cmap=cmap, vmin=0, vmax=4, interpolation='nearest')
                # Obtenemos las estadísticas de la generación actual para leer el % de fuego
                stats = ca.get_latest_stats()
                # Colocamos el título individual sobre la foto con la generación y el fuego activo
                ax.set_title(f"Gen {g} | Fuego: {stats['pct'][STATE_FIRE]:.1f}%", fontsize=11, fontweight='bold')
                # Ocultamos los números de los ejes X e Y para que la cuadrícula se vea limpia
                ax.axis('off')
                # Avanzamos al siguiente subgráfico
                step_idx += 1

            # Si aún no hemos llegado a la última generación objetivo:
            if g < max_step:
                # Avanzamos un paso temporal síncrono en el autómata
                ca.step()

        # Ajustamos los espacios entre los 4 cuadros para que queden perfectamente alineados
        plt.tight_layout()
        # Construimos la ruta completa del archivo PNG de salida (ej. 'graficos/evolucion_exp1_isotropo.png')
        out_file = os.path.join(output_dir, f"{sc['name']}.png")
        # Guardamos la tira de 4 imágenes en el disco en alta resolución
        plt.savefig(out_file, bbox_inches='tight')
        # Cerramos la figura para liberar la memoria RAM
        plt.close()
        # Mostramos mensaje de confirmación en la consola
        print(f" Captura de evolución generada: {out_file}")

# Punto de entrada si se ejecuta el script directamente desde la terminal con 'python3 python/generar_capturas_grilla.py'
if __name__ == "__main__":
    # Ejecutamos la función para generar las imágenes de los 3 experimentos
    generate_grid_evolution_snapshots()
