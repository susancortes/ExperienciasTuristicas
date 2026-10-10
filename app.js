// ===== Estado =====
let experiencias = [];
let reservas = [];
let textoBusqueda = "";
let categoriaActual = "todas";
let ordenActual = "normal";
let precioMaximo = Infinity;
let temporizadorMensaje;

// ===== DOM =====
const catalogo = document.querySelector("#catalogo");
const buscador = document.querySelector("#buscador");
const filtroCategoria = document.querySelector("#filtroCategoria");
const ordenPrecio = document.querySelector("#ordenPrecio");
const presupuesto = document.querySelector("#presupuesto");
const listaReservas = document.querySelector("#listaReservas");
const total = document.querySelector("#total");
const totalPersonas = document.querySelector("#totalPersonas");
const estado = document.querySelector("#estado");
const mensaje = document.querySelector("#mensaje");
const btnVaciar = document.querySelector("#btnVaciar");
const confirmacion = document.querySelector("#confirmacion");
const btnConfirmarVaciar = document.querySelector("#btnConfirmarVaciar");
const btnCancelarVaciar = document.querySelector("#btnCancelarVaciar");

// Mensaje flotante 
function mostrarMensaje(texto, tipo = "error") {
  const modal = document.getElementById("modal-aviso");
  const modalTexto = document.getElementById("modal-mensaje");
  const btnAceptar = document.getElementById("modal-btn-aceptar");
  const modalTitle = document.querySelector(".modal-title");

  if (modalTitle) {
    modalTitle.textContent = tipo === "exito" ? "¡Éxito!" : "Aviso";
  }
  modalTexto.textContent = texto;
  modal.classList.remove("hidden");
  btnAceptar.onclick = () => {
    modal.classList.add("hidden");
  };
}

// Carga de datos
async function cargarExperiencias() {
    try {
        estado.textContent = "Cargando experiencias...";
        const respuesta = await fetch("./data/experiencias.json");
        if (!respuesta.ok) throw new Error("No fue posible cargar las experiencias");
        experiencias = await respuesta.json();
        estado.textContent = `${experiencias.length} experiencias disponibles`;
        actualizarCatalogo();
    } catch (error) {
        estado.textContent = "Error al cargar la información";
        console.error(error);
    }
}

// Filtros y orden 
function obtenerResultados() {
    let resultados = [...experiencias];
    if (categoriaActual !== "todas") {
        resultados = resultados.filter(e => e.categoria === categoriaActual);
    }
    if (textoBusqueda !== "") {
        resultados = resultados.filter(e => e.nombre.toLowerCase().includes(textoBusqueda));
    }
    resultados = resultados.filter(e => e.precio <= precioMaximo);
    if (ordenActual === "ascendente") resultados.sort((a, b) => a.precio - b.precio);
    if (ordenActual === "descendente") resultados.sort((a, b) => b.precio - a.precio);
    return resultados;
}

// Catálogo 
function actualizarCatalogo() {
    const resultados = obtenerResultados();
    if (resultados.length === 0) {
        catalogo.innerHTML = `<p class="sin-resultados">No se encontraron experiencias</p>`;
        estado.textContent = "0 resultados";
        return;
    }
    catalogo.innerHTML = resultados.map(e => `
 <article class="tarjeta">
 <div class="imagen" aria-hidden="true">${e.icono}</div>
 <div class="informacion">
 <span class="categoria">${e.categoria}</span>
 <h3>${e.nombre}</h3>
 <p>Cupo disponible: ${e.cupo}</p>
 <p class="precio">$${e.precio} MXN</p>
 <label>Personas:
 <input type="number" id="cantidad-${e.id}" min="1" max="${e.cupo}" value="1">
 </label>
 <button class="btn-reservar" data-id="${e.id}">Agregar</button>
 </div>
 </article>`).join("");
    estado.textContent = `${resultados.length} resultados`;
    agregarEventosReservar();
}

function agregarEventosReservar() {
    document.querySelectorAll(".btn-reservar").forEach(boton => {
        boton.addEventListener("click", () => agregarReserva(Number(boton.dataset.id)));
    });
}

// Reservas 
function agregarReserva(id) {
    const experiencia = experiencias.find(e => e.id === id);
    const cantidad = Number(document.querySelector(`#cantidad-${id}`).value);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > experiencia.cupo) {
        mostrarMensaje(`Cantidad no válida. Elige entre 1 y ${experiencia.cupo} personas.`);
        return;
    }
    const existente = reservas.find(r => r.experienciaId === id);
    if (existente) {
        const nuevaCantidad = existente.cantidad + cantidad;
        if (nuevaCantidad > experiencia.cupo) {
            mostrarMensaje(`La cantidad supera el cupo disponible (${experiencia.cupo}).`);
            return;
        }
        existente.cantidad = nuevaCantidad;
        existente.subtotal = nuevaCantidad * experiencia.precio;
    } else {
        reservas.push({
            experienciaId: id, nombre: experiencia.nombre,
            precio: experiencia.precio, cantidad,
            subtotal: experiencia.precio * cantidad
        });
    }
    mostrarMensaje(`${experiencia.nombre} agregada a tu reservación.`, "exito");
    mostrarReservas();
}

