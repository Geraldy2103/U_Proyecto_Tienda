(() => {
    const tbodySolicitudes = document.getElementById("tbody-solicitudes")
    const avisoSolicitudes = document.getElementById("aviso-solicitudes")
    const filtros = document.querySelectorAll("input[name=filtro-estado]")

    /* "2026-10-03T15:20:00Z" -> "03/10/2026 10:20" (hora de Perú) */
    const formatearFecha = (texto) => new Date(texto).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })

    const leerSolicitudes = () => {
        const estado = document.querySelector("input[name=filtro-estado]:checked").value

        // perfiles(...) y empleados(...) traen los datos relacionados (como un JOIN de SQL)
        let consulta = db.from("solicitudes_mayoristas")
            .select("*, perfiles(nombre, correo), empleados(nombres, apellidos)")
            .order("fecha", { ascending: false })
        if (estado !== "todas") {
            consulta = consulta.eq("estado", estado)
        }

        obtenerDatos(consulta)
            .then(data => {
                if (data.length === 0) {
                    tbodySolicitudes.innerHTML = `<tr><td colspan="6" class="text-center">No hay solicitudes</td></tr>`
                    return
                }
                let filas = ""
                data.forEach(item => {
                    const productos = item.productos
                        .map(p => `${escaparHTML(p.nombre)} <span class="text-nowrap">× ${p.cantidad}</span>`)
                        .join("<br>")
                    const botonEstado = item.estado === "pendiente" ?
                        `<button class="btn btn-sm btn-success btn-atender" data-id="${item.idsolicitud}">
                            <i class="fa-solid fa-check"></i> Marcar atendida</button>` :
                        `<span class="badge text-bg-secondary">Atendida</span>`
                    filas += `<tr>
                        <td class="text-nowrap">${formatearFecha(item.fecha)}</td>
                        <td>${escaparHTML(item.perfiles.nombre || "")}<br>
                            <small><a href="mailto:${escaparHTML(item.perfiles.correo || "")}">${escaparHTML(item.perfiles.correo || "")}</a></small></td>
                        <td>${escaparHTML(item.empleados.nombres + " " + item.empleados.apellidos)}</td>
                        <td>${productos}</td>
                        <td>${escaparHTML(item.mensaje || "")}</td>
                        <td>${botonEstado}</td>
                    </tr>`
                })
                tbodySolicitudes.innerHTML = filas
            })
            .catch(error => {
                console.error(error)
                tbodySolicitudes.innerHTML = `<tr><td colspan="6">${mensajeError("No se pudieron cargar las solicitudes.")}</td></tr>`
            })
    }

    /* Marcar como atendida */
    tbodySolicitudes.addEventListener("click", (event) => {
        const boton = event.target.closest(".btn-atender")
        if (!boton) return
        boton.disabled = true
        obtenerDatos(db.from("solicitudes_mayoristas").update({ estado: "atendida" })
                .eq("idsolicitud", boton.dataset.id).select())
            .then(verificarCambio)
            .then(() => {
                avisoSolicitudes.innerHTML = ""
                leerSolicitudes()
            })
            .catch(error => {
                console.error(error)
                boton.disabled = false
                avisoSolicitudes.innerHTML = mensajeError("No se pudo actualizar la solicitud.")
            })
    })

    filtros.forEach(f => f.addEventListener("change", leerSolicitudes))
    leerSolicitudes()
})()
