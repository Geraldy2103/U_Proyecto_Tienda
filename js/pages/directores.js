(() => { /*"Crea esta función, mete todo este código dentro y ejecútala inmediatamente.Y crea otra ejecución independiente de esa función"*/

    const rutaServicio = window.API_URL + "directores.php"
    const tbodyDirectores = document.getElementById("tbody-directores")
    const formInsertar = document.getElementById("form-insertar")
    const txtNombres = document.getElementById("txt-nombres")
    const txtPeliculas = document.getElementById("txt-peliculas")

    fetch(rutaServicio)
        .then(response => response.json())
        .then(data => {
            console.log(data)
            data.forEach(item => {
                const fila = `<tr>
                        <td>${item.iddirector}</td>
                        <td>${item.nombres}</td>
                        <td>${item.peliculas}</td>
                        <td><i class="fa-regular fa-pen-to-square icono-actualizar"></i></td>
                        <td><i class="fa-regular fa-trash-can icono-eliminar"></i></td>
                      </tr>`
                tbodyDirectores.innerHTML += fila
            });
        })

    formInsertar.addEventListener("submit", (event) => { // es un "escucha": cuando el formulario se envía (al pulsar el botón Guardar), ejecuta el código de la función.//(event) → tengo el objeto y puedo, por ejemplo, frenar la recarga // () → no puedo frenar la recarga, no tengo el objeto
        console.log("Hola")                             // sin esto la página se recarga al enviar 
        console.log(txtNombres.value, txtPeliculas.value)                         
    })
})()
