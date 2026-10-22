(() => {
    const tbodySolicitudes = document.getElementById("tbody-solicitudes")
    const avisoSolicitudes = document.getElementById("aviso-solicitudes")
    const kpis = document.getElementById("kpis-solicitudes")
    const insight = document.getElementById("insight-solicitudes")
    const graficoAsesores = document.getElementById("grafico-asesores")
    const pendientesSede = document.getElementById("pendientes-sede")
    const filtroEstado = document.getElementById("filtro-estado")

    const DIAS_ALERTA = 7          // una solicitud que espera más de 7 días necesita atención
    const COLOR = "#1d7a35"        // una sola serie: el verde de la marca
    let solicitudes = []
    let estadoElegido = "pendiente"

    const DIA = 24 * 60 * 60 * 1000
    const diasEsperando = (s) => Math.floor((Date.now() - new Date(s.fecha)) / DIA)
    const formatearFecha = (texto) => new Date(texto).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "2-digit" })
    const nombreAsesor = (s) => s.asesores.nombres + " " + s.asesores.apellidos
    const sedeDe = (s) => s.asesores.directores.sedes.nombre
    const unidades = (s) => s.productos.reduce((suma, p) => suma + Number(p.cantidad), 0)

    /* "Hace 3 días" normal; con ícono de alerta si pasa el límite (el color nunca va solo) */
    const espera = (s) => {
        const d = diasEsperando(s)
        const texto = d === 0 ? "Hoy" : d === 1 ? "Hace 1 día" : `Hace ${d} días`
        if (s.estado !== "pendiente") return `<span class="text-body-secondary">${texto}</span>`
        return d > DIAS_ALERTA ?
            `<span class="estado-kpi bajo"><i class="fa-solid fa-triangle-exclamation"></i> ${texto}</span>` :
            `<span class="estado-kpi bueno"><i class="fa-regular fa-clock"></i> ${texto}</span>`
    }

    /* ---------- Indicadores ---------- */
    const dibujarKpis = () => {
        const pendientes = solicitudes.filter(s => s.estado === "pendiente")
        const atendidas = solicitudes.filter(s => s.estado === "atendida")
        const atrasadas = pendientes.filter(s => diasEsperando(s) > DIAS_ALERTA)
        const promedio = pendientes.length ? pendientes.reduce((t, s) => t + diasEsperando(s), 0) / pendientes.length : 0
        const masAntigua = pendientes.reduce((m, s) => Math.max(m, diasEsperando(s)), 0)
        const tasa = solicitudes.length ? atendidas.length / solicitudes.length * 100 : 0
        const tarjeta = (titulo, valor, detalle) => `
            <div class="col"><div class="indicador">
                <div class="indicador-titulo">${titulo}</div>
                <div class="indicador-valor">${valor}</div>
                <div class="indicador-detalle">${detalle}</div>
            </div></div>`
        kpis.innerHTML =
            tarjeta("Pendientes", pendientes.length,
                atrasadas.length ? `<span class="estado-kpi bajo"><i class="fa-solid fa-triangle-exclamation"></i> ${atrasadas.length} con más de ${DIAS_ALERTA} días</span>` :
                `<span class="estado-kpi bueno"><i class="fa-solid fa-circle-check"></i> Todas al día</span>`) +
            tarjeta("Atendidas", atendidas.length, `de ${solicitudes.length} solicitudes`) +
            tarjeta("Tasa de atención", `${tasa.toFixed(0)}%`,
                tasa >= 70 ? `<span class="estado-kpi bueno"><i class="fa-solid fa-circle-check"></i> Buen ritmo</span>` :
                `<span class="estado-kpi medio"><i class="fa-solid fa-circle-minus"></i> Por mejorar</span>`) +
            tarjeta("Espera promedio", `${promedio.toFixed(0)} días`, pendientes.length ? `La más antigua: ${masAntigua} días` : "Sin pendientes")
        return { pendientes, atrasadas, masAntigua }
    }

    /* ---------- Insight principal ---------- */
    const dibujarInsight = ({ pendientes, atrasadas }) => {
        if (!pendientes.length) {
            insight.innerHTML = `<div class="insight-principal bueno"><i class="fa-solid fa-circle-check"></i>
                <span><em>Bien</em>No hay solicitudes pendientes: todos los clientes mayoristas fueron atendidos.</span></div>`
            return
        }
        const porAsesor = agrupar(pendientes, nombreAsesor)
        const [asesor, lista] = porAsesor[0]
        const antigua = Math.max(...lista.map(diasEsperando))
        const tipo = atrasadas.length ? "alerta" : "atencion"
        insight.innerHTML = `<div class="insight-principal ${tipo}"><i class="fa-solid fa-${atrasadas.length ? "triangle-exclamation" : "lightbulb"}"></i>
            <span><em>${atrasadas.length ? "Alerta" : "Atención"}</em>
            <strong>${escaparHTML(asesor)}</strong> acumula ${lista.length} solicitud(es) pendiente(s); la más antigua espera <strong>${antigua} días</strong>.
            ${atrasadas.length ? ` En total, <strong>${atrasadas.length}</strong> clientes esperan más de ${DIAS_ALERTA} días: conviene contactarlos hoy.` : ""}</span></div>`
    }

    /* Agrupa una lista por una clave y ordena de mayor a menor cantidad */
    const agrupar = (lista, clave) => {
        const grupos = {}
        lista.forEach(s => (grupos[clave(s)] = grupos[clave(s)] || []).push(s))
        return Object.entries(grupos).sort((a, b) => b[1].length - a[1].length)
    }

    /* ---------- Gráfico: barras horizontales de pendientes por asesor ---------- */
    const dibujarGrafico = (pendientes) => {
        const datos = agrupar(pendientes, nombreAsesor).map(([asesor, lista]) => ({
            asesor, cantidad: lista.length, atrasadas: lista.filter(s => diasEsperando(s) > DIAS_ALERTA).length,
            sede: sedeDe(lista[0]), unidades: lista.reduce((t, s) => t + unidades(s), 0) }))
        if (!datos.length) {
            graficoAsesores.innerHTML = `<p class="text-body-secondary small mb-0">Sin pendientes.</p>`
            return
        }
        const alto = 34, W = 640, izquierda = 150, derecha = 40, H = datos.length * alto + 8
        const maximo = Math.max(...datos.map(d => d.cantidad))
        const escala = (v) => v / maximo * (W - izquierda - derecha)
        let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Solicitudes pendientes por asesor">`
        datos.forEach((d, i) => {
            const y = i * alto + 4
            svg += `<text x="${izquierda - 10}" y="${y + alto / 2 + 1}" class="eje-nombre" text-anchor="end" dominant-baseline="middle"></text>
                <rect x="${izquierda}" y="${y + 7}" width="${Math.max(escala(d.cantidad), 3)}" height="${alto - 14}" rx="4" fill="${COLOR}" class="segmento"/>
                <text x="${izquierda + escala(d.cantidad) + 8}" y="${y + alto / 2 + 1}" class="valor" dominant-baseline="middle">${d.cantidad}${d.atrasadas ? " ⚠" : ""}</text>
                <rect x="0" y="${y}" width="${W}" height="${alto}" class="zona-hover" data-i="${i}" tabindex="0"/>`
        })
        svg += `</svg><div class="tooltip-grafico" hidden></div>`
        graficoAsesores.innerHTML = svg
        // nombres con textContent (vienen de la base de datos)
        graficoAsesores.querySelectorAll(".eje-nombre").forEach((t, i) => t.textContent = datos[i].asesor)

        const tooltip = graficoAsesores.querySelector(".tooltip-grafico")
        graficoAsesores.querySelectorAll(".zona-hover").forEach(z => {
            const mostrar = () => {
                const d = datos[z.dataset.i]
                tooltip.innerHTML = `<div class="titulo"></div>
                    <div class="fila"><strong>${d.cantidad}</strong> <span>pendiente(s)</span></div>
                    <div class="fila"><strong>${d.atrasadas}</strong> <span>con más de ${DIAS_ALERTA} días</span></div>
                    <div class="fila"><strong>${d.unidades}</strong> <span>unidades solicitadas</span></div>`
                tooltip.querySelector(".titulo").textContent = `${d.asesor} · ${d.sede}`
                tooltip.hidden = false
                const caja = z.getBoundingClientRect(), cont = graficoAsesores.getBoundingClientRect()
                tooltip.style.left = Math.min(cont.width - 90, 260) + "px"
                tooltip.style.top = (caja.top - cont.top + caja.height) + "px"
                graficoAsesores.querySelectorAll(".zona-hover").forEach(x => x.classList.toggle("activa", x === z))
            }
            z.addEventListener("pointerenter", mostrar)
            z.addEventListener("focus", mostrar)
        })
        graficoAsesores.querySelector("svg").addEventListener("pointerleave", () => {
            tooltip.hidden = true
            graficoAsesores.querySelectorAll(".zona-hover").forEach(x => x.classList.remove("activa"))
        })
    }

    /* ---------- Pendientes por sede ---------- */
    const dibujarSedes = (pendientes) => {
        const datos = agrupar(pendientes, sedeDe)
        const maximo = Math.max(...datos.map(([, l]) => l.length), 1)
        pendientesSede.innerHTML = datos.length ? datos.map(([sede, lista]) => {
            const atrasadas = lista.filter(s => diasEsperando(s) > DIAS_ALERTA).length
            return `<div class="sede-fila">
                <div class="d-flex justify-content-between align-items-baseline">
                    <span class="fw-semibold">${escaparHTML(sede)}</span><span class="fw-bold">${lista.length}</span>
                </div>
                <div class="barra"><span style="width: ${lista.length / maximo * 100}%"></span></div>
                <div class="small ${atrasadas ? "estado-kpi bajo" : "text-body-secondary"}">
                    ${atrasadas ? `<i class="fa-solid fa-triangle-exclamation"></i> ${atrasadas} esperan más de ${DIAS_ALERTA} días` : "Todas recientes"}</div>
            </div>`
        }).join("") : `<p class="text-body-secondary small mb-0">Sin pendientes.</p>`
    }

    /* ---------- Tabla ---------- */
    const dibujarTabla = () => {
        const cantidad = (e) => e === "todas" ? solicitudes.length : solicitudes.filter(s => s.estado === e).length
        filtroEstado.innerHTML = [["pendiente", "Pendientes"], ["atendida", "Atendidas"], ["todas", "Todas"]].map(([v, t]) =>
            `<button type="button" class="${estadoElegido === v ? "activo" : ""}" data-valor="${v}">${t} <span>${cantidad(v)}</span></button>`).join("")
        filtroEstado.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { estadoElegido = b.dataset.valor; dibujarTabla() }))

        const visibles = solicitudes.filter(s => estadoElegido === "todas" || s.estado === estadoElegido)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))   // las más antiguas primero
        tbodySolicitudes.innerHTML = visibles.length === 0 ?
            `<tr><td colspan="6" class="text-center text-body-secondary py-4">No hay solicitudes</td></tr>` :
            visibles.map(item => `<tr>
                <td class="text-nowrap">${espera(item)}<br><small class="text-body-secondary">${formatearFecha(item.fecha)}</small></td>
                <td>${escaparHTML(item.perfiles.nombre || "")}<br>
                    <small><a href="mailto:${escaparHTML(item.perfiles.correo || "")}">${escaparHTML(item.perfiles.correo || "")}</a></small></td>
                <td class="text-nowrap">${escaparHTML(nombreAsesor(item))}<br><small class="text-body-secondary">${escaparHTML(sedeDe(item))}</small></td>
                <td>${item.productos.map(p => `${escaparHTML(p.nombre)} <span class="text-nowrap text-body-secondary">× ${p.cantidad}</span>`).join("<br>")}
                    <br><small class="fw-semibold">${unidades(item)} unidades</small></td>
                <td class="small">${escaparHTML(item.mensaje || "")}</td>
                <td class="text-end">${item.estado === "pendiente" ?
                    `<button class="btn btn-sm btn-outline-primary btn-atender text-nowrap" data-id="${item.idsolicitud}"><i class="fa-solid fa-check"></i> Atender</button>` :
                    `<span class="badge text-bg-light border">Atendida</span>`}</td>
            </tr>`).join("")
    }

    const dibujar = () => {
        const resumen = dibujarKpis()
        dibujarInsight(resumen)
        dibujarGrafico(resumen.pendientes)
        dibujarSedes(resumen.pendientes)
        dibujarTabla()
    }

    const leerSolicitudes = () => {
        // perfiles(...) y asesores(...) traen los datos relacionados (como un JOIN de SQL)
        let consulta = db.from("solicitudes_mayoristas")
            .select("*, perfiles(nombre, correo), asesores(nombres, apellidos, directores(sedes(nombre)))")
            .order("fecha")
        if (esAsesor()) consulta = consulta.eq("idasesor", usuarioActual.idasesor)   // solo sus solicitudes
        obtenerDatos(consulta)
            .then(data => { solicitudes = data; dibujar() })
            .catch(error => {
                console.error(error)
                avisoSolicitudes.innerHTML = mensajeError("No se pudieron cargar las solicitudes.")
            })
    }

    /* Marcar como atendida */
    tbodySolicitudes.addEventListener("click", (event) => {
        const boton = event.target.closest(".btn-atender")
        if (!boton) return
        boton.disabled = true
        obtenerDatos(db.from("solicitudes_mayoristas").update({ estado: "atendida" })
                .eq("idsolicitud", boton.dataset.id).select())
            .then(verificarCambio)
            .then(() => {
                avisoSolicitudes.innerHTML = ""
                mostrarNotificacion("Solicitud marcada como atendida")
                leerSolicitudes()
            })
            .catch(error => {
                console.error(error)
                boton.disabled = false
                avisoSolicitudes.innerHTML = mensajeError("No se pudo actualizar la solicitud.")
            })
    })

    leerSolicitudes()
})()
