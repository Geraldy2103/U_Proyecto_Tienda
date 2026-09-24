(() => {
    const tbodyCarrito = document.getElementById("tbody-carrito")
    const btnVaciarCarrito = document.getElementById("btn-vaciar-carrito")
    const cajaTotal = document.getElementById("caja-total")

    let carrito = []

    const calcularTotal = () => {
        const total = carrito.reduce((acumulador, item) => acumulador + (item.precio * item.cantidad), 0) // reduce es un método de los arrays que permite reducir un array a un único valor, en este caso el total de la compra
        cajaTotal.innerText = "S/ " + total.toFixed(2)
    }

    const dibujarCarrito = () => {
        carrito = JSON.parse(sessionStorage.getItem("carritocompras"))
        console.log(carrito)
        carrito.forEach(item => {
            const fila = `<tr>
                <td>${item.idproducto}</td>
                <td>${item.nombre}</td>
                <td class="text-end">${item.precio.toFixed(2)}</td>
                <td class="text-end">${item.cantidad}</td>
                <td class="text-end">${(item.precio * item.cantidad).toFixed(2)}</td>
                <td><i class="fa-regular fa-trash-can icono-eliminar"></i></td> 
            </tr>`
            tbodyCarrito.innerHTML += fila
        });
        calcularTotal()

        const iconosEliminar = tbodyCarrito.querySelectorAll(".icono-eliminar")
        
        iconosEliminar.forEach((iEliminar, index) => {
            iEliminar.addEventListener("click", () => {
                console.log(carrito[index])
                carrito.splice(index, 1)
                sessionStorage.setItem("carritocompras", JSON.stringify(carrito))
                tbodyCarrito.innerHTML = ""
                if(carrito.length>0){
                    dibujarCarrito()
                } else {
                    tbodyCarrito.textContent = "El carrito esta vacío"
                    cajaTotal.textContent = "S/ 0.00"
                }
            })
        })
    }

    if(sessionStorage.getItem("carritocompras")) {
        dibujarCarrito()
    } else{
        tbodyCarrito.textContent = "El carrito esta vacío"
        cajaTotal.innerText = "S/ 0.00"
    } 



    btnVaciarCarrito.addEventListener("click", () => {
        
        sessionStorage.removeItem("carritocompras")
        tbodyCarrito.innerHTML = "El carrito esta vacío"
        cajaTotal.innerText = "S/ 0.00"
    })
})()