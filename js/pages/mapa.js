(() => {
    const aviso = document.getElementById("aviso-mapa")
    const lista = document.getElementById("lista-sedes")

    /* Integración con la base: el nombre y la dirección de cada sede se leen de la tabla "sedes"
       (la misma que usan Checkout y Directores). Si la tabla tiene las columnas latitud/longitud
       (supabase/06_monitoreo.sql) se usan; si no, estas coordenadas aproximadas por código de sede. */
    const COORDENADAS = {
        1: { lat: -12.1301, lng: -77.0297 },   // Miraflores · Av. José Larco 1150
        2: { lat: -12.0968, lng: -77.0362 },   // San Isidro · Av. Camino Real 1050
        3: { lat: -12.0567, lng: -77.1432 }    // Callao · Av. Sáenz Peña 600
    }

    // Si la base no responde, la página igual muestra las 3 sedes
    const SEDES_RESPALDO = [
        { idsede: 1, nombre: "Miraflores", direccion: "Av. José Larco 1150", distrito: "Miraflores" },
        { idsede: 2, nombre: "San Isidro", direccion: "Av. Camino Real 1050", distrito: "San Isidro" },
        { idsede: 3, nombre: "Callao", direccion: "Av. Sáenz Peña 600", distrito: "Callao" }
    ]

    const leerSedes = () => obtenerDatos(db.from("sedes").select("*").order("idsede"))
        .catch(error => {
            console.error(error)
            return SEDES_RESPALDO
        })

    // Leaflet se carga una sola vez desde cdnjs (mapa libre de OpenStreetMap, sin clave)
    const cargarLeaflet = () => new Promise((resolver, rechazar) => {
        if (window.L) return resolver()
        const css = document.createElement("link")
        css.rel = "stylesheet"
        css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css"
        document.head.appendChild(css)
        const js = document.createElement("script")
        js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"
        js.onload = resolver
        js.onerror = () => rechazar(new Error("No se pudo descargar Leaflet"))
        document.head.appendChild(js)
    })

    Promise.all([cargarLeaflet(), leerSedes()])
        .then(([, filas]) => {
            const sedes = filas.map(s => ({
                ...s,
                lat: s.latitud ?? (COORDENADAS[s.idsede] || {}).lat,
                lng: s.longitud ?? (COORDENADAS[s.idsede] || {}).lng
            })).filter(s => s.lat !== undefined && s.lng !== undefined)

            const mapa = L.map("mapa-sedes").setView([-12.09, -77.07], 11)
            L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "&copy; OpenStreetMap"
            }).addTo(mapa)

            lista.innerHTML = ""
            sedes.forEach(sede => {
                const nombre = escaparHTML(sede.nombre)
                const direccion = escaparHTML(`${sede.direccion || ""}${sede.distrito ? ", " + sede.distrito : ""}`)
                const marcador = L.marker([sede.lat, sede.lng]).addTo(mapa)
                marcador.bindPopup(`<strong>Sede ${nombre}</strong><br>${direccion}`)

                const boton = document.createElement("button")
                boton.type = "button"
                boton.className = "list-group-item list-group-item-action"
                boton.innerHTML = `<strong>${nombre}</strong><br><small>${direccion}</small>`
                boton.addEventListener("click", () => {
                    mapa.flyTo([sede.lat, sede.lng], 16)
                    marcador.openPopup()
                    // en celular el mapa queda debajo de la lista: lo traemos a la vista
                    document.getElementById("mapa-sedes").scrollIntoView({ behavior: "smooth", block: "center" })
                })
                lista.appendChild(boton)
            })

            // que se vean las 3 sedes, sea cual sea el tamaño de pantalla
            if (sedes.length > 0) mapa.fitBounds(sedes.map(s => [s.lat, s.lng]), { padding: [40, 40] })
        })
        .catch(error => {
            console.error(error)
            aviso.innerHTML = mensajeError("No se pudo cargar el mapa. Intenta nuevamente.")
        })
})()
