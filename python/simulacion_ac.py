#!/usr/bin/env python3
"""
========================================================================================
SIMULADOR DE AUTÓMATAS CELULARES EN PYTHON (Forest Fire Cellular Automaton)
Temática: Propagación de Incendios Forestales y Dinámica Ecológica
Asignatura: Inteligencia Artificial
========================================================================================

Este script implementa el motor de Autómata Celular en Python utilizando NumPy.
Permite ejecutar simulaciones matriciales, animaciones en consola con colores ANSI
y ejecutar la suite científica de experimentos cuantitativos.
"""

# Importamos librerías estándar del sistema
import sys
import time
import math
import argparse
# Importamos NumPy para el manejo de matrices bidimensionales de alta velocidad
import numpy as np

# ========================================================================================
# 1. DEFINICIÓN DE CONSTANTES DE LOS 5 ESTADOS FINITOS
# ========================================================================================
STATE_EMPTY  = 0  # Terreno Vacío / Roca / Cortafuegos mineral (no combustible)
STATE_GRASS  = 1  # Vegetación ligera / Pastizal (combustión rápida, T_burn = 1)
STATE_FOREST = 2  # Bosque Maduro Denso (alta carga de biomasa, T_burn = 2)
STATE_FIRE   = 3  # Fuego Activo (emite calor a sus 8 vecinos en la vecindad de Moore)
STATE_ASH    = 4  # Cenizas / Terreno Quemado (enfriándose durante T_ash = 4)

# Nombres descriptivos de cada estado
STATE_NAMES = {
    STATE_EMPTY:  "Vacío / Roca",
    STATE_GRASS:  "Vegetación",
    STATE_FOREST: "Bosque Denso",
    STATE_FIRE:   "Fuego Activo",
    STATE_ASH:    "Cenizas"
}

# Códigos de escape ANSI para pintar colores en la consola/terminal
ANSI_COLORS = {
    STATE_EMPTY:  "\033[90m░\033[0m",    # Gris tenue para suelo vacío/roca
    STATE_GRASS:  "\033[92m♣\033[0m",    # Verde brillante para pastizal
    STATE_FOREST: "\033[32m▲\033[0m",    # Verde oscuro para bosque
    STATE_FIRE:   "\033[91;1m🔥\033[0m", # Rojo brillante para fuego
    STATE_ASH:    "\033[37m▒\033[0m"     # Gris medio para cenizas
}

# Caracteres ASCII planos (por si la terminal no soporta emojis ni colores)
ASCII_CHARS = {
    STATE_EMPTY:  " ",
    STATE_GRASS:  ".",
    STATE_FOREST: "T",
    STATE_FIRE:   "*",
    STATE_ASH:    "x"
}


