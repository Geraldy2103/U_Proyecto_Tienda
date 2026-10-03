(() => {
    const tbody = document.getElementById("tbody-pedidos-admin")
    const filtroEstado = document.getElementById("filtro-estado-admin")
    const resumen = document.getElementById("resumen-pedidos-admin")
    const aviso = document.getElementById("aviso-pedidos-admin")

    let pedidos = []
    let estadoElegido = "por_cotizar"   // se abre en lo más urgente: envíos por cotizar

    const fecha = (texto) => new Date(texto).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })

    const dibujarFiltro = () => {
        const cantidad = (estado) => estado === "todos" ? pedidos.length : pedidos.filter(p => p.estado === estado).length
        filtroEstado.innerHTML = [["todos", "Todos"], ...Object.entries(ESTADOS_PEDIDO).map(([k, v]) => [k, v.plural])]
            .map(([valor, texto]) => `<button type="button" class="${estadoElegido === valor ? "activo" : ""}" data-valor="${valor}">
                ${texto} <span>${cantidad(valor)}</span></button>`).join("")
        filtroEstado.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
            estadoElegido = b.dataset.valor
            dibujar()
        }))
    }

    /* Botones según el estado del pedido */
    const accion = (p) => {
        if (p.estado === "por_cotizar") return `
            <div class="input-group input-group-sm justify-content-end flex-nowrap">
                <span class="input-group-text">S/</span>
                <input type="number" class="form-control campo-costo" min="0" max="5000" step="0.5" placeholder="Envío" style="max-width: 90px">
                <button class="btn btn-primary btn-cotizar" data-id="${p.idpedido}">Cotizar</button>
            </div>`
        if (p.estado === "registrado") return `
            <button class="btn btn-sm btn-primary btn-estado" data-id="${p.idpedido}" data-estado="entregado">Entregado</button>
            <button class="btn btn-sm btn-outline-secondary btn-estado" data-id="${p.idpedido}" data-estado="anulado">Anular</button>`
        if (p.estado === "cotizado") return `
            <span class="small text-body-secondary me-2">Espera pago</span>
            <button class="btn btn-sm btn-outline-secondary btn-estado" data-id="${p.idpedido}" data-estado="anulado">Anular</button>`
        return ""
    }

    const dibujar = () => {
        dibujarFiltro()
        const visibles = pedidos.filter(p => estadoElegido === "todos" || p.estado === estadoElegido)
        resumen.textContent = `${visibles.length} pedido(s)`
        tbody.innerHTML = visibles.length === 0 ?
            `<tr><td colspan="9" class="text-center text-body-secondary py-4">No hay pedidos en este estado</td></tr>` :
            visibles.map(p => {
                const estado = ESTADOS_PEDIDO[p.estado] || { texto: p.estado, clase: "" }
                return `<tr>
                    <td class="fw-semibold">${p.idpedido}</td>
                    <td class="text-nowrap">${fecha(p.fecha)}</td>
                    <td>${escaparHTML(p.perfiles.nombre || "")}<br><small class="text-body-secondary">${escaparHTML(p.perfiles.correo || "")}</small></td>
                    <td>${textoEntrega(p)}</td>
                    <td>${p.tipo === "mayorista" ? "Mayorista" : "Minorista"}
                        ${p.asesores ? `<br><small class="text-body-secondary">${escaparHTML(p.asesores.nombres + " " + p.asesores.apellidos)}</small>` : ""}</td>
                    <td class="text-end text-nowrap fw-semibold">${soles(p.total)}
                        ${p.costo_envio === null && p.entrega === "delivery" ? `<br><small class="text-body-secondary">+ envío</small>` : ""}</td>
                    <td class="text-nowrap">${p.pago_estado === "pagado" ? (p.metodo_pago === "yape" ? "Yape" : "Tarjeta") : `<span class="text-body-secondary">Pendiente</span>`}</td>
                    <td><span class="estado-pedido ${estado.clase}">${estado.texto}</span></td>
                    <td class="text-end text-nowrap">${accion(p)}</td>
                </tr>`
            }).join("")
    }

    const leer = () => {
        obtenerDatos(db.from("pedidos")
            .select("*, perfiles(nombre, correo), sedes(nombre), asesores(nombres, apellidos)")
            .order("fecha", { ascending: false }))
            .then(data => { pedidos = data; dibujar() })
            .catch(error => {
                console.error(error)
                tbody.innerHTML = `<tr><td colspan="9">${mensajeError("No se pudieron cargar los pedidos.")}</td></tr>`
            })
    }

    tbody.addEventListener("click", (event) => {
        const btnCotizar = event.target.closest(".btn-cotizar")
        const btnEstado = event.target.closest(".btn-estado")
        aviso.innerHTML = ""

        if (btnCotizar) {
            const costo = Number(btnCotizar.closest("td").querySelector(".campo-costo").value)
            if (!(costo > 0)) {
                aviso.innerHTML = mensajeError("Escribe el costo del envío.")
                return
            }
            btnCotizar.disabled = true
            obtenerDatos(db.rpc("cotizar_envio", { p_idpedido: Number(btnCotizar.dataset.id), p_costo: costo }))
                .then(() => { mostrarNotificacion(`Envío cotizado: ${soles(costo)}`); leer() })
                .catch(error => {
                    console.error(error)
                    btnCotizar.disabled = false
                    aviso.innerHTML = mensajeError(mensajeDeLaBase(error, "No se pudo cotizar el envío."))
                })
        }

        if (btnEstado) {
            const nuevo = btnEstado.dataset.estado
            if (nuevo === "anulado" && !confirm("¿Anular el pedido? El stock se devolverá al inventario.")) return
            btnEstado.disabled = true
            obtenerDatos(db.from("pedidos").update({ estado: nuevo }).eq("idpedido", btnEstado.dataset.id).select("idpedido"))
                .then(verificarCambio)
                .then(() => { mostrarNotificacion(`Pedido ${btnEstado.dataset.id}: ${ESTADOS_PEDIDO[nuevo].texto.toLowerCase()}`); leer() })
                .catch(error => {
                    console.error(error)
                    btnEstado.disabled = false
                    aviso.innerHTML = mensajeError("No se pudo actualizar el pedido.")
                })
        }
    })

    leer()
})()
