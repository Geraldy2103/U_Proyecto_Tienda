(() => { /*"Crea esta función, mete todo este código dentro y ejecútala inmediatamente.Y crea otra ejecución independiente de esa función"*/

    const rutaServicio = window.API_URL + "directores.php"
    const tbodyDirectores = document.getElementById("tbody-directores")
    const formInsertar = document.getElementById("form-insertar")
    const txtNombres = document.getElementById("txt-nombres")
    const txtPeliculas = document.getElementById("txt-peliculas")

    obtenerJSON(rutaServicio)
        .then(data => {
            if (data.length === 0) {
                tbodyDirectores.innerHTML = `<tr><td colspan="5" class="text-center">No hay directores registrados</td></tr>`
                return
            }
            let filas = ""
            data.forEach(item => {
                filas += `<tr>
                        <td>${item.iddirector}</td>
                        <td>${item.nombres}</td>
                        <td>${item.peliculas}</td>
                        <td><i class="fa-regular fa-pen-to-square icono-actualizar"></i></td>
                        <td><i class="fa-regular fa-trash-can icono-eliminar"></i></td>
                      </tr>`
            });
            tbodyDirectores.innerHTML = filas
        })
        .catch(error => {
            console.error(error)
            tbodyDirectores.innerHTML = `<tr><td colspan="5">${mensajeError("No se pudo cargar la lista de directores.")}</td></tr>`
        })

    formInsertar.addEventListener("submit", (event) => { // es un "escucha": cuando el formulario se envía (al pulsar el botón Guardar), ejecuta el código de la función.//(event) → tengo el objeto y puedo, por ejemplo, frenar la recarga // () → no puedo frenar la recarga, no tengo el objeto
        event.preventDefault()                          // evita que el formulario recargue la página
        console.log(txtNombres.value, txtPeliculas.value) // (fase 3: aquí se enviará a la API)
    })
})()
