#!/usr/bin/env python3
import sys, time, os, numpy as np
from scipy.signal import convolve2d

VACIO, ARBOL, FUEGO, CENIZA = 0, 1, 2, 3
CARACTERES = {0: " . ", 1: " T ", 2: " * ", 3: " x "}
KERNEL = np.array([[1, 1, 1], [1, 0, 1], [1, 1, 1]])

class AutomataIncendio:
    def __init__(self, filas=25, columnas=40, prob_propagacion=0.70, densidad=0.65, prob_rebrote=0.005):
        self.filas, self.columnas = filas, columnas
        self.prob_propagacion, self.densidad, self.prob_rebrote = prob_propagacion, densidad, prob_rebrote
        self.reiniciar()

    def reiniciar(self):
        self.generacion = 0
        self.matriz = np.where(np.random.rand(self.filas, self.columnas) < self.densidad, ARBOL, VACIO)
        self.matriz[self.filas // 2, self.columnas // 2] = FUEGO

    def contar_vecinos_fuego(self, f, c):
        f_min, f_max = max(0, f - 1), min(self.filas, f + 2)
        c_min, c_max = max(0, c - 1), min(self.columnas, c + 2)
        return int(np.sum(self.matriz[f_min:f_max, c_min:c_max] == FUEGO) - (self.matriz[f, c] == FUEGO))

    def paso(self):
        fuegos = convolve2d(self.matriz == FUEGO, KERNEL, mode='same', fillvalue=0)
        nueva = np.copy(self.matriz)
        nueva[self.matriz == FUEGO] = CENIZA
        nueva[self.matriz == CENIZA] = VACIO
        arboles = (self.matriz == ARBOL)
        nueva[arboles & (fuegos > 0) & (np.random.rand(self.filas, self.columnas) < self.prob_propagacion)] = FUEGO
        nueva[(self.matriz == VACIO) & (np.random.rand(self.filas, self.columnas) < self.prob_rebrote)] = ARBOL
        self.matriz, self.generacion = nueva, self.generacion + 1

    def metricas(self):
        tot = self.filas * self.columnas
        return {
            "gen": self.generacion,
            "arboles_pct": (np.sum(self.matriz == ARBOL) / tot) * 100,
            "fuego_pct": (np.sum(self.matriz == FUEGO) / tot) * 100,
            "cenizas_pct": (np.sum(self.matriz == CENIZA) / tot) * 100,
            "vacios_pct": (np.sum(self.matriz == VACIO) / tot) * 100
        }

    def imprimir(self):
        m = self.metricas()
        print(f"\nGeneracion {m['gen']:02d} | Arboles: {m['arboles_pct']:.1f}% | Fuego: {m['fuego_pct']:.1f}% | Cenizas: {m['cenizas_pct']:.1f}%")
        for row in self.matriz:
            print("".join(CARACTERES[v] for v in row))

def generar_graficos(output_dir="graficos"):
    import matplotlib; matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    os.makedirs(output_dir, exist_ok=True)
    ac, hist = AutomataIncendio(40, 40, prob_propagacion=0.75, densidad=0.70), []
    for _ in range(50):
        hist.append(ac.metricas())
        ac.paso()
    gens = [m["gen"] for m in hist]
    plt.figure(figsize=(9, 4.5), dpi=150)
    plt.style.use('dark_background')
    plt.plot(gens, [m["arboles_pct"] for m in hist], label="Bosque / Arboles (%)", color="#22c55e", lw=2.2)
    plt.plot(gens, [m["fuego_pct"] for m in hist], label="Fuego Activo (%)", color="#ef4444", lw=2.2)
    plt.plot(gens, [m["cenizas_pct"] for m in hist], label="Cenizas (%)", color="#71717a", lw=1.5, ls="--")
    plt.plot(gens, [m["vacios_pct"] for m in hist], label="Suelo Vacio (%)", color="#38bdf8", lw=1.2, ls=":")
    plt.title("Dinamica Temporal del Automata Celular", fontsize=12, fontweight='bold')
    plt.xlabel("Generacion (Pasos de Tiempo)"); plt.ylabel("Porcentaje de Rejilla (%)")
    plt.ylim(0, 100); plt.grid(True, ls="--", alpha=0.3); plt.legend(loc="upper right"); plt.tight_layout()
    ruta = os.path.join(output_dir, "curva_dinamica_incendio.png")
    plt.savefig(ruta); plt.close()
    print(f"Grafica guardada en: {ruta}")

if __name__ == "__main__":
    print("Simulador de Automatas Celulares (IA)")
    ac = AutomataIncendio(15, 30)
    ac.imprimir()
    if len(sys.argv) > 1 and sys.argv[1] == "--graficar":
        generar_graficos()
    else:
        for _ in range(20):
            time.sleep(0.12)
            print("\033[H\033[J", end="")
            ac.paso(); ac.imprimir()
        generar_graficos()
