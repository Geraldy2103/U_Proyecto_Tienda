
(() => { /*"Crea esta función, mete todo este código dentro y ejecútala inmediatamente.Y crea otra ejecución independiente de esa función"*/
    console.log("Proveedores")
    const rutaServicio = window.API_URL + "proveedores.php"
    const tbodyProveedores = document.getElementById("tbody-proveedores")

    fetch(rutaServicio)
        .then(response => response.json())
        .then(data => {
            console.log(data)
            data.forEach(item => {
                const fila = `<tr>
                        <td>${item.idproveedor}</td>
                        <td>${item.nombreempresa}</td>
                        <td>${item.nombrecontacto}</td>
                        <td>${item.cargocontacto}</td>
                      </tr>`
                tbodyProveedores.innerHTML += fila
            });
        })
})()