(() => {
    const tbodyCarrito = document.getElementById("tbody-carrito")
    const btnVaciarCarrito = document.getElementById("btn-vaciar-carrito")
    const btnSeguirComprando = document.getElementById("btn-seguir-comprando")
    const cajaTotal = document.getElementById("caja-total")
    const resumenCarrito = document.getElementById("resumen-carrito")
    const cajaMayorista = document.getElementById("caja-mayorista")
    const avisoCarrito = document.getElementById("aviso-carrito")
    const btnConfirmarPedido = document.getElementById("btn-confirmar-pedido")
    const formPedido = document.getElementById("form-pedido")
    const totalPedido = document.getElementById("total-pedido")
    const grupoAsesor = document.getElementById("grupo-asesor")
    const grupoSede = document.getElementById("grupo-sede")
    const cboAsesor = document.getElementById("cbo-asesor-pedido")
    const cboSede = document.getElementById("cbo-sede-pedido")
    const btnEnviarPedido = document.getElementById("btn-enviar-pedido")
    const modalPedido = bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-pedido"))

    let carrito = leerCarrito() // definida en main.js: no falla aunque el dato guardado esté dañado

    const calcularTotal = () => {
        const total = carrito.reduce((acumulador, item) => acumulador + (item.precio * item.cantidad), 0) // reduce es un método de los arrays que permite reducir un array a un único valor, en este caso el total de la compra
        cajaTotal.innerText = "S/ " + total.toFixed(2)
    }

    /* Muestra si el carrito califica como compra mayorista y el botón para hablar con un asesor */
    const dibujarMayorista = () => {
        const mayoristas = carrito.filter(item => item.cantidad >= MINIMO_MAYORISTA)
        const califica = mayoristas.length > 0
        cajaMayorista.innerHTML = `
            <div class="card-body d-flex flex-wrap align-items-center gap-3">
                <i class="fa-solid fa-boxes-stacked fa-2x ${califica ? "text-success" : "text-secondary"}"></i>
                <div class="flex-grow-1">
                    <strong>Compras mayoristas</strong><br>
                    <small>${califica ?
                        `${mayoristas.length} producto(s) con ${MINIMO_MAYORISTA}+ unidades. Un asesor puede atenderte personalmente.` :
                        `Lleva ${MINIMO_MAYORISTA} unidades o más de un mismo producto para hablar con un asesor comercial.`}</small>
                </div>
                <button class="btn ${califica ? "btn-primary" : "btn-outline-secondary"}" id="btn-mayoristas" ${califica ? "" : "disabled"}>
                    <i class="fa-regular fa-comments"></i> Mayoristas
                </button>
            </div>`
        document.getElementById("btn-mayoristas").addEventListener("click", () => irAPagina("Asesores comerciales"))
    }

    /* Tope de unidades de un producto: su stock (los productos agregados antes de esta versión no lo guardan) */
    const stockDe = (item) => item.stock === undefined ? 9999 : item.stock

    /* Dibuja la tabla completa a partir del array carrito.
       Se llama al inicio y después de cada cambio (sumar, restar, quitar, vaciar). */
    const dibujarCarrito = () => {
        btnVaciarCarrito.disabled = carrito.length === 0 // no tiene sentido vaciar un carrito vacío
        btnConfirmarPedido.disabled = carrito.length === 0
        dibujarMayorista()

        if (carrito.length === 0) {
            // Mensaje dentro de una fila de la tabla para no romper el HTML
            tbodyCarrito.innerHTML = `<tr><td colspan="6" class="text-center">El carrito está vacío</td></tr>`
            resumenCarrito.textContent = ""
            calcularTotal()
            return
        }

        let filas = ""
        carrito.forEach((item, index) => {
            // data-index guarda la posición del producto en el array para saber cuál se tocó
            filas += `<tr>
                <td>${item.idproducto}</td>
                <td>${escaparHTML(item.nombre)}</td>
                <td class="text-end">${item.precio.toFixed(2)}</td>
                <td class="text-center text-nowrap">
                    <button class="btn btn-sm btn-outline-secondary btn-cantidad" data-index="${index}" data-cambio="-1"
                        title="Quitar uno" ${item.cantidad === 1 ? "disabled" : ""}>
                        <i class="fa-solid fa-minus"></i>
                    </button>
                    <input type="number" class="form-control form-control-sm d-inline-block cantidad-carrito"
                        data-index="${index}" value="${item.cantidad}" min="1" max="${stockDe(item)}" aria-label="Cantidad">
                    <button class="btn btn-sm btn-outline-secondary btn-cantidad" data-index="${index}" data-cambio="1"
                        title="Agregar uno" ${item.cantidad >= stockDe(item) ? "disabled" : ""}>
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </td>
                <td class="text-end">${(item.precio * item.cantidad).toFixed(2)}</td>
                <td><i class="fa-regular fa-trash-can icono-eliminar" data-index="${index}" title="Quitar del carrito"></i></td>
            </tr>`
        })
        tbodyCarrito.innerHTML = filas

        const unidades = carrito.reduce((suma, item) => suma + item.cantidad, 0)
        resumenCarrito.textContent = `${carrito.length} producto(s), ${unidades} unidad(es)`
        calcularTotal()
    }

    /* Guarda en sessionStorage (y actualiza el contador del menú) y vuelve a dibujar */
    const guardarYDibujar = () => {
        guardarCarrito(carrito)
        dibujarCarrito()
    }

    /* Un solo "escucha" para todos los botones de la tabla (delegación de eventos).
       closest() sube desde lo que se clickeó (puede ser el ícono <i>) hasta el botón. */
    tbodyCarrito.addEventListener("click", (event) => {
        const botonCantidad = event.target.closest(".btn-cantidad")
        const iconoEliminar = event.target.closest(".icono-eliminar")

        if (botonCantidad) {
            const item = carrito[botonCantidad.dataset.index]
            item.cantidad += Number(botonCantidad.dataset.cambio) // +1 o -1
            if (item.cantidad < 1) item.cantidad = 1             // nunca menos de 1; para quitarlo está la papelera
            if (item.cantidad > stockDe(item)) item.cantidad = stockDe(item)
            guardarYDibujar()
        }

        if (iconoEliminar) {
            carrito.splice(iconoEliminar.dataset.index, 1) // splice quita 1 elemento en esa posición
            guardarYDibujar()
        }
    })

    /* Si el usuario escribe la cantidad directamente (por ejemplo 12) */
    tbodyCarrito.addEventListener("change", (event) => {
        const caja = event.target.closest(".cantidad-carrito")
        if (!caja) return
        const cantidad = Math.floor(Number(caja.value))
        const item = carrito[caja.dataset.index]
        item.cantidad = cantidad >= 1 ? Math.min(cantidad, stockDe(item)) : 1 // enteros desde 1 hasta el stock
        if (cantidad > stockDe(item)) {
            mostrarNotificacion(`Solo hay ${stockDe(item)} unidades de ${escaparHTML(item.nombre)}`, "fa-circle-info")
        }
        guardarYDibujar()
    })

    btnVaciarCarrito.addEventListener("click", () => {
        if (!confirm("¿Seguro que quieres vaciar el carrito?")) return
        carrito = []
        guardarYDibujar()
    })

    btnSeguirComprando.addEventListener("click", () => irAPagina("Tienda"))

    /* ---------- Confirmar pedido ---------- */
    const total = () => carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0)

    /* Si se eligió un asesor, la sede es la suya: se oculta la lista de sedes */
    const actualizarSede = () => {
        const hayAsesor = cboAsesor.value !== ""
        grupoSede.style.display = hayAsesor ? "none" : "block"
        cboSede.required = !hayAsesor
    }
    cboAsesor.addEventListener("change", actualizarSede)

    btnConfirmarPedido.addEventListener("click", () => {
        if (usuarioActual === null) {
            mostrarNotificacion("Inicia sesión para confirmar tu pedido", "fa-circle-info")
            irAPagina("Ingresar")
            return
        }
        formPedido.classList.remove("was-validated")
        totalPedido.textContent = soles(total())
        const esMayorista = carrito.some(item => item.cantidad >= MINIMO_MAYORISTA)
        grupoAsesor.style.display = esMayorista ? "block" : "none"

        // las dos listas se piden a la vez; Promise.all espera a que lleguen ambas
        Promise.all([
            obtenerDatos(db.from("sedes").select("idsede, nombre, direccion").order("idsede")),
            esMayorista ? obtenerDatos(db.from("asesores").select("idasesor, nombres, apellidos, directores(sedes(nombre))").order("nombres")) : []
        ])
            .then(([sedes, asesores]) => {
                cboSede.innerHTML = `<option value="">Elige una sede</option>` + sedes.map(s =>
                    `<option value="${s.idsede}">${escaparHTML(s.nombre)} — ${escaparHTML(s.direccion || "")}</option>`).join("")
                cboAsesor.innerHTML = `<option value="">Sin asesor</option>` + asesores.map(a =>
                    `<option value="${a.idasesor}">${escaparHTML(a.nombres + " " + a.apellidos)} (${escaparHTML(a.directores.sedes.nombre)})</option>`).join("")
                actualizarSede()
                modalPedido.show()
            })
            .catch(error => {
                console.error(error)
                avisoCarrito.innerHTML = mensajeError("No se pudieron cargar las sedes. Intenta nuevamente.")
            })
    })

    formPedido.addEventListener("submit", (event) => {
        event.preventDefault()
        if (!formPedido.checkValidity()) {
            formPedido.classList.add("was-validated")
            return
        }
        const montoMostrado = total()
        btnEnviarPedido.disabled = true
        // rpc() llama a una función de la base de datos: ella calcula los precios y el total
        obtenerDatos(db.rpc("confirmar_pedido", {
            p_idsede: cboSede.value ? Number(cboSede.value) : null,
            p_idasesor: cboAsesor.value ? Number(cboAsesor.value) : null,
            p_productos: carrito.map(item => ({ idproducto: item.idproducto, cantidad: item.cantidad }))
        }))
            .then(idpedido => {
                modalPedido.hide()
                carrito = []
                guardarYDibujar()
                avisoCarrito.innerHTML = `<div class="alert alert-success">
                    <i class="fa-solid fa-circle-check"></i> ¡Gracias! Tu pedido <strong>N° ${idpedido}</strong>
                    por <strong>${soles(montoMostrado)}</strong> quedó registrado.</div>`
                mostrarNotificacion("Pedido registrado")
            })
            .catch(error => {
                console.error(error)
                modalPedido.hide()
                avisoCarrito.innerHTML = mensajeError(mensajeDeLaBase(error, "No se pudo registrar el pedido. Intenta nuevamente."))
            })
            .finally(() => {
                btnEnviarPedido.disabled = false
            })
    })

    dibujarCarrito()
})()
