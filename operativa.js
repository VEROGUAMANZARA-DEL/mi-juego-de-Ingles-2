// Variables de estado
let leccionActual = [];
let palabraActual = {};
let errores = [];
let modoJuego = '';
let indicePreguntaActual = 0; 
let preguntasFiltradas = [];

const categoriasDB = ["window.verbosIrregulares_VI", "window.verbosRegulares_VR", "window.sustantivos_S", "window.adjetivos_A", "window.lenguajeInformal_LI", "window.lenguajeFormal_LF"];

categoriasDB.forEach(cat => {
    const backup = localStorage.getItem(cat);
    if (backup) {
        window[cat] = JSON.parse(backup);
        console.log(`Datos cargados para ${cat} desde memoria local.`);
    }
});

console.log("Sistema operativo.js cargado correctamente");

// FUNCIÓN AUXILIAR: Determina si una palabra debe mostrar 3 formas o solo 1
function esFormatoTriple(palabra) {
    // Solo pedimos 3 formas si la palabra está en la lista de verbos irregulares (VI)
    // y tiene las propiedades necesarias.
    return window.verbosIrregulares_VI && 
           Object.values(window.verbosIrregulares_VI).flat().some(v => v.eng === palabra.eng) && 
           palabra.past && palabra.part;
}

// FUNCIÓN PARA SELECCIONAR LECCIÓN
function seleccionarLeccion(nombreLeccion) {
    console.log("Intentando cargar lección:", nombreLeccion);
    
    const dbs = [
        window.verbosIrregulares_VI, 
        window.verbosRegulares_VR, 
        window.sustantivos_S,
        window.sustantivos_SS,  
        window.adjetivos_A, 
        window.lenguajeInformal_LI, 
        window.lenguajeFormal_LF,
    ];

    let encontrada = null;
    for (let db of dbs) {
        if (db && db[nombreLeccion]) {
            encontrada = db[nombreLeccion];
            break;
        }
    }

    if (encontrada) {
        leccionActual = JSON.parse(JSON.stringify(encontrada)); 
        leccionActual.sort(() => Math.random() - 0.5);
        document.querySelector('.dropbtn').innerText = "Lección: " + nombreLeccion + " ✓";
        console.log("Lección cargada con", leccionActual.length, "palabras.");
    } else {
        console.error("No se encontró la lección.");
        alert("Error: No se encontró " + nombreLeccion);
    }
}

// FUNCIÓN PARA PREPARAR EL JUEGO
function prepararJuego(modo) {

    alternarAdmin(false);

    if (leccionActual.length === 0) {
        alert("Por favor, selecciona primero una lección del menú.");
        return;
    }
    
    modoJuego = modo;
    indiceActual = 0;
    errores = [];
    
    document.querySelector('.menu-container').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    document.getElementById('reporte').style.display = 'none';

    iniciarTemporizador();
    
    siguientePregunta();
}

function siguientePregunta() {
    if (indiceActual >= leccionActual.length) {
        finalizarJuego();
        return;
    } 
    iniciarTemporizador();
    actualizarAvance();

    palabraActual = leccionActual[indiceActual];
    document.getElementById('feedback').style.display = 'none';

    const inputEscritura = document.getElementById('input-escritura');
    if(inputEscritura) inputEscritura.value = '';

    if (modoJuego === 'opciones') {
        mostrarOpciones();
    } else {
        mostrarEscritura();
    }
}

