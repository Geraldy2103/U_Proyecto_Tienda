(() => {
    const rutaServicio = window.API_URL + "empleados.php"
    const cuadriculaEmpleados = document.getElementById("cuadricula-empleados")
    const precarga = document.getElementById("precarga")
    cuadriculaEmpleados.style.display = "none" /*oculta el elemento const cuadriculaEmpleados de la página."*/

    obtenerJSON(rutaServicio)
        .then(data => {
            if (data.length === 0) {
                cuadriculaEmpleados.insertAdjacentHTML("beforebegin", `<p>No hay empleados registrados.</p>`)
                return
            }
            let cards = ""
            data.forEach(item => {
                cards += `
                <div class="col">
                    <div class="card">
                        <img src="${window.API_URL + item.foto}" class="card-img-top" alt="${item.nombres} ${item.apellidos}">
                         <div class="card-body">
                             <h5 class="card-title">${item.nombres +" "+ item.apellidos}</h5>
                             <p class="card-text">${item.cargo}</p>
                        </div>
                    </div>
                </div>`
            })
            cuadriculaEmpleados.innerHTML = cards
            cuadriculaEmpleados.style.display = "flex" /*muestra el elemento const cuadriculaEmpleados de la página."*/
        })
        .catch(error => {
            console.error(error)
            cuadriculaEmpleados.insertAdjacentHTML("beforebegin", mensajeError("No se pudo cargar la lista de empleados."))
        })
        .finally(() => {
            precarga.style.display = "none" /*la precarga se oculta siempre: haya funcionado o no*/
        })
})()