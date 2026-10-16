(() => {
    const listaPedidos = document.getElementById("lista-pedidos")
    const filtrosPedidos = document.getElementById("filtros-pedidos")
    const filtroEstado = document.getElementById("filtro-estado")
    const resumenPedidos = document.getElementById("resumen-pedidos")
    const resumenCliente = document.getElementById("resumen-cliente")
    const avisoMisPedidos = document.getElementById("aviso-mis-pedidos")
    const avisoPago = document.getElementById("aviso-pago")
    const btnConfirmarPago = document.getElementById("btn-confirmar-pago")
    const tituloModalPagar = document.getElementById("titulo-modal-pagar")
    const modalPagar = bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-pagar"))

    let pedidos = []
    let pedidoAPagar = null
    let pago = null
    let filtro = "en_curso"            // en_curso | entregado | anulado | todos

    const EN_CURSO = ["por_cotizar", "cotizado", "registrado"]
    const grupoDe = (p) => EN_CURSO.includes(p.estado) ? "en_curso" : p.estado
    const formatearFecha = (texto) => new Date(texto).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" })

    /* ---------- Lo que ve el cliente en cada estado (sin términos internos) ---------- */
    const explicar = (p) => {
        const recojo = p.entrega !== "delivery"
        const lugar = recojo ? `la sede ${escaparHTML(p.sedes ? p.sedes.nombre : "")}` :
            `${escaparHTML(p.distrito || "")}, ${escaparHTML(p.departamento || "")}`
        switch (p.estado) {
            case "por_cotizar": return { titulo: "Cotizando tu envío", tono: "espera", icono: "fa-calculator",
                mensaje: `Tu asesor está calculando el costo del envío a ${lugar}. Te avisaremos para que puedas pagar.` }
            case "cotizado": return { titulo: "Pendiente de pago", tono: "por-pagar", icono: "fa-credit-card",
                mensaje: `El envío cuesta ${soles(p.costo_envio)}. Paga ${soles(p.total)} para que preparemos tu pedido.` }
            case "registrado": return recojo ?
                { titulo: "Preparando tu pedido", tono: "proceso", icono: "fa-box-open",
                  mensaje: `Lo estamos alistando. Podrás recogerlo en ${lugar}; lleva tu número de pedido.` } :
                { titulo: "Preparando tu envío", tono: "proceso", icono: "fa-truck-fast",
                  mensaje: `Lo estamos alistando para enviarlo a ${lugar}. Tiempo estimado: ${escaparHTML(p.plazo || "")}.` }
            case "entregado": return { titulo: recojo ? "Recogido" : "Entregado", tono: "listo", icono: "fa-circle-check",
                mensaje: recojo ? `Recogiste tu pedido en ${lugar}. ¡Gracias por tu compra!` : `Entregamos tu pedido en ${lugar}. ¡Gracias por tu compra!` }
            default: return { titulo: "Anulado", tono: "anulado", icono: "fa-ban",
                mensaje: "Este pedido fue anulado. Si ya habías pagado, tu asesor o nuestro equipo coordinará la devolución." }
        }
    }

    /* ---------- Barra de pasos ---------- */
    const pasos = (p) => {
        const recojo = p.entrega !== "delivery"
        const nombres = p.costo_envio === null || p.estado === "cotizado" || (p.entrega === "delivery" && p.plazo === "Según cotización") ?
            ["Pedido recibido", "Envío cotizado", "Pago confirmado", "Preparando", recojo ? "Recogido" : "Entregado"] :
            ["Pedido recibido", "Pago confirmado", "Preparando", recojo ? "Recogido" : "Entregado"]
        // cuántos pasos están completos según el estado
        const hechos = {
            por_cotizar: 1,
            cotizado: 2,
            registrado: nombres.length - 2,     // pagado: se está preparando
            entregado: nombres.length,
            anulado: 0
        }[p.estado]
        if (p.estado === "anulado") return ""
        return `<ol class="pasos-pedido">${nombres.map((n, i) => {
            const clase = i < hechos ? "hecho" : i === hechos ? "actual" : ""
            return `<li class="${clase}"><span class="marca-paso">${i < hechos ? `<i class="fa-solid fa-check"></i>` : i + 1}</span><span class="texto-paso">${n}</span></li>`
        }).join("")}</ol>`
    }

    /* ---------- Tarjeta de un pedido ---------- */
    const tarjetaPedido = (p) => {
        const e = explicar(p)
        const unidades = p.pedido_detalle.reduce((t, d) => t + d.cantidad, 0)
        const envio = p.entrega !== "delivery" ? "Gratis (recojo)" : p.costo_envio === null ? "Por cotizar" : soles(p.costo_envio)
        const fotos = p.pedido_detalle.slice(0, 4).map(d =>
            `<img src="${(d.productos && d.productos.imagenchica) || IMAGEN_SIN_FOTO}" alt="" loading="lazy">`).join("") +
            (p.pedido_detalle.length > 4 ? `<span class="mas-fotos">+${p.pedido_detalle.length - 4}</span>` : "")
        return `
        <article class="pedido-cliente ${e.tono}">
            <header>
                <div>
                    <div class="estado-cliente"><i class="fa-solid ${e.icono}"></i> ${e.titulo}</div>
                    <small class="text-body-secondary">Pedido N° ${p.idpedido} · ${formatearFecha(p.fecha)}
                        ${p.tipo === "mayorista" ? " · Compra mayorista" : ""}</small>
                </div>
                <div class="text-end">
                    <div class="total-pedido">${soles(p.total)}${p.costo_envio === null && p.entrega === "delivery" ? " <small>+ envío</small>" : ""}</div>
                    <small class="text-body-secondary">${unidades} unidades${p.pago_estado === "pagado" ? ` · pagado con ${p.metodo_pago === "yape" ? "Yape" : "tarjeta"}` : ""}</small>
                </div>
            </header>

            ${pasos(p)}

            <div class="pie-pedido">
                <div class="fotos-pedido">${fotos}</div>
                <div class="d-flex flex-wrap gap-2">
                    ${p.estado === "cotizado" ? `<button class="btn btn-primary btn-sm btn-pagar-pedido" data-id="${p.idpedido}"><i class="fa-solid fa-credit-card"></i> Pagar ${soles(p.total)}</button>` : ""}
                    <button class="btn btn-outline-primary btn-sm btn-volver-comprar" data-id="${p.idpedido}"><i class="fa-solid fa-rotate-right"></i> Volver a comprar</button>
                    <button class="btn btn-link btn-sm" data-bs-toggle="collapse" data-bs-target="#detalle-${p.idpedido}">Ver detalle</button>
                </div>
            </div>

            <div class="collapse" id="detalle-${p.idpedido}">
                <table class="table table-sm mb-0 mt-3 tabla-detalle">
                    <tbody>
                        ${p.pedido_detalle.map(d => `
                        <tr>
                            <td>${escaparHTML(d.nombre)}</td>
                            <td class="text-end text-nowrap">${d.cantidad} × ${soles(d.precio)}</td>
                            <td class="text-end text-nowrap fw-semibold">${soles(d.subtotal)}</td>
                        </tr>`).join("")}
                        <tr class="fila-envio"><td>Envío</td><td></td><td class="text-end text-nowrap">${envio}</td></tr>
                    </tbody>
                </table>
            </div>
        </article>`
    }

    /* ---------- Resumen superior y filtro ---------- */
    const dibujarTodo = () => {
        const enCurso = pedidos.filter(p => grupoDe(p) === "en_curso")
        const porPagar = pedidos.filter(p => p.estado === "cotizado")
        resumenCliente.innerHTML = porPagar.length ?
            `<div class="insight-principal atencion"><i class="fa-solid fa-credit-card"></i><span><em>Tienes un pago pendiente</em>
                ${porPagar.length === 1 ? `Tu envío del pedido N° ${porPagar[0].idpedido} ya fue cotizado. Paga para que lo preparemos.` :
                `${porPagar.length} pedidos tienen el envío cotizado y esperan tu pago.`}</span></div>` :
            enCurso.length ?
            `<div class="insight-principal bueno"><i class="fa-solid fa-box-open"></i><span><em>En curso</em>
                Tienes <strong>${enCurso.length} pedido(s) en camino o en preparación</strong>. Aquí verás cada paso.</span></div>` : ""

        const opciones = [["en_curso", "En curso"], ["entregado", "Entregados"], ["anulado", "Anulados"], ["todos", "Todos"]]
        const cantidad = (v) => v === "todos" ? pedidos.length : pedidos.filter(p => grupoDe(p) === v).length
        filtroEstado.innerHTML = opciones.filter(([v]) => v === "todos" || cantidad(v) > 0).map(([v, t]) =>
            `<button type="button" class="${filtro === v ? "activo" : ""}" data-valor="${v}">${t} <span>${cantidad(v)}</span></button>`).join("")
        filtroEstado.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { filtro = b.dataset.valor; dibujarTodo() }))

        const visibles = pedidos.filter(p => filtro === "todos" || grupoDe(p) === filtro)
        resumenPedidos.textContent = `${visibles.length} pedido(s)`
        listaPedidos.innerHTML = visibles.length ? visibles.map(tarjetaPedido).join("") :
            `<p class="text-body-secondary text-center py-4">No tienes pedidos en esta sección.</p>`
    }

    const leerPedidos = () => {
        // pedido_detalle(...) trae los productos del pedido y su foto (el costo no es visible para el cliente)
        obtenerDatos(db.from("pedidos")
            .select("idpedido, fecha, tipo, entrega, departamento, distrito, direccion, plazo, subtotal, costo_envio, total, " +
                    "metodo_pago, pago_estado, estado, sedes(nombre), asesores(nombres, apellidos), " +
                    "pedido_detalle(idproducto, nombre, precio, cantidad, subtotal, productos(imagenchica))")
            .eq("idusuario", usuarioActual.id)
            .order("fecha", { ascending: false }))
            .then(data => {
                pedidos = data
                if (pedidos.length === 0) {
                    filtrosPedidos.hidden = true
                    resumenCliente.innerHTML = ""
                    listaPedidos.innerHTML = `
                        <div class="text-center py-5">
                            <i class="fa-solid fa-box-open fa-3x text-body-secondary mb-3"></i>
                            <h2 class="h5">Todavía no tienes pedidos</h2>
                            <p class="text-body-secondary">Cuando confirmes una compra, aquí podrás seguir cada paso.</p>
                            <button class="btn btn-primary" onclick="irAPagina('Tienda')">Ir a la tienda</button>
                        </div>`
                    return
                }
                // si no hay pedidos en curso, abrir directamente el historial
                if (!pedidos.some(p => grupoDe(p) === "en_curso") && filtro === "en_curso") filtro = "todos"
                filtrosPedidos.hidden = false
                dibujarTodo()
            })
            .catch(error => {
                console.error(error)
                listaPedidos.innerHTML = mensajeError("No se pudieron cargar tus pedidos.")
            })
    }

    /* ---------- Volver a comprar: pone los mismos productos en el carrito (según stock actual) ---------- */
    const volverAComprar = (pedido) => {
        const ids = pedido.pedido_detalle.map(d => d.idproducto)
        obtenerDatos(db.from("productos").select("idproducto, nombre, precio, preciorebajado, stock, stock_minimo").in("idproducto", ids))
            .then(productos => {
                let agregados = 0
                pedido.pedido_detalle.forEach(d => {
                    const producto = productos.find(p => p.idproducto === d.idproducto)
                    const enCarrito = (leerCarrito().find(i => i.idproducto === d.idproducto) || { cantidad: 0 }).cantidad
                    const cantidad = producto ? Math.min(d.cantidad, producto.stock - enCarrito) : 0
                    if (cantidad > 0) { agregarItemCarrito(producto, cantidad); agregados++ }
                })
                if (agregados) {
                    mostrarNotificacion(`${agregados} producto(s) agregados al carrito`)
                    irAPagina("Carrito")
                } else {
                    mostrarNotificacion("Esos productos no tienen stock por ahora", "fa-circle-info")
                }
            })
            .catch(error => {
                console.error(error)
                avisoMisPedidos.innerHTML = mensajeError("No se pudo repetir la compra.")
            })
    }

    listaPedidos.addEventListener("click", (event) => {
        const btnVolver = event.target.closest(".btn-volver-comprar")
        if (btnVolver) volverAComprar(pedidos.find(p => p.idpedido == btnVolver.dataset.id))

        /* ---------- Pagar un pedido cotizado ---------- */
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
                avisoMisPedidos.innerHTML = `<div class="alert alert-success">Pagaste el pedido N° ${pedidoAPagar.idpedido}. ¡Ya lo estamos preparando!</div>`
                leerPedidos()
                actualizarResumenCuenta()
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