// MODO OPCIONES (BOTONES A, B, C, D)
function mostrarOpciones() {
    document.getElementById('opciones-box').style.display = 'grid';
    document.getElementById('escritura-box').style.display = 'none';
    const box = document.getElementById('opciones-box');
    box.innerHTML = '';

    // Definir el formato de la respuesta correcta
    let textoCorrecto = esFormatoTriple(palabraActual) ? 
        `${palabraActual.eng}, ${palabraActual.past}, ${palabraActual.part}` : 
        palabraActual.eng;
    
    document.getElementById('pregunta-txt').innerText = "¿Cómo traduces: " + palabraActual.esp + "?";

    let opciones = [textoCorrecto];
    // Pool para distractores: usamos la lección actual
    let pool = leccionActual;
    
    while (opciones.length < 4) {
        let r = pool[Math.floor(Math.random() * pool.length)];
        let txtDistractor = esFormatoTriple(r) ? 
            `${r.eng}, ${r.past}, ${r.part}` : 
            r.eng;
            
        if (!opciones.includes(txtDistractor)) opciones.push(txtDistractor);
    }

    opciones.sort(() => Math.random() - 0.5);

    opciones.forEach((opt, i) => {
        let btn = document.createElement('button');
        btn.className = 'btn-opcion';
        btn.innerText = String.fromCharCode(65 + i) + ". " + opt;
        btn.onclick = () => verificar(opt === textoCorrecto, textoCorrecto);
        box.appendChild(btn);
    });
}

// MODO ESCRITURA
function mostrarEscritura() {

    alternarAdmin(false);

    document.getElementById('opciones-box').style.display = 'none';
    document.getElementById('escritura-box').style.display = 'block';
    
    let pistaFinal = "";
    let respuestaCorrecta = "";

    if (esFormatoTriple(palabraActual)) {
        let p1 = generarPista(palabraActual.eng);
        let p2 = generarPista(palabraActual.past);
        let p3 = generarPista(palabraActual.part);
        pistaFinal = `Ayuda: ${p1}, ${p2}, ${p3}`;
        respuestaCorrecta = `${palabraActual.eng}, ${palabraActual.past}, ${palabraActual.part}`;
    } else {
        pistaFinal = "Ayuda: " + generarPista(palabraActual.eng);
        respuestaCorrecta = palabraActual.eng;
    }

    document.getElementById('pregunta-txt').innerText = "Escribe: " + palabraActual.esp;
    document.getElementById('pista-txt').innerText = pistaFinal;
    
    const input = document.getElementById('input-escritura');
    input.focus();

    input.onkeyup = (e) => {
        if (e.key === 'Enter') {
            const userVal = input.value.toLowerCase().trim();
            const solVal = respuestaCorrecta.toLowerCase().trim();
            verificar(userVal === solVal, respuestaCorrecta);
        }
    };
}

function generarPista(palabra) {
    if (palabra.length <= 6) {
        return palabra[0] + "_".repeat(palabra.length - 1);
    } else {
        let m = Math.floor(palabra.length / 2);
        return palabra[0] + "_".repeat(m - 1) + palabra[m] + "_".repeat(palabra.length - m - 2) + palabra[palabra.length - 1];
    }
}

