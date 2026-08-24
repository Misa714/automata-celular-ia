// ==========================================================================
// MOTOR DEL AUTÓMATA CELULAR 2D EN JAVASCRIPT (HTML5 CANVAS)
// Modelo de Propagación de Incendios Forestales con Vecindad de Moore
// ==========================================================================

// 1. DEFINICIÓN DE LOS 4 ESTADOS FINITOS DEL AUTÓMATA
const VACIO  = 0; // Estado 0: Suelo libre, roca o cortafuegos (incombustible)
const ARBOL  = 1; // Estado 1: Bosque vivo o árbol (materia combustible)
const FUEGO  = 2; // Estado 2: Fuego activo (combustión, contagia a vecinos)
const CENIZA = 3; // Estado 3: Cenizas residuales (suelo quemado enfriándose)

// Mapeo cromático de cada estado en código hexadecimal para renderizado en Canvas
const COLORES = ['#18181b', '#22c55e', '#ef4444', '#71717a'];

// 2. VARIABLES GLOBALES DE ESTADO Y PARÁMETROS MATEMÁTICOS
let N = 50;                  // Dimensión de la cuadrícula cuadrada (NxN celdas)
let matriz = [];             // Matriz bidimensional principal que almacena el estado actual
let gen = 0;                 // Contador de pasos de tiempo o generaciones transcurridas
let pProp = 0.7;             // Probabilidad de propagación del fuego a un árbol adyacente (70%)
let dens = 0.65;             // Densidad inicial de árboles en la cuadrícula (65%)
let pReb = 0.005;            // Probabilidad de rebrote espontáneo de árboles en celdas vacías (0.5%)
let running = false;         // Bandera booleana que indica si la simulación continua está activa
let timer = null;            // Identificador del temporizador generado por setInterval
let fps = 15;                // Frecuencia de actualización en fotogramas/generaciones por segundo
let tool = FUEGO;            // Estado seleccionado actualmente en la herramienta Pincel
let canvas, ctx;             // Referencias al elemento HTML5 Canvas y a su contexto de dibujo 2D
let drawing = false;         // Bandera booleana para detectar si el usuario arrastra el mouse presionado

// Función auxiliar abreviada para seleccionar elementos del DOM por su identificador único
const $ = id => document.getElementById(id);

// 3. FUNCIONES DE GESTIÓN Y TRANSFORMACIÓN DE LA MATRIZ
// Crea una matriz cuadrada de tamaño n x n inicializada en estado VACIO (0)
const crearMatriz = n => Array.from({length: n}, () => new Array(n).fill(VACIO));

// Inicializa la cuadrícula con árboles aleatorios y un foco de fuego en el centro exacto
const inicializar = () => {
    gen = 0; // Reinicia el contador temporal a cero
    // Genera la matriz asignando ARBOL con probabilidad 'dens' y VACIO en caso contrario
    matriz = Array.from({length: N}, () => Array.from({length: N}, () => Math.random() < dens ? ARBOL : VACIO));
    // Enciende el foco de ignición inicial en la celda central
    matriz[Math.floor(N / 2)][Math.floor(N / 2)] = FUEGO;
    dibujar();            // Renderiza el nuevo estado en el canvas
    actualizarMetricas(); // Actualiza los contadores numéricos y porcentajes en la interfaz
};

// Limpia toda la cuadrícula dejando todas las celdas en estado VACIO
const limpiar = () => { gen = 0; matriz = crearMatriz(N); dibujar(); actualizarMetricas(); };

// 4. CÁLCULO DE LA VECINDAD DE MOORE (8 CELDAS ADYACENTES)
// Cuenta cuántos vecinos en llamas (FUEGO = 2) rodean a la celda en la posición (f, c)
const contarVecinosFuego = (f, c) => {
    let fuegos = 0;
    // Itera en desplazamientos verticales (-1, 0, +1) y horizontales (-1, 0, +1)
    for (let df = -1; df <= 1; df++) {
        for (let dc = -1; dc <= 1; dc++) {
            // (df || dc) excluye la celda central misma; el operador opcional ?. previene errores en los bordes
            if ((df || dc) && matriz[f + df]?.[c + dc] === FUEGO) fuegos++;
        }
    }
    return fuegos;
};

// 5. FUNCIÓN DE TRANSICIÓN SÍNCRONA CON DOBLE BÚFER (DOUBLE BUFFERING)
// Calcula la generación t+1 aplicando las 4 reglas locales del autómata celular
const siguientePaso = () => {
    // Transforma sincrónicamente cada celda produciendo una nueva matriz sin modificar la anterior durante el cálculo
    matriz = matriz.map((row, f) => row.map((cell, c) => {
        if (cell === FUEGO) return CENIZA; // Regla 1: Fuego se extingue a Ceniza en 1 turno
        if (cell === CENIZA) return VACIO; // Regla 2: Ceniza se enfría y pasa a suelo Vacío en 1 turno
        // Regla 3: Árbol con vecinos ardiendo se contagia según la probabilidad de propagación
        if (cell === ARBOL) return (contarVecinosFuego(f, c) > 0 && Math.random() < pProp) ? FUEGO : ARBOL;
        // Regla 4: Suelo libre tiene una probabilidad baja de rebrote espontáneo
        return Math.random() < pReb ? ARBOL : VACIO;
    }));
    gen++;                // Incrementa el contador de generaciones
    dibujar();            // Redibuja el lienzo gráfico
    actualizarMetricas(); // Refresca las estadísticas en pantalla
};

