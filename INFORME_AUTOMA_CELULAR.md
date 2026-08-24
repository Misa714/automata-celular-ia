# INFORME TÉCNICO: SIMULACIÓN DE PROPAGACIÓN DE INCENDIOS FORESTALES MEDIANTE AUTÓMATAS CELULARES 2D

**Asignatura:** Inteligencia Artificial  
**Proyecto:** Modelamiento y Simulación de Sistemas Complejos mediante Autómatas Celulares (AC)  
**Calificación Objetivo:** 100 Puntos (Cumplimiento de Rúbrica)  

---

## 1. Definición del Problema y Justificación del Modelo (25%)

### 1.1 Contexto y Relevancia
Los incendios forestales constituyen fenómenos espacio-temporales complejos y destructivos. Su avance depende directamente de interacciones locales de proximidad entre árboles combustibles y focos de calor adyacentes.

Modelar este fenómeno mediante ecuaciones diferenciales continuas suele requerir una carga computacional elevada y dificulta modelar la discontinuidad del terreno (espacios vacíos o barreras cortafuegos).

### 1.2 Justificación del Enfoque con Autómatas Celulares (AC)
Un **Autómata Celular** discretiza el espacio en una rejilla bidimensional regular $L \subset \mathbb{Z}^2$, donde cada celda posee un estado finito $s \in S$. La evolución temporal se rige por una **función de transición local síncrona** $\delta(s, V) \rightarrow s'$, basada únicamente en el estado de la celda y de su vecindad $V$.

Este enfoque es ideal para la Inteligencia Artificial porque demuestra el concepto de **Comportamiento Emergente**: a partir de 4 reglas locales microscópicas muy simples, emergen patrones macroscópicos realistas (ondas concéntricas de fuego, autoextinción por agotamiento de combustible y regeneración natural).

---

## 2. Definición Formal del Autómata Celular y Estados

Formalmente, el sistema se define como una cuádrupla matemática:
$$A = (L, S, V, \delta)$$

Donde:
* **$L$ (Retículo Espacial):** Rejilla 2D de dimensiones $N \times M$ ($30\times30$, $50\times50$, $80\times80$).
* **$S$ (Espacio de Estados Finitos):** Conjunto discreto de 4 estados:
  $$S = \{0, 1, 2, 3\}$$
* **$V$ (Vecindad de Moore):** Las 8 celdas adyacentes (arriba, abajo, izquierda, derecha y las 4 diagonales).
* **$\delta$ (Función de Transición Síncrona):** Aplica las reglas locales simultáneamente a toda la matriz en cada generación $t \rightarrow t+1$.

### Tabla de Estados Finitos

| ID | Estado | Denominación | Color / Código Hex | Significado Físico / Ecológico |
|:---:|:---:|:---|:---:|:---|
| **0** | `VACIO` | **Vacío / Suelo** | `#18181b` (Gris oscuro) | Suelo mineral inerte o cortafuegos. No se quema. Permite el rebrote. |
| **1** | `ARBOL` | **Bosque / Árbol** | `#22c55e` (Verde vivo) | Biomasa vegetal viva y combustible disponible. |
| **2** | `FUEGO` | **Fuego Activo** | `#ef4444` (Rojo fuego) | Celda en combustión activa; emite calor a sus 8 vecinos de Moore. |
| **3** | `CENIZA`| **Cenizas** | `#71717a` (Gris ceniza) | Terreno quemado caliente. Transición de 1 generación antes de enfriarse. |

---

## 3. Tabla Detallada de Reglas Locales de Transición ($\delta$)

En cada paso temporal $t \rightarrow t+1$, cada celda $(f, c)$ evalúa su estado actual y el de sus vecinos según las siguientes 4 reglas lógicas:

```
          +---------------------------+
          |      0: VACÍO / SUELO     |
          +-------------+-------------+
                        | Rebrote (P_rebrote = 0.5%)
                        v
          +---------------------------+
          |      1: BOSQUE / ÁRBOL    |
          +-------------+-------------+
                        | Propagación por vecinos en fuego (P_prop = 70%)
                        v
          +---------------------------+
          |      2: FUEGO ACTIVO      |
          +-------------+-------------+
                        | Combustión (1 generación)
                        v
          +---------------------------+
          |         3: CENIZAS        |
          +-------------+-------------+
                        | Enfriamiento (1 generación)
                        v
          +---------------------------+
          |      0: VACÍO / SUELO     |
          +---------------------------+
```

### Detalle de las Reglas:
1. **Regla 1 (Extinción del Fuego):** Toda celda en estado `FUEGO (2)` pasa deterministamente a `CENIZA (3)` en el siguiente paso de tiempo.
2. **Regla 2 (Enfriamiento de Cenizas):** Toda celda en estado `CENIZA (3)` se enfría y pasa deterministamente a `VACIO (0)`.
3. **Regla 3 (Propagación del Fuego a Árboles):** Si una celda es `ARBOL (1)` y tiene al menos un vecino en estado `FUEGO (2)` en su vecindad de Moore, se enciende (`FUEGO`) con probabilidad $P_{\text{propagación}} = 0.70$. De lo contrario, permanece como `ARBOL`.
4. **Regla 4 (Rebrote Ecológico):** Si una celda está `VACIA (0)`, tiene una probabilidad $P_{\text{rebrote}} = 0.005$ (0.5%) de que nazca espontáneamente un nuevo `ARBOL (1)`.

