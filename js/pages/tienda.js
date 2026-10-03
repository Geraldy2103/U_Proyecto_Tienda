
(() => { /*"Crea esta función, mete todo este código dentro y ejecútala inmediatamente.Y crea otra ejecución independiente de esa función"*/
    const listaCategorias = document.getElementById("lista-categorias")
    const categoriasNombre = document.getElementById("categorias-nombre")
    const categoriasRecuento = document.getElementById("categorias-recuento")
    const cuadriculaProductos = document.getElementById("cuadricula-productos")

    // la página de asesores revisa sola si se cumplen los requisitos (sesión y 12+ unidades)
    document.getElementById("btn-ir-mayoristas").addEventListener("click", () => irAPagina("Asesores comerciales"))


    // categorias_con_total es una vista: cada categoría con su cantidad de productos
    obtenerDatos(db.from("categorias_con_total").select("*").order("nombre"))
        .then(data => {
            if (data.length === 0) {
                listaCategorias.innerHTML = `<li class="list-group-item">No hay categorías</li>`
                return
            }
            data.forEach(item => {
                const fila = `<li class="list-group-item" title="${item.descripcion}">${item.nombre} (${item.total})</li>` //title es el texto que aparece al pasar el ratón por encima
                listaCategorias.innerHTML += fila
            });
            const itemsCategorias= listaCategorias.querySelectorAll("li")
            itemsCategorias.forEach((iCategoria, index) => {
                iCategoria.addEventListener("click", () => {
                    categoriasNombre.textContent = data[index].nombre
                    categoriasRecuento.textContent = "Mostrando " + data[index].total + " productos"

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
        obtenerDatos(db.from("productos").select("*").eq("idcategoria", idcategoria).order("nombre"))
        .then(data => {
            if (data.length === 0) {
                cuadriculaProductos.innerHTML = `<p>Esta categoría todavía no tiene productos.</p>`
                return
            }
            let cards = ""
            data.forEach(item => {
                const rutaImagen = item.imagenchica ? item.imagenchica : IMAGEN_SIN_FOTO
                // Si no hay precio rebajado (0 o null) se usa el precio normal
                const precioFinal = item.preciorebajado ? item.preciorebajado : item.precio
                const precioAnterior = item.preciorebajado ?
                `<span class="precio-anterior">S/${item.precio.toFixed(2)}</span>` : ""
                const porcentajeDescuento = item.preciorebajado ?
                ((item.preciorebajado/item.precio-1) * 100).toFixed(0) : 0
                const verPorcentajeDescuento = item.preciorebajado ?
                `<div class="porcentaje-descuento">${porcentajeDescuento}%</div>` : ""

                cards += `
                <div class="col">
                    <div class="card">
                        <img src="${rutaImagen}" class="card-img-top" alt="${item.nombre}">
                        ${verPorcentajeDescuento}
                        <div class="card-body">
                             <h5 class="card-title">${item.nombre}</h5>
                             <p class="card-text">S/ ${precioFinal.toFixed(2)} ${precioAnterior}</p>
                        <i class="fa-solid fa-cart-shopping icono-carrito" title="Agregar al carrito"></i>
                        </div>
                    </div>
                </div>`
            })
            cuadriculaProductos.innerHTML = cards
            const iconosCarrito = cuadriculaProductos.querySelectorAll(".icono-carrito")
            iconosCarrito.forEach((iCarrito, index) => {
                iCarrito.addEventListener("click", () =>
                    agregarItemCarrito(data[index], 1))

            })
        })
        .catch(error => {
            console.error(error)
            cuadriculaProductos.innerHTML = mensajeError("No se pudieron cargar los productos de esta categoría.")
        })
    }
})()