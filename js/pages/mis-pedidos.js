(() => {
    const listaPedidos = document.getElementById("lista-pedidos")
    const filtrosPedidos = document.getElementById("filtros-pedidos")
    const filtroEstado = document.getElementById("filtro-estado")
    const filtroTipo = document.getElementById("filtro-tipo")
    const resumenPedidos = document.getElementById("resumen-pedidos")

    const ESTADOS = {
        registrado: { texto: "Registrado", plural: "Registrados", clase: "text-primary" },
        entregado:  { texto: "Entregado",  plural: "Entregados",  clase: "text-success" },
        anulado:    { texto: "Anulado",    plural: "Anulados",    clase: "text-danger" }
    }
    const TIPOS = { minorista: "Minorista", mayorista: "Mayorista" }

    let pedidos = []
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
        const estado = ESTADOS[p.estado] || { texto: p.estado, clase: "" }
        return `
        <div class="card pedido mb-3">
            <div class="card-body">
                <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                    <div>
                        <h2 class="h6 mb-0">Pedido N° ${p.idpedido}</h2>
                        <small class="text-body-secondary">${formatearFecha(p.fecha)} · Sede ${escaparHTML(p.sedes.nombre)}
                            · ${TIPOS[p.tipo] || p.tipo}
                            ${p.asesores ? ` · Asesor: ${escaparHTML(p.asesores.nombres + " " + p.asesores.apellidos)}` : ""}</small>
                    </div>
                    <div class="text-end">
                        <div class="estado ${estado.clase}">${estado.texto}</div>
                        <div class="fw-bold fs-5">${soles(p.total)}</div>
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
                    </tbody>
                </table>
            </div>
        </div>`
    }

    /* Segmentadores + resumen + lista, según el filtro elegido */
    const dibujarTodo = () => {
        dibujarSegmentador(filtroEstado, "estado", Object.fromEntries(Object.entries(ESTADOS).map(([k, v]) => [k, v.plural])))
        dibujarSegmentador(filtroTipo, "tipo", TIPOS)

        const visibles = pedidos.filter(p =>
            (filtro.estado === "todos" || p.estado === filtro.estado) &&
            (filtro.tipo === "todos" || p.tipo === filtro.tipo))
        const total = visibles.reduce((suma, p) => suma + Number(p.total), 0)
        resumenPedidos.textContent = `${visibles.length} pedido(s) · ${soles(total)}`

        listaPedidos.innerHTML = visibles.length > 0 ? visibles.map(tarjetaPedido).join("") :
            `<p class="text-body-secondary text-center py-4">No hay pedidos con este filtro.</p>`
    }

    // pedido_detalle(...) trae los productos de cada pedido (el costo no es visible para el cliente)
    obtenerDatos(db.from("pedidos")
        .select("idpedido, fecha, tipo, total, estado, sedes(nombre), asesores(nombres, apellidos), pedido_detalle(nombre, precio, cantidad, subtotal)")
        .eq("idusuario", usuarioActual.id)
        .order("fecha", { ascending: false }))
        .then(data => {
            pedidos = data
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
            filtrosPedidos.hidden = false
            dibujarTodo()
        })
        .catch(error => {
            console.error(error)
            listaPedidos.innerHTML = mensajeError("No se pudieron cargar tus pedidos.")
        })
})()
