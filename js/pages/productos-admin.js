/* Intranet > Productos: registrar y editar productos en Supabase.
   Usa las funciones compartidas de main.js: db, obtenerDatos, verificarCambio, mensajeDeLaBase,
   mensajeError, escaparHTML, soles y mostrarNotificacion.

   Todo va dentro de (() => { ... })() para que, si la página se abre varias veces,
   los "const" no choquen entre sí. */
(() => {
    const form = document.getElementById("form-producto")
    const mensajeForm = document.getElementById("mensaje-form")
    const tituloForm = document.getElementById("titulo-form")
    const btnGuardar = document.getElementById("btn-guardar")
    const btnCancelar = document.getElementById("btn-cancelar")
    const cuerpoTabla = document.getElementById("tabla-productos")
    const filtro = document.getElementById("filtro-productos")

    /* Campos del formulario (coinciden con las columnas de la tabla productos) */
    const CAMPOS = ["nombre", "precio", "preciorebajado", "costo", "stock", "stock_minimo",
                    "idcategoria", "idproveedor", "imagenchica"]

    let productos = []   // lista que se muestra en la tabla

    /* ---------- Validaciones ---------- */

    /* Devuelve un texto de error, o "" si el monto está bien. Máximo 2 decimales. */
    const errorDeMonto = (texto, { obligatorio, mayorQueCero }) => {
        texto = texto.trim()
        if (texto === "") return obligatorio ? "Este campo es obligatorio." : ""
        if (!/^\d+(\.\d{1,2})?$/.test(texto)) return "Escribe un monto válido, con máximo 2 decimales."
        const monto = Number(texto)
        if (mayorQueCero && monto <= 0) return "Debe ser mayor a 0."
        if (monto > 99999999.99) return "El monto es demasiado grande."
        return ""
    }

    const errorDeEntero = (texto) => {
        texto = texto.trim()
        if (texto === "") return "Este campo es obligatorio."
        if (!/^\d+$/.test(texto)) return "Escribe un número entero, sin decimales."
        if (Number(texto) > 999999) return "El número es demasiado grande."
        return ""
    }

    /* Revisa todos los campos. Devuelve un objeto { campo: "mensaje" } solo con los que tienen error. */
    const validar = (v) => {
        const errores = {}
        const nombre = v.nombre.trim()
        if (nombre === "") errores.nombre = "El nombre es obligatorio."
        else if (nombre.length < 3) errores.nombre = "Escribe al menos 3 caracteres."
        else if (nombre.length > 100) errores.nombre = "Máximo 100 caracteres."

        const errPrecio = errorDeMonto(v.precio, { obligatorio: true, mayorQueCero: true })
        if (errPrecio) errores.precio = errPrecio

        const errRebaja = errorDeMonto(v.preciorebajado, { obligatorio: false, mayorQueCero: true })
        if (errRebaja) errores.preciorebajado = errRebaja
        else if (v.preciorebajado.trim() !== "" && !errores.precio &&
                 Number(v.preciorebajado) >= Number(v.precio)) {
            errores.preciorebajado = "La rebaja debe ser menor que el precio de venta."
        }

        const errCosto = errorDeMonto(v.costo, { obligatorio: true, mayorQueCero: false })
        if (errCosto) errores.costo = errCosto

        const errStock = errorDeEntero(v.stock)
        if (errStock) errores.stock = errStock
        const errMinimo = errorDeEntero(v.stock_minimo)
        if (errMinimo) errores.stock_minimo = errMinimo

        if (v.idcategoria === "") errores.idcategoria = "Elige una categoría."

        const imagen = v.imagenchica.trim()
        if (imagen !== "" && !/^https?:\/\/\S+$/i.test(imagen)) {
            errores.imagenchica = "Escribe una dirección que empiece con http:// o https://"
        }
        return errores
    }

    /* ---------- Mensajes en el formulario ---------- */

    const valoresDelFormulario = () => Object.fromEntries(CAMPOS.map(c => [c, form.elements[c].value]))

    /* Pinta en rojo los campos con error y escribe el mensaje debajo de cada uno */
    const mostrarErrores = (errores) => {
        CAMPOS.forEach(c => {
            form.elements[c].classList.toggle("is-invalid", Boolean(errores[c]))
            form.querySelector(`[data-error="${c}"]`).textContent = errores[c] || ""
        })
        const primero = CAMPOS.find(c => errores[c])
        if (primero) form.elements[primero].focus()   // lleva el cursor al primer campo con error
    }

    const mostrarMensaje = (html) => { mensajeForm.innerHTML = html }
    const mensajeOk = (texto) => `
        <div class="alert alert-success mb-0" role="status">
            <i class="fa-solid fa-circle-check"></i> ${texto}
        </div>`

    /* Al corregir un campo, se le quita el error */
    form.addEventListener("input", (event) => {
        const campo = event.target
        if (campo.classList.contains("is-invalid")) {
            campo.classList.remove("is-invalid")
            form.querySelector(`[data-error="${campo.name}"]`).textContent = ""
        }
    })

    /* ---------- Modo registrar / modo editar ---------- */

    const nuevoFormulario = () => {
        form.reset()
        form.elements.idproducto.value = ""
        mostrarErrores({})
        tituloForm.textContent = "Registrar producto"
        btnGuardar.textContent = "Guardar producto"
        btnCancelar.hidden = true
    }

    const editarProducto = (id) => {
        const p = productos.find(item => item.idproducto === id)
        if (!p) return
        CAMPOS.forEach(c => { form.elements[c].value = p[c] ?? "" })   // null -> campo vacío
        form.elements.idproducto.value = p.idproducto
        mostrarErrores({})
        mostrarMensaje("")
        tituloForm.textContent = "Editar producto"
        btnGuardar.textContent = "Guardar cambios"
        btnCancelar.hidden = false
        form.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    btnCancelar.addEventListener("click", () => {
        nuevoFormulario()
        mostrarMensaje("")
    })

    /* ---------- Tabla de productos ---------- */

    const dibujarTabla = () => {
        const texto = filtro.value.trim().toLowerCase()
        const visibles = productos.filter(p => p.nombre.toLowerCase().includes(texto))
        if (visibles.length === 0) {
            cuerpoTabla.innerHTML = `<tr><td colspan="5" class="text-body-secondary">No hay productos que mostrar.</td></tr>`
            return
        }
        cuerpoTabla.innerHTML = visibles.map(p => `
            <tr>
                <td>${escaparHTML(p.nombre)}</td>
                <td class="text-end">${soles(p.preciorebajado || p.precio)}</td>
                <td class="text-end">${soles(p.costo)}</td>
                <td class="text-end">${p.stock}</td>
                <td class="text-end">
                    <button type="button" class="btn btn-outline-primary btn-sm" data-editar="${p.idproducto}">Editar</button>
                </td>
            </tr>`).join("")
    }

    cuerpoTabla.addEventListener("click", (event) => {
        const boton = event.target.closest("[data-editar]")
        if (boton) editarProducto(Number(boton.dataset.editar))
    })
    filtro.addEventListener("input", dibujarTabla)

    /* Lee los productos desde la vista productos_admin (incluye el costo, que solo ve el admin) */
    const cargarProductos = () => {
        return obtenerDatos(db.from("productos_admin")
            .select("idproducto, nombre, precio, preciorebajado, costo, stock, stock_minimo, idcategoria, idproveedor, imagenchica")
            .order("nombre"))
            .then(datos => {
                productos = datos
                dibujarTabla()
            })
    }

    /* ---------- Listas desplegables (categorías y proveedores) ---------- */

    const llenarSelect = (nombreCampo, textoInicial, filas, campoId, campoTexto) => {
        form.elements[nombreCampo].innerHTML = `<option value="">${textoInicial}</option>` +
            filas.map(f => `<option value="${f[campoId]}">${escaparHTML(f[campoTexto])}</option>`).join("")
    }

    /* ---------- Guardar (insertar o actualizar) ---------- */

    form.addEventListener("submit", (event) => {
        event.preventDefault()
        mostrarMensaje("")

        const v = valoresDelFormulario()
        const errores = validar(v)
        mostrarErrores(errores)
        if (Object.keys(errores).length > 0) {
            mostrarMensaje(mensajeError("Revisa los campos marcados en rojo."))
            return
        }

        // Datos tal como los espera la tabla productos ("" -> null en los opcionales)
        const producto = {
            nombre: v.nombre.trim(),
            precio: Number(v.precio),
            preciorebajado: v.preciorebajado.trim() === "" ? null : Number(v.preciorebajado),
            costo: Number(v.costo),
            stock: Number(v.stock),
            stock_minimo: Number(v.stock_minimo),
            idcategoria: Number(v.idcategoria),
            idproveedor: v.idproveedor === "" ? null : Number(v.idproveedor),
            imagenchica: v.imagenchica.trim() === "" ? null : v.imagenchica.trim()
        }

        const id = form.elements.idproducto.value
        const editando = id !== ""

        /* .select("idproducto") al final: pedimos de vuelta solo el id. Si pidiéramos todas las columnas,
           la base rechazaría la consulta porque "costo" no es legible por permiso de columna. */
        const consulta = editando ?
            db.from("productos").update(producto).eq("idproducto", Number(id)).select("idproducto") :
            db.from("productos").insert(producto).select("idproducto")

        btnGuardar.disabled = true   // evita registrar dos veces si se hace doble clic
        obtenerDatos(consulta)
            .then(verificarCambio)
            .then(() => {
                const texto = editando ? "Producto actualizado correctamente." : "Producto registrado correctamente."
                nuevoFormulario()
                mostrarMensaje(mensajeOk(texto))
                mostrarNotificacion(texto)
                return cargarProductos()
            })
            .catch(error => {
                console.error(error)
                const porDefecto = error.code === "23514" ?
                    "La base de datos no aceptó algún valor. Revisa precios y cantidades." :
                    "No se pudo guardar el producto. Intenta nuevamente."
                mostrarMensaje(mensajeError(mensajeDeLaBase(error, error.message && !error.code ? error.message : porDefecto)))
            })
            .finally(() => { btnGuardar.disabled = false })
    })

    /* ---------- Al abrir la página ---------- */
    Promise.all([
        obtenerDatos(db.from("categorias").select("idcategoria, nombre").order("nombre")),
        obtenerDatos(db.from("proveedores").select("idproveedor, nombreempresa").order("nombreempresa"))
    ])
        .then(([categorias, proveedores]) => {
            llenarSelect("idcategoria", "Elige una categoría", categorias, "idcategoria", "nombre")
            llenarSelect("idproveedor", "Sin proveedor", proveedores, "idproveedor", "nombreempresa")
            return cargarProductos()
        })
        .catch(error => {
            console.error(error)
            mostrarMensaje(mensajeError("No se pudieron cargar los datos. Verifica que hayas iniciado sesión como administrador."))
            cuerpoTabla.innerHTML = `<tr><td colspan="5" class="text-body-secondary">No se pudo cargar la lista.</td></tr>`
        })
})()
