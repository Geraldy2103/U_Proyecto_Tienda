(() => {
    const avisoIndicadores = document.getElementById("aviso-indicadores")
    const tarjetasTotales = document.getElementById("tarjetas-totales")
    const asesoresDestacados = document.getElementById("asesores-destacados")
    const ventasSedes = document.getElementById("ventas-sedes")
    const tbodyRanking = document.getElementById("tbody-ranking")
    const tbodyReponer = document.getElementById("tbody-reponer")
    const cantidadReponer = document.getElementById("cantidad-reponer")

    /* Indicador: etiqueta pequeña arriba, número grande y un detalle opcional */
    const tarjeta = (titulo, valor, detalle = "") => `
        <div class="col">
            <div class="indicador">
                <div class="indicador-titulo">${titulo}</div>
                <div class="indicador-valor">${valor}</div>
                ${detalle ? `<div class="indicador-detalle">${detalle}</div>` : ""}
            </div>
        </div>`

    /* Fila de un asesor destacado. logros: lista de textos ("Mayores ventas: S/ ...") */
    const filaDestacado = (asesor, logros) => `
        <div class="destacado">
            <img src="${asesor.foto || IMAGEN_SIN_FOTO}" alt="${escaparHTML(asesor.nombres)}">
            <div>
                <div class="fw-bold">${escaparHTML(asesor.nombres + " " + asesor.apellidos)}</div>
                <div class="small text-body-secondary">${escaparHTML(asesor.sede)} · ${escaparHTML(asesor.director)}</div>
                ${logros.map(l => `<div class="small">${l}</div>`).join("")}
            </div>
        </div>`

    /* Barra horizontal fina; porcentaje de 0 a 100 */
    const barra = (porcentaje) => `
        <div class="barra" role="progressbar" aria-valuenow="${porcentaje.toFixed(0)}" aria-valuemin="0" aria-valuemax="100">
            <span style="width: ${porcentaje}%"></span>
        </div>`

    // Las tres consultas se hacen a la vez; Promise.all espera a que terminen todas
    Promise.all([
        obtenerDatos(db.from("ventas_por_sede").select("*").order("ventas", { ascending: false })),
        obtenerDatos(db.from("resumen_asesores").select("*").order("ventas", { ascending: false })),
        obtenerDatos(db.from("productos_por_reponer").select("*").order("stock"))
    ])
        .then(([sedes, asesores, reponer]) => {
            /* ---------- Fila 1: totales ---------- */
            const ventas = sedes.reduce((suma, s) => suma + Number(s.ventas), 0)
            const pedidos = sedes.reduce((suma, s) => suma + s.pedidos, 0)
            const mayoristas = sedes.reduce((suma, s) => suma + Number(s.ventas_mayoristas), 0)
            const margen = sedes.reduce((suma, s) => suma + Number(s.margen), 0)
            const porcentaje = (parte, total) => (total ? parte / total * 100 : 0).toFixed(0) + "%"
            tarjetasTotales.innerHTML =
                tarjeta("Ventas totales", soles(ventas)) +
                tarjeta("Margen bruto", soles(margen), porcentaje(margen, ventas) + " de las ventas") +
                tarjeta("Pedidos", pedidos) +
                tarjeta("Ticket promedio", soles(pedidos ? ventas / pedidos : 0)) +
                tarjeta("Ventas mayoristas", porcentaje(mayoristas, ventas), soles(mayoristas))

            if (pedidos === 0) {
                avisoIndicadores.innerHTML = `<div class="alert alert-light border">
                    Todavía no hay pedidos registrados. Los indicadores se llenarán cuando los clientes compren
                    (o al ejecutar <code>supabase/03_demo.sql</code>).</div>`
            }

            /* ---------- Destacados: si es la misma persona, aparece una sola vez con ambos logros ---------- */
            const masVentas = asesores[0]  // ya vienen ordenados por ventas
            const masSolicitado = [...asesores].sort((a, b) => b.solicitudes - a.solicitudes)[0]
            const logroVentas = masVentas && Number(masVentas.ventas) > 0 ?
                `<strong>Mayores ventas:</strong> ${soles(masVentas.ventas)} en ${masVentas.pedidos} pedidos` : ""
            const logroSolicitudes = masSolicitado && masSolicitado.solicitudes > 0 ?
                `<strong>Más solicitado:</strong> ${masSolicitado.solicitudes} solicitudes` : ""
            if (!logroVentas && !logroSolicitudes) {
                asesoresDestacados.innerHTML = `<p class="small text-body-secondary mb-0">Aún no hay ventas ni solicitudes.</p>`
            } else if (masVentas === masSolicitado) {
                asesoresDestacados.innerHTML = filaDestacado(masVentas, [logroVentas, logroSolicitudes].filter(Boolean))
            } else {
                asesoresDestacados.innerHTML =
                    (logroVentas ? filaDestacado(masVentas, [logroVentas]) : "") +
                    (logroSolicitudes ? filaDestacado(masSolicitado, [logroSolicitudes]) : "")
            }

            /* ---------- Ventas por sede ---------- */
            const mayorVentaSede = Math.max(...sedes.map(s => Number(s.ventas)), 1)
            ventasSedes.innerHTML = sedes.map(s => `
                <div class="sede-fila">
                    <div class="d-flex justify-content-between align-items-baseline">
                        <span class="fw-semibold">${escaparHTML(s.sede)}</span>
                        <span class="fw-bold">${soles(s.ventas)}</span>
                    </div>
                    ${barra(Number(s.ventas) / mayorVentaSede * 100)}
                    <div class="d-flex justify-content-between small text-body-secondary">
                        <span>${s.pedidos} pedidos · ${porcentaje(Number(s.ventas_mayoristas), Number(s.ventas))} mayorista</span>
                        <span>Margen ${soles(s.margen)}</span>
                    </div>
                </div>`).join("")

            /* ---------- Ranking de asesores (una línea por asesor) ---------- */
            const mayorVentaAsesor = Math.max(...asesores.map(a => Number(a.ventas)), 1)
            tbodyRanking.innerHTML = asesores.map((a, posicion) => `
                <tr>
                    <td class="text-center text-body-secondary">${posicion + 1}</td>
                    <td class="fw-semibold text-nowrap">${escaparHTML(a.nombres + " " + a.apellidos)}</td>
                    <td class="text-nowrap">${escaparHTML(a.sede)}</td>
                    <td class="text-nowrap text-body-secondary">${escaparHTML(a.director)}</td>
                    <td class="text-end">${a.solicitudes}</td>
                    <td class="text-end">${a.pedidos}</td>
                    <td class="text-end text-nowrap fw-semibold">${soles(a.ventas)}</td>
                    <td class="col-barra">${barra(Number(a.ventas) / mayorVentaAsesor * 100)}</td>
                </tr>`).join("")

            /* ---------- Productos por reponer ---------- */
            cantidadReponer.textContent = `(${reponer.length})`
            tbodyReponer.innerHTML = reponer.length === 0 ?
                `<tr><td colspan="7" class="text-center text-body-secondary">Todo el stock está sobre el mínimo</td></tr>` :
                reponer.map(p => `
                <tr>
                    <td>${escaparHTML(p.nombre)}</td>
                    <td class="text-end fw-bold ${p.stock === 0 ? "text-body-secondary" : "text-danger"}">${p.stock === 0 ? "Agotado" : p.stock}</td>
                    <td class="text-end text-body-secondary">${p.stock_minimo}</td>
                    <td>${p.nombreempresa ? escaparHTML(p.nombreempresa) : `<span class="text-body-secondary">Sin proveedor</span>`}</td>
                    <td class="text-body-secondary">${escaparHTML(p.pais || "")}</td>
                    <td>${escaparHTML(p.nombrecontacto || "")}</td>
                    <td class="text-nowrap">${escaparHTML(p.telefono || "")}</td>
                </tr>`).join("")
        })
        .catch(error => {
            console.error(error)
            avisoIndicadores.innerHTML = mensajeError("No se pudieron cargar los indicadores.")
        })
})()
