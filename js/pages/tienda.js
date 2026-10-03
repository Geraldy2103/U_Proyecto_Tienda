
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
            const itemsCategorias= listaCategorias.querySelectorAll("li")
            itemsCategorias.forEach((iCategoria, index) => {
                iCategoria.addEventListener("click", () => {
                    categoriasNombre.textContent = data[index].nombre
                    categoriasRecuento.textContent = data[index].total + " productos"

                    itemsCategorias.forEach(li => li.classList.remove("active"))
                    iCategoria.classList.add("active")
                    leerProductos(data[index].idcategoria)
                })
            })
            listaCategorias.querySelector("li:first-child").click() // Simula un click en el primer elemento de la lista para que se muestren los productos de la primera categoría al cargar la página

        })
        .catch(error => {
            console.error(error)
            listaCategorias.innerHTML = mensajeError("No se pudieron cargar las categorías.")
        })



    const leerProductos = (idcategoria) => {
        // .eq("idcategoria", x) es el WHERE idcategoria = x de SQL
        // columnas explícitas: el costo no es público (solo el admin puede leerlo)
        obtenerDatos(db.from("productos")
            .select("idproducto, nombre, precio, preciorebajado, imagenchica, stock, stock_minimo")
            .eq("idcategoria", idcategoria).order("nombre"))
        .then(data => {
            if (data.length === 0) {
                cuadriculaProductos.innerHTML = `<p>Esta categoría todavía no tiene productos.</p>`
                return
            }
            // tarjetaProducto (main.js): la misma tarjeta que en Inicio
            cuadriculaProductos.innerHTML = data.map(tarjetaProducto).join("")
            activarBotonesAgregar(cuadriculaProductos, data)
        })
        .catch(error => {
            console.error(error)
            cuadriculaProductos.innerHTML = mensajeError("No se pudieron cargar los productos de esta categoría.")
        })
    }
})()