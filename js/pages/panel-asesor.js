(() => {
    const textoAsesor = document.getElementById("texto-asesor")
    const filtroPeriodo = document.getElementById("filtro-periodo-asesor")
    const aviso = document.getElementById("aviso-panel-asesor")
    const insight = document.getElementById("insight-asesor")
    const tarjetas = document.getElementById("tarjetas-asesor")
    const listaPendientes = document.getElementById("lista-pendientes-asesor")
    const listaPedidos = document.getElementById("lista-pedidos-asesor")

    let pedidos = []       // solo los del asesor (la base filtra con mi_idasesor)
    let solicitudes = []
    let dias = 30

    const DIA = 24 * 60 * 60 * 1000
    const desde = () => dias ? new Date(Date.now() - dias * DIA) : null
    const enPeriodo = (lista) => lista.filter(x => !desde() || new Date(x.fecha) >= desde())
    const haceCuanto = (fecha) => {
        const d = Math.floor((Date.now() - new Date(fecha)) / DIA)
        return d === 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`
    }
    const cliente = (x) => escaparHTML((x.perfiles && (x.perfiles.nombre || x.perfiles.correo)) || "Cliente")

    const tarjeta = (titulo, valor, detalle) => `
        <div class="col"><div class="indicador">
            <div class="indicador-titulo">${titulo}</div>
            <div class="indicador-valor">${valor}</div>
            <div class="indicador-detalle">${detalle}</div>
        </div></div>`

    const dibujar = () => {
        const ped = enPeriodo(pedidos).filter(p => p.estado !== "anulado")
        const sol = enPeriodo(solicitudes)
        const vendidos = ped.filter(p => p.pago_estado === "pagado")
        const ventas = vendidos.reduce((s, p) => s + Number(p.total), 0)
        const conversion = sol.length ? Math.min(100, ped.length / sol.length * 100) : 0
        const pendientes = solicitudes.filter(s => s.estado === "pendiente")
        const porCotizar = pedidos.filter(p => p.estado === "por_cotizar")
        const enCurso = pedidos.filter(p => ["por_cotizar", "cotizado", "registrado"].includes(p.estado))

        // Mensaje principal: lo urgente primero
        const urgentes = pendientes.length + porCotizar.length
        insight.innerHTML = urgentes ?
            `<div class="insight-principal atencion mb-4"><i class="fa-solid fa-bell"></i><span><em>Tienes ${urgentes} tarea(s) esperando</em>
                ${pendientes.length} solicitud(es) sin atender y ${porCotizar.length} envío(s) por cotizar.</span></div>` :
            `<div class="insight-principal bueno mb-4"><i class="fa-solid fa-circle-check"></i><span><em>Todo al día</em>
                No tienes solicitudes ni envíos pendientes.</span></div>`

        tarjetas.innerHTML =
            tarjeta("Ventas cobradas", soles(ventas), `${vendidos.length} pedido(s) pagados`) +
            tarjeta("Pedidos", ped.length, `${enCurso.length} en curso ahora`) +
            tarjeta("Solicitudes recibidas", sol.length, `${pendientes.length} sin atender`) +
            tarjeta("Conversión", `${conversion.toFixed(0)}%`, "pedidos por cada solicitud")

        listaPendientes.innerHTML = [
            ...pendientes.map(s => `<li><i class="fa-solid fa-inbox"></i><span><strong>Solicitud N° ${s.idsolicitud}</strong> de ${cliente(s)} · ${haceCuanto(s.fecha)}</span></li>`),
            ...porCotizar.map(p => `<li><i class="fa-solid fa-truck"></i><span><strong>Cotizar envío</strong> del pedido N° ${p.idpedido} (${cliente(p)}) · ${haceCuanto(p.fecha)}</span></li>`)
        ].join("") || `<li class="text-body-secondary"><i class="fa-solid fa-mug-hot"></i><span>Nada pendiente por ahora.</span></li>`

        listaPedidos.innerHTML = enCurso.slice(0, 6).map(p => `
            <li><i class="fa-solid fa-receipt"></i><span><strong>N° ${p.idpedido}</strong> · ${cliente(p)} · ${soles(p.total)}
                <span class="estado-pedido ${ESTADOS_PEDIDO[p.estado].clase}">${ESTADOS_PEDIDO[p.estado].texto}</span></span></li>`).join("") ||
            `<li class="text-body-secondary"><i class="fa-solid fa-receipt"></i><span>No tienes pedidos en curso.</span></li>`
    }

    filtroPeriodo.addEventListener("click", (event) => {
        const boton = event.target.closest("button")
        if (!boton) return
        filtroPeriodo.querySelectorAll("button").forEach(b => b.classList.toggle("activo", b === boton))
        dias = Number(boton.dataset.dias)
        dibujar()
    })

    textoAsesor.textContent = `Hola, ${usuarioActual.nombre}. Aquí ves solo tus clientes, solicitudes y pedidos.`
    Promise.all([
        obtenerDatos(db.from("pedidos").select("idpedido, fecha, estado, total, pago_estado, perfiles(nombre, correo)")
            .eq("idasesor", usuarioActual.idasesor).order("fecha", { ascending: false })),
        obtenerDatos(db.from("solicitudes_mayoristas").select("idsolicitud, fecha, estado, perfiles(nombre, correo)")
            .eq("idasesor", usuarioActual.idasesor).order("fecha"))
    ])
        .then(([p, s]) => { pedidos = p; solicitudes = s; dibujar() })
        .catch(error => {
            console.error(error)
            aviso.innerHTML = mensajeError("No se pudo cargar tu panel.")
        })
})()
