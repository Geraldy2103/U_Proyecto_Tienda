
(() => { /*"Crea esta función, mete todo este código dentro y ejecútala inmediatamente.Y crea otra ejecución independiente de esa función"*/
    const rutaServicio = window.API_URL + "categorias.php"
    const listaCategorias = document.getElementById("lista-categorias")
    const categoriasNombre = document.getElementById("categorias-nombre")
    const categoriasRecuento = document.getElementById("categorias-recuento")
    const cuadriculaProductos = document.getElementById("cuadricula-productos")


    fetch(rutaServicio)
        .then(response => response.json())
        .then(data => {
            console.log(data)
            data.forEach(item => {
                const fila = `<li class="list-group-item" title="${item.descripcion}">${item.nombre} (${item.total})</li>` //title es el texto que aparece al pasar el ratón por encima
                listaCategorias.innerHTML += fila
            });
            const itemsCategorias= listaCategorias.querySelectorAll("li")
            itemsCategorias.forEach((iCategoria, index) => {
                iCategoria.addEventListener("click", () => {
                    // console.log(data[index].nombre)
                    categoriasNombre.textContent = data[index].nombre
                    categoriasRecuento.textContent = "Mostrando " + data[index].total + " productos"
                    
                    itemsCategorias.forEach(li => li.classList.remove("active"))
                    iCategoria.classList.add("active")
                    leerProductos(data[index].idcategoria)
                })
            })
            listaCategorias.querySelector("li:first-child").click() // Simula un click en el primer elemento de la lista para que se muestren los productos de la primera categoría al cargar la página   

        })


        
    const leerProductos = (idcategoria) => {
        console.log(idcategoria)
        const rutaServicio = window.API_URL + "productos.php?idcategoria=" + idcategoria
        fetch(rutaServicio)
        .then(response => response.json())
        .then(data => {
            console.log(data)
            cuadriculaProductos.innerHTML =""
            data.forEach(item => {
                const rutaImagen = item.imagenchica === null ? 
                window.API_URL + "imagenes/nofoto.jpg" : window.API_URL + item.imagenchica
                const precioFinal = item.preciorebajado === 0 ? 
                item.precio : item.preciorebajado
                const precioAnterior = item.preciorebajado ? 
                `<span class="precio-anterior">S/${item.precio.toFixed(2)}</span>` : ""
                const porcentajeDescuento = ((item.preciorebajado/item.precio-1) * 100).toFixed(0)
                const verPorcentajeDescuento = item.preciorebajado ? 
                `<div class="porcentaje-descuento">${porcentajeDescuento}%</div>` : ""
                
                const card = `            
                <div class="col">
                    <div class="card">
                        <img src="${rutaImagen}" class="card-img-top" alt="...">
                        ${verPorcentajeDescuento}
                        <div class="card-body">
                             <h5 class="card-title">${item.nombre}</h5>
                             <p class="card-text">S/ ${precioFinal.toFixed(2)} ${precioAnterior}</p>
                        <i class="fa-solid fa-cart-shopping icono-carrito"></i>    //<i> es un icono de Font Awesome, y la clase "icono-carrito" es para poder seleccionarlo con querySelectorAll
                        </div>
                    </div>
                </div>`
                cuadriculaProductos.innerHTML += card
            })
            const iconosCarrito = cuadriculaProductos.querySelectorAll(".icono-carrito")
            iconosCarrito.forEach((iCarrito, index) => {
                iCarrito.addEventListener("click", () => 
                    agregarItemCarrito(data[index], 1))

            })
        }) 
    }  
})()