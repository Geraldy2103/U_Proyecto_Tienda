(() => {
    const listaPedidos = document.getElementById("lista-pedidos")

    const ESTADOS = {
        registrado: { texto: "Registrado", clase: "text-primary" },
        entregado:  { texto: "Entregado",  clase: "text-success" },
        anulado:    { texto: "Anulado",    clase: "text-danger" }
    }

    const formatearFecha = (texto) => new Date(texto).toLocaleString("es-PE", { dateStyle: "long", timeStyle: "short" })

    // pedido_detalle(...) trae los productos de cada pedido (el costo no es visible para el cliente)
    obtenerDatos(db.from("pedidos")
        .select("idpedido, fecha, tipo, total, estado, sedes(nombre), asesores(nombres, apellidos), pedido_detalle(nombre, precio, cantidad, subtotal)")
        .eq("idusuario", usuarioActual.id)
        .order("fecha", { ascending: false }))
        .then(pedidos => {
            if (pedidos.length === 0) {
                listaPedidos.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fa-solid fa-box-open fa-3x text-body-secondary mb-3"></i>
                        <h2 class="h5">Todavía no tienes pedidos</h2>
                        <p class="text-body-secondary">Cuando confirmes una compra, aparecerá aquí.</p>
                        <button class="btn btn-primary" onclick="irAPagina('Tienda')">Ir a la tienda</button>
                    </div>`
                return
            }
            listaPedidos.innerHTML = pedidos.map(p => {
                const estado = ESTADOS[p.estado] || { texto: p.estado, clase: "" }
                return `
                <div class="card pedido mb-3">
                    <div class="card-body">
                        <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                            <div>
                                <h2 class="h6 mb-0">Pedido N° ${p.idpedido}</h2>
                                <small class="text-body-secondary">${formatearFecha(p.fecha)} · Sede ${escaparHTML(p.sedes.nombre)}
                                    · ${p.tipo === "mayorista" ? "Mayorista" : "Minorista"}
                                    ${p.asesores ? ` · Asesor: ${escaparHTML(p.asesores.nombres + " " + p.asesores.apellidos)}` : ""}</small>
                            </div>
                            <div class="text-end">
                                <div class="estado ${estado.clase}">${estado.texto}</div>
                                <div class="fw-bold fs-5">${soles(p.total)}</div>
                            </div>
                        </div>
                        <table class="table table-sm mb-0">
                            <tbody>
                                ${p.pedido_detalle.map(d => `
                                <tr>
                                    <td>${escaparHTML(d.nombre)}</td>
                                    <td class="text-end text-nowrap">${d.cantidad} × ${soles(d.precio)}</td>
                                    <td class="text-end text-nowrap fw-semibold">${soles(d.subtotal)}</td>
                                </tr>`).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>`
            }).join("")
        })
        .catch(error => {
            console.error(error)
            listaPedidos.innerHTML = mensajeError("No se pudieron cargar tus pedidos.")
        })
})()
