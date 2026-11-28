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

    /* ---------- Estado del sistema (Integrante 5) ----------
       Cada chequeo prueba en vivo un servicio del que depende la tienda y mide cuánto tarda.
       Se usa db directamente (no obtenerDatos) para que un chequeo fallido no llene el registro de errores. */
    const chequeosSistema = document.getElementById("chequeos-sistema")
    const resumenSistema = document.getElementById("resumen-sistema")
    const tbodyEventos = document.getElementById("tbody-eventos")
    const txtOrigenEventos = document.getElementById("txt-origen-eventos")

    const LENTO_MS = 1500
    const conTiempo = (promesa) => {
        const inicio = performance.now()
        return Promise.resolve(promesa).then(r => ({ ...r, ms: Math.round(performance.now() - inicio) }))
    }
    const respuestaDb = ({ data, error, count, ms }) => error ? { ok: false, texto: error.message, ms } : { ok: true, data, count, ms }

    const CHEQUEOS = [
        { nombre: "Base de datos (API REST)", icono: "fa-database",
          probar: () => conTiempo(db.from("productos").select("idproducto", { count: "exact", head: true })).then(respuestaDb)
            .then(r => r.ok ? { ...r, texto: `${r.count} productos en el catálogo` } : r) },
        { nombre: "Inicio de sesión (Auth)", icono: "fa-user-shield",
          probar: () => conTiempo(db.auth.getUser()).then(({ data, error, ms }) => error || !data.user ?
            { ok: false, texto: "No hay sesión válida", ms } :
            { ok: true, texto: `${data.user.email} · rol ${usuarioActual.rol}`, ms }) },
        { nombre: "Permisos por rol (RLS)", icono: "fa-lock",
          probar: () => conTiempo(db.from("proveedores").select("idproveedor")).then(respuestaDb)
            .then(r => !r.ok ? r : r.data.length > 0 ? { ...r, texto: `El admin ve ${r.data.length} proveedores (un cliente no ve ninguno)` } :
                { ok: false, texto: "El admin no ve proveedores: revisar perfiles.rol", ms: r.ms }) },
        { nombre: "Funciones de la base (RPC)", icono: "fa-gears",
          probar: () => conTiempo(db.rpc("indicadores_diarios")).then(respuestaDb)
            .then(r => r.ok ? { ...r, texto: `indicadores_diarios: ${r.data.length} días con ventas` } : r) },
        { nombre: "Mapa de sedes (OpenStreetMap)", icono: "fa-map-location-dot",
          probar: () => new Promise(resolver => {
            const inicio = performance.now()
            const img = new Image()
            const fin = (ok) => resolver({ ok, ms: Math.round(performance.now() - inicio),
                texto: ok ? "Las imágenes del mapa cargan" : "No se pudo descargar el mapa" })
            img.onload = () => fin(true)
            img.onerror = () => fin(false)
            img.src = "https://tile.openstreetmap.org/11/604/1088.png?t=" + Date.now()
          }) },
        { nombre: "Registro de errores", icono: "fa-bug",
          probar: () => conTiempo(db.from("registro_eventos").select("id").limit(1)).then(respuestaDb)
            .then(r => r.ok ? { ...r, texto: "Tabla registro_eventos activa" } :
                { ok: null, ms: r.ms, texto: "Falta ejecutar supabase/06_monitoreo.sql (se usa el registro local)" }) }
    ]

    const tarjetaChequeo = (c, r) => {
        const estado = r.ok === false ? ["danger", "fa-circle-xmark", "Falla"] :
            r.ok === null ? ["secondary", "fa-circle-minus", "Opcional"] :
            r.ms > LENTO_MS ? ["warning", "fa-circle-exclamation", "Lento"] : ["success", "fa-circle-check", "En línea"]
        return `
        <div class="col">
            <div class="card h-100 chequeo-sistema border-${estado[0]}">
                <div class="card-body d-flex gap-3">
                    <i class="fa-solid ${c.icono} fa-lg text-body-secondary mt-1"></i>
                    <div class="flex-grow-1 min-w-0">
                        <div class="d-flex justify-content-between gap-2">
                            <strong>${c.nombre}</strong>
                            <span class="text-${estado[0]} text-nowrap small"><i class="fa-solid ${estado[1]}"></i> ${estado[2]}</span>
                        </div>
                        <div class="small text-body-secondary text-break">${escaparHTML(r.texto || "")}</div>
                        <div class="small">${r.ms !== undefined ? r.ms + " ms" : ""}</div>
                    </div>
                </div>
            </div>
        </div>`
    }

    const diagnosticar = () => {
        chequeosSistema.innerHTML = CHEQUEOS.map(c => tarjetaChequeo(c, { ok: true, texto: "Probando…" })).join("")
        return Promise.all(CHEQUEOS.map(c => c.probar().catch(error => ({ ok: false, texto: error.message }))))
            .then(resultados => {
                chequeosSistema.innerHTML = CHEQUEOS.map((c, i) => tarjetaChequeo(c, resultados[i])).join("")
                return db.rpc("estado_sistema")
            })
            .then(({ data, error }) => {
                if (error || !data) { resumenSistema.innerHTML = ""; return }
                const dato = (texto, valor) => `<span class="badge rounded-pill text-bg-light border">${texto}: <strong>${escaparHTML(String(valor))}</strong></span>`
                resumenSistema.innerHTML =
                    dato("Tamaño de la base", data.tamano_base) + dato("Clientes", data.clientes) +
                    dato("Asesores con cuenta", data.asesores_con_cuenta) + dato("Administradores", data.administradores) +
                    dato("Pedidos hoy", data.pedidos_hoy) + dato("Pedidos en total", data.pedidos_total) +
                    dato("Errores en 24 h", data.errores_24h)
            })
    }

    /* Errores registrados: de la base si existe registro_eventos; si no, los de este navegador */
    const cargarEventos = () => db.from("registro_eventos").select("fecha, tipo, pagina, mensaje, detalle")
        .order("fecha", { ascending: false }).limit(20)
        .then(({ data, error }) => {
            const eventos = error ? leerRegistroLocal().slice(0, 20) : data
            txtOrigenEventos.textContent = error ? "Solo este navegador (falta 06_monitoreo.sql)" : "Últimos 20 de todos los visitantes"
            tbodyEventos.innerHTML = eventos.length === 0 ?
                `<tr><td colspan="4" class="text-center text-body-secondary py-4">Sin errores registrados</td></tr>` :
                eventos.map(e => `<tr>
                    <td class="text-nowrap">${fecha(e.fecha)}</td>
                    <td><span class="badge ${e.tipo === "aviso" ? "text-bg-secondary" : "text-bg-danger"}">${e.tipo === "error_api" ? "Base de datos" : e.tipo === "error" ? "Página" : "Aviso"}</span></td>
                    <td>${escaparHTML(e.pagina || "")}</td>
                    <td class="text-break"><span title="${escaparHTML(e.detalle || "")}">${escaparHTML(e.mensaje)}</span></td>
                </tr>`).join("")
        })

    const cargar = () => {
        btnActualizar.disabled = true
        diagnosticar()
        cargarEventos()
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
