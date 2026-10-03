(() => { /*"Crea esta función, mete todo este código dentro y ejecútala inmediatamente.Y crea otra ejecución independiente de esa función"*/

    const tbodyDirectores = document.getElementById("tbody-directores")
    const avisoDirectores = document.getElementById("aviso-directores")
    const btnNuevoDirector = document.getElementById("btn-nuevo-director")
    const formDirector = document.getElementById("form-director")
    const tituloModal = document.getElementById("titulo-modal-director")
    const btnGuardar = document.getElementById("btn-guardar-director")
    const txtIdDirector = document.getElementById("txt-iddirector")
    const txtNombres = document.getElementById("txt-nombres")
    const txtPeliculas = document.getElementById("txt-peliculas")

    /* Objeto de Bootstrap para abrir y cerrar el modal desde JavaScript */
    const modalDirector = bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-director"))

    let directores = [] // copia de la última lista leída, para buscar un director por su código

    /* Muestra un aviso arriba de la tabla. tipo: "success" (verde) o "danger" (rojo) */
    const mostrarAviso = (texto, tipo) => {
        avisoDirectores.innerHTML = tipo === "danger" ? mensajeError(texto) :
            `<div class="alert alert-${tipo}" role="alert">${texto}</div>`
    }

    /* ---------- LEER (Read) ---------- */
    const leerDirectores = () => {
        obtenerDatos(db.from("directores").select("*").order("iddirector"))
            .then(data => {
                directores = data
                if (data.length === 0) {
                    tbodyDirectores.innerHTML = `<tr><td colspan="5" class="text-center">No hay directores registrados</td></tr>`
                    return
                }
                let filas = ""
                data.forEach(item => {
                    // escaparHTML: el texto lo escribe el usuario, así se muestra tal cual y no como HTML
                    filas += `<tr>
                            <td>${item.iddirector}</td>
                            <td>${escaparHTML(item.nombres)}</td>
                            <td>${escaparHTML(item.peliculas)}</td>
                            <td><i class="fa-regular fa-pen-to-square icono-actualizar" data-id="${item.iddirector}" title="Editar"></i></td>
                            <td><i class="fa-regular fa-trash-can icono-eliminar" data-id="${item.iddirector}" title="Eliminar"></i></td>
                          </tr>`
                });
                tbodyDirectores.innerHTML = filas
            })
            .catch(error => {
                console.error(error)
                tbodyDirectores.innerHTML = `<tr><td colspan="5">${mensajeError("No se pudo cargar la lista de directores.")}</td></tr>`
            })
    }

    /* Abre el modal vacío (insertar) o con los datos de un director (actualizar) */
    const abrirModal = (director) => {
        formDirector.reset()
        formDirector.classList.remove("was-validated")
        if (director) {
            tituloModal.textContent = "Editar director"
            txtIdDirector.value = director.iddirector
            txtNombres.value = director.nombres
            txtPeliculas.value = director.peliculas
        } else {
            tituloModal.textContent = "Nuevo director"
            txtIdDirector.value = ""
        }
        modalDirector.show()
    }

    btnNuevoDirector.addEventListener("click", () => abrirModal())

    /* Un solo "escucha" en el tbody para todos los iconos (delegación de eventos):
       funciona aunque las filas se vuelvan a dibujar después de cada cambio. */
    tbodyDirectores.addEventListener("click", (event) => {
        const icono = event.target
        const director = directores.find(d => d.iddirector == icono.dataset.id)
        if (!director) return

        /* ---------- ACTUALIZAR (Update): abre el modal con sus datos ---------- */
        if (icono.classList.contains("icono-actualizar")) {
            abrirModal(director)
        }

        /* ---------- ELIMINAR (Delete) ---------- */
        if (icono.classList.contains("icono-eliminar")) {
            if (!confirm(`¿Eliminar al director "${director.nombres}"?`)) return
            // DELETE FROM directores WHERE iddirector = ...
            obtenerDatos(db.from("directores").delete().eq("iddirector", director.iddirector).select())
                .then(verificarCambio)
                .then(() => {
                    mostrarAviso(`Se eliminó a ${escaparHTML(director.nombres)}.`, "success")
                    leerDirectores()
                })
                .catch(error => {
                    console.error(error)
                    mostrarAviso("No se pudo eliminar el director. Intenta nuevamente.", "danger")
                })
        }
    })

    /* ---------- GUARDAR: insertar (Create) o actualizar (Update) ---------- */
    formDirector.addEventListener("submit", (event) => { // es un "escucha": cuando el formulario se envía (al pulsar el botón Guardar), ejecuta el código de la función.
        event.preventDefault()                          // evita que el formulario recargue la página

        // quitamos espacios al inicio y al final; así "    " no cuenta como un nombre válido
        txtNombres.value = txtNombres.value.trim()
        txtPeliculas.value = txtPeliculas.value.trim()
        if (!formDirector.checkValidity()) {            // vuelve a revisar required y minlength
            formDirector.classList.add("was-validated") // Bootstrap pinta en rojo los campos mal llenados
            return
        }

        const esNuevo = txtIdDirector.value === ""
        const datos = { nombres: txtNombres.value, peliculas: txtPeliculas.value }

        // INSERT INTO directores ... o UPDATE directores SET ... WHERE iddirector = ...
        const consulta = esNuevo ?
            db.from("directores").insert(datos).select() :
            db.from("directores").update(datos).eq("iddirector", txtIdDirector.value).select()

        btnGuardar.disabled = true // evita que un doble clic guarde dos veces
        obtenerDatos(consulta)
            .then(verificarCambio)
            .then(() => {
                modalDirector.hide()
                mostrarAviso(esNuevo ? `Se registró a ${escaparHTML(datos.nombres)}.` :
                    `Se actualizaron los datos de ${escaparHTML(datos.nombres)}.`, "success")
                leerDirectores()
            })
            .catch(error => {
                console.error(error)
                modalDirector.hide()
                mostrarAviso("No se pudo guardar el director. Intenta nuevamente.", "danger")
            })
            .finally(() => {
                btnGuardar.disabled = false
            })
    })

    leerDirectores()
})()
