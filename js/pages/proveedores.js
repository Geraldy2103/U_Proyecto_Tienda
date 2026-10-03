
(() => { /*"Crea esta función, mete todo este código dentro y ejecútala inmediatamente."*/
    const tbodyProveedores = document.getElementById("tbody-proveedores")
    const kpisProveedores = document.getElementById("kpis-proveedores")

    /* Celda con fondo degradado: cuanto mayor el valor (respecto del máximo), más intenso el color.
       color: "verde" (ventas) o "azul" (rentabilidad). */
    const celdaDegradado = (contenido, valor, maximo, color) => {
        const intensidad = maximo > 0 ? valor / maximo : 0             // de 0 a 1
        const rgb = color === "verde" ? "31, 92, 69" : "37, 78, 125"    // verde bosque y azul petróleo de la marca
        const textoClaro = intensidad > 0.55                            // fondo oscuro -> letra blanca
        return `<td class="text-end text-nowrap celda-degradado ${textoClaro ? "text-white" : ""}"
                    style="background-color: rgba(${rgb}, ${(0.08 + intensidad * 0.82).toFixed(2)})">${contenido}</td>`
    }

    /* Tarjeta de indicador clave */
    const kpi = (titulo, valor, detalle, icono) => `
        <div class="col">
            <div class="card h-100 kpi">
                <div class="card-body">
                    <div class="small text-body-secondary"><i class="fa-solid ${icono}"></i> ${titulo}</div>
                    <div class="fs-5 fw-bold text-truncate" title="${valor}">${valor}</div>
                    <div class="small">${detalle}</div>
                </div>
            </div>
        </div>`

    // resumen_proveedores es una vista: cada proveedor con sus productos, ventas y ganancia
    obtenerDatos(db.from("resumen_proveedores").select("*").order("ventas", { ascending: false }))
        .then(data => {
            if (data.length === 0) {
                tbodyProveedores.innerHTML = `<tr><td colspan="8" class="text-center">No hay proveedores registrados</td></tr>`
                return
            }

            // Cálculos de apoyo
            const totalVentas = data.reduce((suma, p) => suma + Number(p.ventas), 0)
            data.forEach(p => {
                p.participacion = totalVentas > 0 ? Number(p.ventas) / totalVentas * 100 : 0
                p.porcentajeGanancia = Number(p.ventas) > 0 ? Number(p.margen) / Number(p.ventas) * 100 : 0
            })
            const maxVentas = Math.max(...data.map(p => Number(p.ventas)))
            const maxParticipacion = Math.max(...data.map(p => p.participacion))
            const maxGanancia = Math.max(...data.map(p => p.porcentajeGanancia))
            const lider = data[0]  // ya vienen ordenados por ventas
            const masRentable = [...data].filter(p => Number(p.ventas) > 0)
                .sort((a, b) => b.porcentajeGanancia - a.porcentajeGanancia)[0]
            const porReponer = data.reduce((suma, p) => suma + p.por_reponer, 0)
            const conReposicion = data.filter(p => p.por_reponer > 0).length
            const activos = data.filter(p => p.productos > 0).length

            /* ---------- Indicadores clave ---------- */
            kpisProveedores.innerHTML =
                kpi("Proveedor líder", escaparHTML(lider.nombreempresa),
                    `${soles(lider.ventas)} · ${lider.participacion.toFixed(0)}% de las ventas`, "fa-trophy") +
                kpi("Mejor rentabilidad", masRentable ? escaparHTML(masRentable.nombreempresa) : "—",
                    masRentable ? `${masRentable.porcentajeGanancia.toFixed(0)}% de ganancia` : "Sin ventas", "fa-chart-line") +
                kpi("Por reponer", `${porReponer} producto(s)`,
                    `de ${conReposicion} proveedor(es)`, "fa-triangle-exclamation") +
                kpi("Proveedores activos", `${activos} de ${data.length}`,
                    "con productos en el catálogo", "fa-truck")

            /* ---------- Tabla ---------- */
            let filas = ""
            data.forEach(item => {
                const esLider = item === lider && Number(item.ventas) > 0
                const esMasRentable = item === masRentable
                filas += `<tr>
                        <td>${esLider ? `<i class="fa-solid fa-trophy text-warning" title="Mayor venta"></i> ` : ""}
                            <strong>${escaparHTML(item.nombreempresa)}</strong><br>
                            <small class="text-body-secondary">${escaparHTML(item.ciudad || "")}, ${escaparHTML(item.pais || "")}</small></td>
                        <td>${escaparHTML(item.nombrecontacto || "")}<br>
                            <small class="text-body-secondary text-nowrap"><i class="fa-solid fa-phone"></i> ${escaparHTML(item.telefono || "—")}</small></td>
                        <td class="text-center">${item.productos}</td>
                        <td class="text-center">${item.por_reponer > 0 ?
                            `<span class="badge text-bg-danger" title="Hay que pedirle reposición">${item.por_reponer}</span>` :
                            `<i class="fa-solid fa-check text-success" title="Stock suficiente"></i>`}</td>
                        <td class="text-end">${item.unidades_vendidas}</td>
                        ${celdaDegradado(soles(item.ventas), Number(item.ventas), maxVentas, "verde")}
                        ${celdaDegradado(item.participacion.toFixed(1) + "%", item.participacion, maxParticipacion, "verde")}
                        ${celdaDegradado(`${soles(item.margen)}<br><small>${esMasRentable ? "★ " : ""}${item.porcentajeGanancia.toFixed(0)}%</small>`,
                            item.porcentajeGanancia, maxGanancia, "azul")}
                      </tr>`
            });
            tbodyProveedores.innerHTML = filas
        })
        .catch(error => {
            console.error(error)
            tbodyProveedores.innerHTML = `<tr><td colspan="8">${mensajeError("No se pudo cargar la lista de proveedores.")}</td></tr>`
        })
})()