function verificar(esCorrecto, textoCorrecto) {
    const fb = document.getElementById('feedback');
    fb.style.display = 'block';
    
    // Voz: Dice la respuesta correcta
    decir(textoCorrecto);

    if (esCorrecto) {
        fb.innerHTML = `<span style="color: green;">¡CORRECTO! ✓</span>`;
    } else {
        // AQUÍ LA MODIFICACIÓN: Muestra la X y la respuesta clara
        fb.innerHTML = `<span style="color: red;">❌ INCORRECTO</span><br>
                        <small style="color: #333;">La respuesta era: <b>${textoCorrecto}</b></small>`;
        
        // Guardamos el error para el reporte final
        // Importante: Guardamos 'tripleForma' para que tu tabla de errores no falle
        errores.push({ 
            q: palabraActual.esp,
            a: textoCorrecto, 
            resultado: "❌", 
            tripleForma: textoCorrecto 
        });
    }

    // Desactivar interacción para evitar múltiples clics
    const botones = document.querySelectorAll('.btn-opcion');
    botones.forEach(b => b.disabled = true);
    
    const input = document.getElementById('input-escritura');
    if(input) input.disabled = true;

    // Avanzar a la siguiente pregunta tras 2 segundos
    indiceActual++;
    setTimeout(() => {
        if(input) {
            input.disabled = false;
            input.value = ""; // Limpiar el campo para la próxima
        }
        siguientePregunta();
    }, 2000);
}
function finalizarJuego() {
    
    alternarAdmin(true);
    document.getElementById("game").style.display = "none";
    const reporte = document.getElementById("reporte");
    if (reporte) reporte.style.display = "block";

    // 1. Usamos 'errores' que es tu variable real. 
    // Como ya filtramos errores al guardarlos, no hace falta el .filter()
    const soloErrores = errores; 
    
    // 2. Calculamos el puntaje real
    let aciertos = leccionActual.length - errores.length;
    let contenidoHTML = `<h2 style="text-align:center;">Resultado: ${aciertos} / ${leccionActual.length}</h2>`;

    if (soloErrores.length === 0) {
        contenidoHTML += `<div style="text-align:center; padding: 20px;"><h2 style="color: #28a745;">¡PERFECTO! 🏆</h2><p>Has dominado esta lección sin errores.</p></div>`;
    } else {
        contenidoHTML += `<h3 style="color: #d9534f; text-align:center;">Repasa tus errores:</h3>
            <div style="max-height: 400px; overflow-y: auto; margin-top:20px;">
                <table style="width:100%; border-collapse: collapse; font-size: 14px; text-align: left;">
                    <thead style="background: #f8f9fa;">
                        <tr>
                            <th style="padding:12px; border: 1px solid #ddd;">Pregunta</th>
                            <th style="padding:12px; border: 1px solid #ddd;">Correcta</th>
                            <th style="padding:12px; border: 1px solid #ddd; text-align:center;">Voz</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        soloErrores.forEach(h => {
            // Ajustamos h.q (pregunta) y h.a (respuesta) según tu función verificar
            let formatoVisual = h.a.toUpperCase().replace(/,/g, ";");

            contenidoHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding:12px; border: 1px solid #ddd;"><b>${h.q.toUpperCase()}</b></td>
                    <td style="padding:12px; border: 1px solid #ddd; color:#28a745; font-family: monospace;">
                        ${formatoVisual}
                    </td>
                    <td style="padding:12px; border: 1px solid #ddd; text-align:center;">
                        <button onclick="decir('${h.a}')" style="cursor:pointer; border:none; background:#e7f3ff; border-radius:5px; padding:5px 10px;">🔊</button>
                    </td>
                </tr>`;
        });
        contenidoHTML += `</tbody></table></div>`;
    }

    const finalScoreElem = document.getElementById("final-score");
    if (finalScoreElem) {
        finalScoreElem.innerHTML = contenidoHTML;
    }
}

function decir(t) {
    try {
        window.speechSynthesis.cancel(); // Detener audios previos
        let u = new SpeechSynthesisUtterance(t);
        u.lang = 'en-US';
        window.speechSynthesis.speak(u);
    } catch(e) {}
}
// 1. Variables globales (Asegúrate de que solo estén una vez)
let temporizadorBusqueda;
let temporizadorBorrado;
let diccionarioGlobal = [];

// 2. Función para preparar los datos
function prepararDiccionario() {
    // Definimos las fuentes dentro por si los archivos datos.js tardan en cargar
    const fuentes = {
        ...(typeof verbosIrregulares_VI !== 'undefined' ? verbosIrregulares_VI : {}),
        ...(typeof verbosRegulares_VR !== 'undefined' ? verbosRegulares_VR : {}),
        ...(typeof sustantivos_S !== 'undefined' ? sustantivos_S : {}),
        ...(typeof sustantivos_SS !== 'undefined' ? sustantivos_SS : {}),
        ...(typeof adjetivos_A !== 'undefined' ? adjetivos_A : {}),
        ...(typeof lenguajeInformal_LI !== 'undefined' ? lenguajeInformal_LI : {}),
        ...(typeof lenguajeFormal_LF !== 'undefined' ? lenguajeFormal_LF : {})
    };

    diccionarioGlobal = [];

    Object.values(fuentes).forEach(lista => {
        if (!Array.isArray(lista)) return;
        lista.forEach(item => {
            let info = { esp: "", eng: "" };
            if (item.esp && item.eng) {
                info.esp = item.esp;
                info.eng = item.eng;
            } else if (item.p && item.r && item.o) {
                info.esp = item.p.replace(/¿Cómo se dice | en ingles\?| ¿Cual es la palabra correcta de: |\?|:/gi, "").trim();
                const correcta = item.o.find(opt => opt.startsWith(item.r)); 
                info.eng = correcta ? correcta.slice(1).trim() : ""; 
            }
            if (info.eng && info.esp) diccionarioGlobal.push(info);
        });
    });
    console.log("Diccionario listo con " + diccionarioGlobal.length + " términos.");
}

