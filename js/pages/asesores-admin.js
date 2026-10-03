(() => {
    const tbodyAsesores = document.getElementById("tbody-asesores")
    const avisoAsesores = document.getElementById("aviso-asesores-admin")
    const contadorAsesores = document.getElementById("contador-asesores")
    const btnNuevoAsesor = document.getElementById("btn-nuevo-asesor")
    const formAsesor = document.getElementById("form-asesor")
    const tituloModal = document.getElementById("titulo-modal-asesor")
    const btnGuardar = document.getElementById("btn-guardar-asesor")
    const txtIdAsesor = document.getElementById("txt-idasesor")
    const txtNombres = document.getElementById("txt-nombres-asesor")
    const txtApellidos = document.getElementById("txt-apellidos-asesor")
    const txtCorreo = document.getElementById("txt-correo-asesor")
    const txtFoto = document.getElementById("txt-foto-asesor")
    const cboDirector = document.getElementById("cbo-director")
    const modalAsesor = bootstrap.Modal.getOrCreateInstance(document.getElementById("modal-asesor"))

    const MAXIMO_ASESORES = 10  // la base de datos aplica la misma regla
    let asesores = []

    const mostrarAviso = (texto, tipo) => {
        avisoAsesores.innerHTML = tipo === "danger" ? mensajeError(texto) :
            `<div class="alert alert-${tipo}" role="alert">${texto}</div>`
    }

    /* ---------- LEER ---------- */
    const leerAsesores = () => {
        // directores(...) y dentro sedes(nombre): el asesor trae a su director y la sede del director
        obtenerDatos(db.from("asesores").select("*, directores(nombres, apellidos, sedes(nombre))").order("idasesor"))
            .then(data => {
                asesores = data
                contadorAsesores.textContent = `${data.length} de ${MAXIMO_ASESORES} asesores`
                btnNuevoAsesor.disabled = data.length >= MAXIMO_ASESORES
                btnNuevoAsesor.title = data.length >= MAXIMO_ASESORES ? "Ya hay 10 asesores (es el máximo)" : ""
                if (data.length === 0) {
                    tbodyAsesores.innerHTML = `<tr><td colspan="7" class="text-center">No hay asesores registrados</td></tr>`
                    return
                }
                let filas = ""
                data.forEach(item => {
                    filas += `<tr>
                        <td>${item.idasesor}</td>
                        <td>${escaparHTML(item.nombres + " " + item.apellidos)}</td>
                        <td>${escaparHTML(item.correo || "")}</td>
                        <td>${escaparHTML(item.directores.nombres + " " + item.directores.apellidos)}</td>
                        <td><span class="badge text-bg-secondary">${escaparHTML(item.directores.sedes.nombre)}</span></td>
                        <td><i class="fa-regular fa-pen-to-square icono-actualizar" data-id="${item.idasesor}" title="Editar"></i></td>
                        <td><i class="fa-regular fa-trash-can icono-eliminar" data-id="${item.idasesor}" title="Eliminar"></i></td>
                    </tr>`
                })
                tbodyAsesores.innerHTML = filas
            })
            .catch(error => {
                console.error(error)
                tbodyAsesores.innerHTML = `<tr><td colspan="7">${mensajeError("No se pudo cargar la lista de asesores.")}</td></tr>`
            })
    }

    /* Lista de directores agrupada por sede (<optgroup>) */
    const leerDirectores = () => {
        obtenerDatos(db.from("directores").select("iddirector, nombres, apellidos, sedes(nombre)").order("idsede").order("apellidos"))
            .then(data => {
                const porSede = {}
                data.forEach(d => (porSede[d.sedes.nombre] = porSede[d.sedes.nombre] || []).push(d))
                cboDirector.innerHTML = `<option value="">Elige un director</option>` +
                    Object.entries(porSede).map(([sede, lista]) => `
                        <optgroup label="Sede ${escaparHTML(sede)}">
                            ${lista.map(d => `<option value="${d.iddirector}">${escaparHTML(d.nombres + " " + d.apellidos)}</option>`).join("")}
                        </optgroup>`).join("")
            })
            .catch(error => console.error(error))
    }

    const abrirModal = (asesor) => {
        formAsesor.reset()
        formAsesor.classList.remove("was-validated")
        tituloModal.textContent = asesor ? "Editar asesor" : "Nuevo asesor"
        txtIdAsesor.value = asesor ? asesor.idasesor : ""
        txtNombres.value = asesor ? asesor.nombres : ""
        txtApellidos.value = asesor ? asesor.apellidos : ""
        txtCorreo.value = asesor ? asesor.correo || "" : ""
        txtFoto.value = asesor ? asesor.foto || "" : ""
        cboDirector.value = asesor ? asesor.iddirector : ""
        modalAsesor.show()
    }

    btnNuevoAsesor.addEventListener("click", () => abrirModal())

    tbodyAsesores.addEventListener("click", (event) => {
        const icono = event.target
        const asesor = asesores.find(a => a.idasesor == icono.dataset.id)
        if (!asesor) return

        if (icono.classList.contains("icono-actualizar")) {
            abrirModal(asesor)
        }

        if (icono.classList.contains("icono-eliminar")) {
            if (!confirm(`¿Eliminar al asesor "${asesor.nombres} ${asesor.apellidos}"?\nSus solicitudes también se eliminarán; sus pedidos quedarán sin asesor.`)) return
            obtenerDatos(db.from("asesores").delete().eq("idasesor", asesor.idasesor).select())
                .then(verificarCambio)
                .then(() => {
                    mostrarAviso(`Se eliminó a ${escaparHTML(asesor.nombres + " " + asesor.apellidos)}.`, "success")
                    leerAsesores()
                })
                .catch(error => {
                    console.error(error)
                    mostrarAviso(mensajeDeLaBase(error, "No se pudo eliminar el asesor."), "danger")
                })
        }
    })

    formAsesor.addEventListener("submit", (event) => {
        event.preventDefault()
        txtNombres.value = txtNombres.value.trim()
        txtApellidos.value = txtApellidos.value.trim()
        txtCorreo.value = txtCorreo.value.trim().toLowerCase()
        txtFoto.value = txtFoto.value.trim()
        if (!formAsesor.checkValidity()) {
            formAsesor.classList.add("was-validated")
            return
        }

        const esNuevo = txtIdAsesor.value === ""
        const datos = {
            nombres: txtNombres.value,
            apellidos: txtApellidos.value,
            correo: txtCorreo.value,
            foto: txtFoto.value || null,
            iddirector: Number(cboDirector.value)
        }
        const consulta = esNuevo ?
            db.from("asesores").insert(datos).select() :
            db.from("asesores").update(datos).eq("idasesor", txtIdAsesor.value).select()

        btnGuardar.disabled = true
        obtenerDatos(consulta)
            .then(verificarCambio)
            .then(() => {
                modalAsesor.hide()
                const nombre = escaparHTML(datos.nombres + " " + datos.apellidos)
                mostrarAviso(esNuevo ? `Se registró a ${nombre}.` : `Se actualizaron los datos de ${nombre}.`, "success")
                leerAsesores()
            })
            .catch(error => {
                console.error(error)
                modalAsesor.hide()
                mostrarAviso(mensajeDeLaBase(error, "No se pudo guardar el asesor. Intenta nuevamente."), "danger")
            })
            .finally(() => {
                btnGuardar.disabled = false
            })
    })

    leerDirectores()
    leerAsesores()
})()
