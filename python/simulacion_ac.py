#!/usr/bin/env python3
"""
SIMULADOR CIENTÍFICO DE AUTÓMATAS CELULARES EN PYTHON
Modelo bidimensional de propagación de incendios forestales (Vecindad de Moore).
Optimizado con vectorización en NumPy y convolución 2D en SciPy.
"""

# Importación de módulos para manejo de CLI, temporización, archivos y cálculo matricial
import sys, time, os, numpy as np
from scipy.signal import convolve2d

# 1. DEFINICIÓN DE CONSTANTES Y ESTADOS FINITOS
VACIO, ARBOL, FUEGO, CENIZA = 0, 1, 2, 3

# Caracteres ASCII para representación visual en la terminal
CARACTERES = {0: " . ", 1: " T ", 2: " * ", 3: " x "}

# Kernel de convolución 3x3 para calcular la Vecindad de Moore (los 8 vecinos adyacentes)
KERNEL = np.array([[1, 1, 1], [1, 0, 1], [1, 1, 1]])

# 2. CLASE PRINCIPAL DEL MODELO DE AUTÓMATA CELULAR
class AutomataIncendio:
    def __init__(self, filas=25, columnas=40, prob_propagacion=0.70, densidad=0.65, prob_rebrote=0.005):
        # Asignación de dimensiones de la matriz bidimensional
        self.filas, self.columnas = filas, columnas
        # Asignación de parámetros probabilísticos del modelo
        self.prob_propagacion, self.densidad, self.prob_rebrote = prob_propagacion, densidad, prob_rebrote
        # Inicialización del bosque inicial
        self.reiniciar()

    def reiniciar(self):
        # Reinicia el contador de generaciones a 0
        self.generacion = 0
        # Genera la matriz inicial: si el número aleatorio < densidad se coloca ÁRBOL (1), de lo contrario VACÍO (0)
        self.matriz = np.where(np.random.rand(self.filas, self.columnas) < self.densidad, ARBOL, VACIO)
        # Enciende el foco de ignición en el centro de la cuadrícula
        self.matriz[self.filas // 2, self.columnas // 2] = FUEGO

    def contar_vecinos_fuego(self, f, c):
        # Delimita los límites del recorte 3x3 alrededor de la celda (f, c)
        f_min, f_max = max(0, f - 1), min(self.filas, f + 2)
        c_min, c_max = max(0, c - 1), min(self.columnas, c + 2)
        # Suma los vecinos en estado FUEGO restando la celda central
        return int(np.sum(self.matriz[f_min:f_max, c_min:c_max] == FUEGO) - (self.matriz[f, c] == FUEGO))

    def paso(self):
        # Convolución 2D: calcula la cantidad de vecinos en fuego para TODAS las celdas simultáneamente en O(1)
        fuegos = convolve2d(self.matriz == FUEGO, KERNEL, mode='same', fillvalue=0)
        # Copia de la matriz para implementar Doble Búfer (Double Buffering)
        nueva = np.copy(self.matriz)
        # Regla 1: Las celdas en Fuego arden 1 turno y pasan a Ceniza
        nueva[self.matriz == FUEGO] = CENIZA
        # Regla 2: Las Cenizas se enfrían en 1 turno y pasan a Suelo Vacío
        nueva[self.matriz == CENIZA] = VACIO
        # Regla 3: Los Árboles con al menos 1 vecino ardiendo se contagian según la probabilidad de propagación
        arboles = (self.matriz == ARBOL)
        nueva[arboles & (fuegos > 0) & (np.random.rand(self.filas, self.columnas) < self.prob_propagacion)] = FUEGO
        # Regla 4: Las celdas vacías pueden regenerar un árbol espontáneamente por rebrote
        nueva[(self.matriz == VACIO) & (np.random.rand(self.filas, self.columnas) < self.prob_rebrote)] = ARBOL
        # Actualización de la matriz y avance de generación
        self.matriz, self.generacion = nueva, self.generacion + 1

    def metricas(self):
        # Número total de celdas
        tot = self.filas * self.columnas
        # Diccionario con conteos porcentuales de cada estado y la generación actual
        return {
            "gen": self.generacion,
            "arboles_pct": (np.sum(self.matriz == ARBOL) / tot) * 100,
            "fuego_pct": (np.sum(self.matriz == FUEGO) / tot) * 100,
            "cenizas_pct": (np.sum(self.matriz == CENIZA) / tot) * 100,
            "vacios_pct": (np.sum(self.matriz == VACIO) / tot) * 100
        }

    def imprimir(self):
        # Muestra en consola el encabezado con los porcentajes actuales
        m = self.metricas()
        print(f"\nGeneracion {m['gen']:02d} | Arboles: {m['arboles_pct']:.1f}% | Fuego: {m['fuego_pct']:.1f}% | Cenizas: {m['cenizas_pct']:.1f}%")
        # Imprime la matriz convirtiendo los enteros a símbolos visuales
        for row in self.matriz:
            print("".join(CARACTERES[v] for v in row))

# 3. GENERADOR DE GRÁFICAS CIENTÍFICAS CON MATPLOTLIB
def generar_graficos(output_dir="graficos"):
    # Configuración de backend 'Agg' para renderizado sin interfaz gráfica (headless)
    import matplotlib; matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    # Crea el directorio de salida si no existe
    os.makedirs(output_dir, exist_ok=True)
    # Instancia una simulación de 40x40 para análisis estadístico
    ac, hist = AutomataIncendio(40, 40, prob_propagacion=0.75, densidad=0.70), []
    # Itera 50 generaciones registrando el histórico de métricas
    for _ in range(50):
        hist.append(ac.metricas())
        ac.paso()
    # Extrae el vector de generaciones para el eje X
    gens = [m["gen"] for m in hist]
    # Configuración de la figura y estilo oscuro
    plt.figure(figsize=(9, 4.5), dpi=150)
    plt.style.use('dark_background')
    # Trazado de las curvas para los 4 estados
    plt.plot(gens, [m["arboles_pct"] for m in hist], label="Bosque / Arboles (%)", color="#22c55e", lw=2.2)
    plt.plot(gens, [m["fuego_pct"] for m in hist], label="Fuego Activo (%)", color="#ef4444", lw=2.2)
    plt.plot(gens, [m["cenizas_pct"] for m in hist], label="Cenizas (%)", color="#71717a", lw=1.5, ls="--")
    plt.plot(gens, [m["vacios_pct"] for m in hist], label="Suelo Vacio (%)", color="#38bdf8", lw=1.2, ls=":")
    # Formateo de etiquetas, cuadrícula y leyenda
    plt.title("Dinamica Temporal del Automata Celular", fontsize=12, fontweight='bold')
    plt.xlabel("Generacion (Pasos de Tiempo)"); plt.ylabel("Porcentaje de Rejilla (%)")
    plt.ylim(0, 100); plt.grid(True, ls="--", alpha=0.3); plt.legend(loc="upper right"); plt.tight_layout()
    # Guardado en disco
    ruta = os.path.join(output_dir, "curva_dinamica_incendio.png")
    plt.savefig(ruta); plt.close()
    print(f"Grafica guardada en: {ruta}")

# 4. PUNTO DE ENTRADA PRINCIPAL
if __name__ == "__main__":
    print("Simulador de Automatas Celulares (IA)")
    ac = AutomataIncendio(15, 30)
    ac.imprimir()
    # Si se pasa el argumento --graficar, solo genera la imagen
    if len(sys.argv) > 1 and sys.argv[1] == "--graficar":
        generar_graficos()
    # De lo contrario, anima 20 generaciones en la consola y genera el informe gráfico
    else:
        for _ in range(20):
            time.sleep(0.12)
            print("\033[H\033[J", end="") # Limpia la pantalla de la terminal
            ac.paso(); ac.imprimir()
        generar_graficos()
