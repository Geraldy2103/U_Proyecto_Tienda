(() => {
    const ofertasInicio = document.getElementById("ofertas-inicio")
    const CANTIDAD_OFERTAS = 4

    // Productos con precio rebajado y con stock; el descuento se calcula aquí y se eligen los mayores
    obtenerDatos(db.from("productos")
        .select("idproducto, nombre, precio, preciorebajado, imagenchica, stock, stock_minimo")
        .gt("preciorebajado", 0).gt("stock", 0))
        .then(data => {
            const ofertas = data
                .map(p => ({ ...p, descuento: Math.round((1 - p.preciorebajado / p.precio) * 100) }))
                .sort((a, b) => b.descuento - a.descuento)
                .slice(0, CANTIDAD_OFERTAS)

            ofertasInicio.innerHTML = ofertas.map(p => `
                <div class="col">
                    <div class="card h-100 oferta">
                        <span class="badge text-bg-danger oferta-descuento">-${p.descuento}%</span>
                        <img src="${p.imagenchica || IMAGEN_SIN_FOTO}" class="card-img-top" alt="${escaparHTML(p.nombre)}">
                        <div class="card-body d-flex flex-column">
                            <h6 class="card-title">${escaparHTML(p.nombre)}</h6>
                            <p class="mb-2"><strong>${soles(p.preciorebajado)}</strong>
                                <span class="precio-anterior">${soles(p.precio)}</span></p>
                            <button class="btn btn-sm btn-success mt-auto btn-agregar-oferta" data-id="${p.idproducto}">
                                <i class="fa-solid fa-cart-plus"></i> Agregar</button>
                        </div>
                    </div>
                </div>`).join("")

            ofertasInicio.querySelectorAll(".btn-agregar-oferta").forEach(boton =>
                boton.addEventListener("click", () =>
                    agregarItemCarrito(ofertas.find(p => p.idproducto == boton.dataset.id), 1)))
        })
        .catch(error => {
            console.error(error)
            ofertasInicio.innerHTML = `<div class="col-12">${mensajeError("No se pudieron cargar las ofertas.")}</div>`
        })
})()
