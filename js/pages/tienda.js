
(() => { /*"Crea esta función, mete todo este código dentro y ejecútala inmediatamente.Y crea otra ejecución independiente de esa función"*/
    const listaCategorias = document.getElementById("lista-categorias")
    const categoriasNombre = document.getElementById("categorias-nombre")
    const categoriasRecuento = document.getElementById("categorias-recuento")
    const cuadriculaProductos = document.getElementById("cuadricula-productos")

    document.getElementById("btn-ir-mayoristas").addEventListener("click", () => irAPagina("Mayoristas"))


    // categorias_con_total es una vista: cada categoría con su cantidad de productos
    obtenerDatos(db.from("categorias_con_total").select("*").order("nombre"))
        .then(data => {
            if (data.length === 0) {
                listaCategorias.innerHTML = `<li class="list-group-item">No hay categorías</li>`
                return
            }
            data.forEach(item => {
                const fila = `<li class="list-group-item" title="${escaparHTML(item.descripcion || "")}">
                    ${escaparHTML(item.nombre)} <span class="badge rounded-pill text-bg-light">${item.total}</span></li>` //title es el texto que aparece al pasar el ratón por encima
                listaCategorias.innerHTML += fila
            });
            const itemsCategorias = listaCategorias.querySelectorAll("li")
            itemsCategorias.forEach((iCategoria, index) => {
                iCategoria.addEventListener("click", () => {
                    limpiarBusqueda()
                    categoriasNombre.textContent = data[index].nombre
                    categoriasRecuento.textContent = data[index].total + " productos"

                    itemsCategorias.forEach(li => li.classList.remove("active"))
                    iCategoria.classList.add("active")
                    leerProductos(data[index].idcategoria)
                })
            })
            // ¿Qué mostrar al abrir? Lo que pidió el encabezado (búsqueda o categoría del ☰); si no, la primera categoría
            if (filtroTienda.texto) {
                buscar(filtroTienda.texto)
            } else {
                const posicion = data.findIndex(c => c.idcategoria === filtroTienda.idcategoria)
                itemsCategorias[posicion >= 0 ? posicion : 0].click()
            }
            filtroTienda.idcategoria = null

        })
        .catch(error => {
            console.error(error)
            listaCategorias.innerHTML = mensajeError("No se pudieron cargar las categorías.")
        })



    /* Muestra una lista de productos con la tarjeta común (main.js) */
    const mostrarProductos = (data, textoVacio) => {
        if (data.length === 0) {
            cuadriculaProductos.innerHTML = `<p class="text-body-secondary">${textoVacio}</p>`
            return
        }
        cuadriculaProductos.innerHTML = data.map(tarjetaProducto).join("")
        activarBotonesAgregar(cuadriculaProductos, data)
    }

    /* ---------- Búsqueda (desde el buscador del encabezado) ---------- */
    const btnLimpiarBusqueda = document.getElementById("btn-limpiar-busqueda")

    const limpiarBusqueda = () => {
        filtroTienda.texto = ""
        document.getElementById("txt-buscar").value = ""
        btnLimpiarBusqueda.classList.add("d-none")
    }

    const buscar = (texto) => {
        listaCategorias.querySelectorAll("li").forEach(li => li.classList.remove("active"))
        categoriasNombre.textContent = `Resultados para "${texto}"`
        categoriasRecuento.textContent = ""
        btnLimpiarBusqueda.classList.remove("d-none")
        // ilike = "contiene", sin importar mayúsculas: %texto%
        obtenerDatos(db.from("productos")
            .select("idproducto, nombre, precio, preciorebajado, imagenchica, stock, stock_minimo")
            .ilike("nombre", `%${texto}%`).order("nombre"))
            .then(data => {
                categoriasRecuento.textContent = data.length + " productos"
                mostrarProductos(data, "No encontramos productos con ese nombre. Prueba con otra palabra o revisa las categorías.")
            })
            .catch(error => {
                console.error(error)
                cuadriculaProductos.innerHTML = mensajeError("No se pudo completar la búsqueda.")
            })
    }

    btnLimpiarBusqueda.addEventListener("click", (event) => {
        event.preventDefault()
        limpiarBusqueda()
        listaCategorias.querySelector("li").click()
    })

    const leerProductos = (idcategoria) => {
        // .eq("idcategoria", x) es el WHERE idcategoria = x de SQL
        // columnas explícitas: el costo no es público (solo el admin puede leerlo)
        obtenerDatos(db.from("productos")
            .select("idproducto, nombre, precio, preciorebajado, imagenchica, stock, stock_minimo")
            .eq("idcategoria", idcategoria).order("nombre"))
        .then(data => {
            mostrarProductos(data, "Esta categoría todavía no tiene productos.")
        })
        .catch(error => {
            console.error(error)
            cuadriculaProductos.innerHTML = mensajeError("No se pudieron cargar los productos de esta categoría.")
        })
    }
})()