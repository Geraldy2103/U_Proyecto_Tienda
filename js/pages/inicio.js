(() => {
    const ofertasInicio = document.getElementById("ofertas-inicio")
    const CANTIDAD_OFERTAS = 4

    // Productos con precio rebajado y con stock; el descuento se calcula aquí y se eligen los mayores
    obtenerDatos(db.from("productos")
        .select("idproducto, nombre, precio, preciorebajado, imagenchica, stock, stock_minimo")
        .gt("preciorebajado", 0).gt("stock", 0))
        .then(data => {
            const ofertas = data
                .sort((a, b) => (a.preciorebajado / a.precio) - (b.preciorebajado / b.precio))  // mayor descuento primero
                .slice(0, CANTIDAD_OFERTAS)

            ofertasInicio.innerHTML = ofertas.map(tarjetaProducto).join("")   // misma tarjeta que en la Tienda
            activarBotonesAgregar(ofertasInicio, ofertas)
        })
        .catch(error => {
            console.error(error)
            ofertasInicio.innerHTML = `<div class="col-12">${mensajeError("No se pudieron cargar las ofertas.")}</div>`
        })
})()
