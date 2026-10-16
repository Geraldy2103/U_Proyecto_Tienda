(() => {
    const textoPeriodo = document.getElementById("texto-periodo")
    const filtroPeriodo = document.getElementById("filtro-periodo")
    const avisoIndicadores = document.getElementById("aviso-indicadores")
    const tarjetasTotales = document.getElementById("tarjetas-totales")
    const listaInsights = document.getElementById("lista-insights")
    const leyendaTendencia = document.getElementById("leyenda-tendencia")
    const graficoTendencia = document.getElementById("grafico-tendencia")
    const tablaTendencia = document.getElementById("tabla-tendencia")
    const btnVerTabla = document.getElementById("btn-ver-tabla")
    const ventasSedes = document.getElementById("ventas-sedes")
    const tbodyRanking = document.getElementById("tbody-ranking")
    const tbodyReponer = document.getElementById("tbody-reponer")
    const cantidadReponer = document.getElementById("cantidad-reponer")

    // Colores de las 2 series (par validado de la paleta de referencia: azul y naranja)
    const SERIES = [
        { clave: "minorista", nombre: "Minorista", color: "#2a78d6" },
        { clave: "mayorista", nombre: "Mayorista", color: "#eb6834" }
    ]

    let filas = []         // ventas por día/sede/tipo/asesor (función indicadores_diarios)
    let solicitudes = []   // solicitudes mayoristas (fecha, idasesor)
    let asesores = []      // nombre y sede de cada asesor
    let reponer = []
    let dias = 30          // período elegido (0 = todo)

    /* ---------- Utilidades ---------- */
    const DIA = 24 * 60 * 60 * 1000
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
    const aFecha = (texto) => { const [a, m, d] = texto.split("-").map(Number); return new Date(a, m - 1, d) }
    const porcentaje = (parte, total) => total ? parte / total * 100 : 0
    const sumar = (lista, campo) => lista.reduce((s, x) => s + Number(x[campo]), 0)
    const fechaCorta = (f) => f.toLocaleDateString("es-PE", { day: "numeric", month: "short" })

    /* Filas de un rango [desde, hasta) */
    const entre = (lista, desde, hasta, campoFecha = "fecha") => lista.filter(x => {
        const f = typeof x[campoFecha] === "string" && x[campoFecha].length === 10 ? aFecha(x[campoFecha]) : new Date(x[campoFecha])
        return (!desde || f >= desde) && f < hasta
    })

    /* Resumen de un conjunto de filas */
    const resumir = (lista) => {
        const ventas = sumar(lista, "ventas"), pedidos = sumar(lista, "pedidos"), margen = sumar(lista, "margen")
        const mayorista = sumar(lista.filter(x => x.tipo === "mayorista"), "ventas")
        return { ventas, pedidos, margen, mayorista, ticket: pedidos ? ventas / pedidos : 0,
                 pctMargen: porcentaje(margen, ventas), pctMayorista: porcentaje(mayorista, ventas) }
    }

    /* "▲ 12%" verde o "▼ 5%" rojo comparado con el período anterior (puntos porcentuales si es una tasa) */
    const variacion = (actual, anterior, esTasa = false) => {
        if (!dias) return ""
        if (!esTasa && !anterior) return `<span class="variacion neutra">sin datos previos</span>`
        const cambio = esTasa ? actual - anterior : (actual - anterior) / anterior * 100
        if (Math.abs(cambio) < 0.5) return `<span class="variacion neutra">= igual que antes</span>`
        const sube = cambio > 0
        return `<span class="variacion ${sube ? "sube" : "baja"}">
            <i class="fa-solid fa-arrow-${sube ? "up" : "down"}"></i> ${Math.abs(cambio).toFixed(0)}${esTasa ? " pts" : "%"}</span>
            <span class="variacion-texto">vs. ${dias} días previos</span>`
    }

    const tarjeta = (titulo, valor, detalle) => `
        <div class="col"><div class="indicador">
            <div class="indicador-titulo">${titulo}</div>
            <div class="indicador-valor">${valor}</div>
            <div class="indicador-detalle">${detalle}</div>
        </div></div>`

    /* ---------- Dibujo completo según el período ---------- */
    const dibujar = () => {
        const hasta = new Date(hoy.getTime() + DIA)                     // incluye hoy
        const desde = dias ? new Date(hasta.getTime() - dias * DIA) : null
        const desdePrevio = dias ? new Date(desde.getTime() - dias * DIA) : null
        const actual = entre(filas, desde, hasta)
        const previo = dias ? entre(filas, desdePrevio, desde) : []
        const solicActual = entre(solicitudes, desde, hasta)
        const r = resumir(actual), p = resumir(previo)

        textoPeriodo.textContent = dias ?
            `Del ${fechaCorta(desde)} al ${fechaCorta(hoy)} · comparado con los ${dias} días anteriores` :
            "Todo el historial de ventas pagadas"

        /* Totales */
        tarjetasTotales.innerHTML =
            tarjeta("Ventas", soles(r.ventas), variacion(r.ventas, p.ventas)) +
            tarjeta("Margen bruto", `${r.pctMargen.toFixed(0)}%`, `${soles(r.margen)} · ` + (dias ? variacion(r.pctMargen, p.pctMargen, true) : "")) +
            tarjeta("Pedidos", r.pedidos, variacion(r.pedidos, p.pedidos)) +
            tarjeta("Ticket promedio", soles(r.ticket), variacion(r.ticket, p.ticket)) +
            tarjeta("Ventas mayoristas", `${r.pctMayorista.toFixed(0)}%`, `${soles(r.mayorista)} · ` + (dias ? variacion(r.pctMayorista, p.pctMayorista, true) : ""))

        avisoIndicadores.innerHTML = r.pedidos === 0 ?
            `<div class="alert alert-light border">No hay ventas pagadas en este período. Prueba con un período más largo.</div>` : ""

        dibujarSedes(actual, previo)
        const ranking = dibujarAsesores(actual, solicActual)
        dibujarTendencia(actual, desde, hasta)
        dibujarInsights(r, p, actual, previo, ranking)
    }

    /* ---------- Ventas por sede ---------- */
    const dibujarSedes = (actual, previo) => {
        const nombres = [...new Set(filas.map(f => f.sede))]
        const datos = nombres.map(sede => {
            const a = resumir(actual.filter(f => f.sede === sede)), b = resumir(previo.filter(f => f.sede === sede))
            return { sede, ...a, anterior: b.ventas }
        }).sort((x, y) => y.ventas - x.ventas)
        const total = datos.reduce((s, d) => s + d.ventas, 0), maximo = Math.max(...datos.map(d => d.ventas), 1)
        ventasSedes.innerHTML = datos.map(d => `
            <div class="sede-fila">
                <div class="d-flex justify-content-between align-items-baseline">
                    <span class="fw-semibold">${escaparHTML(d.sede)} <small class="text-body-secondary fw-normal">${porcentaje(d.ventas, total).toFixed(0)}%</small></span>
                    <span class="fw-bold">${soles(d.ventas)}</span>
                </div>
                <div class="barra"><span style="width: ${d.ventas / maximo * 100}%"></span></div>
                <div class="d-flex justify-content-between small text-body-secondary">
                    <span>${d.pedidos} pedidos · margen ${d.pctMargen.toFixed(0)}%</span>
                    <span>${variacion(d.ventas, d.anterior).replace(/<span class="variacion-texto">.*?<\/span>/s, "")}</span>
                </div>
            </div>`).join("")
    }

    /* ---------- Asesores: ventas, conversión y ticket ---------- */
    const dibujarAsesores = (actual, solicActual) => {
        const ranking = asesores.map(a => {
            const suyas = actual.filter(f => f.idasesor === a.idasesor)
            const ventas = sumar(suyas, "ventas"), pedidos = sumar(suyas, "pedidos")
            const solic = solicActual.filter(s => s.idasesor === a.idasesor).length
            return { ...a, ventas, pedidos, solic, conversion: solic ? Math.min(pedidos / solic * 100, 100) : null,   // tope 100%: puede haber pedidos sin solicitud previa
                     ticket: pedidos ? ventas / pedidos : 0 }
        }).sort((x, y) => y.ventas - x.ventas)
        const maximo = Math.max(...ranking.map(a => a.ventas), 1)

        // Conversión con estado (ícono + texto, no solo color)
        const estadoConversion = (c) => c === null ? `<span class="text-body-secondary">—</span>` :
            c >= 70 ? `<span class="estado-kpi bueno"><i class="fa-solid fa-circle-check"></i> ${c.toFixed(0)}%</span>` :
            c >= 40 ? `<span class="estado-kpi medio"><i class="fa-solid fa-circle-minus"></i> ${c.toFixed(0)}%</span>` :
                      `<span class="estado-kpi bajo"><i class="fa-solid fa-triangle-exclamation"></i> ${c.toFixed(0)}%</span>`

        tbodyRanking.innerHTML = ranking.map((a, i) => `
            <tr>
                <td class="text-center text-body-secondary">${i + 1}</td>
                <td class="fw-semibold text-nowrap">${escaparHTML(a.nombre)}</td>
                <td class="text-nowrap text-body-secondary">${escaparHTML(a.sede)}</td>
                <td class="text-end">${a.solic}</td>
                <td class="text-end">${a.pedidos}</td>
                <td class="text-end text-nowrap">${estadoConversion(a.conversion)}</td>
                <td class="text-end text-nowrap">${a.pedidos ? soles(a.ticket) : "—"}</td>
                <td class="text-end text-nowrap fw-semibold">${soles(a.ventas)}</td>
                <td class="col-barra"><div class="barra"><span style="width: ${a.ventas / maximo * 100}%"></span></div></td>
            </tr>`).join("")
        return ranking
    }

    /* ---------- Gráfico: barras apiladas minorista + mayorista por día o semana ---------- */
    const dibujarTendencia = (actual, desde, hasta) => {
        // Agrupación: por día hasta 31 días; por semana si el período es más largo
        const inicio = desde || (actual.length ? new Date(Math.min(...actual.map(f => aFecha(f.fecha)))) : hoy)
        const totalDias = Math.round((hasta - inicio) / DIA)
        const tamano = totalDias <= 31 ? 1 : 7
        const grupos = []
        for (let t = inicio.getTime(); t < hasta.getTime(); t += tamano * DIA) {
            const g = { desde: new Date(t), hasta: new Date(Math.min(t + tamano * DIA, hasta.getTime())), minorista: 0, mayorista: 0 }
            entre(actual, g.desde, g.hasta).forEach(f => g[f.tipo] += Number(f.ventas))
            grupos.push(g)
        }
        const etiqueta = (g) => tamano === 1 ? fechaCorta(g.desde) : `Sem. ${fechaCorta(g.desde)}`

        // Leyenda (2 series)
        leyendaTendencia.innerHTML = SERIES.map(s => `<span><i style="background:${s.color}"></i>${s.nombre}</span>`).join("") +
            `<span class="text-body-secondary">${tamano === 1 ? "por día" : "por semana"}</span>`

        // Tabla (vista alternativa)
        tablaTendencia.innerHTML = `<table class="table table-sm tabla-compacta mb-0"><thead><tr>
            <th>${tamano === 1 ? "Día" : "Semana desde"}</th><th class="text-end">Minorista</th><th class="text-end">Mayorista</th><th class="text-end">Total</th></tr></thead>
            <tbody>${grupos.map(g => `<tr><td>${etiqueta(g)}</td><td class="text-end">${soles(g.minorista)}</td>
                <td class="text-end">${soles(g.mayorista)}</td><td class="text-end fw-semibold">${soles(g.minorista + g.mayorista)}</td></tr>`).join("")}</tbody></table>`

        // SVG
        const W = 640, H = 300, M = { arriba: 12, derecha: 8, abajo: 26, izquierda: 52 }
        const anchoUtil = W - M.izquierda - M.derecha, altoUtil = H - M.arriba - M.abajo
        const maximo = Math.max(...grupos.map(g => g.minorista + g.mayorista), 1)
        const paso = (() => { const crudo = maximo / 4, base = 10 ** Math.floor(Math.log10(crudo)); return [1, 2, 2.5, 5, 10].map(x => x * base).find(x => x >= crudo) })()
        const tope = paso * Math.ceil(maximo / paso)
        const y = (v) => M.arriba + altoUtil - v / tope * altoUtil
        const anchoGrupo = anchoUtil / grupos.length
        const anchoBarra = Math.max(Math.min(anchoGrupo * 0.62, 34), 3)
        const cadaEtiqueta = Math.ceil(grupos.length / 8)        // como máximo ~8 etiquetas en el eje X

        let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ventas minoristas y mayoristas ${tamano === 1 ? "por día" : "por semana"}">`
        for (let v = 0; v <= tope; v += paso) {
            svg += `<line x1="${M.izquierda}" x2="${W - M.derecha}" y1="${y(v)}" y2="${y(v)}" class="grilla"/>
                    <text x="${M.izquierda - 8}" y="${y(v) + 4}" class="eje" text-anchor="end">${v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k" : v}</text>`
        }
        grupos.forEach((g, i) => {
            const x = M.izquierda + i * anchoGrupo + (anchoGrupo - anchoBarra) / 2
            let base = 0
            SERIES.forEach((s, j) => {
                const valor = g[s.clave]
                if (valor > 0) {
                    const alto = valor / tope * altoUtil
                    const yTop = y(base + valor)
                    const esUltima = j === SERIES.length - 1 || g[SERIES[j + 1].clave] === 0
                    // esquinas redondeadas solo arriba del segmento superior
                    const hueco = esUltima ? 0 : 2   // 2px de fondo entre este segmento y el de arriba
                    svg += `<rect x="${x}" y="${yTop + hueco}" width="${anchoBarra}" height="${Math.max(alto - hueco, 1)}"
                        rx="${esUltima ? Math.min(4, anchoBarra / 2) : 0}" fill="${s.color}" class="segmento"/>`
                    base += valor
                }
            })
            // zona de hover: toda la columna (más grande que la barra)
            svg += `<rect x="${M.izquierda + i * anchoGrupo}" y="${M.arriba}" width="${anchoGrupo}" height="${altoUtil}" class="zona-hover" data-i="${i}" tabindex="0"/>`
            if (i % cadaEtiqueta === 0) {
                svg += `<text x="${M.izquierda + i * anchoGrupo + anchoGrupo / 2}" y="${H - 8}" class="eje" text-anchor="middle">${etiqueta(g)}</text>`
            }
        })
        svg += `</svg><div class="tooltip-grafico" hidden></div>`
        graficoTendencia.innerHTML = svg

        // Tooltip: valor primero, nombre de la serie después
        const tooltip = graficoTendencia.querySelector(".tooltip-grafico")
        const mostrar = (zona) => {
            const g = grupos[zona.dataset.i]
            tooltip.innerHTML = `<div class="titulo"></div>` + SERIES.map(s =>
                `<div class="fila"><i style="background:${s.color}"></i><strong>${soles(g[s.clave])}</strong> <span>${s.nombre}</span></div>`).join("") +
                `<div class="fila total"><strong>${soles(g.minorista + g.mayorista)}</strong> <span>Total</span></div>`
            tooltip.querySelector(".titulo").textContent = etiqueta(g)
            tooltip.hidden = false
            const caja = zona.getBoundingClientRect(), contenedor = graficoTendencia.getBoundingClientRect()
            const izquierda = caja.left - contenedor.left + caja.width / 2
            tooltip.style.left = Math.min(Math.max(izquierda, 70), contenedor.width - 70) + "px"
            graficoTendencia.querySelectorAll(".zona-hover").forEach(z => z.classList.toggle("activa", z === zona))
        }
        graficoTendencia.querySelectorAll(".zona-hover").forEach(z => {
            z.addEventListener("pointerenter", () => mostrar(z))
            z.addEventListener("focus", () => mostrar(z))
        })
        graficoTendencia.querySelector("svg").addEventListener("pointerleave", () => {
            tooltip.hidden = true
            graficoTendencia.querySelectorAll(".zona-hover").forEach(z => z.classList.remove("activa"))
        })
    }

    btnVerTabla.addEventListener("click", () => {
        const verTabla = tablaTendencia.hidden
        tablaTendencia.hidden = !verTabla
        graficoTendencia.hidden = verTabla
        btnVerTabla.textContent = verTabla ? "Ver gráfico" : "Ver tabla"
    })

    /* ---------- Insights: frases calculadas a partir de los datos ---------- */
    const dibujarInsights = (r, p, actual, previo, ranking) => {
        const insights = []   // { tipo: bueno | atencion | alerta | info, icono, texto }
        if (r.pedidos === 0) {
            listaInsights.innerHTML = `<li class="info"><i class="fa-solid fa-circle-info"></i><span>Sin ventas en el período.</span></li>`
            return
        }

        // 1. Tendencia de ventas
        if (dias && p.ventas) {
            const cambio = (r.ventas - p.ventas) / p.ventas * 100
            insights.push(cambio >= 0 ?
                { tipo: "bueno", icono: "fa-arrow-trend-up", texto: `Las ventas <strong>crecieron ${cambio.toFixed(0)}%</strong> frente a los ${dias} días anteriores (${soles(r.ventas)}).` } :
                { tipo: "alerta", icono: "fa-arrow-trend-down", texto: `Las ventas <strong>cayeron ${Math.abs(cambio).toFixed(0)}%</strong> frente a los ${dias} días anteriores.` })
        }

        // 2. Sede líder y sede con mayor caída
        const porSede = [...new Set(actual.map(f => f.sede))].map(sede => ({
            sede, ventas: sumar(actual.filter(f => f.sede === sede), "ventas"), antes: sumar(previo.filter(f => f.sede === sede), "ventas") }))
            .sort((a, b) => b.ventas - a.ventas)
        if (porSede.length) {
            insights.push({ tipo: "info", icono: "fa-store", texto: `<strong>${escaparHTML(porSede[0].sede)}</strong> lidera con el ${porcentaje(porSede[0].ventas, r.ventas).toFixed(0)}% de las ventas.` })
            const cayo = porSede.filter(s => s.antes > 0).map(s => ({ ...s, cambio: (s.ventas - s.antes) / s.antes * 100 })).sort((a, b) => a.cambio - b.cambio)[0]
            if (dias && cayo && cayo.cambio <= -10) {
                insights.push({ tipo: "atencion", icono: "fa-location-dot", texto: `<strong>${escaparHTML(cayo.sede)}</strong> bajó ${Math.abs(cayo.cambio).toFixed(0)}% respecto al período anterior: revisar su equipo y stock.` })
            }
        }

        // 3. Dependencia del canal mayorista
        if (r.pctMayorista >= 75) {
            insights.push({ tipo: "atencion", icono: "fa-scale-unbalanced", texto: `El <strong>${r.pctMayorista.toFixed(0)}% de las ventas es mayorista</strong>: alta dependencia de pocos clientes; conviene impulsar la venta minorista.` })
        } else if (r.pctMayorista <= 25) {
            insights.push({ tipo: "info", icono: "fa-boxes-stacked", texto: `Solo el ${r.pctMayorista.toFixed(0)}% es mayorista: hay espacio para crecer con negocios.` })
        }

        // 4. Concentración en el mejor asesor
        const ventasAsesores = ranking.reduce((s, a) => s + a.ventas, 0)
        if (ranking[0] && ranking[0].ventas > 0) {
            const peso = porcentaje(ranking[0].ventas, ventasAsesores)
            insights.push({ tipo: peso >= 35 ? "atencion" : "bueno", icono: "fa-user-tie",
                texto: `<strong>${escaparHTML(ranking[0].nombre)}</strong> es el asesor con más ventas (${peso.toFixed(0)}% del canal mayorista)` +
                       (peso >= 35 ? ": riesgo de concentración en una sola persona." : ".") })
        }

        // 5. Conversión baja (con al menos 3 solicitudes)
        const bajaConversion = ranking.filter(a => a.solic >= 3 && a.conversion !== null && a.conversion < 50).sort((a, b) => a.conversion - b.conversion)[0]
        if (bajaConversion) {
            insights.push({ tipo: "alerta", icono: "fa-filter", texto: `<strong>${escaparHTML(bajaConversion.nombre)}</strong> convierte solo el ${bajaConversion.conversion.toFixed(0)}% de sus ${bajaConversion.solic} solicitudes en pedidos.` })
        }

        // 6. Margen
        insights.push(r.pctMargen >= 30 ?
            { tipo: "bueno", icono: "fa-coins", texto: `Margen bruto saludable de <strong>${r.pctMargen.toFixed(0)}%</strong>.` } :
            { tipo: "atencion", icono: "fa-coins", texto: `Margen bruto de <strong>${r.pctMargen.toFixed(0)}%</strong>: revisar descuentos y costos.` })

        // 7. Stock
        const agotados = reponer.filter(x => x.stock === 0).length
        if (reponer.length) {
            insights.push({ tipo: agotados ? "alerta" : "atencion", icono: "fa-box-open",
                texto: `<strong>${reponer.length} productos por reponer</strong>${agotados ? `, ${agotados} agotado(s)` : ""}: ventas en riesgo.` })
        }

        const etiquetas = { bueno: "Bien", atencion: "Atención", alerta: "Alerta", info: "Dato" }
        listaInsights.innerHTML = insights.map(i => `
            <li class="${i.tipo}"><i class="fa-solid ${i.icono}" aria-hidden="true"></i>
                <span><em>${etiquetas[i.tipo]}</em>${i.texto}</span></li>`).join("")
    }

    /* ---------- Reposición priorizada ---------- */
    const dibujarReponer = () => {
        const urgencia = (p) => p.stock === 0 ? { orden: 0, html: `<span class="estado-kpi bajo"><i class="fa-solid fa-circle-xmark"></i> Agotado</span>` } :
            p.stock <= p.stock_minimo * 0.25 ? { orden: 1, html: `<span class="estado-kpi bajo"><i class="fa-solid fa-triangle-exclamation"></i> Urgente</span>` } :
            { orden: 2, html: `<span class="estado-kpi medio"><i class="fa-solid fa-clock"></i> Pronto</span>` }
        const lista = reponer.map(p => ({ ...p, u: urgencia(p) })).sort((a, b) => a.u.orden - b.u.orden || a.stock - b.stock)
        cantidadReponer.textContent = `(${lista.length})`
        tbodyReponer.innerHTML = lista.length === 0 ?
            `<tr><td colspan="7" class="text-center text-body-secondary">Todo el stock está sobre el mínimo</td></tr>` :
            lista.map(p => `
            <tr>
                <td class="text-nowrap">${p.u.html}</td>
                <td>${escaparHTML(p.nombre)}</td>
                <td class="text-end fw-bold">${p.stock}</td>
                <td class="text-end text-body-secondary">${p.stock_minimo}</td>
                <td>${p.nombreempresa ? escaparHTML(p.nombreempresa) : `<span class="text-body-secondary">Sin proveedor</span>`}
                    <small class="text-body-secondary">${escaparHTML(p.pais || "")}</small></td>
                <td>${escaparHTML(p.nombrecontacto || "")}</td>
                <td class="text-nowrap">${escaparHTML(p.telefono || "")}</td>
            </tr>`).join("")
    }

    /* ---------- Eventos y carga ---------- */
    filtroPeriodo.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
        filtroPeriodo.querySelectorAll("button").forEach(x => x.classList.toggle("activo", x === b))
        dias = Number(b.dataset.dias)
        dibujar()
    }))

    Promise.all([
        obtenerDatos(db.rpc("indicadores_diarios")),
        obtenerDatos(db.from("solicitudes_mayoristas").select("fecha, idasesor")),
        obtenerDatos(db.from("asesores").select("idasesor, nombres, apellidos, directores(sedes(nombre))")),
        obtenerDatos(db.from("productos_por_reponer").select("*"))
    ])
        .then(([datos, solic, listaAsesores, porReponer]) => {
            filas = datos
            solicitudes = solic
            asesores = listaAsesores.map(a => ({ idasesor: a.idasesor, nombre: a.nombres + " " + a.apellidos, sede: a.directores.sedes.nombre }))
            reponer = porReponer
            dibujarReponer()
            dibujar()
        })
        .catch(error => {
            console.error(error)
            avisoIndicadores.innerHTML = mensajeError(error && error.code === "PGRST202" ?
                "Falta crear la función indicadores_diarios en Supabase (ejecuta supabase/04_indicadores_diarios.sql)." :
                "No se pudieron cargar los indicadores.")
        })
})()
