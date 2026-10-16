(() => {
    const tbody = document.getElementById("tbody-pedidos-admin")
    const filtroEstado = document.getElementById("filtro-estado-admin")
    const resumen = document.getElementById("resumen-pedidos-admin")
    const aviso = document.getElementById("aviso-pedidos-admin")

    const kpis = document.getElementById("kpis-pedidos")
    const insight = document.getElementById("insight-pedidos")
    const leyendaDespacho = document.getElementById("leyenda-despacho")
    const graficoDespacho = document.getElementById("grafico-despacho")
    const metodosPago = document.getElementById("metodos-pago")

    let pedidos = []
    let estadoElegido = null            // al cargar se elige lo más urgente (ver elegirFiltroInicial)

    const DIAS_ALERTA = 2               // un pedido registrado hace más de 2 días ya debería haberse entregado
    // Dos series (par validado de la paleta de referencia): recojo / delivery y tarjeta / yape
    const AZUL = "#2a78d6", NARANJA = "#eb6834"
    const DIA = 24 * 60 * 60 * 1000
    const dias = (p) => Math.floor((Date.now() - new Date(p.fecha)) / DIA)
    const fecha = (texto) => new Date(texto).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })
    const pendientesDeAccion = ["por_cotizar", "cotizado", "registrado"]

    /* "3 días" con alerta si el pedido aún requiere acción; la fecha debajo */
    const espera = (p) => {
        const d = dias(p)
        const texto = d === 0 ? "Hoy" : d === 1 ? "1 día" : `${d} días`
        if (!pendientesDeAccion.includes(p.estado)) return `<span class="text-body-secondary small">${fecha(p.fecha)}</span>`
        return (d > DIAS_ALERTA ? `<span class="estado-kpi bajo"><i class="fa-solid fa-triangle-exclamation"></i> ${texto}</span>` :
            `<span class="estado-kpi bueno"><i class="fa-regular fa-clock"></i> ${texto}</span>`) +
            `<br><small class="text-body-secondary">${fecha(p.fecha)}</small>`
    }

    const elegirFiltroInicial = () => {
        const hay = (e) => pedidos.some(p => p.estado === e)
        estadoElegido = hay("por_cotizar") ? "por_cotizar" : hay("registrado") ? "registrado" : "todos"
    }

    /* ---------- Indicadores e insight ---------- */
    const dibujarResumen = () => {
        const registrados = pedidos.filter(p => p.estado === "registrado")
        const porCotizar = pedidos.filter(p => p.estado === "por_cotizar")
        const porPagar = pedidos.filter(p => p.estado === "cotizado")
        const entregados = pedidos.filter(p => p.estado === "entregado")
        const validos = pedidos.filter(p => p.estado !== "anulado")
        const atrasados = registrados.filter(p => dias(p) > DIAS_ALERTA)
        const montoPorAtender = registrados.reduce((t, p) => t + Number(p.total), 0)
        const tasaEntrega = validos.length ? entregados.length / validos.length * 100 : 0
        const masAntiguo = registrados.slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0]
        const tarjeta = (titulo, valor, detalle) => `
            <div class="col"><div class="indicador">
                <div class="indicador-titulo">${titulo}</div>
                <div class="indicador-valor">${valor}</div>
                <div class="indicador-detalle">${detalle}</div>
            </div></div>`
        kpis.innerHTML =
            tarjeta("Por despachar", registrados.length, `${soles(montoPorAtender)} en mercadería`) +
            tarjeta("Atrasados", atrasados.length, atrasados.length ?
                `<span class="estado-kpi bajo"><i class="fa-solid fa-triangle-exclamation"></i> más de ${DIAS_ALERTA} días sin entregar</span>` :
                `<span class="estado-kpi bueno"><i class="fa-solid fa-circle-check"></i> Todo a tiempo</span>`) +
            tarjeta("Envíos por cotizar / pagar", `${porCotizar.length} / ${porPagar.length}`,
                porCotizar.length ? `<span class="estado-kpi medio"><i class="fa-solid fa-circle-minus"></i> Cotiza para que el cliente pague</span>` : "Sin cotizaciones pendientes") +
            tarjeta("Pedidos entregados", `${tasaEntrega.toFixed(0)}%`, `${entregados.length} de ${validos.length} pedidos válidos`)

        const deliveries = registrados.filter(p => p.entrega === "delivery").length
        if (porCotizar.length) {
            insight.innerHTML = `<div class="insight-principal atencion"><i class="fa-solid fa-calculator"></i><span><em>Atención</em>
                Hay <strong>${porCotizar.length} envío(s) por cotizar</strong>: el cliente no puede pagar hasta que los cotices.
                ${registrados.length ? ` Además, ${registrados.length} pedidos esperan despacho.` : ""}</span></div>`
        } else if (registrados.length) {
            insight.innerHTML = `<div class="insight-principal ${atrasados.length ? "alerta" : "bueno"}">
                <i class="fa-solid fa-${atrasados.length ? "triangle-exclamation" : "truck-fast"}"></i><span><em>${atrasados.length ? "Alerta" : "Al día"}</em>
                <strong>${registrados.length} pedidos por despachar</strong> (${deliveries} delivery, ${registrados.length - deliveries} recojo).
                El más antiguo (N° ${masAntiguo.idpedido}, ${escaparHTML(masAntiguo.sedes ? masAntiguo.sedes.nombre : "")}) espera <strong>${dias(masAntiguo)} días</strong>.
                ${atrasados.length ? ` <strong>${atrasados.length}</strong> superan los ${DIAS_ALERTA} días.` : ""}</span></div>`
        } else {
            insight.innerHTML = `<div class="insight-principal bueno"><i class="fa-solid fa-circle-check"></i><span><em>Bien</em>
                No hay pedidos por despachar ni envíos por cotizar.</span></div>`
        }
        dibujarDespacho(registrados)
        dibujarPagos()
    }

    /* ---------- Gráfico: por despachar por sede (recojo + delivery apilados) ---------- */
    const dibujarDespacho = (registrados) => {
        leyendaDespacho.innerHTML = `<span><i style="background:${AZUL}"></i>Recojo en sede</span><span><i style="background:${NARANJA}"></i>Delivery</span>`
        const nombreSede = (p) => p.sedes ? p.sedes.nombre : "—"
        const sedes = [...new Set(pedidos.map(nombreSede))]
        const datos = sedes.map(sede => {
            const suyos = registrados.filter(p => nombreSede(p) === sede)
            return { sede, recojo: suyos.filter(p => p.entrega !== "delivery").length, delivery: suyos.filter(p => p.entrega === "delivery").length,
                     atrasados: suyos.filter(p => dias(p) > DIAS_ALERTA).length }
        }).sort((a, b) => (b.recojo + b.delivery) - (a.recojo + a.delivery))
        const maximo = Math.max(...datos.map(d => d.recojo + d.delivery), 1)
        const W = 640, izquierda = 110, derecha = 60, alto = 40, H = datos.length * alto + 6
        const escala = (v) => v / maximo * (W - izquierda - derecha)
        let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Pedidos por despachar por sede">`
        datos.forEach((d, i) => {
            const y = i * alto + 3, total = d.recojo + d.delivery
            const anchoRecojo = escala(d.recojo), anchoDelivery = escala(d.delivery)
            svg += `<text x="${izquierda - 10}" y="${y + alto / 2}" class="eje-nombre" text-anchor="end" dominant-baseline="middle"></text>`
            // 2px de fondo entre recojo y delivery; esquina redondeada al final de la barra
            if (d.recojo) svg += `<rect x="${izquierda}" y="${y + 9}" width="${Math.max(anchoRecojo - (d.delivery ? 2 : 0), 2)}" height="${alto - 18}" rx="${d.delivery ? 0 : 4}" fill="${AZUL}"/>`
            if (d.delivery) svg += `<rect x="${izquierda + anchoRecojo}" y="${y + 9}" width="${Math.max(anchoDelivery, 2)}" height="${alto - 18}" rx="4" fill="${NARANJA}"/>`
            svg += `<text x="${izquierda + escala(total) + 8}" y="${y + alto / 2}" class="valor" dominant-baseline="middle">${total}${d.atrasados ? " ⚠" : ""}</text>
                <rect x="0" y="${y}" width="${W}" height="${alto}" class="zona-hover" data-i="${i}" tabindex="0"/>`
        })
        svg += `</svg><div class="tooltip-grafico" hidden></div>`
        graficoDespacho.innerHTML = svg
        graficoDespacho.querySelectorAll(".eje-nombre").forEach((t, i) => t.textContent = datos[i].sede)

        const tooltip = graficoDespacho.querySelector(".tooltip-grafico")
        graficoDespacho.querySelectorAll(".zona-hover").forEach(z => {
            const mostrar = () => {
                const d = datos[z.dataset.i]
                tooltip.innerHTML = `<div class="titulo"></div>
                    <div class="fila"><i style="background:${AZUL}"></i><strong>${d.recojo}</strong> <span>recojo</span></div>
                    <div class="fila"><i style="background:${NARANJA}"></i><strong>${d.delivery}</strong> <span>delivery</span></div>
                    <div class="fila total"><strong>${d.atrasados}</strong> <span>atrasados</span></div>`
                tooltip.querySelector(".titulo").textContent = d.sede
                tooltip.hidden = false
                const caja = z.getBoundingClientRect(), cont = graficoDespacho.getBoundingClientRect()
                tooltip.style.left = Math.min(cont.width - 90, 300) + "px"
                tooltip.style.top = (caja.top - cont.top + caja.height) + "px"
                graficoDespacho.querySelectorAll(".zona-hover").forEach(x => x.classList.toggle("activa", x === z))
            }
            z.addEventListener("pointerenter", mostrar)
            z.addEventListener("focus", mostrar)
        })
        graficoDespacho.querySelector("svg").addEventListener("pointerleave", () => {
            tooltip.hidden = true
            graficoDespacho.querySelectorAll(".zona-hover").forEach(x => x.classList.remove("activa"))
        })
    }

    /* ---------- Métodos de pago (barra 100%) ---------- */
    const dibujarPagos = () => {
        const pagados = pedidos.filter(p => p.pago_estado === "pagado" && p.estado !== "anulado")
        const tarjeta = pagados.filter(p => p.metodo_pago === "tarjeta"), yape = pagados.filter(p => p.metodo_pago === "yape")
        const pct = (l) => pagados.length ? l.length / pagados.length * 100 : 0
        const monto = (l) => soles(l.reduce((t, p) => t + Number(p.total), 0))
        metodosPago.innerHTML = !pagados.length ? `<p class="small text-body-secondary mb-0">Aún no hay pagos.</p>` : `
            <div class="barra-100" role="img" aria-label="Tarjeta ${pct(tarjeta).toFixed(0)}%, Yape ${pct(yape).toFixed(0)}%">
                <span style="width:${pct(tarjeta)}%; background:${AZUL}"></span><span style="width:${pct(yape)}%; background:${NARANJA}"></span>
            </div>
            <div class="metodo"><i style="background:${AZUL}"></i><span><strong>${pct(tarjeta).toFixed(0)}%</strong> Tarjeta</span>
                <small>${tarjeta.length} pedidos · ${monto(tarjeta)}</small></div>
            <div class="metodo"><i style="background:${NARANJA}"></i><span><strong>${pct(yape).toFixed(0)}%</strong> Yape</span>
                <small>${yape.length} pedidos · ${monto(yape)}</small></div>`
    }

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
        // Estados que requieren acción: los más antiguos primero. Historial: los más recientes primero.
        const urgente = pendientesDeAccion.includes(estadoElegido)
        const visibles = pedidos.filter(p => estadoElegido === "todos" || p.estado === estadoElegido)
            .sort((a, b) => urgente ? new Date(a.fecha) - new Date(b.fecha) : new Date(b.fecha) - new Date(a.fecha))
        resumen.textContent = `${visibles.length} pedido(s)`
        tbody.innerHTML = visibles.length === 0 ?
            `<tr><td colspan="9" class="text-center text-body-secondary py-4">No hay pedidos en este estado</td></tr>` :
            visibles.map(p => {
                const estado = ESTADOS_PEDIDO[p.estado] || { texto: p.estado, clase: "" }
                return `<tr>
                    <td class="fw-semibold">${p.idpedido}</td>
                    <td class="text-nowrap">${espera(p)}</td>
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
            .then(data => {
                pedidos = data
                if (!estadoElegido) elegirFiltroInicial()
                dibujarResumen()
                dibujar()
            })
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
