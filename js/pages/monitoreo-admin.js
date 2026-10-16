(() => {
    const tarjetas = document.getElementById("tarjetas-monitoreo")
    const tbodyStock = document.getElementById("tbody-alertas-stock")
    const tbodyPedidos = document.getElementById("tbody-pedidos-atender")
    const aviso = document.getElementById("aviso-monitoreo")
    const txtActualizado = document.getElementById("txt-actualizado")
    const btnActualizar = document.getElementById("btn-actualizar")

    const fecha = (texto) => new Date(texto).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })

    const tarjeta = (titulo, valor, icono, color) => `
        <div class="col">
            <div class="card h-100 border-${color}">
                <div class="card-body d-flex align-items-center gap-3">
                    <i class="fa-solid ${icono} fa-2x text-${color}"></i>
                    <div>
                        <div class="fs-3 fw-semibold">${valor}</div>
                        <div class="small text-body-secondary">${titulo}</div>
                    </div>
                </div>
            </div>
        </div>`

    const dibujar = (productos, pedidos) => {
        const agotados = productos.filter(p => p.stock === 0)
        const porReponer = productos.filter(p => p.stock > 0 && p.stock <= p.stock_minimo)
        const cuenta = (estado) => pedidos.filter(p => p.estado === estado).length

        tarjetas.innerHTML =
            tarjeta("Agotados", agotados.length, "fa-ban", "danger") +
            tarjeta("Por reponer", porReponer.length, "fa-box-open", "warning") +
            tarjeta("Por cotizar", cuenta("por_cotizar"), "fa-file-invoice-dollar", "warning") +
            tarjeta("Pendientes de pago", cuenta("cotizado"), "fa-clock", "info") +
            tarjeta("Por entregar", cuenta("registrado"), "fa-truck", "primary")

        // Alertas de stock: primero los agotados, luego los de menor stock
        const alertas = [...agotados, ...porReponer.sort((a, b) => a.stock - b.stock)]
        tbodyStock.innerHTML = alertas.length === 0 ?
            `<tr><td colspan="4" class="text-center text-body-secondary py-4">Todo el inventario está en orden</td></tr>` :
            alertas.map(p => `<tr>
                <td>${escaparHTML(p.nombre)}</td>
                <td class="text-end fw-semibold text-danger">${p.stock}</td>
                <td class="text-end">${p.stock_minimo}</td>
                <td>${p.stock === 0 ?
                    `<span class="badge text-bg-danger">Agotado</span>` :
                    `<span class="badge text-bg-warning">Por reponer</span>`}</td>
            </tr>`).join("")

        // Pedidos por atender: los más antiguos primero
        tbodyPedidos.innerHTML = pedidos.length === 0 ?
            `<tr><td colspan="5" class="text-center text-body-secondary py-4">No hay pedidos pendientes</td></tr>` :
            pedidos.map(p => {
                const estado = ESTADOS_PEDIDO[p.estado] || { texto: p.estado, clase: "" }
                return `<tr>
                    <td class="fw-semibold">${p.idpedido}</td>
                    <td class="text-nowrap">${fecha(p.fecha)}</td>
                    <td>${escaparHTML(p.perfiles ? p.perfiles.nombre || "" : "")}</td>
                    <td class="text-end text-nowrap">${soles(p.total)}</td>
                    <td><span class="estado-pedido ${estado.clase}">${estado.texto}</span></td>
                </tr>`
            }).join("")
    }

    const cargar = () => {
        btnActualizar.disabled = true
        return Promise.all([
            obtenerDatos(db.from("productos_admin").select("idproducto, nombre, stock, stock_minimo")),
            obtenerDatos(db.from("pedidos")
                .select("idpedido, fecha, estado, total, perfiles(nombre)")
                .in("estado", ["por_cotizar", "cotizado", "registrado"])
                .order("fecha", { ascending: true }))
        ])
            .then(([productos, pedidos]) => {
                aviso.innerHTML = ""
                dibujar(productos, pedidos)
                txtActualizado.textContent = "Actualizado a las " +
                    new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })
            })
            .catch(error => {
                console.error(error)
                aviso.innerHTML = mensajeError("No se pudo cargar el monitoreo. Verifica que hayas iniciado sesión como administrador.")
            })
            .finally(() => { btnActualizar.disabled = false })
    }

    btnActualizar.addEventListener("click", cargar)

    // Se actualiza solo cada minuto; se detiene si el usuario sale de esta página
    const reloj = setInterval(() => {
        if (!document.body.contains(btnActualizar)) {
            clearInterval(reloj)
            return
        }
        cargar()
    }, 60000)

    cargar()
})()
