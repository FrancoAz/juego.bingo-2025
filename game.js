import * as Tone from 'tone';

// --- Utilidades para la voz ---
function speakNumberES(number, enabled = true) {
    if (!enabled) return;
    if (!window.speechSynthesis) return;
    const msg = new window.SpeechSynthesisUtterance(`Número ${number}`);
    msg.lang = "es-ES";
    msg.rate = 0.95;
    msg.pitch = 1.12;
    msg.volume = 1;
    msg.voice = speechSynthesis.getVoices().find(v => v.lang.startsWith("es")) || null;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
}

// --- Generación de 80 cartillas únicas ---
function generarCartillasUnicas() {
    let cartillas = [];
    for (let n = 0; n < 80; n++) {
        let numeros = Array.from({length: 80}, (_, i) => i + 1);
        let sel = [];
        while (sel.length < 25) {
            let ix = Math.floor(Math.random() * numeros.length);
            sel.push(numeros.splice(ix, 1)[0]);
        }
        // Insertar entre 4 y 6 espacios vacíos aleatorios
        let indices = Array.from({length: 25}, (_, i) => i);
        for (let i = 0; i < Math.floor(Math.random()*3) + 4; i++)
            sel[indices.splice(Math.floor(Math.random()*indices.length), 1)[0]] = null;
        cartillas.push(sel);
    }
    return cartillas;
}

function shuffle(array) {
    // algoritmo Fisher-Yates
    for (let i = array.length-1; i>0; i--) {
        const j = Math.floor(Math.random()*(i+1));
        [array[i],array[j]] = [array[j],array[i]];
    }
    return array;
}

// --- Estado del juego ---
const state = {
    bolaActual: null,
    bolasRestantes: [],
    bolasLlamadas: [],
    voiceEnabled: true,
    autoMode: false,
    autoTimer: null,
    cartillas: [],
    cartillaSeleccionada: 0,
    marcadoAuto: false,
    lineaDeclarada: false,
    bingoDeclarado: false
};

// --- Referencias DOM ---
const bolaActualEl = () => document.getElementById("bola-actual");
const ultimasBolasList = () => document.getElementById("ultimas-bolas-list");
const numbersGrid = () => document.getElementById("numbers-grid");
const bolasRestantesEl = () => document.getElementById("bolas-restantes");
const btnVoice = () => document.getElementById("btn-voice");
const btnAuto = () => document.getElementById("btn-auto");
const btnStart = () => document.getElementById("btn-start");
const btnReset = () => document.getElementById("btn-reset");
const btnSeleccionarCartilla = () => document.getElementById("btn-seleccionar-cartilla");
const cartillaContEl = () => document.getElementById("cartilla-container");
const cartillaLabelEl = () => document.getElementById("cartilla-seleccionada");
const btnBingo = () => document.getElementById("btn-bingo");
const btnLinea = () => document.getElementById("btn-linea");
const chkMarcadoAuto = () => document.getElementById("chk-marcado-auto");
const modalOverlay = () => document.getElementById("modal-overlay");
const cartillaSelectorPanel = () => document.getElementById("cartilla-selector-panel");

// --- Inicializa todo en pantalla ---
function init() {
    state.bolasRestantes = Array.from({length: 80}, (_, i) => i+1);
    state.bolasLlamadas = [];
    state.bolaActual = null;
    state.autoMode = false;
    state.lineaDeclarada = false;
    state.bingoDeclarado = false;
    // Selecciona cartilla #1 al iniciar (índice 0)
    if (typeof state.cartillaSeleccionada !== "number" || state.cartillaSeleccionada < 0)
        state.cartillaSeleccionada = 0;
    bolasRestantesEl().innerHTML = "<b>Bolas restantes:</b> 80";
    bolaActualEl().textContent = "--";
    ultimasBolasList().innerHTML = "";
    btnAuto().textContent = "▶️ Auto";
    chkMarcadoAuto().checked = false;
    setGridNumbers();
    // Cartillas
    state.cartillas = generarCartillasUnicas();
    renderCartillaSelectorPanel();
    renderCartilla(state.cartillaSeleccionada);
    cartillaLabelEl().textContent = `#${state.cartillaSeleccionada+1}`;
}

function setGridNumbers() {
    let grid = numbersGrid();
    grid.innerHTML = "";
    for (let i=1; i<=80; i++) {
        const div = document.createElement("div");
        div.className = "number-circle";
        div.dataset.num = i;
        div.id = `circle-${i}`;
        div.textContent = i;
        grid.appendChild(div);
    }
}

