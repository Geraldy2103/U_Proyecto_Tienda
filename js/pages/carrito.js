(() => {
    const tbodyCarrito = document.getElementById("tbody-carrito")
    const btnVaciarCarrito = document.getElementById("btn-vaciar-carrito")
    const btnSeguirComprando = document.getElementById("btn-seguir-comprando")
    const cajaTotal = document.getElementById("caja-total")
    const resumenCarrito = document.getElementById("resumen-carrito")

    let carrito = leerCarrito() // definida en main.js: no falla aunque el dato guardado esté dañado

    const calcularTotal = () => {
        const total = carrito.reduce((acumulador, item) => acumulador + (item.precio * item.cantidad), 0) // reduce es un método de los arrays que permite reducir un array a un único valor, en este caso el total de la compra
        cajaTotal.innerText = "S/ " + total.toFixed(2)
    }

    /* Dibuja la tabla completa a partir del array carrito.
       Se llama al inicio y después de cada cambio (sumar, restar, quitar, vaciar). */
    const dibujarCarrito = () => {
        btnVaciarCarrito.disabled = carrito.length === 0 // no tiene sentido vaciar un carrito vacío

        if (carrito.length === 0) {
            // Mensaje dentro de una fila de la tabla para no romper el HTML
            tbodyCarrito.innerHTML = `<tr><td colspan="6" class="text-center">El carrito está vacío</td></tr>`
            resumenCarrito.textContent = ""
            calcularTotal()
            return
        }

        let filas = ""
        carrito.forEach((item, index) => {
            // data-index guarda la posición del producto en el array para saber cuál se tocó
            filas += `<tr>
                <td>${item.idproducto}</td>
                <td>${escaparHTML(item.nombre)}</td>
                <td class="text-end">${item.precio.toFixed(2)}</td>
                <td class="text-center text-nowrap">
                    <button class="btn btn-sm btn-outline-secondary btn-cantidad" data-index="${index}" data-cambio="-1"
                        title="Quitar uno" ${item.cantidad === 1 ? "disabled" : ""}>
                        <i class="fa-solid fa-minus"></i>
                    </button>
                    <span class="cantidad-carrito">${item.cantidad}</span>
                    <button class="btn btn-sm btn-outline-secondary btn-cantidad" data-index="${index}" data-cambio="1"
                        title="Agregar uno">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </td>
                <td class="text-end">${(item.precio * item.cantidad).toFixed(2)}</td>
                <td><i class="fa-regular fa-trash-can icono-eliminar" data-index="${index}" title="Quitar del carrito"></i></td>
            </tr>`
        })
        tbodyCarrito.innerHTML = filas

        const unidades = carrito.reduce((suma, item) => suma + item.cantidad, 0)
        resumenCarrito.textContent = `${carrito.length} producto(s), ${unidades} unidad(es)`
        calcularTotal()
    }

    /* Guarda en sessionStorage (y actualiza el contador del menú) y vuelve a dibujar */
    const guardarYDibujar = () => {
        guardarCarrito(carrito)
        dibujarCarrito()
    }

    /* Un solo "escucha" para todos los botones de la tabla (delegación de eventos).
       closest() sube desde lo que se clickeó (puede ser el ícono <i>) hasta el botón. */
    tbodyCarrito.addEventListener("click", (event) => {
        const botonCantidad = event.target.closest(".btn-cantidad")
        const iconoEliminar = event.target.closest(".icono-eliminar")

        if (botonCantidad) {
            const item = carrito[botonCantidad.dataset.index]
            item.cantidad += Number(botonCantidad.dataset.cambio) // +1 o -1
            if (item.cantidad < 1) item.cantidad = 1             // nunca menos de 1; para quitarlo está la papelera
            guardarYDibujar()
        }

        if (iconoEliminar) {
            carrito.splice(iconoEliminar.dataset.index, 1) // splice quita 1 elemento en esa posición
            guardarYDibujar()
        }
    })

    btnVaciarCarrito.addEventListener("click", () => {
        if (!confirm("¿Seguro que quieres vaciar el carrito?")) return
        carrito = []
        guardarYDibujar()
    })

    btnSeguirComprando.addEventListener("click", () => irAPagina("Tienda"))

    dibujarCarrito()
})()
