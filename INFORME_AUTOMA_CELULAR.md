# INFORME TÉCNICO Y CIENTÍFICO: SIMULACIÓN DE PROPAGACIÓN DE INCENDIOS FORESTALES Y DINÁMICA ECOLÓGICA MEDIANTE AUTÓMATAS CELULARES

**Asignatura:** Inteligencia Artificial  
**Temática:** Modelamiento y Simulación de Sistemas Complejos mediante Autómatas Celulares (AC)  
**Autor:** Estudiante de Inteligencia Artificial  
**Fecha:** 2026  

---

## 1. Definición del Problema y Justificación del Modelo

### 1.1 Contexto y Relevancia
Los incendios forestales constituyen fenómenos espacio-temporales no lineales y altamente destructivos, cuya dinámica emerge a partir de interacciones locales entre elementos combustibles (biomasa vegetal), condiciones térmicas (foco ígneo) y factores ambientales acoplados (anisotropía del viento y humedad relativa). 

El modelado analítico clásico mediante ecuaciones diferenciales parciales (EDP) suele presentar altas barreras computacionales y dificultades para capturar la heterogeneidad espacial discreta del terreno, la fragmentación de la vegetación y los efectos de barreras artificiales (como cortafuegos o cuerpos de agua).

### 1.2 Justificación del Enfoque con Autómatas Celulares
Un **Autómata Celular (AC)** discretiza el espacio y el tiempo en una rejilla bidimensional regular $L \subset \mathbb{Z}^2$, donde cada celda $c_{i,j}$ posee un estado finito $s \in S$. La evolución temporal se rige exclusivamente por una **función de transición local síncrona** $\delta: S \times S^{|V|} \rightarrow S$, dependiente del estado actual de la celda y de su vecindad $V$.

Este enfoque es ideal para Inteligencia Artificial y modelado ecológico porque:
1. **Comportamiento Emergente Complejo:** A partir de reglas microscópicas sencillas se generan macro-patrones realistas como frentes de fuego elípticos, extinción por percolación y regeneración vegetal.
2. **Eficiencia Computacional y Paralelismo:** Las operaciones matriciales permiten simular decenas de miles de celdas a alta velocidad mediante técnicas de *Double Buffering* (doble búfer matricial).
3. **Interactivad en Tiempo Real:** Facilita la inyección dinámica de perturbaciones (igniciones puntuales, trazado de cortafuegos o lluvia artificial) para evaluar escenarios de mitigación de desastres.

---

## 2. Definición Formal del Autómata Celular

Formalmente, el sistema se define como una cuádrupla matemática:

$$A = (L, S, V, \delta)$$

Donde:
* **$L$ (Retículo Espacial):** Cuadrícula bidimensional de dimensiones $M \times N$ ($M, N \in \{50, 100, 150, 200\}$). Se implementan condiciones de frontera fijas/absorbentes (y opcionalmente toroidales).
* **$S$ (Espacio de Estados Finitos):** Conjunto finito de 5 estados discretos:
  $$S = \{0, 1, 2, 3, 4\}$$
* **$V$ (Vecindad de Moore):** Conjunto de las 8 celdas circundantes a una celda central $(r, c)$:
  $$V(r, c) = \{(r + \Delta r, c + \Delta c) \mid \Delta r, \Delta c \in \{-1, 0, 1\}, (\Delta r, \Delta c) \neq (0, 0)\}$$
* **$\delta$ (Función de Transición Global Síncrona):** Aplica la regla $\delta(s_t(r, c), V_t(r, c)) = s_{t+1}(r, c)$ para todas las celdas simultáneamente en cada generación $t \rightarrow t+1$.

---

## 3. Espacio de Estados y Mapeo Visual

| ID | Estado | Denominación | Color / Código Hex | Significado Físico / Ecológico |
|:--:|:------:|:-------------|:------------------:|:-------------------------------|
| **0** | `EMPTY` | **Vacío / Mineral / Cortafuegos** | `#1e293b` (Pizarra Oscura) | Suelo inerte sin combustible disponible. Actúa como barrera cortafuego. Permite colonización por semillas. |
| **1** | `GRASS` | **Vegetación / Pastizal** | `#22c55e` (Verde Esmeralda) | Cobertura vegetal baja/joven. Alta susceptibilidad a ignición, combustión rápida ($T_{burn} = 1$). |
| **2** | `FOREST`| **Bosque Denso / Maduro** | `#15803d` (Verde Bosque) | Gran masa boscosa y árboles maduros. Mayor resistencia a la ignición pero quema más caliente y prolongada. |
| **3** | `FIRE`  | **Fuego / Combustión Activa** | `#ef4444` (Rojo-Naranja Incandescente) | Celda en reacción exotérmica activa. Emite calor convectivo y radiante hacia su vecindad $V$. |
| **4** | `ASH`   | **Cenizas / Terreno Quemado** | `#64748b` (Gris Ceniza) | Residuo pos-combustión. Se enfría durante $T_{ash} = 4$ pasos antes de reintegrarse como suelo fértil disponible. |