function cambiarCantidad(id, cambio) {
    const reserva = reservas.find(r => r.experienciaId === id);
    const experiencia = experiencias.find(e => e.id === id);
    const nueva = reserva.cantidad + cambio;
    if (nueva > experiencia.cupo) {
        mostrarMensaje(`No hay más cupo para ${experiencia.nombre} (máximo ${experiencia.cupo}).`);
        return;
    }
    if (nueva < 1) {
        mostrarMensaje("La cantidad mínima es 1. Usa Eliminar para quitar la experiencia.");
        return;
    }
    reserva.cantidad = nueva;
    reserva.subtotal = nueva * reserva.precio;
    mostrarReservas();
}

function calcularTotalPersonas() {
    return reservas.reduce((suma, r) => suma + r.cantidad, 0);
}

function mostrarReservas() {
    cancelarVaciado();
    if (reservas.length === 0) {
        listaReservas.innerHTML = "<p>No hay experiencias seleccionadas.</p>";
        total.textContent = "$0 MXN";
        totalPersonas.textContent = "0";
        btnVaciar.hidden = true;
        return;
    }
    listaReservas.innerHTML = reservas.map(r => `
 <article class="item-reserva">
 <div>
 <strong>${r.nombre}</strong>
 <p>${r.cantidad} persona(s) × $${r.precio}</p>
 </div>
 <div class="item-derecha">
 <strong>$${r.subtotal} MXN</strong>
 <div class="control-cantidad" role="group" aria-label="Cantidad de ${r.nombre}">
 <button class="btn-cantidad btn-menos" data-id="${r.experienciaId}" aria-label="Disminuir personas de ${r.nombre}">−</button>
 <output>${r.cantidad}</output>
 <button class="btn-cantidad btn-mas" data-id="${r.experienciaId}" aria-label="Aumentar personas de ${r.nombre}">+</button>
 </div>
 <button class="btn-eliminar" data-id="${r.experienciaId}">Eliminar</button>
 </div>
 </article>`).join("");
    const totalReserva = reservas.reduce((suma, r) => suma + r.subtotal, 0);
    total.textContent = `$${totalReserva} MXN`;
    totalPersonas.textContent = calcularTotalPersonas();
    btnVaciar.hidden = false;
    agregarEventosReservacion();
}

function agregarEventosReservacion() {
    document.querySelectorAll(".btn-menos").forEach(b =>
        b.addEventListener("click", () => cambiarCantidad(Number(b.dataset.id), -1)));
    document.querySelectorAll(".btn-mas").forEach(b =>
        b.addEventListener("click", () => cambiarCantidad(Number(b.dataset.id), 1)));
    document.querySelectorAll(".btn-eliminar[data-id]").forEach(b =>
        b.addEventListener("click", () => eliminarReserva(Number(b.dataset.id))));
}

function eliminarReserva(id) {
    reservas = reservas.filter(r => r.experienciaId !== id);
    mostrarReservas();
}

// Vaciar con confirmación
function pedirConfirmacionVaciado() {
    confirmacion.hidden = false;
    btnVaciar.hidden = true;
    btnConfirmarVaciar.focus();
}

function cancelarVaciado() {
    confirmacion.hidden = true;
    if (reservas.length > 0) btnVaciar.hidden = false;
}

function vaciarReservacion() {
    reservas = [];
    mostrarReservas();
    mostrarMensaje("La reservación fue vaciada.", "exito");
}

// Eventos de controles
buscador.addEventListener("input", () => {
    textoBusqueda = buscador.value.trim().toLowerCase();
    actualizarCatalogo();
});
filtroCategoria.addEventListener("change", () => {
    categoriaActual = filtroCategoria.value;
    actualizarCatalogo();
});
ordenPrecio.addEventListener("change", () => {
    ordenActual = ordenPrecio.value;
    actualizarCatalogo();
});
presupuesto.addEventListener("input", () => {
    const valor = presupuesto.value.trim();
    if (valor === "") {
        precioMaximo = Infinity;
    } else if (Number(valor) < 0) {
        mostrarMensaje("El presupuesto no puede ser negativo.");
        return;
    } else {
        precioMaximo = Number(valor);
    }
    actualizarCatalogo();
});
btnVaciar.addEventListener("click", pedirConfirmacionVaciado);
btnCancelarVaciar.addEventListener("click", () => { cancelarVaciado(); btnVaciar.focus(); });
btnConfirmarVaciar.addEventListener("click", vaciarReservacion);

cargarExperiencias();