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

# Importamos el módulo sys para operaciones del sistema
import sys
# Importamos time para pausar la animación entre fotogramas
import time
# Importamos math para funciones trigonométricas (coseno, seno, hipotenusa)
import math
# Importamos argparse para recibir parámetros desde la terminal (línea de comandos)
import argparse
# Importamos NumPy para manejar matrices numéricas bidimensionales ultrarrápidas
import numpy as np

# ========================================================================================
# 1. DEFINICIÓN DE CONSTANTES DE LOS 5 ESTADOS FINITOS
# ========================================================================================
# Estado 0: Terreno Vacío / Roca / Cortafuegos mineral (no combustible)
STATE_EMPTY  = 0
# Estado 1: Vegetación ligera / Pastizal (combustión rápida, dura 1 generación ardiendo)
STATE_GRASS  = 1
# Estado 2: Bosque Maduro Denso (alta carga de biomasa, dura 2 generaciones ardiendo)
STATE_FOREST = 2
# Estado 3: Fuego Activo (emite calor a sus 8 vecinos en la vecindad de Moore)
STATE_FIRE   = 3
# Estado 4: Cenizas / Terreno Quemado (enfriándose durante 4 generaciones)
STATE_ASH    = 4

# Diccionario con nombres descriptivos de cada estado
STATE_NAMES = {
    STATE_EMPTY:  "Vacío / Roca",
    STATE_GRASS:  "Vegetación",
    STATE_FOREST: "Bosque Denso",
    STATE_FIRE:   "Fuego Activo",
    STATE_ASH:    "Cenizas"
}

# Códigos de escape ANSI para pintar con colores en la terminal de Linux/Mac/Windows
ANSI_COLORS = {
    STATE_EMPTY:  "\033[90m░\033[0m",    # Gris tenue para suelo vacío o roca inerte
    STATE_GRASS:  "\033[92m♣\033[0m",    # Verde brillante para pastizal
    STATE_FOREST: "\033[32m▲\033[0m",    # Verde oscuro para bosque denso
    STATE_FIRE:   "\033[91;1m🔥\033[0m", # Emoji y rojo brillante para fuego activo
    STATE_ASH:    "\033[37m▒\033[0m"     # Gris medio para cenizas
}

# Caracteres ASCII planos por si la terminal no soporta colores ni emojis
ASCII_CHARS = {
    STATE_EMPTY:  " ",  # Espacio en blanco para vacío
    STATE_GRASS:  ".",  # Punto para pasto
    STATE_FOREST: "T",  # Letra T para árbol
    STATE_FIRE:   "*",  # Asterisco para fuego
    STATE_ASH:    "x"   # Letra x para ceniza
}