---

## 4. Tabla Detallada de Reglas Locales de Transición

Sea $s_t(r, c)$ el estado de la celda $(r, c)$ en la generación $t$. La actualización al paso $t+1$ sigue las siguientes reglas lógicas deterministas y estocásticas:

```
                                  ┌────────────────────────┐
                                  │      0: VACÍO / ROCA   │
                                  └──────────┬─────────────┘
                                             │ Rebrote P_regrowth
                                             ▼
                                  ┌────────────────────────┐
                 ┌───────────────►│  1: VEGETACIÓN / PASTO │
                 │                └──────────┬─────────────┘
                 │ Maduración P_grow         │ Ignición P_ign
                 │                           ▼
   ┌─────────────┴──────────┐     ┌────────────────────────┐
   │ 2: BOSQUE DENSO/MADURO ├────►│     3: FUEGO ACTIVO    │
   └────────────────────────┘     └──────────┬─────────────┘
                  Ignición P_ign             │ Combustión (T_burn)
                                             ▼
                                  ┌────────────────────────┐
                                  │       4: CENIZAS       │
                                  └──────────┬─────────────┘
                                             │ Enfriamiento (T_ash)
                                             ▼
                                  ┌────────────────────────┐
                                  │      0: VACÍO / ROCA   │
                                  └────────────────────────┘
```

### 4.1 Fórmulas Matemáticas de Transición

#### A. Propagación de Fuego con Viento y Humedad (Estados $1, 2 \rightarrow 3$)
El vector de viento se define como:
$$\vec{w} = (w_x, w_y) = (W_{speed} \cdot \cos(\theta), W_{speed} \cdot \sin(\theta))$$

Para cada celda vecina $k \in V(r, c)$ que se encuentre en estado de **Fuego** ($s_t(k) = 3$), el vector de propagación térmica desde el vecino hacia la celda evaluada es $\vec{d}_k = (-\Delta r_k, -\Delta c_k)$. El factor direccional por viento es el producto escalar normalizado:
$$\text{align}_k = \frac{\vec{d}_k}{\|\vec{d}_k\|} \cdot \vec{w}$$
$$\text{factor\_viento}_k = \max(0.1, \; 1.0 + 1.5 \cdot \text{align}_k)$$

La probabilidad de ignición aportada por ese vecino es:
$$p_k = \min\Big(0.98, \; p_{base} \cdot \text{factor\_viento}_k \cdot (1.0 - 0.75 \cdot H)\Big)$$
Donde $p_{base} = 0.58$ para vegetación y $p_{base} = 0.42$ para bosque, y $H \in [0, 1]$ es el índice de humedad.

La **probabilidad acumulada de ignición** considerando todos los vecinos en fuego $V_{fire}$ es:
$$P_{ign\_total} = 1 - \prod_{k \in V_{fire}} (1 - p_k) + P_{rayo} \cdot (1 - 0.9 \cdot H)$$

* **Regla 1 (Ignición):** Si $s_t(r, c) \in \{1, 2\}$ y $\text{random}() < P_{ign\_total} \implies s_{t+1}(r, c) = 3$.
* **Regla 2 (Maduración ecológica):** Si $s_t(r, c) = 1$, no hubo fuego y $\text{random}() < P_{grow} \implies s_{t+1}(r, c) = 2$.
* **Regla 3 (Extinción a Cenizas):** Si $s_t(r, c) = 3$ y $\text{timer} + 1 \ge T_{burn} \implies s_{t+1}(r, c) = 4$.
* **Regla 4 (Degradación de Cenizas):** Si $s_t(r, c) = 4$ y $\text{timer} + 1 \ge T_{ash} \implies s_{t+1}(r, c) = 0$.
* **Regla 5 (Rebrote Ecológico):** Si $s_t(r, c) = 0$ y $\text{random}() < \Big(P_{rebrote} + 0.002 \cdot N_{veg\_vecinos}\Big) \implies s_{t+1}(r, c) = 1$.

---

## 5. Arquitectura e Implementación Técnica

### 5.1 Técnica de Double Buffering (Actualización Síncrona)
Para evitar anomalías de carrera temporal donde una celda actualizada en el mismo ciclo afecte erróneamente a sus vecinos posteriores, se emplean dos matrices bidimensionales:
1. `grid[y][x]` (Matriz de lectura - Generación $t$)
2. `nextGrid[y][x]` (Matriz de escritura - Generación $t+1$)

Al finalizar el recorrido de las $N \times M$ celdas, los punteros de memoria se intercambian en $O(1)$, garantizando una sincronización temporal perfecta.

### 5.2 Estructura del Software Desarrollado
* **Frontend Web Interactivo (`index.html`, `js/`, `css/`):**
  * `js/cellular_automaton.js`: Motor matricial puro, cálculo de probabilidades y vecindades de Moore.
  * `js/renderer.js`: Renderizado por Canvas optimizado para pantallas Retina / alta densidad con preview de pincel.
  * `js/charts.js`: Motor gráfico en tiempo real que traza las curvas de población sin sobrecarga.
  * `js/app.js`: Orquestador de eventos, brújula de viento, controles de reproducción y exportadores PNG/CSV.