# ========================================================================================
# 2. CLASE PRINCIPAL: ForestFireAutomaton
# ========================================================================================
class ForestFireAutomaton:
    """Motor matricial síncrono del Autómata Celular en Python."""

    def __init__(self, width=60, height=30, wind_speed=0.5, wind_angle_deg=0.0,
                 humidity=0.2, p_regrowth=0.005, p_lightning=0.00005):
        self.width = width                    # Número de columnas
        self.height = height                  # Número de filas
        
        # Parámetros físicos y ambientales
        self.wind_speed = float(wind_speed)            # Intensidad del viento [0.0 - 1.0]
        self.wind_angle = math.radians(wind_angle_deg) # Ángulo del viento convertido a radianes
        self.humidity = float(humidity)                # Humedad relativa [0.0 - 1.0]
        self.p_regrowth = float(p_regrowth)            # Probabilidad de rebrote vegetal en suelo vacío
        self.p_lightning = float(p_lightning)          # Probabilidad de chispa espontánea (rayos)
        
        # Probabilidades base de ignición
        self.p_ign_grass = 0.58               # 58% probabilidad base para pasto
        self.p_ign_forest = 0.42              # 42% probabilidad base para bosque
        
        # Duración de estados (en número de generaciones)
        self.burn_duration_grass = 1          # El pasto arde durante 1 generación
        self.burn_duration_forest = 2         # El bosque arde durante 2 generaciones
        self.ash_duration = 4                 # Las cenizas tardan 4 generaciones en enfriarse
        
        # MATRICES DE MEMORIA CON NUMPY (Double Buffering):
        # 1. self.grid: Matriz 2D de enteros de 8 bits (uint8) para los estados actuales
        # 2. self.timers: Matriz 2D para la cuenta regresiva de fuego y cenizas
        self.grid = np.zeros((height, width), dtype=np.uint8)
        self.timers = np.zeros((height, width), dtype=np.uint8)
        
        self.generation = 0                   # Contador de pasos temporales
        self.history = []                     # Lista de estadísticas de cada paso

        # Vector de viento (dx, dy) calculado con trigonometría
        self.wind_vec = np.array([
            math.cos(self.wind_angle) * self.wind_speed,
            math.sin(self.wind_angle) * self.wind_speed
        ])

        # DESPLAZAMIENTOS DE LA VECINDAD DE MOORE (8 celdas vecinas):
        # (dy, dx): arriba-izq, arriba, arriba-der, izq, der, abajo-izq, abajo, abajo-der
        self.moore_offsets = [
            (-1, -1), (-1, 0), (-1, 1),
            ( 0, -1),          ( 0, 1),
            ( 1, -1), ( 1, 0), ( 1, 1)
        ]

    def reset(self, preset="mixed_forest"):
        """Inicializa la cuadrícula con un escenario específico."""
        self.generation = 0
        self.history = []
        self.timers.fill(0)                   # Reiniciamos temporizadores a cero

        total_cells = self.width * self.height
        
        if preset == "dense_forest":
            # 85% Bosque, 15% Pastizal
            rand = np.random.rand(self.height, self.width)
            self.grid = np.where(rand < 0.85, STATE_FOREST, STATE_GRASS).astype(np.uint8)
            # Foco de fuego inicial en el centro
            self.grid[self.height // 2, self.width // 2] = STATE_FIRE

        elif preset == "mixed_forest":
            # 50% Pasto, 35% Bosque, 15% Vacío
            rand = np.random.rand(self.height, self.width)
            self.grid = np.zeros((self.height, self.width), dtype=np.uint8)
            self.grid[rand < 0.50] = STATE_GRASS
            self.grid[(rand >= 0.50) & (rand < 0.85)] = STATE_FOREST
            self.grid[rand >= 0.85] = STATE_EMPTY
            # Foco de fuego inicial en el centro
            self.grid[self.height // 2, self.width // 2] = STATE_FIRE

        elif preset == "firebreak_demo":
            # Bosque con una franja cortafuegos mineral en el centro
            rand = np.random.rand(self.height, self.width)
            self.grid = np.where(rand < 0.6, STATE_GRASS, STATE_FOREST).astype(np.uint8)
            # Línea vertical de cortafuegos en el centro del mapa
            mid_x = self.width // 2
            self.grid[:, max(0, mid_x - 1):min(self.width, mid_x + 2)] = STATE_EMPTY
            # Fuego en el flanco izquierdo
            mid_y = self.height // 2
            self.grid[max(0, mid_y - 2):min(self.height, mid_y + 3), self.width // 6] = STATE_FIRE

        elif preset == "sparse_plains":
            # Pradera dispersa
            rand = np.random.rand(self.height, self.width)
            self.grid = np.zeros((self.height, self.width), dtype=np.uint8)
            self.grid[rand < 0.40] = STATE_GRASS
            self.grid[(rand >= 0.40) & (rand < 0.50)] = STATE_FOREST
            self.grid[self.height // 2, self.width // 2] = STATE_FIRE

        else:  # empty: Lienzo vacío
            self.grid.fill(STATE_EMPTY)

        self._record_stats()                  # Registramos estado inicial

    def step(self):
        """
        Ejecuta una transición generacional completa con actualización síncrona (Double Buffering).
        """
        # Creamos una copia de las matrices para escribir la siguiente generación (Matriz del futuro)
        next_grid = self.grid.copy()
        next_timers = self.timers.copy()

        h, w = self.height, self.width
        wind_x, wind_y = self.wind_vec[0], self.wind_vec[1]

        # Recorremos cada celda (y, x) de la matriz:
        for y in range(h):
            for x in range(w):
                current_state = self.grid[y, x] # Estado actual en generación t
                timer = self.timers[y, x]

                # CASO 1: CELDA EN FUEGO (ESTADO 3)
                if current_state == STATE_FIRE:
                    if timer > 1:
                        next_grid[y, x] = STATE_FIRE
                        next_timers[y, x] = timer - 1
                    else:
                        # Se consume el combustible -> pasa a Cenizas
                        next_grid[y, x] = STATE_ASH
                        next_timers[y, x] = self.ash_duration

                # CASO 2: CELDA EN CENIZAS (ESTADO 4)
                elif current_state == STATE_ASH:
                    if timer > 1:
                        next_grid[y, x] = STATE_ASH
                        next_timers[y, x] = timer - 1
                    else:
                        # Se enfrían las cenizas -> pasa a Suelo Vacío
                        next_grid[y, x] = STATE_EMPTY
                        next_timers[y, x] = 0

                # CASO 3: CELDA VACÍA (ESTADO 0)
                elif current_state == STATE_EMPTY:
                    seed_neighbors = 0
                    # Contamos vecinos con vegetación para el aporte de semillas
                    for dy, dx in self.moore_offsets:
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w:
                            if self.grid[ny, nx] in (STATE_GRASS, STATE_FOREST):
                                seed_neighbors += 1
                    
                    # Probabilidad de rebrote ecológico
                    effective_regrowth = self.p_regrowth + (seed_neighbors * 0.002)
                    if np.random.rand() < effective_regrowth:
                        next_grid[y, x] = STATE_GRASS
                        next_timers[y, x] = 0

                # CASO 4: VEGETACIÓN (ESTADO 1) O BOSQUE (ESTADO 2)
                elif current_state in (STATE_GRASS, STATE_FOREST):
                    is_forest = (current_state == STATE_FOREST)
                    base_prob = self.p_ign_forest if is_forest else self.p_ign_grass

                    fire_neighbors = 0
                    wind_factor_sum = 0.0

                    # Revisamos los 8 vecinos de Moore:
                    for dy, dx in self.moore_offsets:
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w:
                            if self.grid[ny, nx] == STATE_FIRE:
                                fire_neighbors += 1
                                
                                # Vector de calor que viaja del vecino hacia esta celda:
                                prop_x, prop_y = -dx, -dy
                                norm = math.hypot(prop_x, prop_y)
                                
                                # Producto punto con el vector de viento:
                                dot = (prop_x / norm) * wind_x + (prop_y / norm) * wind_y
                                wind_multiplier = max(0.1, 1.0 + dot * 1.5)
                                wind_factor_sum += wind_multiplier

                    ignites = False
                    if fire_neighbors > 0:
                        avg_wind_factor = wind_factor_sum / fire_neighbors
                        # Probabilidad por vecino ajustada con viento y humedad:
                        p_neighbor = min(0.98, max(0.01, base_prob * avg_wind_factor * (1.0 - self.humidity * 0.75)))
                        # Probabilidad acumulada: P = 1 - (1 - p)^k
                        p_catch_fire = 1.0 - math.pow(1.0 - p_neighbor, fire_neighbors)

                        if np.random.rand() < p_catch_fire:
                            ignites = True

                    # Rayo / Chispa espontánea
                    if not ignites and self.p_lightning > 0:
                        eff_lightning = self.p_lightning * (1.0 - self.humidity * 0.9)
                        if np.random.rand() < eff_lightning:
                            ignites = True

                    if ignites:
                        next_grid[y, x] = STATE_FIRE
                        next_timers[y, x] = self.burn_duration_forest if is_forest else self.burn_duration_grass
                    else:
                        # Maduración biológica de pastizal a bosque
                        if not is_forest and np.random.rand() < 0.01:
                            next_grid[y, x] = STATE_FOREST
                            next_timers[y, x] = 0

        # ACTUALIZACIÓN SÍNCRONA: Asignamos la matriz del futuro como la matriz activa
        self.grid = next_grid
        self.timers = next_timers
        self.generation += 1
        self._record_stats()

    def _record_stats(self):
        """Calcula el censo poblacional de cada estado en la generación actual."""
        total = self.width * self.height
        counts = {
            s: int(np.sum(self.grid == s)) for s in (STATE_EMPTY, STATE_GRASS, STATE_FOREST, STATE_FIRE, STATE_ASH)
        }
        stats = {
            "gen": self.generation,
            "counts": counts,
            "pct": {s: (counts[s] / total) * 100 for s in counts},
            "has_fire": counts[STATE_FIRE] > 0
        }
        self.history.append(stats)
        return stats

    def get_latest_stats(self):
        """Retorna las estadísticas más recientes."""
        return self.history[-1] if self.history else self._record_stats()

    def print_terminal_frame(self, use_ansi=True):
        """Imprime la cuadrícula en la consola usando caracteres ANSI o ASCII."""
        lines = []
        for y in range(self.height):
            line_str = "".join(
                ANSI_COLORS[self.grid[y, x]] if use_ansi else ASCII_CHARS[self.grid[y, x]]
                for x in range(self.width)
            )
            lines.append(line_str)

        stats = self.get_latest_stats()
        header = f"\n=== GENERACIÓN {stats['gen']:03d} | Fuego: {stats['pct'][STATE_FIRE]:.1f}% | Veg: {stats['pct'][STATE_GRASS]:.1f}% | Bosque: {stats['pct'][STATE_FOREST]:.1f}% | Ceniza: {stats['pct'][STATE_ASH]:.1f}% ==="
        print(header)
        print("\n".join(lines))


def run_experiment_suite(ca_class, output_csv="experimentos_ac.csv"):
    """Ejecuta una suite de 4 experimentos científicos cuantitativos y los guarda en CSV."""
    print("🧪 Ejecutando suite de experimentos de validación...")
    
    experiments = [
        {"name": "Exp1_Sin_Viento_Humedad_Baja", "wind_speed": 0.0, "wind_angle": 0, "humidity": 0.1, "preset": "dense_forest"},
        {"name": "Exp2_Viento_Fuerte_Este", "wind_speed": 0.9, "wind_angle": 0, "humidity": 0.15, "preset": "mixed_forest"},
        {"name": "Exp3_Efecto_Cortafuegos", "wind_speed": 0.6, "wind_angle": 0, "humidity": 0.2, "preset": "firebreak_demo"},
        {"name": "Exp4_Alta_Humedad_Contencion", "wind_speed": 0.5, "wind_angle": 90, "humidity": 0.85, "preset": "mixed_forest"}
    ]

    records = []

    for exp in experiments:
        print(f"  -> Corriendo {exp['name']}...")
        ca = ca_class(width=50, height=50, wind_speed=exp["wind_speed"],
                      wind_angle_deg=exp["wind_angle"], humidity=exp["humidity"])
        ca.reset(exp["preset"])

        for g in range(60):
            ca.step()
            st = ca.get_latest_stats()
            records.append({
                "experimento": exp["name"],
                "generacion": st["gen"],
                "fuego_pct": round(st["pct"][STATE_FIRE], 2),
                "vegetacion_pct": round(st["pct"][STATE_GRASS], 2),
                "bosque_pct": round(st["pct"][STATE_FOREST], 2),
                "cenizas_pct": round(st["pct"][STATE_ASH], 2),
                "vacio_pct": round(st["pct"][STATE_EMPTY], 2)
            })

    # Guardar en archivo CSV
    with open(output_csv, "w", encoding="utf-8") as f:
        f.write("experimento,generacion,fuego_pct,vegetacion_pct,bosque_pct,cenizas_pct,vacio_pct\n")
        for r in records:
            f.write(f"{r['experimento']},{r['generacion']},{r['fuego_pct']},{r['vegetacion_pct']},{r['bosque_pct']},{r['cenizas_pct']},{r['vacio_pct']}\n")

    print(f"✅ Experimentos finalizados y exportados a: {output_csv}")


def main():
    """Punto de entrada de línea de comandos."""
    parser = argparse.ArgumentParser(description="Simulador de Autómatas Celulares - Incendios Forestales (IA)")
    parser.add_argument("--width", type=int, default=50, help="Ancho de la cuadrícula (columnas)")
    parser.add_argument("--height", type=int, default=25, help="Alto de la cuadrícula (filas)")
    parser.add_argument("--steps", type=int, default=40, help="Número de generaciones a simular")
    parser.add_argument("--preset", type=str, default="mixed_forest", choices=["mixed_forest", "dense_forest", "firebreak_demo", "sparse_plains", "empty"])
    parser.add_argument("--wind-speed", type=float, default=0.6, help="Velocidad del viento [0.0 - 1.0]")
    parser.add_argument("--wind-angle", type=float, default=0.0, help="Ángulo del viento en grados (0=Este, 90=Sur, 180=Oeste, 270=Norte)")
    parser.add_argument("--humidity", type=float, default=0.20, help="Humedad ambiental [0.0 - 1.0]")
    parser.add_argument("--animate", action="store_true", help="Animación interactiva en terminal")
    parser.add_argument("--experiments", action="store_true", help="Ejecutar suite de experimentos para el informe")

    args = parser.parse_args()

    if args.experiments:
        run_experiment_suite(ForestFireAutomaton)
        return

    ca = ForestFireAutomaton(
        width=args.width,
        height=args.height,
        wind_speed=args.wind_speed,
        wind_angle_deg=args.wind_angle,
        humidity=args.humidity
    )
    ca.reset(args.preset)

    print(f"🌲 Iniciando Simulación de Autómata Celular ({args.width}x{args.height}) - Escenario: '{args.preset}'")
    ca.print_terminal_frame()

    for step_i in range(1, args.steps + 1):
        if args.animate:
            time.sleep(0.12)
            # Código de escape ANSI para limpiar la pantalla y crear animación fluida
            print("\033[H\033[J", end="")
        
        ca.step()
        
        if args.animate or step_i % 10 == 0 or step_i == args.steps:
            ca.print_terminal_frame()

    print("\n🏁 Simulación completada exitosamente.")


if __name__ == "__main__":
    main()