// 6. RENDERIZADO GRÁFICO EN EL CANVAS HTML5
const dibujar = () => {
    if (!ctx) return;
    const w = canvas.width / N, h = canvas.height / N; // Dimensiones en píxeles de cada celda
    ctx.clearRect(0, 0, canvas.width, canvas.height);  // Limpia el lienzo antes de repintar
    // Recorre todas las celdas y pinta cada rectángulo con su color correspondiente
    for (let f = 0; f < N; f++) {
        for (let c = 0; c < N; c++) {
            ctx.fillStyle = COLORES[matriz[f][c]];
            ctx.fillRect(c * w, f * h, w, h);
        }
    }
};

// 7. CÁLCULO Y ACTUALIZACIÓN DE MÉTRICAS EN VIVO
const actualizarMetricas = () => {
    let cnt = [0, 0, 0, 0], tot = N * N; // Vector acumulador de conteos para cada estado y total de celdas
    matriz.forEach(row => row.forEach(c => cnt[c]++)); // Cuenta ocurrencias de cada estado
    // Actualiza textos numéricos y porcentajes en los elementos del DOM
    $('txt-gen').textContent = gen;
    $('cnt-arboles').textContent = `${cnt[ARBOL]} (${(cnt[ARBOL] * 100 / tot).toFixed(1)}%)`;
    $('cnt-fuego').textContent   = `${cnt[FUEGO]} (${(cnt[FUEGO] * 100 / tot).toFixed(1)}%)`;
    $('cnt-ceniza').textContent  = `${cnt[CENIZA]} (${(cnt[CENIZA] * 100 / tot).toFixed(1)}%)`;
    $('cnt-vacio').textContent   = `${cnt[VACIO]} (${(cnt[VACIO] * 100 / tot).toFixed(1)}%)`;
    // Actualiza la insignia visual de estado indicando si el fuego sigue activo o se extinguió
    const badge = $('badge-estado');
    if (badge) {
        badge.textContent = cnt[FUEGO] > 0 ? "FUEGO ACTIVO" : "FUEGO EXTINGUIDO";
        badge.style.color = cnt[FUEGO] > 0 ? "#ef4444" : "#22c55e";
    }
};

// 8. CONTROLADORES DE EJECUCIÓN (INICIAR / PAUSAR)
const iniciar = () => {
    if (!running) {
        running = true;
        $('btn-iniciar').classList.add('activo');
        $('btn-pausar').classList.remove('activo');
        timer = setInterval(siguientePaso, 1000 / fps); // Configura el ciclo continuo según los FPS
    }
};
const pausar = () => {
    if (running) {
        running = false;
        $('btn-iniciar').classList.remove('activo');
        $('btn-pausar').classList.add('activo');
        clearInterval(timer); // Detiene el temporizador en ejecución
    }
};

// 9. HERRAMIENTA PINCEL INTERACTIVO (DIBUJO CON MOUSE O TOUCH)
const aplicarPincel = e => {
    const rect = canvas.getBoundingClientRect(); // Obtiene la posición del canvas en la ventana
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left; // Coordenada X relativa
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;  // Coordenada Y relativa
    const c = Math.floor(x / (rect.width / N)), f = Math.floor(y / (rect.height / N)); // Convierte a fila y columna
    // Verifica límites de la matriz y aplica el estado actual del pincel
    if (f >= 0 && f < N && c >= 0 && c < N) {
        matriz[f][c] = tool;
        dibujar();
        actualizarMetricas();
    }
};

// 10. ENLACE DE EVENTOS AL CARGAR EL DOCUMENTO
window.addEventListener('DOMContentLoaded', () => {
    canvas = $('canvas-simulacion');
    ctx = canvas.getContext('2d');

    // Botonera de control
    $('btn-iniciar').onclick   = iniciar;
    $('btn-pausar').onclick    = pausar;
    $('btn-paso').onclick      = () => { pausar(); siguientePaso(); };
    $('btn-reiniciar').onclick = () => { pausar(); inicializar(); };
    $('btn-limpiar').onclick   = () => { pausar(); limpiar(); };

    // Selectores y deslizadores de parámetros
    $('sel-tamano').onchange = e => { pausar(); N = +e.target.value; inicializar(); };
    $('sld-propagacion').oninput = e => { pProp = e.target.value / 100; $('lbl-propagacion').textContent = `${e.target.value}%`; };
    $('sld-densidad').oninput = e => { dens = e.target.value / 100; $('lbl-densidad').textContent = `${e.target.value}%`; };
    $('sld-fps').oninput = e => { fps = +e.target.value; $('lbl-fps').textContent = `${fps} FPS`; if (running) { pausar(); iniciar(); } };

    // Selección de herramientas de pincel
    document.querySelectorAll('.btn-pincel').forEach(btn => btn.onclick = () => {
        document.querySelectorAll('.btn-pincel').forEach(b => b.classList.remove('activo'));
        btn.classList.add('activo');
        tool = +btn.dataset.estado;
    });

    // Eventos de ratón para pintar de forma interactiva arrastrando sobre el canvas
    canvas.onmousedown = e => { drawing = true; aplicarPincel(e); };
    window.onmouseup   = () => drawing = false;
    canvas.onmousemove = e => { if (drawing) aplicarPincel(e); };

    // Inicialización automática de la primera generación
    inicializar();
});