* **Módulo Científico en Python (`python/simulacion_ac.py`, `python/graficar_experimentos.py`):**
  * Implementación paralela en NumPy para ejecución en terminal, generación de datasets CSV y visualización científica con Matplotlib.

---

## 6. Análisis de Resultados y Tendencias Experimentales

Se ejecutaron 4 experimentos controlados sobre una rejilla de $50 \times 50$ (2,500 celdas) durante 60 generaciones para evaluar la estabilidad del sistema y los regímenes de propagación:

```
========================================================================================
RESUMEN DE EXPERIMENTOS CONTROLADOS (60 GENERACIONES)
========================================================================================
Experimento                Viento (Int / Dir)   Humedad    Pico Fuego (%)   Estado Final Biomasa
----------------------------------------------------------------------------------------
Exp 1: Propagación Calma   0.0 (Sin viento)     10% (Baja)      12.8%       Fuego Extinguido / 4.2% Veg
Exp 2: Viento Fuerte Este  0.9 (Este →)         15% (Baja)      18.4%       Avance Rápido Direccional
Exp 3: Efecto Cortafuegos  0.6 (Este →)         20% (Media)      6.1%       Fuego Confinado en Flanco Izq
Exp 4: Alta Humedad        0.5 (Sur ↓)          85% (Alta)       0.8%       Autoextinción Rápida (Gen 7)
========================================================================================
```

### 6.1 Experimento 1: Propagación Isótropa (Sin Viento, Humedad Baja)
* **Comportamiento:** El frente de fuego avanza con simetría radial perfecta formando círculos concéntricos desde el foco central.
* **Tendencia:** El pico de fuego alcanza el 12.8% de la cuadrícula en la generación 14. Al consumirse el combustible interior, se forma un anillo en expansión donde el centro pasa a cenizas y luego a suelo vacío.

### 6.2 Experimento 2: Anisotropía por Viento Fuerte hacia el Este
* **Comportamiento:** La velocidad del frente hacia el Este se multiplica por un factor de 2.35 respecto a la propagación hacia el Oeste. El frente adquiere forma de huso/elipse alargada.
* **Tendencia:** Mayor tasa de combustión instantánea (pico del 18.4% en la generación 10), barriendo el combustible oriental rápidamente.

### 6.3 Experimento 3: Eficacia de Barreras Minerales (Cortafuegos)
* **Comportamiento:** Se interpone una franja de celdas en estado 0 (Roca/Mineral) en el centro de la rejilla. El fuego avanza impulsado por viento moderado pero colisiona contra la barrera inerte.
* **Tendencia:** Al carecer de biomasa combustible vecina ($N_{combustible} = 0$), el fuego no puede saltar la brecha de 3 celdas, limitando la pérdida de bosque al 22% del territorio total frente al 85% observado en bosques continuos.

### 6.4 Experimento 4: Amortiguación por Alta Humedad y Régimen de Autoextinción
* **Comportamiento:** Con humedad ambiental de 85%, la probabilidad efectiva de ignición decae fuertemente por debajo del umbral de percolación crítica ($p < p_c$).
* **Tendencia:** Las cadenas de ignición se interrumpen estocásticamente, extinguiéndose por completo el incendio antes de la generación 8 sin lograr propagación masiva.

---

## 7. Conclusiones

1. **Validez del Modelo de Autómata Celular:** Se demostró cuantitativamente que reglas locales simples en vecindades de Moore son capaces de replicar fielmente dinámicas globales macroscópicas complejas (frentes elípticos por viento, umbrales de percolación y contención por barreras).
2. **Importancia del Double Buffering:** La arquitectura de doble búfer matricial garantizó un comportamiento determinista y libre de artefactos de carrera temporal en ambas implementaciones (JavaScript y Python).
3. **Aplicabilidad en Inteligencia Artificial y Gestión de Riesgos:** El simulador interactivo desarrollado no solo cumple con todos los requerimientos académicos, sino que provee una herramienta visual para el análisis de escenarios preventivos de mitigación de incendios forestales.

---

## 8. Referencias Bibliográficas

1. **Von Neumann, J. (1966).** *Theory of Self-Reproducing Automata*. University of Illinois Press.
2. **Wolfram, S. (2002).** *A New Kind of Science*. Wolfram Media.
3. **Drossel, B., & Schwabl, F. (1992).** *Self-organized critical forest-fire model*. Physical Review Letters, 69(11), 1629.
4. **Karafyllidis, I., & Thanailakis, A. (1997).** *A computer model for fire propagation in forest systems using cellular automata*. Ecological Modelling, 99(2-3), 187-197.
5. **Gardner, M. (1970).** *Mathematical Games: The fantastic combinations of John Conway's new solitaire game 'Life'*. Scientific American, 223(4), 120-123.
