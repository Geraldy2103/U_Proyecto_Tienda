(() => {
    const avisoAsesores = document.getElementById("aviso-asesores")
    const cuadriculaAsesores = document.getElementById("cuadricula-asesores")
    const precarga = document.getElementById("precarga")
    const formSolicitud = document.getElementById("form-solicitud")
    const textoAsesorElegido = document.getElementById("texto-asesor-elegido")
    const listaProductosSolicitud = document.getElementById("lista-productos-solicitud")
    const txtMensaje = document.getElementById("txt-mensaje")
    const btnEnviar = document.getElementById("btn-enviar-solicitud")
    const modalSolicitud = bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-solicitud"))

    let asesores = []
    let asesorElegido = null

    /* Aviso azul con un botón para ir a otra página (ej. "Ir a la tienda") */
    const mostrarRequisito = (texto, textoBoton, pagina) => {
        precarga.style.display = "none"
        avisoAsesores.innerHTML = `
            <div class="alert alert-info">
                <p class="mb-2"><i class="fa-solid fa-circle-info"></i> ${texto}</p>
                <button class="btn btn-primary btn-sm" id="btn-requisito">${textoBoton}</button>
            </div>`
        document.getElementById("btn-requisito").addEventListener("click", () => irAPagina(pagina))
    }

    /* ---------- Requisitos: tener cuenta y al menos un producto con 12 unidades o más ---------- */
    if (usuarioActual === null) {
        mostrarRequisito("Para hablar con un asesor primero inicia sesión.", "Ingresar", "Ingresar")
        return
    }
    const mayoristas = productosMayoristas()
    if (mayoristas.length === 0) {
        mostrarRequisito(`La atención con asesores es para compras mayoristas: lleva
            <strong>${MINIMO_MAYORISTA} unidades o más</strong> de un mismo producto en tu carrito.`,
            "Ir al carrito", "Carrito")
        return
    }

    avisoAsesores.innerHTML = `
        <div class="alert alert-success">
            <i class="fa-solid fa-boxes-stacked"></i>
            Tienes <strong>${mayoristas.length}</strong> producto(s) con cantidad mayorista.
            Elige al asesor con quien quieres hablar.
        </div>`

    /* ---------- Lista de asesores ---------- */
    obtenerDatos(db.from("empleados").select("idempleado, nombres, apellidos, cargo, foto")
            .eq("es_asesor", true).order("nombres"))
        .then(data => {
            asesores = data
            if (data.length === 0) {
                cuadriculaAsesores.insertAdjacentHTML("beforebegin", `<p>Por ahora no hay asesores disponibles.</p>`)
                return
            }
            let cards = ""
            data.forEach(item => {
                cards += `
                <div class="col">
                    <div class="card h-100">
                        <img src="${item.foto}" class="card-img-top" alt="${escaparHTML(item.nombres + " " + item.apellidos)}">
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title">${escaparHTML(item.nombres + " " + item.apellidos)}</h5>
                            <p class="card-text">${escaparHTML(item.cargo)}</p>
                            <button class="btn btn-primary mt-auto btn-elegir-asesor" data-id="${item.idempleado}">
                                <i class="fa-regular fa-comments"></i> Hablar con este asesor
                            </button>
                        </div>
                    </div>
                </div>`
            })
            cuadriculaAsesores.innerHTML = cards
        })
        .catch(error => {
            console.error(error)
            cuadriculaAsesores.insertAdjacentHTML("beforebegin", mensajeError("No se pudo cargar la lista de asesores."))
        })
        .finally(() => {
            precarga.style.display = "none"
        })

    /* ---------- Elegir asesor: abre el modal con el resumen ---------- */
    cuadriculaAsesores.addEventListener("click", (event) => {
        const boton = event.target.closest(".btn-elegir-asesor")
        if (!boton) return
        asesorElegido = asesores.find(a => a.idempleado == boton.dataset.id)

        textoAsesorElegido.innerHTML = `Enviarás esta solicitud a
            <strong>${escaparHTML(asesorElegido.nombres + " " + asesorElegido.apellidos)}</strong>:`
        listaProductosSolicitud.innerHTML = productosMayoristas().map(item => `
            <li class="list-group-item d-flex justify-content-between">
                <span>${escaparHTML(item.nombre)}</span>
                <span class="text-nowrap">${item.cantidad} und</span>
            </li>`).join("")
        txtMensaje.value = ""
        modalSolicitud.show()
    })

    /* ---------- Enviar la solicitud (se guarda en la base de datos) ---------- */
    formSolicitud.addEventListener("submit", (event) => {
        event.preventDefault()
        const solicitud = {
            idempleado: asesorElegido.idempleado,
            // solo los productos con 12 o más unidades
            productos: productosMayoristas().map(({ idproducto, nombre, precio, cantidad }) => ({ idproducto, nombre, precio, cantidad })),
            mensaje: txtMensaje.value.trim() || null
        }

        btnEnviar.disabled = true
        obtenerDatos(db.from("solicitudes_mayoristas").insert(solicitud).select())
            .then(verificarCambio)
            .then(() => {
                modalSolicitud.hide()
                avisoAsesores.innerHTML = `
                    <div class="alert alert-success">
                        <i class="fa-solid fa-circle-check"></i>
                        ¡Listo! <strong>${escaparHTML(asesorElegido.nombres)}</strong> se comunicará contigo a
                        <strong>${escaparHTML(usuarioActual.correo)}</strong> para coordinar tu compra mayorista.
                    </div>`
                mostrarNotificacion("Solicitud enviada")
            })
            .catch(error => {
                console.error(error)
                modalSolicitud.hide()
                avisoAsesores.innerHTML = mensajeError("No se pudo enviar la solicitud. Intenta nuevamente.")
            })
            .finally(() => {
                btnEnviar.disabled = false
            })
    })
})()
