#!/usr/bin/env python3
"""
Script para generar gráficos comparativos de los experimentos de Autómatas Celulares.
Genera figuras PNG listas para ser incluidas en el informe académico.
"""

import os
import csv
import matplotlib
matplotlib.use('Agg') # Modo headless
import matplotlib.pyplot as plt

def generate_experiment_charts(csv_file="experimentos_ac.csv", output_dir="graficos"):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    data = {}
    with open(csv_file, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            exp = row["experimento"]
            if exp not in data:
                data[exp] = {
                    "gen": [],
                    "fuego": [],
                    "vegetacion": [],
                    "bosque": [],
                    "cenizas": [],
                    "vacio": []
                }
            data[exp]["gen"].append(int(row["generacion"]))
            data[exp]["fuego"].append(float(row["fuego_pct"]))
            data[exp]["vegetacion"].append(float(row["vegetacion_pct"]))
            data[exp]["bosque"].append(float(row["bosque_pct"]))
            data[exp]["cenizas"].append(float(row["cenizas_pct"]))
            data[exp]["vacio"].append(float(row["vacio_pct"]))

    # Paleta de colores acorde al diseño
    colors = {
        "fuego": "#ef4444",
        "vegetacion": "#22c55e",
        "bosque": "#15803d",
        "cenizas": "#64748b",
        "vacio": "#94a3b8"
    }

    # Gráfico individual para cada experimento
    for exp_name, values in data.items():
        plt.figure(figsize=(10, 5), dpi=150)
        plt.style.use('dark_background')
        
        plt.plot(values["gen"], values["vegetacion"], label="Vegetación (%)", color=colors["vegetacion"], linewidth=2)
        plt.plot(values["gen"], values["bosque"], label="Bosque Maduro (%)", color=colors["bosque"], linewidth=2)
        plt.plot(values["gen"], values["fuego"], label="Fuego Activo (%)", color=colors["fuego"], linewidth=2.5)
        plt.plot(values["gen"], values["cenizas"], label="Cenizas (%)", color=colors["cenizas"], linewidth=1.5, linestyle="--")
        plt.plot(values["gen"], values["vacio"], label="Vacío / Mineral (%)", color=colors["vacio"], linewidth=1, linestyle=":")

        plt.title(f"Dinámica Temporal del Autómata Celular - {exp_name.replace('_', ' ')}", fontsize=13, fontweight='bold', pad=12)
        plt.xlabel("Generación (Pasos Temporales)", fontsize=11)
        plt.ylabel("Porcentaje de la Rejilla (%)", fontsize=11)
        plt.ylim(0, 100)
        plt.grid(True, linestyle="--", alpha=0.25)
        plt.legend(loc="upper right", framealpha=0.8)
        plt.tight_layout()

        out_path = os.path.join(output_dir, f"{exp_name}_curva.png")
        plt.savefig(out_path)
        plt.close()
        print(f" Gráfica guardada: {out_path}")

    # Gráfico comparativo de propagación de fuego entre todos los experimentos
    plt.figure(figsize=(11, 6), dpi=150)
    plt.style.use('dark_background')
    
    exp_colors = ["#38bdf8", "#ef4444", "#fbbf24", "#a855f7"]
    for i, (exp_name, values) in enumerate(data.items()):
        clean_name = exp_name.replace("Exp", "Exp ").replace("_", " ")
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
