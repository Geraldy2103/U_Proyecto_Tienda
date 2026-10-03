(() => { /*"Crea esta función, mete todo este código dentro y ejecútala inmediatamente."*/

    const tbodyDirectores = document.getElementById("tbody-directores")
    const avisoDirectores = document.getElementById("aviso-directores")
    const btnNuevoDirector = document.getElementById("btn-nuevo-director")
    const formDirector = document.getElementById("form-director")
    const tituloModal = document.getElementById("titulo-modal-director")
    const btnGuardar = document.getElementById("btn-guardar-director")
    const txtIdDirector = document.getElementById("txt-iddirector")
    const txtNombres = document.getElementById("txt-nombres")
    const txtApellidos = document.getElementById("txt-apellidos")
    const txtCorreo = document.getElementById("txt-correo")
    const cboSede = document.getElementById("cbo-sede")

    /* Objeto de Bootstrap para abrir y cerrar el modal desde JavaScript */
    const modalDirector = bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-director"))

    const MAXIMO_POR_SEDE = 3   // la base de datos aplica la misma regla
    let directores = []         // última lista leída, para buscar un director por su código
    let sedes = []

    /* Muestra un aviso arriba de la tabla. tipo: "success" (verde) o "danger" (rojo) */
    const mostrarAviso = (texto, tipo) => {
        avisoDirectores.innerHTML = tipo === "danger" ? mensajeError(texto) :
            `<div class="alert alert-${tipo}" role="alert">${texto}</div>`
    }

    /* ---------- LEER (Read) ---------- */
    const leerDirectores = () => {
        // sedes(nombre) y asesores(count) traen datos de las tablas relacionadas
        obtenerDatos(db.from("directores").select("*, sedes(nombre), asesores(count)").order("idsede").order("apellidos"))
            .then(data => {
                directores = data
                if (data.length === 0) {
                    tbodyDirectores.innerHTML = `<tr><td colspan="7" class="text-center">No hay directores registrados</td></tr>`
                    return
                }
                let filas = ""
                data.forEach(item => {
                    filas += `<tr>
                            <td>${item.iddirector}</td>
                            <td>${escaparHTML(item.nombres + " " + item.apellidos)}</td>
                            <td>${escaparHTML(item.correo || "")}</td>
                            <td><span class="badge text-bg-secondary">${escaparHTML(item.sedes.nombre)}</span></td>
                            <td class="text-center">${item.asesores[0].count}</td>
                            <td><i class="fa-regular fa-pen-to-square icono-actualizar" data-id="${item.iddirector}" title="Editar"></i></td>
                            <td><i class="fa-regular fa-trash-can icono-eliminar" data-id="${item.iddirector}" title="Eliminar"></i></td>
                          </tr>`
                });
                tbodyDirectores.innerHTML = filas
            })
            .catch(error => {
                console.error(error)
                tbodyDirectores.innerHTML = `<tr><td colspan="7">${mensajeError("No se pudo cargar la lista de directores.")}</td></tr>`
            })
    }

    /* Llena la lista de sedes del formulario, indicando cuántos directores tiene cada una */
    const llenarSedes = (idsedeActual) => {
        cboSede.innerHTML = `<option value="">Elige una sede</option>` + sedes.map(sede => {
            const cantidad = directores.filter(d => d.idsede === sede.idsede).length
            // una sede llena no se puede elegir, salvo que sea la del director que estamos editando
            const llena = cantidad >= MAXIMO_POR_SEDE && sede.idsede !== idsedeActual
            return `<option value="${sede.idsede}" ${llena ? "disabled" : ""}>
                ${escaparHTML(sede.nombre)} (${cantidad}/${MAXIMO_POR_SEDE})</option>`
        }).join("")
        cboSede.value = idsedeActual || ""
    }

    /* Abre el modal vacío (insertar) o con los datos de un director (actualizar) */
    const abrirModal = (director) => {
        formDirector.reset()
        formDirector.classList.remove("was-validated")
        if (director) {
            tituloModal.textContent = "Editar director"
            txtIdDirector.value = director.iddirector
            txtNombres.value = director.nombres
            txtApellidos.value = director.apellidos
            txtCorreo.value = director.correo || ""
            llenarSedes(director.idsede)
        } else {
            tituloModal.textContent = "Nuevo director"
            txtIdDirector.value = ""
            llenarSedes(null)
        }
        modalDirector.show()
    }

    btnNuevoDirector.addEventListener("click", () => abrirModal())

    /* Un solo "escucha" en el tbody para todos los iconos (delegación de eventos) */
    tbodyDirectores.addEventListener("click", (event) => {
        const icono = event.target
        const director = directores.find(d => d.iddirector == icono.dataset.id)
        if (!director) return

        if (icono.classList.contains("icono-actualizar")) {
            abrirModal(director)
        }

        /* ---------- ELIMINAR (Delete) ---------- */
        if (icono.classList.contains("icono-eliminar")) {
            if (director.asesores[0].count > 0) { // la base también lo impide
                mostrarAviso("No se puede eliminar: primero reasigna sus asesores a otro director (en la página Asesores).", "danger")
                return
            }
            if (!confirm(`¿Eliminar al director "${director.nombres} ${director.apellidos}"?`)) return
            obtenerDatos(db.from("directores").delete().eq("iddirector", director.iddirector).select())
                .then(verificarCambio)
                .then(() => {
                    mostrarAviso(`Se eliminó a ${escaparHTML(director.nombres + " " + director.apellidos)}.`, "success")
                    leerDirectores()
                })
                .catch(error => {
                    console.error(error)
                    mostrarAviso(mensajeDeLaBase(error, "No se pudo eliminar el director. Intenta nuevamente."), "danger")
                })
        }
    })

    /* ---------- GUARDAR: insertar (Create) o actualizar (Update) ---------- */
    formDirector.addEventListener("submit", (event) => {
        event.preventDefault()                          // evita que el formulario recargue la página

        txtNombres.value = txtNombres.value.trim()
        txtApellidos.value = txtApellidos.value.trim()
        txtCorreo.value = txtCorreo.value.trim().toLowerCase()
        if (!formDirector.checkValidity()) {
            formDirector.classList.add("was-validated") // Bootstrap pinta en rojo los campos mal llenados
            return
        }

        const esNuevo = txtIdDirector.value === ""
        const datos = {
            nombres: txtNombres.value,
            apellidos: txtApellidos.value,
            correo: txtCorreo.value,
            idsede: Number(cboSede.value)
        }
        const consulta = esNuevo ?
            db.from("directores").insert(datos).select() :
            db.from("directores").update(datos).eq("iddirector", txtIdDirector.value).select()

        btnGuardar.disabled = true // evita que un doble clic guarde dos veces
        obtenerDatos(consulta)
            .then(verificarCambio)
            .then(() => {
                modalDirector.hide()
                const nombre = escaparHTML(datos.nombres + " " + datos.apellidos)
                mostrarAviso(esNuevo ? `Se registró a ${nombre}.` : `Se actualizaron los datos de ${nombre}.`, "success")
                leerDirectores()
            })
            .catch(error => {
                console.error(error)
                modalDirector.hide()
                mostrarAviso(mensajeDeLaBase(error, "No se pudo guardar el director. Intenta nuevamente."), "danger")
            })
            .finally(() => {
                btnGuardar.disabled = false
            })
    })

    obtenerDatos(db.from("sedes").select("*").order("idsede"))
        .then(data => sedes = data)
        .catch(error => console.error(error))
    leerDirectores()
})()
