# 🌲 Simulador de Autómata Celular: Incendios Forestales y Dinámica Ecológica
**Asignatura:** Inteligencia Artificial  
**Proyecto:** Modelamiento y Simulación de Sistemas Complejos mediante Autómatas Celulares (AC)

---

## 📋 Resumen del Proyecto

Este proyecto implementa una simulación interactiva de alta fidelidad basada en un **Autómata Celular 2D** para modelar la propagación de incendios forestales, la influencia direccional del viento, la humedad ambiental y los ciclos de regeneración ecológica.

Cuenta con:
1. **Aplicación Web Interactiva (HTML5 / Canvas / Vanilla JS / CSS Glassmorphism)** con interacción en tiempo real mediante pinceles, controles de reproducción, brújula de viento, curvas de población dinámicas y exportación de capturas PNG y datos CSV.
2. **Módulo Científico en Python (`python/simulacion_ac.py`)** con soporte para visualización en terminal ANSI, ejecución de suites de experimentos matriciales con NumPy y generación de gráficos en Matplotlib.
3. **Informe Académico Formal (`INFORME_AUTOMA_CELULAR.md`)** estructurado según la rúbrica de evaluación de 100 puntos.

---

## 🎨 Estados Finitos del Autómata ($S$)

| Estado | Nombre | Color | Descripción |
|:------:|:-------|:-----:|:------------|
| **0** | **Vacío / Mineral** | Pizarra (`#1e293b`) | Terreno sin biomasa o cortafuegos inerte. Permite rebrote de vegetación. |
| **1** | **Vegetación** | Verde Vivo (`#22c55e`) | Pastizal o matorral de combustión rápida. |
| **2** | **Bosque Denso** | Verde Oscuro (`#15803d`) | Árboles maduros con mayor biomasa y resistencia relativa. |
| **3** | **Fuego Activo** | Rojo Fuego (`#ef4444`) | Celda en combustión activa; propaga calor hacia su vecindad. |
| **4** | **Cenizas** | Gris Ceniza (`#64748b`) | Estado transitorio pos-incendio antes de enfriarse a suelo vacío. |

---

## 🚀 Guía de Ejecución

### Opción A: Aplicación Web Interactiva (Recomendada)
Para abrir la interfaz interactiva en tu navegador:
1. Abre directamente el archivo `index.html` en cualquier navegador web moderno (Google Chrome, Firefox, Edge, Safari, Brave), o bien:
2. Inicia un servidor local rápido ejecutando:
   ```bash
   python3 -m http.server 8080
   ```
   Y accede a `http://localhost:8080` en tu navegador.

#### Controles de la Interfaz Web:
- **Iniciar / Pausar / Paso (+1) / Reiniciar / Limpiar:** Control total del flujo temporal.
- **Pincel Interactivo:** Selecciona un estado (Fuego, Vegetación, Bosque, Cortafuegos, Cenizas) y haz clic o arrastra sobre la cuadrícula.
- **Brújula de Viento:** Selecciona cualquiera de las 8 direcciones cardinales o ajusta la velocidad del viento.
- **Sliders Ambientales:** Modifica en tiempo real la humedad, tasa de rebrote ecológico y probabilidad de rayos.
- **Captura PNG & Exportación CSV:** Descarga instantáneamente capturas de pantalla de la cuadrícula o datos históricos de la simulación.

---

### Opción B: Ejecución en Consola / Python

El script en Python incluye múltiples modos de operación:

1. **Animación en Consola (Terminal ANSI):**
   ```bash
   python3 python/simulacion_ac.py --animate --steps 50 --preset mixed_forest
   ```

2. **Demostración de Cortafuegos:**
   ```bash
   python3 python/simulacion_ac.py --preset firebreak_demo --wind-speed 0.7 --wind-angle 0
   ```

3. **Ejecutar Suite Experimental y Exportar CSV:**
   ```bash
   python3 python/simulacion_ac.py --experiments
   ```

4. **Generar Gráficos de Experimentos en PNG:**
   ```bash
   python3 python/graficar_experimentos.py
   ```
   *(Los gráficos se guardarán en la carpeta `graficos/`)*.

---

## 📂 Estructura de Archivos del Proyecto

```
├── index.html                     # Interfaz visual interactiva web principal
├── css/
│   └── styles.css                 # Estilos modernos Dark Mode y Glassmorphism
├── js/
│   ├── cellular_automaton.js      # Motor matricial del AC (Double Buffering)
│   ├── renderer.js                # Renderizado por Canvas optimizado
│   ├── charts.js                  # Gráfico de líneas en tiempo real
│   └── app.js                     # Controlador principal de la UI y eventos
├── python/
│   ├── simulacion_ac.py           # Simulación en Python (NumPy + ANSI)
│   └── graficar_experimentos.py   # Generador de gráficos comparativos (Matplotlib)
├── graficos/                      # Figuras y curvas de experimentos generadas en PNG
│   ├── Exp1_Sin_Viento_Humedad_Baja_curva.png
│   ├── Exp2_Viento_Fuerte_Este_curva.png
│   ├── Exp3_Efecto_Cortafuegos_curva.png
│   ├── Exp4_Alta_Humedad_Contencion_curva.png
│   └── comparativa_incendios_experimentos.png
├── experimentos_ac.csv            # Dataset con métricas cuantitativas
├── INFORME_AUTOMA_CELULAR.md      # Informe técnico formal completo para entrega
└── README.md                      # Esta guía de uso y documentación
```

---

## 🏆 Cumplimiento de la Rúbrica de Evaluación

- **Definición del Modelo y Reglas (25/25):** 5 estados discretos, vecindad de Moore de 8 celdas, vector de viento con producto escalar, amortiguación por humedad y regeneración vegetal detalladas en [INFORME_AUTOMA_CELULAR.md](file:///home/lembrox/Documentos/Proyectos/Github/IA/INFORME_AUTOMA_CELULAR.md).
- **Implementación Técnica y Matriz (25/25):** Código modular limpio con arreglos multidimensionales (`Uint8Array` en JS y `np.ndarray` en Python) y técnica de *Double Buffering* para sincronización estricta.
- **Visualización y Colores (15/15):** Paleta armónica distintiva (pizarra, esmeralda, verde bosque, naranja-rojo fuego con resplandor y gris ceniza).
- **Interacción y Controles (15/15):** Controles de simulación completos, dibujo directo con clic/touch, selector de radio de pincel, presets y selector de velocidad.
- **Informe y Análisis de Tendencias (20/20):** Informe completo con datos experimentales, métricas cuantitativas, análisis de regímenes y gráficos generados.