// 3. Función de búsqueda corregida
function buscarEnDiccionario() {
    const input = document.getElementById("cajaBusqueda");
    const mensaje = document.getElementById("mensajeResultado");

    if (!input || !mensaje) return;

    const consulta = input.value.toLowerCase().trim();

    // Limpiar procesos anteriores
    clearTimeout(temporizadorBusqueda);
    clearTimeout(temporizadorBorrado);

    if (consulta.length < 3) {
        mensaje.innerHTML = "";
        return;
    }

    // Si por alguna razón el diccionario está vacío, lo llenamos
    if (diccionarioGlobal.length === 0) {
        prepararDiccionario();
    }

    temporizadorBusqueda = setTimeout(() => {
        const encontrado = diccionarioGlobal.find(item => 
            item.esp.toLowerCase().includes(consulta) || 
            item.eng.toLowerCase().includes(consulta)
        );

        if (encontrado) {
            mensaje.innerHTML = `
                <div style="background:#f0f4f8; padding: 15px; border-radius:10px; margin-top: 10px; border-left: 5px solid #007bff; color: #333;">
                    <span>
                        ✓ <b>${encontrado.esp.toUpperCase()}</b>: 
                        <b style="color:#007bff;">${encontrado.eng.toUpperCase()}</b>
                    </span>
                    <button onclick="pronunciar('${encontrado.eng}')" style="margin-left:10px; cursor:pointer; border:none; background:none; font-size:18px;">🔊</button>
                </div>`;
            
                decir(encontrado.eng);
                
            if (typeof pronunciar === "function") pronunciar(encontrado.eng);

            // BORRADO AUTOMÁTICO EN 7 SEGUNDOS
            temporizadorBorrado = setTimeout(() => {
                mensaje.innerHTML = "";
                input.value = ""; // Limpia el buscador también
            }, 7000);

        } else {
            mensaje.innerHTML = `<p style="color: #888; margin-top:10px;"> No se encontró "${consulta}"</p>`;
            
            // Borrar el mensaje de error también en 7 seg
            temporizadorBorrado = setTimeout(() => {
                mensaje.innerHTML = "";
            }, 7000);
        }
    }, 400);
}

// Inicializar al cargar la página
window.onload = prepararDiccionario;
// 4. Función de voz
function cargarVoces() {
    vocesDisponibles = window.speechSynthesis.getVoices();
}

window.speechSynthesis.onvoiceschanged = cargarVoces;

// 5. Inicialización automática
document.addEventListener("DOMContentLoaded", prepararDiccionario);
function pararJuego() {
    // 1. Detener los temporizadores del juego (ajusta los nombres si son distintos)
    if (typeof temporizador !== 'undefined') clearInterval(temporizador);
    if (typeof tiempoLimite !== 'undefined') clearTimeout(tiempoLimite);

    // 2. Ocultar las secciones del juego y resultados
    document.getElementById("game").style.display = "none";
    document.getElementById("reporte").style.display = "none";

    // 3. Mostrar el menú principal
    // Buscamos el contenedor del menú. En tu HTML es 'menu-container' dentro de 'container'
    const menu = document.querySelector(".menu-container");
    if (menu) {
        menu.style.display = "block";
    }

    // 4. Limpiar mensajes de búsqueda o feedback previos
    document.getElementById("mensajeResultado").innerHTML = "";
    document.getElementById("feedback").style.display = "none";
    
    // Opcional: Recargar si quieres resetear todo el estado interno
    // location.reload(); 
}
let tiempoRestante = 25;
let intervaloTemporizador = null; // Cambiado a null para mejor control

