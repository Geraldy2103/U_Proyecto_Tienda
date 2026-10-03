(() => {
    const rutaServicio = window.API_URL + "empleados.php"
    const cuadriculaEmpleados = document.getElementById("cuadricula-empleados")
    const precarga = document.getElementById("precarga")
    cuadriculaEmpleados.style.display = "none" /*oculta el elemento const cuadriculaEmpleados de la página."*/

    fetch(rutaServicio)
        .then(response => response.json())
        .then(data => {
            data.forEach(item => {
                const card = `            
                <div class="col">
                    <div class="card">
                        <img src="${window.API_URL + item.foto}" class="card-img-top" alt="${item.nombres} ${item.apellidos}">
                         <div class="card-body">
                             <h5 class="card-title">${item.nombres +" "+ item.apellidos}</h5>
                             <p class="card-text">${item.cargo}</p>
                        </div>
                    </div>
                </div>`
                cuadriculaEmpleados.innerHTML += card
            })
            cuadriculaEmpleados.style.display = "flex" /*muestra el elemento const cuadriculaEmpleados de la página."*/
            precarga.style.display = "none" /*oculta el elemento const precarga de la página."*/
        })
})()