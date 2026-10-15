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

    /* Objeto de Bootstrap para abrir y cerrar el modal desde JavaScript */
    const modalProducto = bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-producto"))

    let productos = []      // última lista leída, para buscar un producto por su código
    let categorias = []
    let proveedores = []

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
        const visibles = productos.filter(item => item.nombre.toLowerCase().includes(texto))
        if (visibles.length === 0) {
            tbodyProductos.innerHTML = `<tr><td colspan="7" class="text-center">No hay productos que mostrar</td></tr>`
            return
        }
        let filas = ""
        visibles.forEach(item => {
            const pocoStock = item.stock <= item.stock_minimo   // por reponer: se marca en rojo
            filas += `<tr>
                    <td>${item.idproducto}</td>
                    <td>${escaparHTML(item.nombre)}</td>
                    <td><span class="badge text-bg-secondary">${escaparHTML(nombreCategoria(item.idcategoria))}</span></td>
                    <td class="text-end">${soles(item.preciorebajado || item.precio)}</td>
                    <td class="text-end">${soles(item.costo)}</td>
                    <td class="text-end ${pocoStock ? "text-danger fw-semibold" : ""}">${item.stock}</td>
                    <td><i class="fa-regular fa-pen-to-square icono-actualizar" data-id="${item.idproducto}" title="Editar"></i></td>
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
                dibujarTabla()
            })
            .catch(error => {
                console.error(error)
                tbodyProductos.innerHTML = `<tr><td colspan="7">${mensajeError("No se pudo cargar la lista de productos. Verifica que hayas iniciado sesión como administrador.")}</td></tr>`
            })
    }

    txtFiltro.addEventListener("input", dibujarTabla)

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
        if (!icono.classList.contains("icono-actualizar")) return
        const producto = productos.find(p => p.idproducto == icono.dataset.id)
        if (producto) abrirModal(producto)
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