function iniciarTemporizador() {
    detenerReloj(); 
    tiempoRestante = 25; 
    actualizarRelojUI();

    intervaloTemporizador = setInterval(() => {
        tiempoRestante--;
        actualizarRelojUI();

        if (tiempoRestante <= 0) {
            detenerReloj(); 
            // Llamamos a la función de salto automático
            siguientePreguntaPorTerminarTiempo();
        }
    }, 1000);
}

function detenerReloj() {
    if (intervaloTemporizador) {
        clearInterval(intervaloTemporizador);
        intervaloTemporizador = null;
    }
}

function actualizarRelojUI() {
    const timerElement = document.getElementById("timer");
    if (timerElement) {
        timerElement.innerText = tiempoRestante + "s";
        
        // Estética: se pone rojo y grande en los últimos 5 segundos
        if (tiempoRestante <= 5) {
            timerElement.style.color = "#ff0000";
            timerElement.style.fontSize = "22px";
        } else {
            timerElement.style.color = "#d9534f";
            timerElement.style.fontSize = "18px";
        }
    }
}
function siguientePreguntaPorTerminarTiempo() {
    detenerReloj();

    // GUARDAR EL ERROR ANTES DE AVANZAR
    // Si no guardamos esto, finalizarJuego() dará error de "undefined"
    let respuestaCorrecta = esFormatoTriple(palabraActual) ? 
        `${palabraActual.eng}, ${palabraActual.past}, ${palabraActual.part}` : 
        palabraActual.eng;

    errores.push({ 
        q: palabraActual.esp, 
        a: respuestaCorrecta 
    });

    indiceActual++;

    if (indiceActual < leccionActual.length) {
        siguientePregunta(); 
        iniciarTemporizador();
    } else {
        finalizarJuego(); 
    }
}
function actualizarRelojUI() {
    const timerElement = document.getElementById("timer");
    if (timerElement) {
        timerElement.innerText = tiempoRestante + "s";
        
        // Efecto visual: poner en rojo si queda poco tiempo
        if (tiempoRestante <= 5) {
            timerElement.style.color = "#ff0000";
            timerElement.style.fontSize = "22px";
        } else {
            timerElement.style.color = "#d9534f";
            timerElement.style.fontSize = "18px";
        }
    }
}

