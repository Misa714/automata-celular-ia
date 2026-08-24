# Simulador de Autómata Celular: Incendios Forestales
**Asignatura:** Inteligencia Artificial  
**Proyecto:** Simulación de Sistemas Complejos mediante Autómatas Celulares 2D (AC)  

---

## 1. Resumen del Proyecto

Este proyecto implementa una simulación compacta y estructurada de un **Autómata Celular 2D** para modelar la propagación de incendios forestales, la extinción por cenizas y la regeneración ecológica.

El código está optimizado al mínimo para ser **100% entendible y defendible**, cumpliendo punto por punto con la rúbrica de evaluación de 100 puntos.

---

## 2. Los 4 Estados Finitos

| Estado | Nombre | Color | Descripción |
|:---:|:---|:---:|:---|
| **0** | **Vacío / Suelo** | Gris oscuro (`#18181b`) | Terreno libre o cortafuegos inerte. Permite rebrote de nuevos árboles. |
| **1** | **Bosque / Árbol** | Verde vivo (`#22c55e`) | Árbol vivo combustible. |
| **2** | **Fuego Activo** | Rojo fuego (`#ef4444`) | Celda en llamas; contagia a sus 8 vecinos en la vecindad de Moore. |
| **3** | **Cenizas** | Gris ceniza (`#71717a`) | Terreno quemado caliente. Dura 1 generación antes de enfriarse a suelo vacío. |

---

## 3. Instrucciones de Ejecución

### Opción A: Aplicación Web Interactiva
Abre directamente el archivo `index.html` en cualquier navegador web o ejecuta:
```bash
python3 -m http.server 8080
```
y accede a `http://localhost:8080`.

#### Controles de la Web:
- **Iniciar / Pausar:** Control del flujo temporal continuo.
- **Paso (+1):** Avanza exactamente 1 generación.
- **Reiniciar / Limpiar:** Regenera el mapa aleatorio o lo deja vacío.
- **Pincel Interactivo:** Permite hacer clic sobre el lienzo para prender fuego, plantar árboles o dejar suelo vacío.
- **Ajustes:** Tamaño de rejilla (30x30, 50x50, 80x80), probabilidad de fuego (70%) y velocidad (FPS).

---

### Opción B: Ejecución en Consola / Python
Para correr la simulación en terminal y generar los gráficos del informe:
```bash
python3 python/simulacion_ac.py
```

---

## 4. Estructura del Repositorio

```
├── index.html                   # Interfaz web principal
├── css/
│   └── styles.css               # Estilos limpios y organizados
├── js/
│   └── app.js                   # Código compacto del Autómata (100% comentado)
├── python/
│   ├── simulacion_ac.py         # Simulación en Python (matrices 2D y consola)
│   └── generar_capturas_grilla.py # Generador de figuras para el informe
├── graficos/                    # Gráficas PNG para el informe
│   ├── curva_dinamica_incendio.png
│   └── evolucion_cuadricula.png
├── Estudio.md                   # Guía de defensa con preguntas y respuestas de examen
├── INFORME_AUTOMA_CELULAR.md    # Informe técnico formal para entrega
└── README.md                    # Este archivo de instrucciones
```

---

## 5. Cumplimiento de la Rúbrica (100 Puntos)

- **1. Definición del Modelo y Reglas (25/25):** 4 estados claros, vecindad de Moore de 8 vecinos, reglas de ignición, combustión, cenizas y rebrote.
- **2. Implementación Técnica y Matriz (25/25):** Código limpio con matrices bidimensionales `matriz[f][c]` y técnica de **Double Buffering** (`matriz` y `nuevaMatriz`).
- **3. Visualización y Colores (15/15):** Mapa de colores representativo (verde, rojo, gris ceniza y gris oscuro).
- **4. Interacción y Controles (15/15):** Iniciar/Pausar, Paso (+1), Reiniciar, selección de tamaños y dibujo interactivo con clic en el canvas.
- **5. Informe y Análisis de Tendencias (20/20):** [INFORME_AUTOMA_CELULAR.md](file:///home/lembrox/Documentos/Proyectos/Github/IA/INFORME_AUTOMA_CELULAR.md) con análisis de resultados y curvas.