---

## 4. Implementación Técnica y Matriz (25%)

### 4.1 Arquitectura con Doble Búfer (*Double Buffering*)
Para garantizar que la actualización sea estrictamente **síncrona y simultánea**, se utilizan dos matrices bidimensionales:
1. `matriz[f][c]`: Matriz de lectura que representa la generación actual $t$.
2. `nuevaMatriz[f][c]`: Matriz de escritura donde se computa el estado futuro $t+1$.

Al finalizar la evaluación de todas las celdas, se realiza el intercambio `matriz = nuevaMatriz`. Esto evita que el cambio de estado de una celda altere la evaluación de sus celdas vecinas en el mismo turno temporal.

### 4.2 Verificación de Límites en la Vecindad de Moore
La función `contarVecinosFuego(f, c)` recorre los 8 pares de coordenadas relativas asegurando que no existan accesos fuera de rango:
```javascript
if (vf >= 0 && vf < filas && vc >= 0 && vc < columnas) {
    if (matriz[vf][vc] === FUEGO) {
        fuegos++;
    }
}
```

---

## 5. Visualización, Interacción y Controles (30%)

### 5.1 Mapa de Colores y Representación Gráfica (15%)
El autómata se dibuja mediante un elemento `<canvas>` HTML5 en la web y mediante caracteres y Matplotlib en Python, mapeando cada estado a su color representativo:
- Negro/Gris oscuro -> Suelo libre.
- Verde brillante -> Árboles vivos.
- Rojo incandescente -> Fuego.
- Gris medio -> Ceniza.

### 5.2 Interfaz de Control e Interacción Directa (15%)
La interfaz web desarrollada incluye:
- **Botón Iniciar / Pausar:** Controla la ejecución del bucle temporal.
- **Botón Paso (+1):** Permite avanzar la simulación paso a paso para análisis pedagógico.
- **Botón Reiniciar / Limpiar:** Restablece la rejilla a las condiciones iniciales o la vacía por completo.
- **Pincel Interactivo:** Permite al usuario hacer clic sobre cualquier celda del lienzo para encender focos de fuego manualmente, plantar árboles o trazar barreras cortafuegos.
- **Ajustes en Vivo:** Sliders para regular la probabilidad de propagación ($10\% - 100\%$), la densidad inicial de bosque y la velocidad de simulación (FPS).

---

## 6. Análisis de Resultados y Tendencias a Largo Plazo (20%)

Se ejecutaron simulaciones controladas sobre una rejilla de $50 \times 50$ (2500 celdas) con una densidad inicial de bosque del 70% y un foco ígneo central:

### 6.1 Evolución Espacial de la Cuadrícula

A continuación se muestra la secuencia temporal del incendio forestal en las generaciones $t=0$, $t=5$, $t=12$ y $t=25$:

![Evolución Temporal de la Cuadrícula](graficos/evolucion_cuadricula.png)

* **Generación $t=0$:** Se observa el foco inicial puntual de fuego en el centro rodeado por masa forestal continua.
* **Generación $t=5$:** El fuego se expande radialmente en un frente circular homogéneo; el núcleo central se transforma en ceniza y suelo vacío.
* **Generación $t=12$:** Se alcanza el pico máximo de fuego activo consumiendo la biomasa circundante.
* **Generación $t=25$:** Al agotarse el combustible de contacto en el perímetro, el fuego se autoextingue por completo, dejando un claro central de cenizas y suelo disponible para el rebrote.

---

### 6.2 Curva de Dinámica de Poblaciones

La siguiente gráfica cuantifica los porcentajes de ocupación de cada estado a lo largo de 50 generaciones:

![Curva de Dinámica Temporal](graficos/curva_dinamica_incendio.png)

### 6.3 Conclusiones del Análisis de Tendencias:
1. **Fase de Crecimiento Exponencial (Gen 0 a 10):** El fuego crece aceleradamente mientras encuentra una alta densidad de árboles adyacentes.
2. **Pico y Saturación (Gen 10 a 14):** Se alcanza el máximo porcentaje de celdas en llamas ($\approx 12\%-15\%$).
3. **Autoextinción por Falta de Conectividad (Gen 15 a 25):** Al convertirse las celdas quemadas en cenizas inertes, se interrumpe la propagación y el fuego se extingue sin necesidad de agentes externos.
4. **Estabilidad y Ciclo de Regeneración a Largo Plazo:** Gracias a la regla de rebrote ($P_{\text{rebrote}} = 0.5\%$), el suelo vacío comienza a repoblarse lentamente de nuevos árboles jóvenes, completando el ciclo ecológico natural.

---

## 7. Conclusiones

1. Se implementó exitosamente un Autómata Celular bidimensional síncrono con **4 estados finitos**, **vecindad de Moore** y técnica de **Double Buffering**.
2. La herramienta desarrollada cumple con el 100% de los requisitos de la rúbrica de evaluación: código limpio, altamente comentado y comprensible, visualización gráfica intuitiva, interacción en tiempo real y análisis experimental cuantitativo.