function terminarJuegoPorTiempo() {
    alert("¡Se acabó el tiempo!");
    pararJuego(); // Usamos la función que creamos antes para volver al menú
}
function actualizarAvance() {
    const barraFill = document.getElementById("fill");
    
    // Verificamos que la lección tenga datos para evitar dividir por cero
    if (barraFill && leccionActual.length > 0) {
        // Calculamos el porcentaje usando las variables reales de tu código
        let porcentaje = ((indiceActual + 1) / leccionActual.length) * 100;

        // Aplicamos el ancho
        barraFill.style.width = porcentaje + "%";
        console.log("Progreso:", porcentaje + "%"); // Para que lo veas en la consola
    }
}
// Asegúrate de tener esto definido al principio de tu archivo operativa.js
const CODIGO_SECRETO = "2222"; 
function agregarPalabraDirecto() {

    

    // 1. SEGURIDAD
    if (typeof CODIGO_SECRETO === 'undefined') {
        alert("ERROR: Define CODIGO_SECRETO al inicio de operativa.js");
        return;
    }
    const password = prompt("Introduce el CODIGO_SECRETO:");
    if (password !== CODIGO_SECRETO) return;

    let continuar = true;
    let listaTemporal = ""; 

    while (continuar) {
        console.clear(); 
        
        // 2. ENTRADA DE ESPAÑOL/VALIDACION DUPLICADO
        const espInput = prompt("1. ESPAÑOL (o 'SALIR'):");
        if (!espInput || espInput.toUpperCase() === 'SALIR') break;
        const espUpper = espInput.trim().toUpperCase();

        if (espUpper === "") {
            alert("HAS COMETIDO UN ERROR: VUELVE A INGRESAR LOS DATOS.");
            continue; 
        }
        //---VALIDACION DE DUPLICADO---
        
        let existe = false;
        const categoriasNombres = ["verbosIrregulares_VI", "verbosRegulares_VR", "sustantivos_S", "adjetivos_A", "lenguajeInformal_LI", "lenguajeFormal_LF"];
        
        for (let cat of categoriasNombres) {
            let db = window[cat];
            if (db) {
                for (let grupo in db) {
                    if (Array.isArray(db[grupo]) && db[grupo].some(i => i.esp === espUpper)) {
                        existe = true;
                        break;
                    }
                }
            }
            if (existe) break;
        }

        if (existe) {
            alert(`STOP: '${espUpper}' ya existe.`);
            if (confirm("¿Intentar con otra?")) continue; else break;
        }


        // 3. ENTRADA DE INGLÉS
        const engInput = prompt(`2. INGLÉS para '${espUpper}':`);
        if (!engInput || engInput.trim() === "") {
            alert("HAS COMETIDO UN ERROR: VUELVE A INGRESAR LOS DATOS.");
            continue;
        }
        const engUpper = engInput.trim().toUpperCase();

        // 4. CATEGORÍA
        const menu = "3. Categoría (1-6):\n1. VI | 2. VR | 3. S | 4. A | 5. LI | 6. LF";
        const opcion = prompt(menu);
        const mapeo = {
            "1": { t: "VI", p: "VI", v: "verbosIrregulares_VI" },
            "2": { t: "VR", p: "VR", v: "verbosRegulares_VR" },
            "3": { t: "S", p: "S", v: "sustantivos_S" },
            "4": { t: "SS", p: "SS", v: "sustantivos_SS" },
            "5": { t: "A", p: "A", v: "adjetivos_A" },
            "6": { t: "LI", p: "LI", v: "lenguajeInformal_LI" },
            "7": { t: "LF", p: "LF", v: "lenguajeFormal_LF" }
        };

        if (!opcion || !mapeo[opcion]) {
            alert("HAS COMETIDO UN ERROR: VUELVE A INGRESAR LOS DATOS.");
            continue;
        }

        let { t: tipo, p: prefijo, v: nombreVar } = mapeo[opcion];
        let past = "", part = "";

        if (tipo === "VI") {
            const p1 = prompt("PASADO:");
            const p2 = prompt("PARTICIPIO:");
            if (!p1 || !p2) {
                alert("HAS COMETIDO UN ERROR: VUELVE A INGRESAR LOS DATOS.");
                continue;
            }
            past = p1.trim().toUpperCase();
            part = p2.trim().toUpperCase();
        }

        // --- FILTRO DE SEGURIDAD (Confirmación Humana) ---
        // Esto detendrá errores como "MUNDOOO" antes de que salgan en consola
        const esCorrecto = confirm(
            `¿REVISA SI ESTÁ BIEN ESCRITO?\n\n` +
            `Español: ${espUpper}\n` +
            `Inglés: ${engUpper}\n` +
            `Tipo: ${tipo}\n\n` +
            `¿Es correcto? (Si hay un error, pulsa CANCELAR)`
        );

        if (!esCorrecto) {
            alert("HAS ESCRITO MAL, VUELVE A INGRESAR LOS DATOS.");
            continue; 
        }

        // 5. LÓGICA DE GRUPOS
        let dbActual = window[nombreVar] || {};
        let numGrupo = 1;
        while (dbActual[prefijo + (numGrupo + 1)]) { numGrupo++; }
        let nombreGrupo = prefijo + numGrupo;
        if (dbActual[nombreGrupo] && dbActual[nombreGrupo].length >= 20) {
            numGrupo++;
            nombreGrupo = prefijo + numGrupo;
        }

        // 6. CONSTRUCCIÓN (Aquí se arregla el error de "VI is not defined")
        let dataObj = (tipo === "VI") 
            ? { tipo: "VI", eng: engUpper, past: past, part: part, esp: espUpper }
            : { tipo: tipo, eng: engUpper, esp: espUpper };
        
            //DEFINIR CONTENIDO
            let contenido = JSON.stringify(dataObj)
            .replace(/:/g, ": ").replace(/,/g, ", ")//sin corchetes
            .replace(/"([^"]+)":/g, '$1:') // Elimina las comillas de las claves (tipo, eng, esp)
            .replace(/:/g, ": ")           // Asegura un espacio después de los dos puntos
            .replace(/,/g, ", ");          // Asegura un espacio después de cada coma

            // MOSTRAR EN CONSOLA (Resultado: {tipo: "A", eng: "HAPPY", esp: "FELIZ"},)
            console.log(`%c${nombreGrupo}: %c${contenido},`, 
            "color: #00ffff; font-weight: bold; font-size: 13px;", 
            "color: #ffffff; font-weight: normal;");  
        
        // MOSTRAR EN CONSOLA (Sin textos informativos extra)
        console.log(`%c${nombreGrupo}: %c${contenido},`, 
                    "color: #00ffff; font-weight: bold; font-size: 13px;", 
                    "color: #ffffff; font-weight: normal;");

        
        listaTemporal += `${nombreGrupo}: ${contenido},\n`; 

        continuar = confirm("¿Deseas agregar otra palabra?");
    }

    // 8. BLOQUE FINAL
    console.clear();
    if (listaTemporal !== "") {
        console.log("%cBLOQUE FINAL PARA DATOS.JS:", "color: #00ff00; font-weight: bold;");
        console.log(listaTemporal);
    }
}
const basesDeDatos = [
    { nombre: 'Irregulares VI', data: window.verbosIrregulares_VI.VI2 },
    { nombre: 'Regulares', data: window.verbosRegulares_VR },
    { nombre: 'Sustantivos', data: window.sustantivos_S },
    { nombre: 'Sustantivos', data: window.sustantivos_SS },
    { nombre: 'Adjetivos', data: window.adjetivos_A },
    { nombre: 'Lenguaje Formal', data: window.lenguajeFormal_LF },
    { nombre: 'Lenguaje Informal', data: window.lenguajeInformal_LI },
];

