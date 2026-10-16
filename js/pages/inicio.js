(() => {
    const categoriasInicio = document.getElementById("categorias-inicio")
    const filtrosDestacados = document.getElementById("filtros-destacados")
    const destacadosInicio = document.getElementById("destacados-inicio")
    const CANTIDAD_DESTACADOS = 10
    const COLUMNAS = "idproducto, nombre, precio, preciorebajado, imagenchica, stock, stock_minimo"  // sin costo (no es público)

    /* ---------- Compra por categorías: foto + nombre ---------- */
    obtenerDatos(db.from("categorias").select("idcategoria, nombre, foto").order("nombre"))
        .then(categorias => {
            categoriasInicio.innerHTML = categorias.map(c => `
                <div class="col">
                    <a class="tarjeta-categoria" data-categoria="${c.idcategoria}">
                        <img src="${c.foto || IMAGEN_SIN_FOTO}" alt="${escaparHTML(c.nombre)}" loading="lazy">
                        <span>${escaparHTML(c.nombre)}</span>
                    </a>
                </div>`).join("")
            categoriasInicio.querySelectorAll("[data-categoria]").forEach(a =>
                a.addEventListener("click", () => verCategoria(Number(a.dataset.categoria))))

            // Píldoras: "Todos" + una por categoría
            filtrosDestacados.innerHTML = `<button type="button" class="activo" data-categoria="">Todos</button>` +
                categorias.map(c => `<button type="button" data-categoria="${c.idcategoria}">${escaparHTML(c.nombre)}</button>`).join("")
            filtrosDestacados.querySelectorAll("button").forEach(boton =>
                boton.addEventListener("click", () => {
                    filtrosDestacados.querySelectorAll("button").forEach(b => b.classList.toggle("activo", b === boton))
                    leerDestacados(boton.dataset.categoria ? Number(boton.dataset.categoria) : null)
                }))
        })
        .catch(error => {
            console.error(error)
            categoriasInicio.innerHTML = `<div class="col-12">${mensajeError("No se pudieron cargar las categorías.")}</div>`
        })

    /* ---------- Productos destacados ----------
       "Todos": los de mayor descuento (con stock). Una categoría: sus productos con stock, ofertas primero. */
    const leerDestacados = (idcategoria) => {
        let consulta = db.from("productos").select(COLUMNAS).gt("stock", 0)
        if (idcategoria) consulta = consulta.eq("idcategoria", idcategoria)
        obtenerDatos(consulta)
            .then(data => {
                const descuento = (p) => p.preciorebajado ? 1 - p.preciorebajado / p.precio : 0
                const productos = data.sort((a, b) => descuento(b) - descuento(a)).slice(0, CANTIDAD_DESTACADOS)
                destacadosInicio.innerHTML = productos.length ? productos.map(tarjetaProducto).join("") :
                    `<p class="text-body-secondary">No hay productos disponibles en esta categoría.</p>`
                activarBotonesAgregar(destacadosInicio, productos)
            })
            .catch(error => {
                console.error(error)
                destacadosInicio.innerHTML = `<div class="col-12">${mensajeError("No se pudieron cargar los productos.")}</div>`
            })
    }

    leerDestacados(null)
})()