// --- Lógica de extracción de bolas ---
function llamarSiguienteBola() {
    if (state.bolasRestantes.length === 0) return;
    let idx = Math.floor(Math.random()*state.bolasRestantes.length);
    let num = state.bolasRestantes.splice(idx,1)[0];
    state.bolaActual = num;
    state.bolasLlamadas.push(num);

    // VOZ
    if (state.voiceEnabled) {
        speakNumberES(num, true);
    }

    // Actualiza panel bolas restantes
    bolasRestantesEl().innerHTML = `<b>Bolas restantes:</b> ${state.bolasRestantes.length}`;

    // Bola actual
    bolaActualEl().textContent = num;

    // Actualiza en el tablero de números
    let lastNum = document.querySelector('.number-circle.reciente');
    if (lastNum) lastNum.classList.remove('reciente');
    let circleEl = document.getElementById(`circle-${num}`);
    if(circleEl){
        circleEl.classList.add("llamada","reciente");
        circleEl.style.animation = "popOut 0.37s";
        setTimeout(()=>circleEl.style.animation = "",600);
    }

    // Últimas bolas (4x80 entrega vertical)
    updateUltimasBolas();

    // Marcado auto en cartilla
    if (state.marcadoAuto && state.cartillaSeleccionada !== null) {
        marcarEnCartillaAuto(num);
    }
}

function updateUltimasBolas() {
    // Mostrar todas las bolas llamadas, de arriba hacia abajo, columna de 4 (4x80 como grid)
    ultimasBolasList().innerHTML = "";
    let bolas = state.bolasLlamadas.slice(); // copia
    for (let i = bolas.length-1; i >= 0; i--) {
        const d = document.createElement('span');
        d.className = "ultima-bola";
        d.textContent = bolas[i];
        ultimasBolasList().appendChild(d);
    }
}

// --- Botón auto --- 
function toogleAuto() {
    if (!state.autoMode) {
        if (state.bolasRestantes.length === 0) return;
        state.autoMode = true;
        btnAuto().textContent = "⏸️ Pausar Auto";
        state.autoTimer = setInterval(()=>{
            llamarSiguienteBola();
            if (state.bolasRestantes.length === 0) toogleAuto();
        }, 5000);
    } else {
        state.autoMode = false;
        btnAuto().textContent = "▶️ Auto";
        if (state.autoTimer) {
            clearInterval(state.autoTimer);
            state.autoTimer = null;
        }
    }
}

// --- Botón Voz ---
function toogleVoice() {
    state.voiceEnabled = !state.voiceEnabled;
    btnVoice().textContent = state.voiceEnabled ? "🔊 Silenciar Voz" : "🔈 Activar Voz";
}

// --- Nueva: Panel de botones de cartilla ---
function renderCartillaSelectorPanel() {
    const panel = cartillaSelectorPanel();
    panel.innerHTML = "";
    for (let k = 0; k < state.cartillas.length; k++) {
        const btn = document.createElement("button");
        btn.className = "cartilla-btn" + (state.cartillaSeleccionada === k ? " selected":"");
        btn.textContent = `Cartilla #${k+1}`;
        btn.tabIndex = 0;
        btn.onclick = ()=>{
            selectCartilla(k);
        };
        btn.dataset.idx = k;
        panel.appendChild(btn);
    }
    // Scroll en el panel de botones para enfocar la cartilla seleccionada
    setTimeout(()=>{
        const btnSel = panel.querySelector('.cartilla-btn.selected');
        if (btnSel && panel.scrollHeight > panel.clientHeight) {
            const offTop = btnSel.offsetTop - panel.clientHeight/2 + btnSel.clientHeight/2;
            panel.scrollTop = Math.max(0,offTop);
        }
    },80);
}

// --- Selección de cartilla y render ---
function selectCartilla(idx) {
    state.cartillaSeleccionada = idx;
    cartillaLabelEl().textContent = `#${idx+1}`;
    renderCartillaSelectorPanel();
    renderCartilla(idx);
}

function renderCartilla(idx) {
    let cart = state.cartillas[idx];
    if (!cart) return;
    // Quitamos el label superior, lo ponemos a la derecha de la cartilla, bien visible.
    let cartHtml = `<div class="bingo-cartilla">
        <div class="cartilla-grid">
            ${cart.map((n, cidx) => {
                if(n==null) return `<div class="cartilla-celda vacia"></div>`;
                // ¿Marcarla? 
                let marcada = "";
                if (state.bolasLlamadas.includes(n)) {
                    marcada = state.marcadoAuto ? "automarcada" : "marcada";
                }
                return `<div class="cartilla-celda ${marcada}" data-casilla="${cidx}" data-num="${n}">${n}</div>`;
            }).join("")}
        </div>
        <div class="cartilla-label-num right">Cartilla #${idx+1}</div>
    </div>`;
    cartillaContEl().innerHTML = cartHtml;
    // Eventos de marca manual
    cartillaContEl().querySelectorAll(".cartilla-celda:not(.vacia)").forEach(celda=>{
        celda.onclick = ()=>{
            if (celda.classList.contains("marcada")) {
                celda.classList.remove("marcada");
            } else if (state.bolasLlamadas.includes(Number(celda.dataset.num))) {
                celda.classList.add("marcada");
            }
        };
    });
}

