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

import os
import csv
import matplotlib
# Activamos el modo 'Agg' (headless) para generar imágenes sin necesitar una ventana gráfica abierta
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def generate_experiment_charts(csv_file="experimentos_ac.csv", output_dir="graficos"):
    """Lee el CSV de experimentos y genera curvas de población individuales y comparativas."""
    
    # Creamos la carpeta de salida si no existe
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Estructura de diccionario para agrupar los datos por experimento
    data = {}
    
    # Abrimos y leemos el archivo CSV generado
    with open(csv_file, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            exp = row["experimento"]
            # Si es la primera vez que vemos este experimento, creamos sus listas
            if exp not in data:
                data[exp] = {
                    "gen": [],
                    "fuego": [],
                    "vegetacion": [],
                    "bosque": [],
                    "cenizas": [],
                    "vacio": []
                }
            # Guardamos cada valor numérico en su lista correspondiente
            data[exp]["gen"].append(int(row["generacion"]))
            data[exp]["fuego"].append(float(row["fuego_pct"]))
            data[exp]["vegetacion"].append(float(row["vegetacion_pct"]))
            data[exp]["bosque"].append(float(row["bosque_pct"]))
            data[exp]["cenizas"].append(float(row["cenizas_pct"]))
            data[exp]["vacio"].append(float(row["vacio_pct"]))

    # Paleta de colores oficial del autómata
    colors = {
        "fuego": "#ef4444",      # Rojo fuego
        "vegetacion": "#22c55e", # Verde claro
        "bosque": "#15803d",     # Verde oscuro
        "cenizas": "#64748b",    # Gris ceniza
        "vacio": "#94a3b8"       # Gris claro suelo
    }

    # ------------------------------------------------------------------------------------
    # 1. GENERACIÓN DE GRÁFICAS INDIVIDUALES POR CADA EXPERIMENTO
    # ------------------------------------------------------------------------------------
    for exp_name, values in data.items():
        # Creamos una figura de 10x5 pulgadas con 150 DPI de nitidez
        plt.figure(figsize=(10, 5), dpi=150)
        # Aplicamos tema oscuro moderno
        plt.style.use('dark_background')
        
        # Trazamos cada curva de población
        plt.plot(values["gen"], values["vegetacion"], label="Vegetación (%)", color=colors["vegetacion"], linewidth=2)
        plt.plot(values["gen"], values["bosque"], label="Bosque Maduro (%)", color=colors["bosque"], linewidth=2)
        plt.plot(values["gen"], values["fuego"], label="Fuego Activo (%)", color=colors["fuego"], linewidth=2.5)
        plt.plot(values["gen"], values["cenizas"], label="Cenizas (%)", color=colors["cenizas"], linewidth=1.5, linestyle="--")
        plt.plot(values["gen"], values["vacio"], label="Vacío / Mineral (%)", color=colors["vacio"], linewidth=1, linestyle=":")

        # Títulos y etiquetas de los ejes
        plt.title(f"Dinámica Temporal del Autómata Celular - {exp_name.replace('_', ' ')}", fontsize=13, fontweight='bold', pad=12)
        plt.xlabel("Generación (Pasos Temporales)", fontsize=11)
        plt.ylabel("Porcentaje de la Rejilla (%)", fontsize=11)
        plt.ylim(0, 100)                                       # Eje Y fijado de 0 a 100%
        plt.grid(True, linestyle="--", alpha=0.25)             # Cuadrícula tenue
        plt.legend(loc="upper right", framealpha=0.8)          # Leyenda arriba a la derecha
        plt.tight_layout()

        # Guardamos la imagen en PNG
        out_path = os.path.join(output_dir, f"{exp_name}_curva.png")
        plt.savefig(out_path)
        plt.close()                                            # Cerramos la figura para liberar memoria
        print(f" Gráfica guardada: {out_path}")

    # ------------------------------------------------------------------------------------
    # 2. GENERACIÓN DE LA GRÁFICA COMPARATIVA GLOBAL DE FUEGO ACTIVO
    # ------------------------------------------------------------------------------------
    plt.figure(figsize=(11, 6), dpi=150)
    plt.style.use('dark_background')
    
    # Paleta de 4 colores contrastantes para los 4 experimentos
    exp_colors = ["#38bdf8", "#ef4444", "#fbbf24", "#a855f7"]
    for i, (exp_name, values) in enumerate(data.items()):
        clean_name = exp_name.replace("Exp", "Exp ").replace("_", " ")
        # Trazamos la curva de fuego de cada experimento
        plt.plot(values["gen"], values["fuego"], label=clean_name, color=exp_colors[i % len(exp_colors)], linewidth=2.2)

    plt.title("Comparativa de Curvas de Fuego Activo entre Experimentos", fontsize=14, fontweight='bold', pad=15)
    plt.xlabel("Generación (Pasos Temporales)", fontsize=11)
    plt.ylabel("Fuego Activo (% de Rejilla)", fontsize=11)
    plt.grid(True, linestyle="--", alpha=0.3)
    plt.legend(loc="upper right", fontsize=10)
    plt.tight_layout()

    comp_path = os.path.join(output_dir, "comparativa_incendios_experimentos.png")
    plt.savefig(comp_path)
    plt.close()
    print(f" Gráfica comparativa guardada: {comp_path}")

if __name__ == "__main__":
    generate_experiment_charts()
