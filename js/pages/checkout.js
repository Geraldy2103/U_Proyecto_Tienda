(() => {
    const avisoCheckout = document.getElementById("aviso-checkout")
    const contenidoCheckout = document.getElementById("contenido-checkout")
    const formCheckout = document.getElementById("form-checkout")
    const bloqueRecojo = document.getElementById("bloque-recojo")
    const bloqueDelivery = document.getElementById("bloque-delivery")
    const cboSede = document.getElementById("cbo-sede")
    const cboDepartamento = document.getElementById("cbo-departamento")
    const txtDistrito = document.getElementById("txt-distrito")
    const txtDireccion = document.getElementById("txt-direccion")
    const txtReferencia = document.getElementById("txt-referencia")
    const txtTelefono = document.getElementById("txt-telefono")
    const infoEnvio = document.getElementById("info-envio")
    const panelAsesor = document.getElementById("panel-asesor")
    const cboAsesor = document.getElementById("cbo-asesor")
    const panelPago = document.getElementById("panel-pago")
    const numeroPasoPago = document.getElementById("numero-paso-pago")
    const panelCotizacion = document.getElementById("panel-cotizacion")
    const textoDepartamentoCotizar = document.getElementById("texto-departamento-cotizar")
    const listaResumen = document.getElementById("lista-resumen")
    const resumenSubtotal = document.getElementById("resumen-subtotal")
    const resumenEnvio = document.getElementById("resumen-envio")
    const resumenTotal = document.getElementById("resumen-total")
    const btnPagar = document.getElementById("btn-pagar")

    const carrito = leerCarrito()
    const esMayorista = carrito.some(item => item.cantidad >= MINIMO_MAYORISTA)
    const subtotal = carrito.reduce((suma, item) => suma + item.precio * item.cantidad, 0)
    let zonas = []                                        // zonas_envio de la base
    const pago = crearFormularioPago(document.getElementById("formulario-pago"))   // main.js

    if (carrito.length === 0) {
        contenidoCheckout.innerHTML = `
            <div class="col-12 text-center py-5">
                <h2 class="h5">Tu carrito está vacío</h2>
                <button class="btn btn-primary mt-2" onclick="irAPagina('Tienda')">Ir a la tienda</button>
            </div>`
        return
    }

    /* ---------- Estado actual de lo elegido ---------- */
    const tipoEntrega = () => formCheckout.querySelector("input[name=tipo-entrega]:checked").value
    const zonaElegida = () => zonas.find(z => z.departamento === cboDepartamento.value)
    const porCotizar = () => tipoEntrega() === "delivery" && zonaElegida() && zonaElegida().zona === "alejada"

    /* Costo de envío que se mostrará (la base de datos lo vuelve a calcular al confirmar) */
    const costoEnvio = () => {
        if (tipoEntrega() === "recojo") return 0
        const zona = zonaElegida()
        return zona ? zona.costo : null
    }

    /* Vuelve a pintar todo lo que depende de las opciones elegidas */
    const actualizar = () => {
        const delivery = tipoEntrega() === "delivery"
        bloqueRecojo.hidden = delivery
        bloqueDelivery.hidden = !delivery
        cboSede.required = !delivery
        ;[cboDepartamento, txtDistrito, txtDireccion, txtTelefono].forEach(campo => campo.required = delivery)

        // Información de la zona elegida
        const zona = zonaElegida()
        infoEnvio.innerHTML = !delivery || !zona ? "" :
            zona.zona === "alejada" ?
                (esMayorista ?
                    `<span class="text-body-secondary">Envío a ${escaparHTML(zona.departamento)}: <strong>lo cotiza tu asesor</strong>.</span>` :
                    `<span class="text-danger">El envío a ${escaparHTML(zona.departamento)} solo está disponible para compras
                     mayoristas (12 o más unidades de un producto). Puedes elegir recojo en sede.</span>`) :
                `<span>Envío a ${escaparHTML(zona.departamento)}: <strong>${soles(zona.costo)}</strong> · Entrega en ${escaparHTML(zona.plazo)}</span>`

        // Asesor: visible si es mayorista; obligatorio si el envío es por cotizar
        panelAsesor.hidden = !esMayorista
        cboAsesor.required = porCotizar()
        numeroPasoPago.textContent = esMayorista ? "3" : "2"

        // Pago o cotización
        panelPago.hidden = porCotizar()
        panelCotizacion.hidden = !porCotizar()
        if (porCotizar()) textoDepartamentoCotizar.textContent = zona.departamento

        // Resumen
        const envio = costoEnvio()
        resumenSubtotal.textContent = soles(subtotal)
        resumenEnvio.textContent = envio === null ? (delivery && zona ? "Por cotizar" : "—") : envio === 0 ? "Gratis" : soles(envio)
        resumenTotal.textContent = envio === null ? soles(subtotal) + " + envío" : soles(subtotal + envio)
        const bloqueado = delivery && zona && zona.zona === "alejada" && !esMayorista
        btnPagar.disabled = bloqueado
        btnPagar.textContent = porCotizar() ? "Solicitar cotización" : `Pagar ${soles(subtotal + (envio || 0))}`
    }

    /* ---------- Datos iniciales ---------- */
    listaResumen.innerHTML = carrito.map(item => `
        <li><span>${item.cantidad} × ${escaparHTML(item.nombre)}</span><span>${soles(item.precio * item.cantidad)}</span></li>`).join("")

    Promise.all([
        obtenerDatos(db.from("sedes").select("idsede, nombre, direccion").order("idsede")),
        obtenerDatos(db.from("zonas_envio").select("*").order("departamento")),
        esMayorista ? obtenerDatos(db.from("asesores").select("idasesor, nombres, apellidos, directores(sedes(nombre))").order("nombres")) : []
    ])
        .then(([sedes, zonasEnvio, asesores]) => {
            zonas = zonasEnvio
            cboSede.innerHTML = `<option value="">Elige una sede</option>` + sedes.map(s =>
                `<option value="${s.idsede}">${escaparHTML(s.nombre)} — ${escaparHTML(s.direccion || "")}</option>`).join("")

            // Departamentos agrupados por zona, con su precio
            const grupo = (zona, titulo) => `<optgroup label="${titulo}">` + zonas.filter(z => z.zona === zona).map(z =>
                `<option value="${escaparHTML(z.departamento)}">${escaparHTML(z.departamento)}</option>`).join("") + `</optgroup>`
            cboDepartamento.innerHTML = `<option value="">Elige un departamento</option>` +
                grupo("lima", "Lima y Callao · S/ 10 · 1 día") +
                grupo("cercana", "Cercanos · S/ 30 · 3 a 5 días hábiles") +
                grupo("alejada", "Resto del país · solo mayoristas · lo cotiza el asesor")

            cboAsesor.innerHTML = `<option value="">Sin asesor</option>` + asesores.map(a =>
                `<option value="${a.idasesor}">${escaparHTML(a.nombres + " " + a.apellidos)} (${escaparHTML(a.directores.sedes.nombre)})</option>`).join("")
            actualizar()
        })
        .catch(error => {
            console.error(error)
            avisoCheckout.innerHTML = mensajeError("No se pudieron cargar las opciones de entrega. Intenta nuevamente.")
        })

    formCheckout.addEventListener("change", actualizar)

    /* ---------- Confirmar ---------- */
    formCheckout.addEventListener("submit", (event) => {
        event.preventDefault()
        avisoCheckout.innerHTML = ""
        ;[txtDistrito, txtDireccion, txtReferencia].forEach(c => c.value = c.value.trim())

        const formularioOk = formCheckout.checkValidity()
        formCheckout.classList.add("was-validated")
        const resultadoPago = porCotizar() ? { ok: true, metodo: null } : pago.validar()
        if (!formularioOk || !resultadoPago.ok) {
            avisoCheckout.innerHTML = mensajeError(resultadoPago.ok ? "Revisa los datos marcados en rojo." : resultadoPago.error)
            window.scrollTo({ top: 0, behavior: "smooth" })
            return
        }

        const entrega = tipoEntrega() === "recojo" ?
            { tipo: "recojo", idsede: Number(cboSede.value) } :
            { tipo: "delivery", departamento: cboDepartamento.value, distrito: txtDistrito.value,
              direccion: txtDireccion.value, referencia: txtReferencia.value, telefono: txtTelefono.value }

        btnPagar.disabled = true
        btnPagar.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${porCotizar() ? "Registrando..." : "Procesando pago..."}`

        // pequeña espera para simular la respuesta del banco / Yape
        new Promise(resolver => setTimeout(resolver, porCotizar() ? 0 : 1200))
            // rpc() llama a una función de la base de datos: ella calcula precios, envío y total
            .then(() => obtenerDatos(db.rpc("confirmar_pedido", {
                p_productos: carrito.map(item => ({ idproducto: item.idproducto, cantidad: item.cantidad })),
                p_entrega: entrega,
                p_idasesor: cboAsesor.value ? Number(cboAsesor.value) : null,
                p_metodo_pago: resultadoPago.metodo
            })))
            .then(idpedido => {
                const cotizar = porCotizar()
                const total = subtotal + (costoEnvio() || 0)
                guardarCarrito([])   // el carrito queda vacío
                window.scrollTo(0, 0)
                contenidoCheckout.innerHTML = `
                    <div class="col-lg-7 mx-auto">
                        <div class="panel text-center py-5">
                            <i class="fa-regular fa-circle-check fa-3x text-success mb-3"></i>
                            <h2 class="h4">${cotizar ? "¡Pedido registrado!" : "¡Gracias por tu compra!"}</h2>
                            <p class="mb-1">Pedido <strong>N° ${idpedido}</strong></p>
                            <p class="text-body-secondary">${cotizar ?
                                "Tu asesor cotizará el envío. Podrás pagarlo desde Mis pedidos." :
                                `Pagaste ${soles(total)} con ${resultadoPago.metodo === "yape" ? "Yape" : "tarjeta"}.
                                 ${entrega.tipo === "recojo" ? "Te avisaremos cuando esté listo para recoger." :
                                   "Lo enviaremos en " + escaparHTML(zonaElegida().plazo) + "."}`}</p>
                            <div class="d-flex justify-content-center gap-2 mt-3">
                                <button class="btn btn-primary" onclick="irAPagina('Mis pedidos')">Ver mis pedidos</button>
                                <button class="btn btn-outline-primary" onclick="irAPagina('Tienda')">Seguir comprando</button>
                            </div>
                        </div>
                    </div>`
            })
            .catch(error => {
                console.error(error)
                avisoCheckout.innerHTML = mensajeError(mensajeDeLaBase(error, "No se pudo registrar el pedido. Intenta nuevamente."))
                window.scrollTo({ top: 0, behavior: "smooth" })
                actualizar()
            })
    })
})()
