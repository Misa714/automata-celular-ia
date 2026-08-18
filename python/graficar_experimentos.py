#!/usr/bin/env python3
"""
========================================================================================
GENERADOR DE GRÁFICAS COMPARATIVAS (Matplotlib Chart Generator)
Archivo: python/graficar_experimentos.py
Asignatura: Inteligencia Artificial
========================================================================================

Este script lee el archivo 'experimentos_ac.csv' generado por la simulación
y produce figuras científicas en alta resolución (PNG) listas para el informe.
"""

# Importamos el módulo 'os' para interactuar con el sistema operativo (crear carpetas y rutas de archivos)
import os
# Importamos el módulo 'csv' para leer y procesar archivos de valores separados por comas
import csv
# Importamos la librería 'matplotlib' para la generación de gráficos científicos
import matplotlib
# Activamos el backend 'Agg' (modo headless) para renderizar imágenes en memoria sin requerir entorno gráfico o monitor
matplotlib.use('Agg')
# Importamos el submódulo 'pyplot' con el alias estándar 'plt' para crear figuras, trazar curvas y guardar imágenes
import matplotlib.pyplot as plt

# Definimos la función principal que toma como entrada el archivo CSV y la carpeta donde se guardarán las imágenes
def generate_experiment_charts(csv_file="experimentos_ac.csv", output_dir="graficos"):
    """Lee el CSV de experimentos y genera curvas de población individuales y comparativas."""
    
    # Comprobamos si la carpeta de destino existe en el disco; si no existe, la creamos
    if not os.path.exists(output_dir):
        # Creamos la carpeta (por defecto 'graficos')
        os.makedirs(output_dir)

    # Creamos un diccionario vacío para almacenar y clasificar los datos de cada uno de los experimentos
    data = {}
    
    # Abrimos el archivo CSV en modo lectura ('r') con codificación UTF-8
    with open(csv_file, mode="r", encoding="utf-8") as f:
        # Usamos DictReader para leer cada fila como un diccionario usando los nombres de las columnas
        reader = csv.DictReader(f)
        # Recorremos fila por fila el archivo CSV
        for row in reader:
            # Obtenemos el nombre del experimento de la columna 'experimento'
            exp = row["experimento"]
            # Si es la primera vez que leemos este experimento, inicializamos sus listas de datos
            if exp not in data:
                # Creamos listas vacías para la generación y para cada uno de los 5 estados
                data[exp] = {
                    "gen": [],         # Lista de números de generación (eje X)
                    "fuego": [],       # Lista de porcentajes de fuego activo
                    "vegetacion": [],  # Lista de porcentajes de pastizal
                    "bosque": [],      # Lista de porcentajes de bosque maduro
                    "cenizas": [],     # Lista de porcentajes de cenizas
                    "vacio": []        # Lista de porcentajes de suelo vacío/roca
                }
            # Convertimos el número de generación a entero y lo agregamos a la lista
            data[exp]["gen"].append(int(row["generacion"]))
            # Convertimos el porcentaje de fuego a float y lo guardamos
            data[exp]["fuego"].append(float(row["fuego_pct"]))
            # Convertimos el porcentaje de pasto a float y lo guardamos
            data[exp]["vegetacion"].append(float(row["vegetacion_pct"]))
            # Convertimos el porcentaje de bosque a float y lo guardamos
            data[exp]["bosque"].append(float(row["bosque_pct"]))
            # Convertimos el porcentaje de cenizas a float y lo guardamos
            data[exp]["cenizas"].append(float(row["cenizas_pct"]))
            # Convertimos el porcentaje de vacío a float y lo guardamos
            data[exp]["vacio"].append(float(row["vacio_pct"]))

    # Definimos la paleta de colores oficial del autómata celular en formato hexadecimal
    colors = {
        "fuego": "#ef4444",      # Rojo brillante para la curva de Fuego Activo
        "vegetacion": "#22c55e", # Verde esmeralda vivo para la curva de Vegetación/Pastizal
        "bosque": "#15803d",     # Verde bosque profundo para la curva de Bosque Maduro
        "cenizas": "#64748b",    # Gris azulado para la curva de Cenizas
        "vacio": "#94a3b8"       # Gris claro para la curva de Suelo Vacío / Mineral
    }

    # ------------------------------------------------------------------------------------
    # 1. GENERACIÓN DE GRÁFICAS INDIVIDUALES POR CADA EXPERIMENTO
    # ------------------------------------------------------------------------------------
    # Recorremos cada experimento con sus respectivas listas de datos
    for exp_name, values in data.items():
        # Creamos una nueva figura de 10 pulgadas de ancho por 5 de alto con resolución de 150 DPI
        plt.figure(figsize=(10, 5), dpi=150)
        # Aplicamos el estilo de fondo oscuro 'dark_background' para estética profesional
        plt.style.use('dark_background')
        
        # Trazamos la curva verde de Vegetación (%) con grosor de línea 2
        plt.plot(values["gen"], values["vegetacion"], label="Vegetación (%)", color=colors["vegetacion"], linewidth=2)
        # Trazamos la curva verde oscura de Bosque Maduro (%) con grosor de línea 2
        plt.plot(values["gen"], values["bosque"], label="Bosque Maduro (%)", color=colors["bosque"], linewidth=2)
        # Trazamos la curva roja de Fuego Activo (%) con grosor destacado de 2.5
        plt.plot(values["gen"], values["fuego"], label="Fuego Activo (%)", color=colors["fuego"], linewidth=2.5)
        # Trazamos la curva gris discontinua de Cenizas (%) con patrón '--'
        plt.plot(values["gen"], values["cenizas"], label="Cenizas (%)", color=colors["cenizas"], linewidth=1.5, linestyle="--")
        # Trazamos la curva gris punteada de Suelo Vacío (%) con patrón ':'
        plt.plot(values["gen"], values["vacio"], label="Vacío / Mineral (%)", color=colors["vacio"], linewidth=1, linestyle=":")

        # Asignamos el título superior de la gráfica formateando los guiones bajos por espacios
        plt.title(f"Dinámica Temporal del Autómata Celular - {exp_name.replace('_', ' ')}", fontsize=13, fontweight='bold', pad=12)
        # Asignamos la etiqueta del eje horizontal X
        plt.xlabel("Generación (Pasos Temporales)", fontsize=11)
        # Asignamos la etiqueta del eje vertical Y
        plt.ylabel("Porcentaje de la Rejilla (%)", fontsize=11)
        # Fijamos los límites del eje Y exactamente de 0% a 100%
        plt.ylim(0, 100)
        # Dibujamos líneas de cuadrícula punteadas con 25% de opacidad para facilitar la lectura
        plt.grid(True, linestyle="--", alpha=0.25)
        # Colocamos el cuadro de leyenda arriba a la derecha con fondo semi-transparente
        plt.legend(loc="upper right", framealpha=0.8)
        # Ajustamos los márgenes de la imagen automáticamente para que nada quede cortado
        plt.tight_layout()

        # Construimos la ruta de guardado del archivo PNG (ej. 'graficos/Exp1_Sin_Viento...png')
        out_path = os.path.join(output_dir, f"{exp_name}_curva.png")
        # Guardamos la figura en el disco en formato PNG
        plt.savefig(out_path)
        # Cerramos la figura actual para liberar memoria RAM
        plt.close()
        # Mostramos mensaje en la terminal confirmando que la imagen fue creada
        print(f" Gráfica guardada: {out_path}")

    # ------------------------------------------------------------------------------------
    # 2. GENERACIÓN DE LA GRÁFICA COMPARATIVA GLOBAL DE FUEGO ACTIVO
    # ------------------------------------------------------------------------------------
    # Creamos una figura de 11 pulgadas de ancho por 6 de alto con 150 DPI
    plt.figure(figsize=(11, 6), dpi=150)
    # Aplicamos estilo de fondo oscuro
    plt.style.use('dark_background')
    
    # Definimos una paleta de 4 colores llamativos para diferenciar las 4 curvas de fuego
    exp_colors = ["#38bdf8", "#ef4444", "#fbbf24", "#a855f7"]
    # Iteramos sobre los experimentos numerándolos con enumerate (i = 0, 1, 2, 3)
    for i, (exp_name, values) in enumerate(data.items()):
        # Limpiamos el nombre para que en la leyenda se lea elegante (ej. 'Exp 1 Sin Viento...')
        clean_name = exp_name.replace("Exp", "Exp ").replace("_", " ")
        # Trazamos únicamente la curva de Fuego Activo (%) de este experimento
        plt.plot(values["gen"], values["fuego"], label=clean_name, color=exp_colors[i % len(exp_colors)], linewidth=2.2)

    # Asignamos el título principal del gráfico comparativo
    plt.title("Comparativa de Curvas de Fuego Activo entre Experimentos", fontsize=14, fontweight='bold', pad=15)
    # Asignamos la etiqueta del eje X
    plt.xlabel("Generación (Pasos Temporales)", fontsize=11)
    # Asignamos la etiqueta del eje Y
    plt.ylabel("Fuego Activo (% de Rejilla)", fontsize=11)
    # Dibujamos cuadrícula de referencia
    plt.grid(True, linestyle="--", alpha=0.3)
    # Mostramos la leyenda con los nombres de los 4 experimentos
    plt.legend(loc="upper right", fontsize=10)
    # Ajustamos márgenes de la imagen
    plt.tight_layout()

    # Construimos la ruta de la gráfica comparativa
    comp_path = os.path.join(output_dir, "comparativa_incendios_experimentos.png")
    # Guardamos la imagen comparativa en PNG
    plt.savefig(comp_path)
    # Cerramos la figura
    plt.close()
    # Mostramos mensaje en consola
    print(f" Gráfica comparativa guardada: {comp_path}")

# Si este archivo se ejecuta directamente desde la terminal con 'python3 python/graficar_experimentos.py'
if __name__ == "__main__":
    # Llamamos a la función principal para generar todas las gráficas
    generate_experiment_charts()
