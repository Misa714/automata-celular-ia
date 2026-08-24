const VACIO = 0, ARBOL = 1, FUEGO = 2, CENIZA = 3;
const COLORES = ['#18181b', '#22c55e', '#ef4444', '#71717a'];
let N = 50, matriz = [], gen = 0, pProp = 0.7, dens = 0.65, pReb = 0.005, running = false, timer = null, fps = 15, tool = FUEGO;
let canvas, ctx, drawing = false;
const $ = id => document.getElementById(id);

const crearMatriz = n => Array.from({length: n}, () => new Array(n).fill(VACIO));
const inicializar = () => {
    gen = 0; matriz = Array.from({length: N}, () => Array.from({length: N}, () => Math.random() < dens ? ARBOL : VACIO));
    matriz[Math.floor(N / 2)][Math.floor(N / 2)] = FUEGO;
    dibujar(); actualizarMetricas();
};
const limpiar = () => { gen = 0; matriz = crearMatriz(N); dibujar(); actualizarMetricas(); };

const contarVecinosFuego = (f, c) => {
    let fuegos = 0;
    for (let df = -1; df <= 1; df++)
        for (let dc = -1; dc <= 1; dc++)
            if ((df || dc) && matriz[f + df]?.[c + dc] === FUEGO) fuegos++;
    return fuegos;
};

const siguientePaso = () => {
    matriz = matriz.map((row, f) => row.map((cell, c) => {
        if (cell === FUEGO) return CENIZA;
        if (cell === CENIZA) return VACIO;
        if (cell === ARBOL) return (contarVecinosFuego(f, c) > 0 && Math.random() < pProp) ? FUEGO : ARBOL;
        return Math.random() < pReb ? ARBOL : VACIO;
    }));
    gen++; dibujar(); actualizarMetricas();
};

const dibujar = () => {
    if (!ctx) return;
    const w = canvas.width / N, h = canvas.height / N;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let f = 0; f < N; f++)
        for (let c = 0; c < N; c++) {
            ctx.fillStyle = COLORES[matriz[f][c]];
            ctx.fillRect(c * w, f * h, w, h);
        }
};

const actualizarMetricas = () => {
    let cnt = [0, 0, 0, 0], tot = N * N;
    matriz.forEach(row => row.forEach(c => cnt[c]++));
    $('txt-gen').textContent = gen;
    $('cnt-arboles').textContent = `${cnt[ARBOL]} (${(cnt[ARBOL] * 100 / tot).toFixed(1)}%)`;
    $('cnt-fuego').textContent = `${cnt[FUEGO]} (${(cnt[FUEGO] * 100 / tot).toFixed(1)}%)`;
    $('cnt-ceniza').textContent = `${cnt[CENIZA]} (${(cnt[CENIZA] * 100 / tot).toFixed(1)}%)`;
    $('cnt-vacio').textContent = `${cnt[VACIO]} (${(cnt[VACIO] * 100 / tot).toFixed(1)}%)`;
    const badge = $('badge-estado');
    if (badge) {
        badge.textContent = cnt[FUEGO] > 0 ? "FUEGO ACTIVO" : "FUEGO EXTINGUIDO";
        badge.style.color = cnt[FUEGO] > 0 ? "#ef4444" : "#22c55e";
    }
};

const iniciar = () => {
    if (!running) {
        running = true;
        $('btn-iniciar').classList.add('activo');
        $('btn-pausar').classList.remove('activo');
        timer = setInterval(siguientePaso, 1000 / fps);
    }
};
const pausar = () => {
    if (running) {
        running = false;
        $('btn-iniciar').classList.remove('activo');
        $('btn-pausar').classList.add('activo');
        clearInterval(timer);
    }
};

const aplicarPincel = e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    const c = Math.floor(x / (rect.width / N)), f = Math.floor(y / (rect.height / N));
    if (f >= 0 && f < N && c >= 0 && c < N) { matriz[f][c] = tool; dibujar(); actualizarMetricas(); }
};

window.addEventListener('DOMContentLoaded', () => {
    canvas = $('canvas-simulacion');
    ctx = canvas.getContext('2d');
    $('btn-iniciar').onclick = iniciar;
    $('btn-pausar').onclick = pausar;
    $('btn-paso').onclick = () => { pausar(); siguientePaso(); };
    $('btn-reiniciar').onclick = () => { pausar(); inicializar(); };
    $('btn-limpiar').onclick = () => { pausar(); limpiar(); };
    $('sel-tamano').onchange = e => { pausar(); N = +e.target.value; inicializar(); };
    $('sld-propagacion').oninput = e => { pProp = e.target.value / 100; $('lbl-propagacion').textContent = `${e.target.value}%`; };
    $('sld-densidad').oninput = e => { dens = e.target.value / 100; $('lbl-densidad').textContent = `${e.target.value}%`; };
    $('sld-fps').oninput = e => { fps = +e.target.value; $('lbl-fps').textContent = `${fps} FPS`; if (running) { pausar(); iniciar(); } };
    document.querySelectorAll('.btn-pincel').forEach(btn => btn.onclick = () => {
        document.querySelectorAll('.btn-pincel').forEach(b => b.classList.remove('activo'));
        btn.classList.add('activo');
        tool = +btn.dataset.estado;
    });
    canvas.onmousedown = e => { drawing = true; aplicarPincel(e); };
    window.onmouseup = () => drawing = false;
    canvas.onmousemove = e => { if (drawing) aplicarPincel(e); };
    inicializar();
});
