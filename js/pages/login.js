(() => {
    const avisoLogin = document.getElementById("aviso-login")
    const formIngresar = document.getElementById("form-ingresar")
    const formRegistro = document.getElementById("form-registro")
    const txtCorreoIngreso = document.getElementById("txt-correo-ingreso")
    const txtClaveIngreso = document.getElementById("txt-clave-ingreso")
    const txtNombreRegistro = document.getElementById("txt-nombre-registro")
    const txtCorreoRegistro = document.getElementById("txt-correo-registro")
    const txtClaveRegistro = document.getElementById("txt-clave-registro")

    /* Supabase responde los errores en inglés: los traducimos para el usuario */
    const traducirError = (error) => {
        const mensaje = (error && error.message) || ""
        if (mensaje.includes("Invalid login credentials")) return "Correo o contraseña incorrectos."
        if (mensaje.includes("Email not confirmed")) return "Primero confirma tu correo (revisa tu bandeja de entrada)."
        if (mensaje.includes("already registered")) return "Ya existe una cuenta con ese correo. Inicia sesión."
        if (mensaje.includes("Password should be")) return "La contraseña debe tener al menos 6 caracteres."
        if (mensaje.includes("rate limit")) return "Demasiados intentos. Espera unos minutos y vuelve a intentar."
        return "No se pudo completar la operación. Intenta nuevamente."
    }

    /* Revisa los campos con las reglas del HTML (required, type="email", minlength).
       Si algo está mal, Bootstrap pinta en rojo y muestra el texto de .invalid-feedback */
    const formularioValido = (form) => {
        form.classList.add("was-validated")
        return form.checkValidity()
    }

    /* Desactiva el botón mientras se espera la respuesta (evita doble clic) */
    const esperando = (form, activo) => {
        form.querySelector("button[type=submit]").disabled = activo
    }

    /* ---------- Iniciar sesión ---------- */
    formIngresar.addEventListener("submit", (event) => {
        event.preventDefault()
        avisoLogin.innerHTML = ""
        if (!formularioValido(formIngresar)) return

        esperando(formIngresar, true)
        db.auth.signInWithPassword({ email: txtCorreoIngreso.value.trim(), password: txtClaveIngreso.value })
            .then(({ error }) => {
                if (error) throw error
                return alIniciarSesion() // definida en main.js: carga el rol, rehace el menú y cambia de página
            })
            .catch(error => {
                console.error(error)
                avisoLogin.innerHTML = mensajeError(traducirError(error))
                esperando(formIngresar, false)
            })
    })

    /* ---------- Crear cuenta ---------- */
    formRegistro.addEventListener("submit", (event) => {
        event.preventDefault()
        avisoLogin.innerHTML = ""
        txtNombreRegistro.value = txtNombreRegistro.value.trim()
        if (!formularioValido(formRegistro)) return

        esperando(formRegistro, true)
        db.auth.signUp({
            email: txtCorreoRegistro.value.trim(),
            password: txtClaveRegistro.value,
            // "data" se guarda con el usuario; el trigger de la base lo copia a la tabla perfiles
            options: { data: { nombre: txtNombreRegistro.value } }
        })
            .then(({ data, error }) => {
                if (error) throw error
                if (data.session) { // la cuenta quedó lista y con sesión abierta
                    return alIniciarSesion()
                }
                // si Supabase pide confirmar el correo, todavía no hay sesión
                avisoLogin.innerHTML = `<div class="alert alert-info">
                    Te enviamos un correo para confirmar tu cuenta. Después inicia sesión.</div>`
                formRegistro.reset()
                formRegistro.classList.remove("was-validated")
                esperando(formRegistro, false)
            })
            .catch(error => {
                console.error(error)
                avisoLogin.innerHTML = mensajeError(traducirError(error))
                esperando(formRegistro, false)
            })
    })
})()