# ========================================================================================
# 2. CLASE PRINCIPAL: ForestFireAutomaton
# ========================================================================================
class ForestFireAutomaton:
    """Motor matricial síncrono del Autómata Celular en Python."""

    def __init__(self, width=60, height=30, wind_speed=0.5, wind_angle_deg=0.0,
                 humidity=0.2, p_regrowth=0.005, p_lightning=0.00005):
        # Asignamos el ancho de la cuadrícula (número de columnas)
        self.width = width
        # Asignamos el alto de la cuadrícula (número de filas)
        self.height = height
        
        # Intensidad del viento entre 0.0 (calma) y 1.0 (viento fuerte)
        self.wind_speed = float(wind_speed)
        # Convertimos el ángulo de grados a radianes para usar funciones trigonométricas
        self.wind_angle = math.radians(wind_angle_deg)
        # Nivel de humedad ambiental entre 0.0 (muy seco) y 1.0 (muy húmedo)
        self.humidity = float(humidity)
        # Probabilidad de que nazca pasto en suelo vacío (tasa de rebrote)
        self.p_regrowth = float(p_regrowth)
        # Probabilidad de que caiga un rayo o haya chispa espontánea
        self.p_lightning = float(p_lightning)
        
        # Probabilidad base de que prenda fuego el pastizal al tener un vecino en llamas
        self.p_ign_grass = 0.58
        # Probabilidad base de que prenda fuego el bosque maduro al tener un vecino en llamas
        self.p_ign_forest = 0.42
        
        # Cuántas generaciones dura ardiendo el pastizal antes de volverse ceniza
        self.burn_duration_grass = 1
        # Cuántas generaciones dura ardiendo el bosque denso antes de volverse ceniza
        self.burn_duration_forest = 2
        # Cuántas generaciones tardan las cenizas en enfriarse y convertirse en suelo vacío
        self.ash_duration = 4
        
        # Creamos la matriz principal de estados 2D con ceros usando NumPy (tipo uint8 = 1 byte por celda)
        self.grid = np.zeros((height, width), dtype=np.uint8)
        # Creamos la matriz de temporizadores 2D para la cuenta regresiva de fuego y cenizas
        self.timers = np.zeros((height, width), dtype=np.uint8)
        
        # Contador de generación (pasos de tiempo transcurridos)
        self.generation = 0
        # Lista para guardar el historial de estadísticas de cada generación
        self.history = []

        # Calculamos el vector de dirección del viento (dx, dy) usando coseno y seno
        self.wind_vec = np.array([
            math.cos(self.wind_angle) * self.wind_speed,  # Componente horizontal X
            math.sin(self.wind_angle) * self.wind_speed   # Componente vertical Y
        ])

        # Definimos los 8 desplazamientos relativos (dy, dx) de la vecindad de Moore:
        self.moore_offsets = [
            (-1, -1), (-1, 0), (-1, 1), # Fila superior (arriba-izq, arriba, arriba-der)
            ( 0, -1),          ( 0, 1), # Fila central (izquierda, derecha)
            ( 1, -1), ( 1, 0), ( 1, 1)  # Fila inferior (abajo-izq, abajo, abajo-der)
        ]

    def reset(self, preset="mixed_forest"):
        """Inicializa la cuadrícula con un escenario preconfigurado."""
        # Reiniciamos el contador de generación a 0
        self.generation = 0
        # Vaciamos la lista de historial
        self.history = []
        # Ponemos todos los temporizadores en 0
        self.timers.fill(0)

        # Calculamos el total de celdas en la cuadrícula
        total_cells = self.width * self.height
        
        # ESCENARIO 1: Bosque denso altamente combustible
        if preset == "dense_forest":
            # Generamos números aleatorios entre 0 y 1 para toda la matriz
            rand = np.random.rand(self.height, self.width)
            # 85% de probabilidad de ser Bosque Maduro, 15% de ser Pastizal
            self.grid = np.where(rand < 0.85, STATE_FOREST, STATE_GRASS).astype(np.uint8)
            # Iniciamos un foco de fuego justo en el centro de la cuadrícula
            self.grid[self.height // 2, self.width // 2] = STATE_FIRE

        # ESCENARIO 2: Bosque mixto estándar
        elif preset == "mixed_forest":
            # Generamos números aleatorios para cada celda
            rand = np.random.rand(self.height, self.width)
            # Inicializamos la matriz en ceros (suelo vacío)
            self.grid = np.zeros((self.height, self.width), dtype=np.uint8)
            # 50% de las celdas serán Pastizal (Vegetación ligera)
            self.grid[rand < 0.50] = STATE_GRASS
            # 35% de las celdas serán Bosque Denso
            self.grid[(rand >= 0.50) & (rand < 0.85)] = STATE_FOREST
            # 15% restante de las celdas quedarán como Suelo Vacío
            self.grid[rand >= 0.85] = STATE_EMPTY
            # Iniciamos un foco de fuego en el centro
            self.grid[self.height // 2, self.width // 2] = STATE_FIRE

        # ESCENARIO 3: Demostración de barrera cortafuegos mineral
        elif preset == "firebreak_demo":
            # Generamos vegetación en todo el mapa (60% pasto, 40% bosque)
            rand = np.random.rand(self.height, self.width)
            self.grid = np.where(rand < 0.6, STATE_GRASS, STATE_FOREST).astype(np.uint8)
            # Calculamos la columna central de la cuadrícula
            mid_x = self.width // 2
            # Dibujamos una franja vertical de 3 celdas de ancho con Suelo Vacío (Cortafuegos inerte)
            self.grid[:, max(0, mid_x - 1):min(self.width, mid_x + 2)] = STATE_EMPTY
            # Calculamos la fila central
            mid_y = self.height // 2
            # Colocamos una columna de fuego en el flanco izquierdo (a un sexto del ancho)
            self.grid[max(0, mid_y - 2):min(self.height, mid_y + 3), self.width // 6] = STATE_FIRE

        # ESCENARIO 4: Pradera dispersa
        elif preset == "sparse_plains":
            # Generamos números aleatorios para cada celda
            rand = np.random.rand(self.height, self.width)
            # Inicializamos la matriz en ceros (suelo vacío)
            self.grid = np.zeros((self.height, self.width), dtype=np.uint8)
            # 40% de probabilidad de tener pasto
            self.grid[rand < 0.40] = STATE_GRASS
            # 10% de probabilidad de tener árboles aislados
            self.grid[(rand >= 0.40) & (rand < 0.50)] = STATE_FOREST
            # 50% restante queda como suelo vacío
            # Colocamos el fuego en el centro
            self.grid[self.height // 2, self.width // 2] = STATE_FIRE

        # ESCENARIO 5: Lienzo vacío para creación libre
        else:
            # Llenamos toda la cuadrícula con estado vacío (0)
            self.grid.fill(STATE_EMPTY)

        # Registramos las estadísticas de población del estado inicial
        self._record_stats()

    def step(self):
        """
        Ejecuta una transición generacional completa con actualización síncrona (Double Buffering).
        """
        # DOUBLE BUFFERING: Creamos una copia de la matriz para escribir la siguiente generación
        # De esta forma ninguna celda modificada altera la lectura de sus vecinas en el mismo turno.
        next_grid = self.grid.copy()
        # Copiamos la matriz de temporizadores para calcular los tiempos futuros
        next_timers = self.timers.copy()

        # Obtenemos las dimensiones de la cuadrícula
        h, w = self.height, self.width
        # Obtenemos las componentes X e Y del vector de viento
        wind_x, wind_y = self.wind_vec[0], self.wind_vec[1]

        # BUCLE PRINCIPAL: Recorremos cada fila (y)
        for y in range(h):
            # Recorremos cada columna (x)
            for x in range(w):
                # Leemos el estado actual de la celda en la generación t
                current_state = self.grid[y, x]
                # Leemos cuánto tiempo le queda a esta celda en su temporizador
                timer = self.timers[y, x]

                # ------------------------------------------------------------------------
                # REGLA 1: SI LA CELDA ESTÁ ARDIENDO (ESTADO 3: FUEGO)
                # ------------------------------------------------------------------------
                if current_state == STATE_FIRE:
                    # Si todavía le queda tiempo de combustión:
                    if timer > 1:
                        # Permanece en fuego en la siguiente generación
                        next_grid[y, x] = STATE_FIRE
                        # Restamos 1 generación al temporizador
                        next_timers[y, x] = timer - 1
                    else:
                        # Se le agotó el combustible: se transforma en CENIZAS
                        next_grid[y, x] = STATE_ASH
                        # Iniciamos el temporizador de enfriamiento de cenizas (4 generaciones)
                        next_timers[y, x] = self.ash_duration

                # ------------------------------------------------------------------------
                # REGLA 2: SI LA CELDA ES CENIZA (ESTADO 4: CENIZAS)
                # ------------------------------------------------------------------------
                elif current_state == STATE_ASH:
                    # Si aún está caliente y degradándose:
                    if timer > 1:
                        # Permanece como ceniza
                        next_grid[y, x] = STATE_ASH
                        # Restamos 1 generación al enfriamiento
                        next_timers[y, x] = timer - 1
                    else:
                        # La ceniza se enfrió por completo: se convierte en SUELO VACÍO
                        next_grid[y, x] = STATE_EMPTY
                        # Reiniciamos el temporizador a cero
                        next_timers[y, x] = 0

                # ------------------------------------------------------------------------
                # REGLA 3: SI LA CELDA ES SUELO VACÍO (ESTADO 0: VACÍO / ROCA)
                # ------------------------------------------------------------------------
                elif current_state == STATE_EMPTY:
                    # Contador de vecinos con plantas para aporte de semillas
                    seed_neighbors = 0
                    # Revisamos los 8 vecinos de Moore
                    for dy, dx in self.moore_offsets:
                        ny, nx = y + dy, x + dx
                        # Verificamos que el vecino esté dentro de los límites del mapa
                        if 0 <= ny < h and 0 <= nx < w:
                            # Si el vecino es pasto o bosque, aporta semillas
                            if self.grid[ny, nx] in (STATE_GRASS, STATE_FOREST):
                                seed_neighbors += 1
                    
                    # Probabilidad de rebrote = base + bono por semillas vecinas
                    effective_regrowth = self.p_regrowth + (seed_neighbors * 0.002)
                    # Si el número aleatorio es menor que la probabilidad:
                    if np.random.rand() < effective_regrowth:
                        # ¡Nace nueva vegetación (Pastizal)!
                        next_grid[y, x] = STATE_GRASS
                        next_timers[y, x] = 0

                # ------------------------------------------------------------------------
                # REGLA 4: SI LA CELDA ES VEGETACIÓN (1) O BOSQUE (2) (CELDA VIVA COMBUSTIBLE)
                # ------------------------------------------------------------------------
                elif current_state in (STATE_GRASS, STATE_FOREST):
                    # Determinamos si la celda es bosque denso o pastizal
                    is_forest = (current_state == STATE_FOREST)
                    # Asignamos la probabilidad base según el tipo de biomasa
                    base_prob = self.p_ign_forest if is_forest else self.p_ign_grass

                    # Contador de vecinos que están ardiendo en fuego
                    fire_neighbors = 0
                    # Acumulador del factor de empuje del viento
                    wind_factor_sum = 0.0

                    # Revisamos las 8 celdas de la vecindad de Moore:
                    for dy, dx in self.moore_offsets:
                        ny, nx = y + dy, x + dx
                        # Verificamos que la celda vecina esté dentro del mapa
                        if 0 <= ny < h and 0 <= nx < w:
                            # Si el vecino está ardiendo en fuego:
                            if self.grid[ny, nx] == STATE_FIRE:
                                fire_neighbors += 1
                                
                                # Vector de calor: dirección desde el vecino ardiendo hacia mi celda
                                prop_x, prop_y = -dx, -dy
                                # Calculamos la distancia euclidiana (norma)
                                norm = math.hypot(prop_x, prop_y)
                                
                                # PRODUCTO ESCALAR (Punto): alineación entre el viento y el calor
                                dot = (prop_x / norm) * wind_x + (prop_y / norm) * wind_y
                                # Si dot > 0: viento a favor (acelera fuego); si dot < 0: viento en contra (frena)
                                wind_multiplier = max(0.1, 1.0 + dot * 1.5)
                                # Sumamos el multiplicador de viento de este vecino
                                wind_factor_sum += wind_multiplier

                    # Bandera para saber si la celda prende fuego
                    ignites = False
                    
                    # Si hay al menos un vecino ardiendo:
                    if fire_neighbors > 0:
                        # Calculamos el factor de viento promedio de los vecinos en llamas
                        avg_wind_factor = wind_factor_sum / fire_neighbors
                        # Probabilidad por vecino ajustada con viento y amortiguada por la humedad ambiental
                        p_neighbor = min(0.98, max(0.01, base_prob * avg_wind_factor * (1.0 - self.humidity * 0.75)))
                        # FÓRMULA DE PROBABILIDAD ACUMULADA: P = 1 - (1 - p)^k
                        p_catch_fire = 1.0 - math.pow(1.0 - p_neighbor, fire_neighbors)

                        # Evaluamos el tiro de dados aleatorio
                        if np.random.rand() < p_catch_fire:
                            ignites = True

                    # Si no prendió por vecinos, evaluamos si cae un rayo / chispa espontánea
                    if not ignites and self.p_lightning > 0:
                        eff_lightning = self.p_lightning * (1.0 - self.humidity * 0.9)
                        if np.random.rand() < eff_lightning:
                            ignites = True

                    # Si la celda se prendió fuego:
                    if ignites:
                        # Asignamos el estado FUEGO
                        next_grid[y, x] = STATE_FIRE
                        # El bosque denso dura 2 turnos ardiendo; el pastizal dura 1 turno
                        next_timers[y, x] = self.burn_duration_forest if is_forest else self.burn_duration_grass
                    else:
                        # Si no se quemó y es pasto, tiene 1% de probabilidad de madurar a Bosque Maduro
                        if not is_forest and np.random.rand() < 0.01:
                            next_grid[y, x] = STATE_FOREST
                            next_timers[y, x] = 0

        # DOUBLE BUFFERING (Intercambio Síncrono):
        # La matriz calculada para el futuro se convierte en la matriz activa del presente
        self.grid = next_grid
        self.timers = next_timers
        # Incrementamos el contador de generaciones
        self.generation += 1
        # Registramos las métricas de población de esta generación
        self._record_stats()

    def _record_stats(self):
        """Calcula el censo poblacional de cada estado en la generación actual."""
        # Calculamos el total de celdas del mapa
        total = self.width * self.height
        
        # Contamos cuántas celdas hay de cada uno de los 5 estados (0, 1, 2, 3, 4)
        counts = {
            s: int(np.sum(self.grid == s)) for s in (STATE_EMPTY, STATE_GRASS, STATE_FOREST, STATE_FIRE, STATE_ASH)
        }
        
        # Construimos el diccionario de estadísticas con conteos y porcentajes
        stats = {
            "gen": self.generation,                                               # Paso temporal actual
            "counts": counts,                                                     # Cantidad de celdas por estado
            "pct": {s: (counts[s] / total) * 100 for s in counts},                # Porcentaje del mapa por estado
            "has_fire": counts[STATE_FIRE] > 0                                    # Booleano: True si hay fuego activo
        }
        
        # Agregamos el registro al historial
        self.history.append(stats)
        return stats

    def get_latest_stats(self):
        """Retorna las estadísticas de la generación más reciente."""
        return self.history[-1] if self.history else self._record_stats()

    def print_terminal_frame(self, use_ansi=True):
        """Imprime la cuadrícula completa en la consola con colores ANSI o caracteres ASCII."""
        lines = []
        # Recorremos cada fila
        for y in range(self.height):
            # Construimos la línea de texto uniendo el color/carácter de cada columna
            line_str = "".join(
                ANSI_COLORS[self.grid[y, x]] if use_ansi else ASCII_CHARS[self.grid[y, x]]
                for x in range(self.width)
            )
            lines.append(line_str)

        # Obtenemos las estadísticas actuales para el encabezado
        stats = self.get_latest_stats()
        # Formateamos la barra de título con porcentajes
        header = f"\n=== GENERACIÓN {stats['gen']:03d} | Fuego: {stats['pct'][STATE_FIRE]:.1f}% | Veg: {stats['pct'][STATE_GRASS]:.1f}% | Bosque: {stats['pct'][STATE_FOREST]:.1f}% | Ceniza: {stats['pct'][STATE_ASH]:.1f}% ==="
        print(header)
        # Imprimimos todas las filas de la cuadrícula
        print("\n".join(lines))


def run_experiment_suite(ca_class, output_csv="experimentos_ac.csv"):
    """Ejecuta una suite de 4 experimentos científicos cuantitativos y los guarda en CSV."""
    print("🧪 Ejecutando suite de experimentos de validación...")
    
    # Definición de los 4 escenarios controlados para el informe académico
    experiments = [
        # Experimento 1: Calma (sin viento) y baja humedad en bosque denso
        {"name": "Exp1_Sin_Viento_Humedad_Baja", "wind_speed": 0.0, "wind_angle": 0, "humidity": 0.1, "preset": "dense_forest"},
        # Experimento 2: Viento fuerte hacia el Este (0 grados)
        {"name": "Exp2_Viento_Fuerte_Este", "wind_speed": 0.9, "wind_angle": 0, "humidity": 0.15, "preset": "mixed_forest"},
        # Experimento 3: Efecto de barrera cortafuegos vertical con viento moderado
        {"name": "Exp3_Efecto_Cortafuegos", "wind_speed": 0.6, "wind_angle": 0, "humidity": 0.2, "preset": "firebreak_demo"},
        # Experimento 4: Alta humedad (85%) para régimen de autoextinción
        {"name": "Exp4_Alta_Humedad_Contencion", "wind_speed": 0.5, "wind_angle": 90, "humidity": 0.85, "preset": "mixed_forest"}
    ]

    # Lista para almacenar todas las filas que se escribirán en el CSV
    records = []

    # Iteramos sobre cada uno de los 4 experimentos
    for exp in experiments:
        print(f"  -> Corriendo {exp['name']}...")
        # Instanciamos el autómata con los parámetros de este experimento
        ca = ca_class(width=50, height=50, wind_speed=exp["wind_speed"],
                      wind_angle_deg=exp["wind_angle"], humidity=exp["humidity"])
        # Cargamos el escenario correspondiente
        ca.reset(exp["preset"])

        # Simulamos 60 generaciones continuas
        for g in range(60):
            # Avanzamos una generación síncrona
            ca.step()
            # Obtenemos las estadísticas resultantes
            st = ca.get_latest_stats()
            # Guardamos la fila con los porcentajes redondeados
            records.append({
                "experimento": exp["name"],
                "generacion": st["gen"],
                "fuego_pct": round(st["pct"][STATE_FIRE], 2),
                "vegetacion_pct": round(st["pct"][STATE_GRASS], 2),
                "bosque_pct": round(st["pct"][STATE_FOREST], 2),
                "cenizas_pct": round(st["pct"][STATE_ASH], 2),
                "vacio_pct": round(st["pct"][STATE_EMPTY], 2)
            })

    # Abrimos el archivo CSV en modo escritura
    with open(output_csv, "w", encoding="utf-8") as f:
        # Escribimos los encabezados de las columnas
        f.write("experimento,generacion,fuego_pct,vegetacion_pct,bosque_pct,cenizas_pct,vacio_pct\n")
        # Escribimos cada una de las filas registradas
        for r in records:
            f.write(f"{r['experimento']},{r['generacion']},{r['fuego_pct']},{r['vegetacion_pct']},{r['bosque_pct']},{r['cenizas_pct']},{r['vacio_pct']}\n")

    print(f"✅ Experimentos finalizados y exportados a: {output_csv}")


def main():
    """Punto de entrada de línea de comandos."""
    # Configuramos el parser de argumentos para permitir opciones desde la terminal
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

    # Parseamos los argumentos pasados por el usuario
    args = parser.parse_args()

    # Si el usuario pasó la bandera --experiments, ejecutamos la suite y salimos
    if args.experiments:
        run_experiment_suite(ForestFireAutomaton)
        return

    # Si no, creamos la simulación con los argumentos recibidos
    ca = ForestFireAutomaton(
        width=args.width,
        height=args.height,
        wind_speed=args.wind_speed,
        wind_angle_deg=args.wind_angle,
        humidity=args.humidity
    )
    # Inicializamos el escenario elegido
    ca.reset(args.preset)

    print(f"🌲 Iniciando Simulación de Autómata Celular ({args.width}x{args.height}) - Escenario: '{args.preset}'")
    # Imprimimos el estado inicial
    ca.print_terminal_frame()

    # Bucle para avanzar las generaciones solicitadas
    for step_i in range(1, args.steps + 1):
        if args.animate:
            # Pausa de 120 milisegundos para que el ojo humano aprecie la animación
            time.sleep(0.12)
            # Código de escape ANSI para limpiar la pantalla y crear animación fluida
            print("\033[H\033[J", end="")
        
        # Avanzamos un paso temporal síncrono
        ca.step()
        
        # Si está en modo animación o es un múltiplo de 10 o el paso final, imprimimos el mapa
        if args.animate or step_i % 10 == 0 or step_i == args.steps:
            ca.print_terminal_frame()

    print("\n🏁 Simulación completada exitosamente.")


# Punto de entrada estándar de Python si el script se ejecuta directamente
if __name__ == "__main__":
    main()
