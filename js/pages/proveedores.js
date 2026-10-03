
(() => { /*"Crea esta función, mete todo este código dentro y ejecútala inmediatamente.Y crea otra ejecución independiente de esa función"*/
    const tbodyProveedores = document.getElementById("tbody-proveedores")

    obtenerDatos(db.from("proveedores").select("*").order("idproveedor")) // consulta + revisión de errores (definida en main.js)
        .then(data => {
            if (data.length === 0) {
                tbodyProveedores.innerHTML = `<tr><td colspan="4" class="text-center">No hay proveedores registrados</td></tr>`
                return
            }
            let filas = "" // armamos todas las filas y las pintamos una sola vez
            data.forEach(item => {
                filas += `<tr>
                        <td>${item.idproveedor}</td>
                        <td>${item.nombreempresa}</td>
                        <td>${item.nombrecontacto}</td>
                        <td>${item.cargocontacto}</td>
                      </tr>`
            });
            tbodyProveedores.innerHTML = filas
        })
        .catch(error => {
            console.error(error)
            tbodyProveedores.innerHTML = `<tr><td colspan="4">${mensajeError("No se pudo cargar la lista de proveedores.")}</td></tr>`
        })
})()
