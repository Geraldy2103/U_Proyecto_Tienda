(() => {
    const listaPedidos = document.getElementById("lista-pedidos")
    const filtrosPedidos = document.getElementById("filtros-pedidos")
    const filtroEstado = document.getElementById("filtro-estado")
    const filtroTipo = document.getElementById("filtro-tipo")
    const resumenPedidos = document.getElementById("resumen-pedidos")
    const avisoMisPedidos = document.getElementById("aviso-mis-pedidos")
    const avisoPago = document.getElementById("aviso-pago")
    const btnConfirmarPago = document.getElementById("btn-confirmar-pago")
    const tituloModalPagar = document.getElementById("titulo-modal-pagar")
    const modalPagar = bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-pagar"))

    const TIPOS = { minorista: "Minorista", mayorista: "Mayorista" }

    let pedidos = []
    let pedidoAPagar = null
    let pago = null
    const filtro = { estado: "todos", tipo: "todos" }   // lo que está elegido en los segmentadores

    const formatearFecha = (texto) => new Date(texto).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })

    /* Botones de un segmentador: "Todos" + una opción por valor, cada una con su cantidad */
    const dibujarSegmentador = (contenedor, campo, opciones) => {
        const cantidad = (valor) => valor === "todos" ? pedidos.length : pedidos.filter(p => p[campo] === valor).length
        contenedor.innerHTML = [["todos", "Todos"], ...Object.entries(opciones)]
            .filter(([valor]) => valor === "todos" || cantidad(valor) > 0)   // no mostrar opciones vacías
            .map(([valor, texto]) => `
                <button type="button" class="${filtro[campo] === valor ? "activo" : ""}" data-valor="${valor}">
                    ${texto} <span>${cantidad(valor)}</span>
                </button>`).join("")
        contenedor.querySelectorAll("button").forEach(boton =>
            boton.addEventListener("click", () => {
                filtro[campo] = boton.dataset.valor
                dibujarTodo()
            }))
    }

    /* Tarjeta de un pedido */
    const tarjetaPedido = (p) => {
        const estado = ESTADOS_PEDIDO[p.estado] || { texto: p.estado, clase: "" }
        const envio = p.entrega === "recojo" ? "Gratis" : p.costo_envio === null ? "Por cotizar" : soles(p.costo_envio)
        return `
        <div class="card pedido mb-3">
            <div class="card-body">
                <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                    <div>
                        <h2 class="h6 mb-0">Pedido N° ${p.idpedido}</h2>
                        <small class="text-body-secondary">${formatearFecha(p.fecha)} · ${TIPOS[p.tipo] || p.tipo}
                            ${p.asesores ? ` · Asesor: ${escaparHTML(p.asesores.nombres + " " + p.asesores.apellidos)}` : ""}</small><br>
                        <small>${textoEntrega(p)}</small>
                    </div>
                    <div class="text-end">
                        <div class="estado-pedido ${estado.clase}">${estado.texto}</div>
                        <div class="fw-bold fs-5">${soles(p.total)}${p.costo_envio === null && p.entrega === "delivery" ? " + envío" : ""}</div>
                        ${p.pago_estado === "pagado" ? `<small class="text-body-secondary">Pagado con ${p.metodo_pago === "yape" ? "Yape" : "tarjeta"}</small>` : ""}
                    </div>
                </div>
                <table class="table table-sm mb-0 tabla-detalle">
                    <tbody>
                        ${p.pedido_detalle.map(d => `
                        <tr>
                            <td>${escaparHTML(d.nombre)}</td>
                            <td class="text-end text-nowrap">${d.cantidad} × ${soles(d.precio)}</td>
                            <td class="text-end text-nowrap fw-semibold">${soles(d.subtotal)}</td>
                        </tr>`).join("")}
                        <tr class="fila-envio">
                            <td>Envío</td><td></td><td class="text-end text-nowrap">${envio}</td>
                        </tr>
                    </tbody>
                </table>
                ${p.estado === "cotizado" ? `
                <div class="franja mt-3">
                    <div class="flex-grow-1">Tu asesor cotizó el envío en <strong>${soles(p.costo_envio)}</strong>.
                        Total a pagar: <strong>${soles(p.total)}</strong>.</div>
                    <button class="btn btn-primary btn-sm btn-pagar-pedido" data-id="${p.idpedido}">Pagar ${soles(p.total)}</button>
                </div>` : ""}
                ${p.estado === "por_cotizar" ? `
                <p class="small text-body-secondary mt-3 mb-0">Tu asesor está cotizando el envío. Cuando lo confirme, podrás pagar aquí.</p>` : ""}
            </div>
        </div>`
    }

    /* Segmentadores + resumen + lista, según el filtro elegido */
    const dibujarTodo = () => {
        dibujarSegmentador(filtroEstado, "estado", Object.fromEntries(Object.entries(ESTADOS_PEDIDO).map(([k, v]) => [k, v.plural])))
        dibujarSegmentador(filtroTipo, "tipo", TIPOS)

        const visibles = pedidos.filter(p =>
            (filtro.estado === "todos" || p.estado === filtro.estado) &&
            (filtro.tipo === "todos" || p.tipo === filtro.tipo))
        const total = visibles.reduce((suma, p) => suma + Number(p.total), 0)
        resumenPedidos.textContent = `${visibles.length} pedido(s) · ${soles(total)}`

        listaPedidos.innerHTML = visibles.length > 0 ? visibles.map(tarjetaPedido).join("") :
            `<p class="text-body-secondary text-center py-4">No hay pedidos con este filtro.</p>`
    }

    const leerPedidos = () => {
        // pedido_detalle(...) trae los productos de cada pedido (el costo no es visible para el cliente)
        obtenerDatos(db.from("pedidos")
            .select("idpedido, fecha, tipo, entrega, departamento, distrito, direccion, plazo, subtotal, costo_envio, total, " +
                    "metodo_pago, pago_estado, estado, sedes(nombre), asesores(nombres, apellidos), " +
                    "pedido_detalle(nombre, precio, cantidad, subtotal)")
            .eq("idusuario", usuarioActual.id)
            .order("fecha", { ascending: false }))
            .then(data => {
                pedidos = data
                if (pedidos.length === 0) {
                    filtrosPedidos.hidden = true
                    listaPedidos.innerHTML = `
                        <div class="text-center py-5">
                            <i class="fa-solid fa-box-open fa-3x text-body-secondary mb-3"></i>
                            <h2 class="h5">Todavía no tienes pedidos</h2>
                            <p class="text-body-secondary">Cuando confirmes una compra, aparecerá aquí.</p>
                            <button class="btn btn-primary" onclick="irAPagina('Tienda')">Ir a la tienda</button>
                        </div>`
                    return
                }
                filtrosPedidos.hidden = false
                dibujarTodo()
            })
            .catch(error => {
                console.error(error)
                listaPedidos.innerHTML = mensajeError("No se pudieron cargar tus pedidos.")
            })
    }

    /* ---------- Pagar un pedido cotizado ---------- */
    listaPedidos.addEventListener("click", (event) => {
        const boton = event.target.closest(".btn-pagar-pedido")
        if (!boton) return
        pedidoAPagar = pedidos.find(p => p.idpedido == boton.dataset.id)
        tituloModalPagar.textContent = `Pagar pedido N° ${pedidoAPagar.idpedido}`
        btnConfirmarPago.textContent = `Pagar ${soles(pedidoAPagar.total)}`
        avisoPago.innerHTML = ""
        pago = crearFormularioPago(document.getElementById("formulario-pago-cotizado"))   // main.js
        modalPagar.show()
    })

    btnConfirmarPago.addEventListener("click", () => {
        const resultado = pago.validar()
        if (!resultado.ok) {
            avisoPago.innerHTML = mensajeError(resultado.error)
            return
        }
        btnConfirmarPago.disabled = true
        btnConfirmarPago.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Procesando...`
        new Promise(resolver => setTimeout(resolver, 1200))   // simula la respuesta del banco / Yape
            .then(() => obtenerDatos(db.rpc("pagar_pedido", { p_idpedido: pedidoAPagar.idpedido, p_metodo_pago: resultado.metodo })))
            .then(() => {
                modalPagar.hide()
                avisoMisPedidos.innerHTML = `<div class="alert alert-success">Pagaste el pedido N° ${pedidoAPagar.idpedido}. ¡Gracias!</div>`
                leerPedidos()
            })
            .catch(error => {
                console.error(error)
                avisoPago.innerHTML = mensajeError(mensajeDeLaBase(error, "No se pudo completar el pago."))
            })
            .finally(() => {
                btnConfirmarPago.disabled = false
                btnConfirmarPago.textContent = `Pagar ${soles(pedidoAPagar.total)}`
            })
    })

    leerPedidos()
})()