// Marcado auto de casillas de la cartilla seleccionada
function marcarEnCartillaAuto(n) {
    if (state.cartillaSeleccionada === null) return;
    let celda = cartillaContEl().querySelector(`.cartilla-celda[data-num="${n}"]`);
    if (celda && !celda.classList.contains("automarcada")) {
        celda.classList.add("automarcada");
    }
}

// --- Declarar BINGO / LINEA ---
function declararBingo() {
    if (!(state.cartillaSeleccionada !== null)) {
        showSimpleModal("Seleccione una cartilla primero");
        return;
    }
    showGanadorModal("¡BINGO!", true);
    state.bingoDeclarado = true;
}

function declararLinea() {
    if (state.cartillaSeleccionada === null) {
        showSimpleModal("Seleccione una cartilla primero");
        return;
    }
    showGanadorModal("¡Línea!", false);
    state.lineaDeclarada = true;
}

// --- Modal UI ---
function showSimpleModal(contentEl) {
    modalOverlay().innerHTML = typeof contentEl === "string" ? `
        <div class="modal-content">
            <p>${contentEl}</p>
            <button class="btn-modal" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cerrar</button>
        </div>
    ` : `<div class="modal-content"></div>`;
    if (typeof contentEl !== "string") {
        modalOverlay().firstChild.appendChild(contentEl);
    }
    modalOverlay().classList.remove("hidden");
}
function closeModal() {
    modalOverlay().classList.add("hidden");
}

// Modal de ganador animado
function showGanadorModal(mensaje, isBingo) {
    modalOverlay().innerHTML = `
        <div class="modal-content" style="animation: popOut 0.7s;">
            <h1 style="font-family:'Luckiest Guy';font-size:2.4em;color:#24ff2b;text-shadow:0 3px 19px #7396ffb2,0 1px #fff;">${mensaje}</h1>
            <p style="color:#6a1b9a;font-size:1.13em;margin-bottom:8px;">¡Felicidades!</p>
            <button class="btn-modal" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cerrar</button>
        </div>
    `;
    modalOverlay().classList.remove("hidden");
}

// --- Eventos UI ---
btnStart().onclick = ()=>{
    btnStart().disabled = true;
    btnSeleccionarCartilla().disabled = true;
    btnAuto().disabled = false;
    btnBingo().disabled = false;
    btnLinea().disabled = false;
    btnVoice().disabled = false;
    // Solo si hay bolas restantes
    if (state.bolasRestantes.length !== 0) {
        llamarSiguienteBola();
    }
};
btnAuto().onclick = ()=>toogleAuto();

btnReset().onclick = ()=>{
    if (state.autoMode) toogleAuto();
    btnStart().disabled = false;
    btnSeleccionarCartilla().disabled = false;
    btnAuto().disabled = false;
    btnBingo().disabled = false;
    btnLinea().disabled = false;
    btnVoice().disabled = false;
    // Por defecto dejar seleccionada la misma cartilla en reset
    // state.cartillaSeleccionada = 0;
    init();
};
btnVoice().onclick = ()=>toogleVoice();

btnSeleccionarCartilla().onclick = ()=> {
    // Este botón solo regresa el foco visual al panel de la izquierda
    cartillaSelectorPanel().querySelector('.cartilla-btn.selected')?.focus();
};

btnBingo().onclick = ()=>declararBingo();
btnLinea().onclick = ()=>declararLinea();

numbersGrid().onclick = e=> {
    if (e.target.classList.contains("number-circle") && !e.target.classList.contains("llamada")) {
        // Nada: solo permite visualización, no interactivo para usuarios.
        // Podríamos hacer click para "llamar" de modo manual, o ignorarlo.
    }
    // Permitir solo llamar siguiente bola con botón, no click tablero.
};

chkMarcadoAuto().onchange = ()=>{
    state.marcadoAuto = chkMarcadoAuto().checked;
    // Actualiza auto marcado en la cartilla actual
    if (state.cartillaSeleccionada !== null) renderCartilla(state.cartillaSeleccionada);
};

// Bola actual click-CALL si no hay auto.
bolaActualEl().onclick = ()=>{
    if (state.bolasRestantes.length && !state.autoMode && !btnStart().disabled) {
        llamarSiguienteBola();
    }
};
// Modal (en overlay) cerrar por click fondo
modalOverlay().onclick = function(e){
    if (e.target === modalOverlay()) closeModal();
};

// --- INICIALIZAR ---
window.addEventListener("DOMContentLoaded", ()=>{
    init();
    btnStart().disabled = false;
    btnAuto().disabled = true;
    btnBingo().disabled = true;
    btnLinea().disabled = true;
});

// Exposiciones globales necesarias para modals:
window.closeModal = closeModal;