basesDeDatos.forEach(base => {
    if (base.data) {
        let items = Array.isArray(base.data) ? base.data : Object.values(base.data).flat();
        let counts = {};
        let dups = items.filter(item => {
            let key = item.eng || item.palabra || JSON.stringify(item);
            counts[key] = (counts[key] || 0) + 1;
            return counts[key] === 2;
        });
        
        if (dups.length > 0) {
            console.warn(`⚠️ Duplicados en ${base.nombre}:`, dups.map(d => d.eng || d.palabra));
        }
    }
});
function verificarRepeticionExacta(entradaUsuario) {
    // 1. Limpiamos la palabra (Mayúsculas y sin espacios)
    let palabraABuscar = entradaUsuario.trim().toUpperCase();
    
    // 2. Definimos la lista donde buscar (usando tu objeto de la imagen)
    let lista = window.verbosIrregulares_VI.VI2;

    // 3. Buscamos la coincidencia 100% idéntica
    let resultado = lista.filter(item => item.eng.trim().toUpperCase() === palabraABuscar);

    if (resultado.length > 0) {
        // Solo entra aquí si es EXACTAMENTE la misma palabra
        console.log("⚠️ REPETICIÓN DETECTADA: '" + palabraABuscar + "' ya existe.");
        alert("La palabra exacta '" + palabraABuscar + "' ya está en el sistema.");
        // Importante: Aquí el usuario decide si cerrar o continuar manualmente.
    } else {
        // Ignora CALLE, CALLAR, etc., porque no son iguales a CALL
        console.log("✅ Palabra nueva o única aceptada.");
    }
}
function alternarAdmin(estado) {
    const botonAdmin = document.querySelector('.boton-admin-secreto');
    if (botonAdmin) {
        // Si estado es true se muestra, si es false se oculta
        botonAdmin.style.display = estado ? 'block' : 'none';
    }
    console.log("Sistema de administración:", estado ? "Visible" : "Oculto");
}
// Esto detecta tanto el clic del mouse como el toque del dedo
window.addEventListener('pointerdown', function(event) {
    // Aquí pones lo que quieres que pase cuando toquen la pantalla
    console.log("¡Pantalla tocada en la posición!", event.clientX, event.clientY);
    
    // Si tu juego tiene una función de disparar o saltar, llámala aquí:
    // saltar(); 
});

