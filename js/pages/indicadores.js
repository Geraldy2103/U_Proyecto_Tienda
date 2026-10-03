(() => {
    const avisoIndicadores = document.getElementById("aviso-indicadores")
    const tarjetasTotales = document.getElementById("tarjetas-totales")
    const asesoresDestacados = document.getElementById("asesores-destacados")
    const ventasSedes = document.getElementById("ventas-sedes")
    const tbodyRanking = document.getElementById("tbody-ranking")
    const tbodyReponer = document.getElementById("tbody-reponer")
    const cantidadReponer = document.getElementById("cantidad-reponer")

    /* Tarjeta con un número grande (ej. "Ventas totales: S/ 12,345.00") */
    const tarjeta = (titulo, valor, icono) => `
        <div class="col">
            <div class="card h-100">
                <div class="card-body">
                    <div class="text-body-secondary small"><i class="fa-solid ${icono}"></i> ${titulo}</div>
                    <div class="fs-4 fw-bold">${valor}</div>
                </div>
            </div>
        </div>`

    /* Tarjeta de un asesor destacado */
    const tarjetaAsesor = (titulo, asesor, detalle) => `
        <div class="col-md-6">
            <div class="card h-100 border-success">
                <div class="card-body d-flex gap-3 align-items-center">
                    <img src="${asesor.foto || IMAGEN_SIN_FOTO}" alt="${escaparHTML(asesor.nombres)}" class="foto-destacado">
                    <div>
                        <div class="text-success small fw-bold text-uppercase">${titulo}</div>
                        <div class="fs-5 fw-bold">${escaparHTML(asesor.nombres + " " + asesor.apellidos)}</div>
                        <div>${detalle}</div>
                        <div class="small text-body-secondary">
                            Sede ${escaparHTML(asesor.sede)} · Director: ${escaparHTML(asesor.director)}
                        </div>
                    </div>
                </div>
            </div>
        </div>`

    /* Barra horizontal de Bootstrap; porcentaje de 0 a 100 */
    const barra = (porcentaje, color) => `
        <div class="progress" role="progressbar" aria-valuenow="${porcentaje.toFixed(0)}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar ${color}" style="width: ${porcentaje}%"></div>
        </div>`

    // Las dos consultas se hacen a la vez; Promise.all espera a que terminen ambas
    Promise.all([
        obtenerDatos(db.from("ventas_por_sede").select("*").order("ventas", { ascending: false })),
        obtenerDatos(db.from("resumen_asesores").select("*").order("ventas", { ascending: false })),
        obtenerDatos(db.from("productos_por_reponer").select("*").order("stock"))
    ])
        .then(([sedes, asesores, reponer]) => {
            /* ---------- Totales ---------- */
            const ventas = sedes.reduce((suma, s) => suma + Number(s.ventas), 0)
            const pedidos = sedes.reduce((suma, s) => suma + s.pedidos, 0)
            const mayoristas = sedes.reduce((suma, s) => suma + Number(s.ventas_mayoristas), 0)
            const margen = sedes.reduce((suma, s) => suma + Number(s.margen), 0)
            tarjetasTotales.innerHTML =
                tarjeta("Ventas totales", soles(ventas), "fa-sack-dollar") +
                tarjeta("Margen bruto", `${soles(margen)} <small class="fs-6 text-body-secondary">${(ventas ? margen / ventas * 100 : 0).toFixed(0)}%</small>`, "fa-chart-line") +
                tarjeta("Pedidos", pedidos, "fa-receipt") +
                tarjeta("Ticket promedio", soles(pedidos ? ventas / pedidos : 0), "fa-scale-balanced") +
                tarjeta("Ventas mayoristas", (ventas ? mayoristas / ventas * 100 : 0).toFixed(0) + "%", "fa-boxes-stacked")

            if (pedidos === 0) {
                avisoIndicadores.innerHTML = `<div class="alert alert-info">
                    Todavía no hay pedidos registrados. Los indicadores se llenarán cuando los clientes compren
                    (o al ejecutar <code>supabase/03_demo.sql</code>).</div>`
            }

            /* ---------- Asesores destacados ---------- */
            const masVentas = asesores[0]  // ya vienen ordenados por ventas
            const masSolicitado = [...asesores].sort((a, b) => b.solicitudes - a.solicitudes)[0]
            asesoresDestacados.innerHTML = (masVentas && Number(masVentas.ventas) > 0 ?
                tarjetaAsesor("Mayores ventas", masVentas, `${soles(masVentas.ventas)} en ${masVentas.pedidos} pedido(s)`) : "") +
                (masSolicitado && masSolicitado.solicitudes > 0 ?
                tarjetaAsesor("Más solicitado", masSolicitado, `${masSolicitado.solicitudes} solicitud(es) mayoristas`) : "")

            /* ---------- Ventas por sede ---------- */
            const mayorVentaSede = Math.max(...sedes.map(s => Number(s.ventas)), 1)
            ventasSedes.innerHTML = sedes.map(s => `
                <div class="mb-3">
                    <div class="d-flex justify-content-between">
                        <strong>${escaparHTML(s.sede)}</strong>
                        <span>${soles(s.ventas)} <small class="text-body-secondary">(${s.pedidos} pedidos)</small></span>
                    </div>
                    ${barra(Number(s.ventas) / mayorVentaSede * 100, "bg-success")}
                    <small class="text-body-secondary">
                        Minorista ${soles(s.ventas_minoristas)} · Mayorista ${soles(s.ventas_mayoristas)} · Margen ${soles(s.margen)}
                    </small>
                </div>`).join("")

            /* ---------- Ranking de asesores ---------- */
            const mayorVentaAsesor = Math.max(...asesores.map(a => Number(a.ventas)), 1)
            tbodyRanking.innerHTML = asesores.map((a, posicion) => `
                <tr>
                    <td>${posicion + 1}</td>
                    <td>${escaparHTML(a.nombres + " " + a.apellidos)}</td>
                    <td><span class="badge text-bg-secondary">${escaparHTML(a.sede)}</span><br>
                        <small class="text-body-secondary">${escaparHTML(a.director)}</small></td>
                    <td class="text-center">${a.solicitudes}</td>
                    <td class="text-center">${a.pedidos}</td>
                    <td class="text-end" style="min-width: 9em">${soles(a.ventas)}
                        ${barra(Number(a.ventas) / mayorVentaAsesor * 100, "bg-primary")}</td>
                </tr>`).join("")

            /* ---------- Productos por reponer ---------- */
            cantidadReponer.textContent = reponer.length
            tbodyReponer.innerHTML = reponer.length === 0 ?
                `<tr><td colspan="5" class="text-center">Todo el stock está sobre el mínimo</td></tr>` :
                reponer.map(p => `
                <tr>
                    <td>${escaparHTML(p.nombre)}</td>
                    <td class="text-center">${p.stock === 0 ? `<span class="badge text-bg-dark">Agotado</span>` :
                        `<span class="text-danger fw-bold">${p.stock}</span>`}</td>
                    <td class="text-center">${p.stock_minimo}</td>
                    <td>${p.nombreempresa ? escaparHTML(p.nombreempresa) + ` <small class="text-body-secondary">(${escaparHTML(p.pais || "")})</small>` :
                        `<span class="text-body-secondary">Sin proveedor asignado</span>`}</td>
                    <td>${escaparHTML(p.nombrecontacto || "")}
                        ${p.telefono ? `<br><small class="text-nowrap"><i class="fa-solid fa-phone"></i> ${escaparHTML(p.telefono)}</small>` : ""}</td>
                </tr>`).join("")
        })
        .catch(error => {
            console.error(error)
            avisoIndicadores.innerHTML = mensajeError("No se pudieron cargar los indicadores.")
        })
})()
