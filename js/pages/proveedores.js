
(() => { /*"Crea esta función, mete todo este código dentro y ejecútala inmediatamente.Y crea otra ejecución independiente de esa función"*/
    const tbodyProveedores = document.getElementById("tbody-proveedores")

    // resumen_proveedores es una vista: cada proveedor con sus productos, ventas y margen
    obtenerDatos(db.from("resumen_proveedores").select("*").order("ventas", { ascending: false }))
        .then(data => {
            if (data.length === 0) {
                tbodyProveedores.innerHTML = `<tr><td colspan="8" class="text-center">No hay proveedores registrados</td></tr>`
                return
            }
            let filas = "" // armamos todas las filas y las pintamos una sola vez
            data.forEach(item => {
                const porcentajeMargen = Number(item.ventas) > 0 ? (item.margen / item.ventas * 100).toFixed(0) + "%" : ""
                filas += `<tr>
                        <td>${escaparHTML(item.nombreempresa)}<br>
                            <small class="text-body-secondary">${escaparHTML(item.ciudad || "")}, ${escaparHTML(item.pais || "")}</small></td>
                        <td>${escaparHTML(item.nombrecontacto || "")}<br>
                            <small class="text-body-secondary">${escaparHTML(item.cargocontacto || "")}</small></td>
                        <td class="text-nowrap">${escaparHTML(item.telefono || "")}</td>
                        <td class="text-center">${item.productos}</td>
                        <td class="text-center">${item.por_reponer > 0 ?
                            `<span class="badge text-bg-danger">${item.por_reponer}</span>` : "0"}</td>
                        <td class="text-end">${item.unidades_vendidas}</td>
                        <td class="text-end text-nowrap">${soles(item.ventas)}</td>
                        <td class="text-end text-nowrap">${soles(item.margen)} <small class="text-body-secondary">${porcentajeMargen}</small></td>
                      </tr>`
            });
            tbodyProveedores.innerHTML = filas
        })
        .catch(error => {
            console.error(error)
            tbodyProveedores.innerHTML = `<tr><td colspan="8">${mensajeError("No se pudo cargar la lista de proveedores.")}</td></tr>`
        })
})()
