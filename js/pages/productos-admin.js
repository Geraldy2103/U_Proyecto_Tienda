(() => { /*"Crea esta función, mete todo este código dentro y ejecútala inmediatamente."*/

    const tbodyProductos = document.getElementById("tbody-productos")
    const avisoProductos = document.getElementById("aviso-productos")
    const avisoModal = document.getElementById("aviso-modal-producto")
    const btnNuevoProducto = document.getElementById("btn-nuevo-producto")
    const txtFiltro = document.getElementById("txt-filtro-producto")
    const formProducto = document.getElementById("form-producto")
    const tituloModal = document.getElementById("titulo-modal-producto")
    const btnGuardar = document.getElementById("btn-guardar-producto")
    const txtIdProducto = document.getElementById("txt-idproducto")
    const txtNombre = document.getElementById("txt-nombre")
    const txtPrecio = document.getElementById("txt-precio")
    const txtRebaja = document.getElementById("txt-preciorebajado")
    const txtCosto = document.getElementById("txt-costo")
    const txtStock = document.getElementById("txt-stock")
    const txtStockMinimo = document.getElementById("txt-stockminimo")
    const cboCategoria = document.getElementById("cbo-categoria")
    const cboProveedor = document.getElementById("cbo-proveedor")
    const txtImagen = document.getElementById("txt-imagen")

    /* Filtros y acciones de la tabla (parte de Gabriel) */
    const btnLimpiar = document.getElementById("btn-limpiar-filtros")
    const btnActualizar = document.getElementById("btn-actualizar-productos")

    /* Objeto de Bootstrap para abrir y cerrar el modal desde JavaScript */
    const modalProducto = bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-producto"))

    /* Modal de confirmación de borrado (parte de Gabriel) */
    const modalEliminar = bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-eliminar-producto"))
    const nombreEliminar = document.getElementById("nombre-eliminar-producto")
    const btnConfirmarEliminar = document.getElementById("btn-confirmar-eliminar")

    let productos = []      // última lista leída, para buscar un producto por su código
    let categorias = []
    let proveedores = []
    let productoAEliminar = null  // producto que el admin confirmó eliminar (parte de Gabriel)

    /* ---------- Panel de resumen (indicadores, insight y gráfico) ---------- */
    const kpis = document.getElementById("kpis-productos")
    const insight = document.getElementById("insight-productos")
    const graficoMargen = document.getElementById("grafico-margen")
    const filtroCategoria = document.getElementById("filtro-categoria")
    const filtroAlerta = document.getElementById("filtro-alerta")
    const resumenTabla = document.getElementById("resumen-tabla")
    const MARGEN_BAJO = 15, MARGEN_BUENO = 30     // % para colorear el margen
    let categoriaElegida = null                    // null = todas
    let soloAlertas = false

    const precioVenta = (p) => Number(p.preciorebajado || p.precio)
    const margen = (p) => precioVenta(p) > 0 ? (precioVenta(p) - Number(p.costo)) / precioVenta(p) * 100 : 0
    const tieneAlerta = (p) => p.stock <= p.stock_minimo || margen(p) < MARGEN_BAJO

    /* Margen con ícono + texto + color (nunca solo color) */
    const estadoMargen = (m) => m >= MARGEN_BUENO ?
        `<span class="estado-kpi bueno"><i class="fa-solid fa-circle-check"></i> ${m.toFixed(0)}%</span>` :
        m >= MARGEN_BAJO ? `<span class="estado-kpi medio"><i class="fa-solid fa-circle-minus"></i> ${m.toFixed(0)}%</span>` :
        `<span class="estado-kpi bajo"><i class="fa-solid fa-triangle-exclamation"></i> ${m.toFixed(0)}%</span>`

    const estadoStock = (p) => p.stock === 0 ? `<span class="estado-kpi bajo"><i class="fa-solid fa-circle-xmark"></i> Agotado</span>` :
        p.stock <= p.stock_minimo ? `<span class="estado-kpi bajo"><i class="fa-solid fa-triangle-exclamation"></i> ${p.stock}</span>` :
        `<span>${p.stock}</span>`

    /* Estado del producto según el stock (parte de Gabriel): Agotado / Por reponer / Disponible */
    const estadoProducto = (stock, stockMinimo) => {
        if (stock === 0) return { texto: "Agotado", clase: "text-bg-danger" }
        if (stock <= stockMinimo) return { texto: "Por reponer", clase: "text-bg-warning" }
        return { texto: "Disponible", clase: "text-bg-success" }
    }

    const dibujarResumen = () => {
        const agotados = productos.filter(p => p.stock === 0).length
        const porReponer = productos.filter(p => p.stock <= p.stock_minimo).length
        const enOferta = productos.filter(p => p.preciorebajado)
        const descuentoProm = enOferta.length ? enOferta.reduce((t, p) => t + (1 - p.preciorebajado / p.precio), 0) / enOferta.length * 100 : 0
        const ventaTotal = productos.reduce((t, p) => t + precioVenta(p) * p.stock, 0)
        const costoTotal = productos.reduce((t, p) => t + Number(p.costo) * p.stock, 0)
        const margenProm = productos.length ? productos.reduce((t, p) => t + margen(p), 0) / productos.length : 0
        const tarjeta = (titulo, valor, detalle) => `
            <div class="col"><div class="indicador">
                <div class="indicador-titulo">${titulo}</div>
                <div class="indicador-valor">${valor}</div>
                <div class="indicador-detalle">${detalle}</div>
            </div></div>`
        kpis.innerHTML =
            tarjeta("Productos", productos.length, agotados || porReponer ?
                `<span class="estado-kpi bajo"><i class="fa-solid fa-triangle-exclamation"></i> ${porReponer} por reponer · ${agotados} agotados</span>` :
                `<span class="estado-kpi bueno"><i class="fa-solid fa-circle-check"></i> Stock suficiente</span>`) +
            tarjeta("Margen promedio", `${margenProm.toFixed(0)}%`, estadoMargen(margenProm).replace(/\d+%/, margenProm >= MARGEN_BUENO ? "Saludable" : margenProm >= MARGEN_BAJO ? "Ajustado" : "Bajo")) +
            tarjeta("En oferta", enOferta.length, `Descuento promedio ${descuentoProm.toFixed(0)}%`) +
            tarjeta("Valor del inventario", soles(costoTotal), `${soles(ventaTotal)} a precio de venta`)

        // Insight: lo más importante primero (margen bajo/negativo, luego stock)
        const bajos = productos.filter(p => margen(p) < MARGEN_BAJO).sort((a, b) => margen(a) - margen(b))
        const negativos = bajos.filter(p => margen(p) < 0)
        if (bajos.length) {
            insight.innerHTML = `<div class="insight-principal ${negativos.length ? "alerta" : "atencion"}">
                <i class="fa-solid fa-${negativos.length ? "triangle-exclamation" : "tags"}"></i><span><em>${negativos.length ? "Alerta" : "Atención"}</em>
                <strong>${bajos.length} producto(s) con margen menor a ${MARGEN_BAJO}%</strong>${negativos.length ? `, ${negativos.length} se venden por debajo del costo` : ""}.
                El más crítico es <strong>${escaparHTML(bajos[0].nombre)}</strong> (${margen(bajos[0]).toFixed(0)}%): revisa su precio, rebaja o costo.</span></div>`
        } else if (porReponer) {
            insight.innerHTML = `<div class="insight-principal atencion"><i class="fa-solid fa-box-open"></i><span><em>Atención</em>
                Los márgenes están sanos, pero <strong>${porReponer} productos</strong> están en su stock mínimo o por debajo.</span></div>`
        } else {
            insight.innerHTML = `<div class="insight-principal bueno"><i class="fa-solid fa-circle-check"></i><span><em>Bien</em>
                Márgenes sanos y stock suficiente en todo el catálogo.</span></div>`
        }
        dibujarGrafico()
        dibujarFiltros()
    }

    /* Gráfico: barras horizontales del margen promedio por categoría (una serie) */
    const dibujarGrafico = () => {
        const datos = categorias.map(c => {
            const suyos = productos.filter(p => p.idcategoria === c.idcategoria)
            return { nombre: c.nombre, idcategoria: c.idcategoria, cantidad: suyos.length,
                     margen: suyos.length ? suyos.reduce((t, p) => t + margen(p), 0) / suyos.length : 0,
                     bajos: suyos.filter(p => margen(p) < MARGEN_BAJO).length }
        }).filter(d => d.cantidad).sort((a, b) => b.margen - a.margen)
        if (!datos.length) { graficoMargen.innerHTML = ""; return }
        const W = 640, izquierda = 140, derecha = 70, alto = 30, H = datos.length * alto + 6
        const maximo = Math.max(...datos.map(d => d.margen), 1)
        const escala = (v) => Math.max(v, 0) / maximo * (W - izquierda - derecha)
        let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Margen promedio por categoría">`
        datos.forEach((d, i) => {
            const y = i * alto + 3
            svg += `<text x="${izquierda - 10}" y="${y + alto / 2}" class="eje-nombre" text-anchor="end" dominant-baseline="middle"></text>
                <rect x="${izquierda}" y="${y + 7}" width="${Math.max(escala(d.margen), 2)}" height="${alto - 14}" rx="4" fill="#1d7a35"/>
                <text x="${izquierda + escala(d.margen) + 8}" y="${y + alto / 2}" class="valor" dominant-baseline="middle">${d.margen.toFixed(0)}%${d.bajos ? " ⚠" : ""}</text>
                <rect x="0" y="${y}" width="${W}" height="${alto}" class="zona-hover" data-i="${i}" tabindex="0"/>`
        })
        svg += `</svg><div class="tooltip-grafico" hidden></div>`
        graficoMargen.innerHTML = svg
        graficoMargen.querySelectorAll(".eje-nombre").forEach((t, i) => t.textContent = datos[i].nombre)
        const tooltip = graficoMargen.querySelector(".tooltip-grafico")
        graficoMargen.querySelectorAll(".zona-hover").forEach(z => {
            const mostrar = () => {
                const d = datos[z.dataset.i]
                tooltip.innerHTML = `<div class="titulo"></div>
                    <div class="fila"><strong>${d.margen.toFixed(1)}%</strong> <span>margen promedio</span></div>
                    <div class="fila"><strong>${d.cantidad}</strong> <span>productos</span></div>
                    <div class="fila"><strong>${d.bajos}</strong> <span>con margen bajo</span></div>
                    <div class="fila"><span>Clic para filtrar la tabla</span></div>`
                tooltip.querySelector(".titulo").textContent = d.nombre
                tooltip.hidden = false
                const caja = z.getBoundingClientRect(), cont = graficoMargen.getBoundingClientRect()
                tooltip.style.left = Math.min(cont.width - 90, 320) + "px"
                tooltip.style.top = (caja.top - cont.top + caja.height) + "px"
                graficoMargen.querySelectorAll(".zona-hover").forEach(x => x.classList.toggle("activa", x === z))
            }
            z.addEventListener("pointerenter", mostrar)
            z.addEventListener("focus", mostrar)
            z.addEventListener("click", () => { categoriaElegida = datos[z.dataset.i].idcategoria; dibujarFiltros(); dibujarTabla() })
        })
        graficoMargen.querySelector("svg").addEventListener("pointerleave", () => {
            tooltip.hidden = true
            graficoMargen.querySelectorAll(".zona-hover").forEach(x => x.classList.remove("activa"))
        })
    }

    /* Píldoras de categoría y "Todos / Con alerta" */
    const dibujarFiltros = () => {
        filtroCategoria.innerHTML = `<button type="button" class="${categoriaElegida === null ? "activo" : ""}" data-id="">Todas</button>` +
            categorias.map(c => `<button type="button" class="${categoriaElegida === c.idcategoria ? "activo" : ""}" data-id="${c.idcategoria}">${escaparHTML(c.nombre)}</button>`).join("")
        filtroCategoria.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
            categoriaElegida = b.dataset.id ? Number(b.dataset.id) : null
            dibujarFiltros(); dibujarTabla()
        }))
        const alertas = productos.filter(tieneAlerta).length
        filtroAlerta.innerHTML = `<button type="button" class="${!soloAlertas ? "activo" : ""}" data-alerta="no">Todos <span>${productos.length}</span></button>
            <button type="button" class="${soloAlertas ? "activo" : ""}" data-alerta="si">Con alerta <span>${alertas}</span></button>`
        filtroAlerta.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
            soloAlertas = b.dataset.alerta === "si"
            dibujarFiltros(); dibujarTabla()
        }))
    }

    /* Muestra un aviso en el contenedor indicado. tipo: "success" (verde) o "danger" (rojo) */
    const mostrarAviso = (contenedor, texto, tipo) => {
        contenedor.innerHTML = tipo === "danger" ? mensajeError(texto) :
            `<div class="alert alert-${tipo}" role="alert">${texto}</div>`
    }

    /* Nombre de la categoría a partir de su código */
    const nombreCategoria = (idcategoria) => {
        const categoria = categorias.find(c => c.idcategoria === idcategoria)
        return categoria ? categoria.nombre : ""
    }

    /* ---------- LEER (Read) ---------- */
    /* Se lee la vista productos_admin porque incluye el costo, que solo puede ver el administrador */
    const dibujarTabla = () => {
        const texto = txtFiltro.value.trim().toLowerCase()
        const visibles = productos.filter(item => item.nombre.toLowerCase().includes(texto) &&
            (categoriaElegida === null || item.idcategoria === categoriaElegida) &&
            (!soloAlertas || tieneAlerta(item)))
        resumenTabla.textContent = `${visibles.length} de ${productos.length} productos`
        if (visibles.length === 0) {
            tbodyProductos.innerHTML = `<tr><td colspan="8" class="text-center text-body-secondary py-4">No hay productos que mostrar</td></tr>`
            return
        }
        let filas = ""
        visibles.forEach(item => {
            const descuento = item.preciorebajado ? Math.round((1 - item.preciorebajado / item.precio) * 100) : 0
            const est = estadoProducto(item.stock, item.stock_minimo)
            filas += `<tr>
                    <td>
                        <div class="producto-fila">
                            <img src="${item.imagenchica || IMAGEN_SIN_FOTO}" alt="" loading="lazy">
                            <div><span class="fw-semibold">${escaparHTML(item.nombre)}</span>
                                <br><small class="text-body-secondary">Código ${item.idproducto}</small></div>
                        </div>
                    </td>
                    <td><span class="etiqueta-categoria">${escaparHTML(nombreCategoria(item.idcategoria))}</span></td>
                    <td class="text-end text-nowrap">${soles(precioVenta(item))}
                        ${descuento ? `<br><small><span class="etiqueta-oferta">-${descuento}%</span> <span class="precio-anterior ms-0">${soles(item.precio)}</span></small>` : ""}</td>
                    <td class="text-end text-nowrap text-body-secondary">${soles(item.costo)}</td>
                    <td class="text-end text-nowrap">${estadoMargen(margen(item))}</td>
                    <td class="text-end text-nowrap">${estadoStock(item)}<br><small class="text-body-secondary">mín. ${item.stock_minimo}</small></td>
                    <td><span class="badge ${est.clase}">${est.texto}</span></td>
                    <td class="text-center text-nowrap">
                        <i class="fa-regular fa-pen-to-square icono-actualizar" data-id="${item.idproducto}" title="Editar" role="button"></i>
                        <i class="fa-regular fa-trash-can icono-eliminar text-danger ms-2" data-id="${item.idproducto}" title="Eliminar" role="button"></i>
                    </td>
                  </tr>`
        })
        tbodyProductos.innerHTML = filas
    }

    const leerProductos = () => {
        return obtenerDatos(db.from("productos_admin")
            .select("idproducto, nombre, precio, preciorebajado, costo, stock, stock_minimo, idcategoria, idproveedor, imagenchica")
            .order("nombre"))
            .then(data => {
                productos = data
                dibujarResumen()
                dibujarTabla()
            })
            .catch(error => {
                console.error(error)
                tbodyProductos.innerHTML = `<tr><td colspan="8">${mensajeError("No se pudo cargar la lista de productos. Verifica que hayas iniciado sesión como administrador.")}</td></tr>`
            })
    }

    txtFiltro.addEventListener("input", dibujarTabla)

    /* Limpia la búsqueda y los filtros (parte de Gabriel) */
    btnLimpiar.addEventListener("click", () => {
        txtFiltro.value = ""
        categoriaElegida = null
        soloAlertas = false
        dibujarFiltros()
        dibujarTabla()
    })

    /* Vuelve a leer la lista desde la base de datos (parte de Gabriel) */
    btnActualizar.addEventListener("click", leerProductos)

    /* ---------- Listas desplegables del formulario ---------- */
    const llenarListas = () => {
        cboCategoria.innerHTML = `<option value="">Elige una categoría</option>` +
            categorias.map(c => `<option value="${c.idcategoria}">${escaparHTML(c.nombre)}</option>`).join("")
        cboProveedor.innerHTML = `<option value="">Sin proveedor</option>` +
            proveedores.map(p => `<option value="${p.idproveedor}">${escaparHTML(p.nombreempresa)}</option>`).join("")
    }

    /* ---------- Validación extra: la rebaja debe ser menor que el precio ---------- */
    /* setCustomValidity("texto") marca el campo como inválido; setCustomValidity("") lo vuelve válido */
    const validarRebaja = () => {
        const hayRebaja = txtRebaja.value.trim() !== ""
        const hayPrecio = txtPrecio.value.trim() !== ""
        const invalida = hayRebaja && hayPrecio && Number(txtRebaja.value) >= Number(txtPrecio.value)
        txtRebaja.setCustomValidity(invalida ? "La rebaja debe ser menor que el precio" : "")
    }
    txtPrecio.addEventListener("input", validarRebaja)
    txtRebaja.addEventListener("input", validarRebaja)

    /* Abre el modal vacío (insertar) o con los datos de un producto (actualizar) */
    const abrirModal = (producto) => {
        formProducto.reset()
        formProducto.classList.remove("was-validated")
        txtRebaja.setCustomValidity("")
        avisoModal.innerHTML = ""
        if (producto) {
            tituloModal.textContent = "Editar producto"
            txtIdProducto.value = producto.idproducto
            txtNombre.value = producto.nombre
            txtPrecio.value = producto.precio
            txtRebaja.value = producto.preciorebajado ?? ""   // null -> campo vacío
            txtCosto.value = producto.costo
            txtStock.value = producto.stock
            txtStockMinimo.value = producto.stock_minimo
            cboCategoria.value = producto.idcategoria
            cboProveedor.value = producto.idproveedor ?? ""
            txtImagen.value = producto.imagenchica ?? ""
        } else {
            tituloModal.textContent = "Nuevo producto"
            txtIdProducto.value = ""
        }
        modalProducto.show()
    }

    btnNuevoProducto.addEventListener("click", () => abrirModal())

    /* Un solo "escucha" en el tbody para todos los iconos (delegación de eventos) */
    tbodyProductos.addEventListener("click", (event) => {
        const icono = event.target
        const producto = productos.find(p => p.idproducto == icono.dataset.id)
        if (!producto) return

        if (icono.classList.contains("icono-actualizar")) {
            abrirModal(producto)
        }

        /* ---------- ELIMINAR (Delete): primero se pide confirmación (parte de Gabriel) ---------- */
        if (icono.classList.contains("icono-eliminar")) {
            productoAEliminar = producto
            nombreEliminar.textContent = producto.nombre
            modalEliminar.show()
        }
    })

    /* Confirmación aceptada: se elimina el producto de la base (parte de Gabriel) */
    btnConfirmarEliminar.addEventListener("click", () => {
        if (!productoAEliminar) return
        btnConfirmarEliminar.disabled = true // evita doble clic
        /* .select("idproducto"): pedimos solo el código (no todas las columnas, por el permiso de costo) */
        obtenerDatos(db.from("productos").delete().eq("idproducto", productoAEliminar.idproducto).select("idproducto"))
            .then(verificarCambio)
            .then(() => {
                modalEliminar.hide()
                mostrarAviso(avisoProductos, `Se eliminó el producto ${escaparHTML(productoAEliminar.nombre)}.`, "success")
                productoAEliminar = null
                leerProductos()
            })
            .catch(error => {
                console.error(error)
                modalEliminar.hide()
                /* La base rechaza el borrado (23503) si el producto ya está en un pedido: mensajeDeLaBase lo explica */
                mostrarAviso(avisoProductos, mensajeDeLaBase(error, "No se pudo eliminar el producto. Intenta nuevamente."), "danger")
            })
            .finally(() => {
                btnConfirmarEliminar.disabled = false
            })
    })

    /* ---------- GUARDAR: insertar (Create) o actualizar (Update) ---------- */
    formProducto.addEventListener("submit", (event) => {
        event.preventDefault()                          // evita que el formulario recargue la página

        txtNombre.value = txtNombre.value.trim()
        txtImagen.value = txtImagen.value.trim()
        validarRebaja()
        if (!formProducto.checkValidity()) {
            formProducto.classList.add("was-validated") // Bootstrap pinta en rojo los campos mal llenados
            avisoModal.innerHTML = mensajeError("Revisa los campos marcados en rojo.")
            return
        }
        avisoModal.innerHTML = ""

        const esNuevo = txtIdProducto.value === ""
        // Datos tal como los espera la tabla productos ("" -> null en los campos opcionales)
        const datos = {
            nombre: txtNombre.value,
            precio: Number(txtPrecio.value),
            preciorebajado: txtRebaja.value.trim() === "" ? null : Number(txtRebaja.value),
            costo: Number(txtCosto.value),
            stock: Number(txtStock.value),
            stock_minimo: Number(txtStockMinimo.value),
            idcategoria: Number(cboCategoria.value),
            idproveedor: cboProveedor.value === "" ? null : Number(cboProveedor.value),
            imagenchica: txtImagen.value === "" ? null : txtImagen.value
        }

        /* .select("idproducto") al final: pedimos de vuelta solo el código. Si pidiéramos todas las columnas,
           la base rechazaría la consulta porque "costo" no se puede leer en la tabla productos (permiso por columna). */
        const consulta = esNuevo ?
            db.from("productos").insert(datos).select("idproducto") :
            db.from("productos").update(datos).eq("idproducto", txtIdProducto.value).select("idproducto")

        btnGuardar.disabled = true // evita que un doble clic guarde dos veces
        obtenerDatos(consulta)
            .then(verificarCambio)
            .then(() => {
                modalProducto.hide()
                const nombre = escaparHTML(datos.nombre)
                mostrarAviso(avisoProductos, esNuevo ? `Se registró el producto ${nombre}.` : `Se actualizaron los datos de ${nombre}.`, "success")
                leerProductos()
            })
            .catch(error => {
                console.error(error)
                // El modal queda abierto para que no se pierda lo que se escribió
                const porDefecto = error.code === "23514" ?
                    "La base de datos no aceptó algún valor. Revisa precios y cantidades." :
                    "No se pudo guardar el producto. Intenta nuevamente."
                mostrarAviso(avisoModal, mensajeDeLaBase(error, porDefecto), "danger")
            })
            .finally(() => {
                btnGuardar.disabled = false
            })
    })

    /* ---------- Al abrir la página: primero categorías y proveedores, luego los productos ---------- */
    Promise.all([
        obtenerDatos(db.from("categorias").select("idcategoria, nombre").order("nombre")),
        obtenerDatos(db.from("proveedores").select("idproveedor, nombreempresa").order("nombreempresa"))
    ])
        .then(([datosCategorias, datosProveedores]) => {
            categorias = datosCategorias
            proveedores = datosProveedores
            llenarListas()
        })
        .catch(error => console.error(error))
        .finally(leerProductos)
})()
