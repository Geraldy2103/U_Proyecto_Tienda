
(() => { /*"Crea esta función, mete todo este código dentro y ejecútala inmediatamente."*/
    const tbodyProveedores = document.getElementById("tbody-proveedores")
    const kpisProveedores = document.getElementById("kpis-proveedores")
    const avisoProveedores = document.getElementById("aviso-proveedores")
    const insight = document.getElementById("insight-proveedores")
    const leyendaCuadrantes = document.getElementById("leyenda-cuadrantes")
    const graficoMatriz = document.getElementById("grafico-matriz")
    const guiaCuadrantes = document.getElementById("guia-cuadrantes")
    const resumenTabla = document.getElementById("resumen-tabla-proveedores")

    /* Los 4 grupos de la matriz. Colores: primeros 4 tonos de la paleta validada (orden fijo). */
    const CUADRANTES = {
        estrategico: { nombre: "Estratégicos", color: "#2a78d6", icono: "fa-star",
                       accion: "Venden mucho y dejan buena ganancia. Cuidar la relación y asegurar el abastecimiento." },
        rentable:    { nombre: "Rentables", color: "#1baf7a", icono: "fa-coins",
                       accion: "Dejan buena ganancia pero venden poco. Impulsar sus productos (ofertas, vitrina)." },
        volumen:     { nombre: "De volumen", color: "#eb6834", icono: "fa-boxes-stacked",
                       accion: "Venden mucho con poca ganancia. Negociar mejores costos de compra." },
        revisar:     { nombre: "A revisar", color: "#eda100", icono: "fa-magnifying-glass",
                       accion: "Venden poco y dejan poca ganancia. Evaluar si conviene mantenerlos." }
    }
    let grupoElegido = null   // filtro de la tabla al hacer clic en la leyenda

    /* Celda con fondo degradado: cuanto mayor el valor, más intenso el color (verde ventas, azul rentabilidad) */
    const celdaDegradado = (contenido, valor, maximo, color) => {
        const intensidad = maximo > 0 ? Math.max(valor, 0) / maximo : 0
        const rgb = color === "verde" ? "29, 122, 53" : "37, 78, 125"
        const textoClaro = intensidad > 0.55
        return `<td class="text-end text-nowrap celda-degradado ${textoClaro ? "text-white" : ""}"
                    style="background-color: rgba(${rgb}, ${(0.08 + intensidad * 0.82).toFixed(2)})">${contenido}</td>`
    }

    const tarjeta = (titulo, valor, detalle) => `
        <div class="col"><div class="indicador">
            <div class="indicador-titulo">${titulo}</div>
            <div class="indicador-valor text-truncate" title="${valor}">${valor}</div>
            <div class="indicador-detalle">${detalle}</div>
        </div></div>`

    // resumen_proveedores es una vista: cada proveedor con sus productos, ventas y ganancia
    obtenerDatos(db.from("resumen_proveedores").select("*").order("ventas", { ascending: false }))
        .then(data => {
            if (data.length === 0) {
                tbodyProveedores.innerHTML = `<tr><td colspan="9" class="text-center">No hay proveedores registrados</td></tr>`
                return
            }

            /* ---------- Cálculos ---------- */
            const totalVentas = data.reduce((suma, p) => suma + Number(p.ventas), 0)
            const totalMargen = data.reduce((suma, p) => suma + Number(p.margen), 0)
            data.forEach(p => {
                p.participacion = totalVentas > 0 ? Number(p.ventas) / totalVentas * 100 : 0
                p.porcentajeGanancia = Number(p.ventas) > 0 ? Number(p.margen) / Number(p.ventas) * 100 : 0
            })
            const conVentas = data.filter(p => Number(p.ventas) > 0)
            const promedioParticipacion = conVentas.length ? 100 / conVentas.length : 0      // línea vertical
            const promedioGanancia = totalVentas ? totalMargen / totalVentas * 100 : 0        // línea horizontal
            const cuadrante = (p) => Number(p.ventas) <= 0 ? null :
                p.participacion >= promedioParticipacion ?
                    (p.porcentajeGanancia >= promedioGanancia ? "estrategico" : "volumen") :
                    (p.porcentajeGanancia >= promedioGanancia ? "rentable" : "revisar")
            data.forEach(p => p.cuadrante = cuadrante(p))

            const lider = data[0]  // ya vienen ordenados por ventas
            const masRentable = [...conVentas].sort((a, b) => b.porcentajeGanancia - a.porcentajeGanancia)[0]
            const porReponer = data.reduce((suma, p) => suma + p.por_reponer, 0)
            const conReposicion = data.filter(p => p.por_reponer > 0).length
            const top5 = data.slice(0, 5).reduce((t, p) => t + p.participacion, 0)
            const cuenta = (c) => data.filter(p => p.cuadrante === c).length

            /* ---------- Indicadores ---------- */
            kpisProveedores.innerHTML =
                tarjeta("Proveedor líder", `${lider.participacion.toFixed(0)}% de ventas`, escaparHTML(lider.nombreempresa)) +
                tarjeta("Mejor rentabilidad", masRentable ? `${masRentable.porcentajeGanancia.toFixed(0)}% de ganancia` : "—",
                    masRentable ? escaparHTML(masRentable.nombreempresa) : "Sin ventas") +
                tarjeta("Concentración", `${top5.toFixed(0)}%`, "de las ventas viene de los 5 principales") +
                tarjeta("Por reponer", `${porReponer} productos`, porReponer ?
                    `<span class="estado-kpi bajo"><i class="fa-solid fa-triangle-exclamation"></i> de ${conReposicion} proveedor(es)</span>` :
                    `<span class="estado-kpi bueno"><i class="fa-solid fa-circle-check"></i> Stock suficiente</span>`)

            /* ---------- Insight ---------- */
            const volumen = data.filter(p => p.cuadrante === "volumen")
            const textoVolumen = volumen.length ?
                ` <strong>${volumen.length}</strong> proveedor(es) venden mucho con poca ganancia (por ejemplo <strong>${escaparHTML(volumen[0].nombreempresa)}</strong>, ${volumen[0].porcentajeGanancia.toFixed(0)}%): oportunidad para negociar costos.` : ""
            insight.innerHTML = `<div class="insight-principal ${top5 >= 50 ? "atencion" : "bueno"}">
                <i class="fa-solid fa-${top5 >= 50 ? "scale-unbalanced" : "lightbulb"}"></i><span><em>${top5 >= 50 ? "Atención" : "Dato"}</em>
                Los 5 principales proveedores concentran el <strong>${top5.toFixed(0)}% de las ventas</strong>${top5 >= 50 ? ": si alguno falla, el impacto es alto." : "."}
                ${textoVolumen}</span></div>`

            /* ---------- Leyenda (también filtra la tabla) y guía ---------- */
            const dibujarLeyenda = () => {
                leyendaCuadrantes.innerHTML = Object.entries(CUADRANTES).map(([clave, c]) =>
                    `<button type="button" class="chip-cuadrante ${grupoElegido === clave ? "activo" : ""}" data-cuadrante="${clave}">
                        <i style="background:${c.color}"></i>${c.nombre} <span>${cuenta(clave)}</span></button>`).join("") +
                    (grupoElegido ? `<button type="button" class="chip-cuadrante" data-cuadrante="">Ver todos</button>` : "")
                leyendaCuadrantes.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
                    // clic en un grupo: filtra; clic otra vez en el mismo o en "Ver todos": quita el filtro
                    const elegido = b.dataset.cuadrante
                    grupoElegido = elegido && grupoElegido !== elegido ? elegido : null
                    dibujarLeyenda()
                    dibujarTabla()
                }))
            }
            guiaCuadrantes.innerHTML = Object.values(CUADRANTES).map(c => `
                <div class="guia-cuadrante">
                    <i class="fa-solid ${c.icono}" style="color:${c.color}"></i>
                    <div><strong>${c.nombre}</strong><p>${c.accion}</p></div>
                </div>`).join("")

            /* ---------- Matriz (gráfico de dispersión) ---------- */
            const W = 640, H = 340, M = { arriba: 14, derecha: 16, abajo: 40, izquierda: 50 }
            const maxX = Math.max(...conVentas.map(p => p.participacion), promedioParticipacion) * 1.12
            const minY = Math.min(0, ...conVentas.map(p => p.porcentajeGanancia))
            const maxY = Math.max(...conVentas.map(p => p.porcentajeGanancia), promedioGanancia) * 1.12
            const x = (v) => M.izquierda + v / maxX * (W - M.izquierda - M.derecha)
            const y = (v) => M.arriba + (1 - (v - minY) / (maxY - minY)) * (H - M.arriba - M.abajo)
            let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Matriz de proveedores: participación en ventas frente a porcentaje de ganancia">`
            // grilla y ejes
            for (let v = 0; v <= maxY; v += 10) {
                svg += `<line x1="${M.izquierda}" x2="${W - M.derecha}" y1="${y(v)}" y2="${y(v)}" class="grilla"/>
                        <text x="${M.izquierda - 8}" y="${y(v) + 4}" class="eje" text-anchor="end">${v}%</text>`
            }
            for (let v = 0; v <= maxX; v += 5) {
                svg += `<text x="${x(v)}" y="${H - M.abajo + 16}" class="eje" text-anchor="middle">${v}%</text>`
            }
            svg += `<text x="${(W + M.izquierda) / 2}" y="${H - 6}" class="eje" text-anchor="middle">Participación en ventas →</text>
                <text x="14" y="${(H - M.abajo) / 2}" class="eje" text-anchor="middle" transform="rotate(-90 14 ${(H - M.abajo) / 2})">% de ganancia →</text>`
            // líneas de promedio
            svg += `<line x1="${x(promedioParticipacion)}" x2="${x(promedioParticipacion)}" y1="${M.arriba}" y2="${H - M.abajo}" class="linea-promedio"/>
                <line x1="${M.izquierda}" x2="${W - M.derecha}" y1="${y(promedioGanancia)}" y2="${y(promedioGanancia)}" class="linea-promedio"/>`
            // nombres de los cuadrantes en las esquinas
            svg += `<text x="${W - M.derecha - 6}" y="${M.arriba + 14}" class="etiqueta-cuadrante" text-anchor="end">Estratégicos</text>
                <text x="${M.izquierda + 6}" y="${M.arriba + 14}" class="etiqueta-cuadrante">Rentables</text>
                <text x="${W - M.derecha - 6}" y="${H - M.abajo - 8}" class="etiqueta-cuadrante" text-anchor="end">De volumen</text>
                <text x="${M.izquierda + 6}" y="${H - M.abajo - 8}" class="etiqueta-cuadrante">A revisar</text>`
            // puntos (con anillo blanco de 2px) y etiqueta directa solo para los 3 más grandes
            conVentas.forEach((p, i) => {
                const c = CUADRANTES[p.cuadrante]
                svg += `<circle cx="${x(p.participacion)}" cy="${y(p.porcentajeGanancia)}" r="7" fill="${c.color}" stroke="#fff" stroke-width="2" class="punto"/>`
                if (i < 3) svg += `<text x="${x(p.participacion) - 10}" y="${y(p.porcentajeGanancia) - 10}" class="etiqueta-punto" text-anchor="end" data-i="${i}"></text>`
                svg += `<circle cx="${x(p.participacion)}" cy="${y(p.porcentajeGanancia)}" r="14" class="zona-punto" data-i="${i}" tabindex="0"/>`
            })
            svg += `</svg><div class="tooltip-grafico" hidden></div>`
            graficoMatriz.innerHTML = svg
            graficoMatriz.querySelectorAll(".etiqueta-punto").forEach(t => t.textContent = conVentas[t.dataset.i].nombreempresa)

            const tooltip = graficoMatriz.querySelector(".tooltip-grafico")
            graficoMatriz.querySelectorAll(".zona-punto").forEach(z => {
                const mostrar = () => {
                    const p = conVentas[z.dataset.i], c = CUADRANTES[p.cuadrante]
                    tooltip.innerHTML = `<div class="titulo"></div>
                        <div class="fila"><strong>${p.participacion.toFixed(1)}%</strong> <span>de las ventas (${soles(p.ventas)})</span></div>
                        <div class="fila"><strong>${p.porcentajeGanancia.toFixed(0)}%</strong> <span>de ganancia</span></div>
                        <div class="fila"><i style="background:${c.color}"></i><span>${c.nombre}</span></div>`
                    tooltip.querySelector(".titulo").textContent = p.nombreempresa
                    tooltip.hidden = false
                    const caja = z.getBoundingClientRect(), cont = graficoMatriz.getBoundingClientRect()
                    tooltip.style.left = Math.min(Math.max(caja.left - cont.left + caja.width / 2, 90), cont.width - 90) + "px"
                    tooltip.style.top = (caja.bottom - cont.top + 4) + "px"
                }
                z.addEventListener("pointerenter", mostrar)
                z.addEventListener("focus", mostrar)
                z.addEventListener("pointerleave", () => tooltip.hidden = true)
                z.addEventListener("blur", () => tooltip.hidden = true)
            })

            /* ---------- Tabla ---------- */
            const maxVentas = Math.max(...data.map(p => Number(p.ventas)))
            const maxParticipacion = Math.max(...data.map(p => p.participacion))
            const maxGanancia = Math.max(...data.map(p => p.porcentajeGanancia))
            const dibujarTabla = () => {
                const visibles = data.filter(p => !grupoElegido || p.cuadrante === grupoElegido)
                resumenTabla.textContent = grupoElegido ?
                    `${visibles.length} proveedores · ${CUADRANTES[grupoElegido].nombre}` : `${visibles.length} proveedores`
                tbodyProveedores.innerHTML = visibles.map(item => {
                    const c = item.cuadrante ? CUADRANTES[item.cuadrante] : null
                    return `<tr>
                        <td>${item === lider ? `<i class="fa-solid fa-trophy text-warning" title="Mayor venta"></i> ` : ""}
                            <strong>${escaparHTML(item.nombreempresa)}</strong><br>
                            <small class="text-body-secondary">${escaparHTML(item.ciudad || "")}, ${escaparHTML(item.pais || "")}</small></td>
                        <td>${escaparHTML(item.nombrecontacto || "")}<br>
                            <small class="text-body-secondary text-nowrap"><i class="fa-solid fa-phone"></i> ${escaparHTML(item.telefono || "—")}</small></td>
                        <td class="text-nowrap">${c ? `<span class="grupo-cuadrante"><i style="background:${c.color}"></i>${c.nombre}</span>` :
                            `<span class="text-body-secondary small">Sin ventas</span>`}</td>
                        <td class="text-center">${item.productos}</td>
                        <td class="text-center">${item.por_reponer > 0 ?
                            `<span class="badge text-bg-danger" title="Hay que pedirle reposición">${item.por_reponer}</span>` :
                            `<i class="fa-solid fa-check text-success" title="Stock suficiente"></i>`}</td>
                        <td class="text-end">${item.unidades_vendidas}</td>
                        ${celdaDegradado(soles(item.ventas), Number(item.ventas), maxVentas, "verde")}
                        ${celdaDegradado(item.participacion.toFixed(1) + "%", item.participacion, maxParticipacion, "verde")}
                        ${celdaDegradado(`${soles(item.margen)}<br><small>${item === masRentable ? "★ " : ""}${item.porcentajeGanancia.toFixed(0)}%</small>`,
                            item.porcentajeGanancia, maxGanancia, "azul")}
                    </tr>`
                }).join("")
            }
            dibujarLeyenda()
            dibujarTabla()
        })
        .catch(error => {
            console.error(error)
            avisoProveedores.innerHTML = mensajeError("No se pudo cargar la lista de proveedores.")
        })
})()
