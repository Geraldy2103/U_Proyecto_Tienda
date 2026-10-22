-- =====================================================================
-- El Galpón del Costo — Rol ASESOR
-- Un asesor comercial ve y atiende SOLO sus solicitudes y pedidos, y los datos de sus clientes.
-- La cuenta se vincula por correo: el correo de la tabla asesores debe ser el de su cuenta.
-- Ejecutar en Supabase > SQL Editor sobre una base ya creada (no borra nada; se puede repetir).
-- =====================================================================

-- 1. El rol 'asesor' se suma a 'cliente' y 'admin'
alter table perfiles drop constraint if exists perfiles_rol_check;
alter table perfiles add constraint perfiles_rol_check check (rol in ('cliente', 'asesor', 'admin'));

-- 2. ¿Qué asesor es quien consulta? (null si no es asesor)
create or replace function mi_idasesor() returns integer
language sql stable security definer set search_path = public as $$
    select a.idasesor
    from perfiles pf
    join asesores a on lower(a.correo) = lower(pf.correo)
    where pf.id = auth.uid() and pf.rol = 'asesor'
    limit 1;
$$;

-- 3. Reglas de seguridad: el asesor solo ve lo suyo
drop policy if exists "asesor ve sus pedidos" on pedidos;
create policy "asesor ve sus pedidos" on pedidos for select to authenticated
    using (idasesor = mi_idasesor());

drop policy if exists "asesor actualiza sus pedidos" on pedidos;
create policy "asesor actualiza sus pedidos" on pedidos for update to authenticated
    using (idasesor = mi_idasesor()) with check (idasesor = mi_idasesor());

drop policy if exists "asesor ve el detalle de sus pedidos" on pedido_detalle;
create policy "asesor ve el detalle de sus pedidos" on pedido_detalle for select to authenticated
    using (exists (select 1 from pedidos p where p.idpedido = pedido_detalle.idpedido and p.idasesor = mi_idasesor()));

drop policy if exists "asesor ve sus solicitudes" on solicitudes_mayoristas;
create policy "asesor ve sus solicitudes" on solicitudes_mayoristas for select to authenticated
    using (idasesor = mi_idasesor());

drop policy if exists "asesor atiende sus solicitudes" on solicitudes_mayoristas;
create policy "asesor atiende sus solicitudes" on solicitudes_mayoristas for update to authenticated
    using (idasesor = mi_idasesor()) with check (idasesor = mi_idasesor());

-- Nombre y correo de SUS clientes (los que le pidieron o compraron con él)
drop policy if exists "asesor ve a sus clientes" on perfiles;
create policy "asesor ve a sus clientes" on perfiles for select to authenticated
    using (exists (select 1 from pedidos p where p.idusuario = perfiles.id and p.idasesor = mi_idasesor())
        or exists (select 1 from solicitudes_mayoristas s where s.idusuario = perfiles.id and s.idasesor = mi_idasesor()));

-- 4. Cotizar envíos: el admin o el asesor del pedido
create or replace function cotizar_envio(p_idpedido integer, p_costo numeric) returns void
language plpgsql security definer set search_path = public as $$
begin
    if not (es_admin() or exists (select 1 from pedidos where idpedido = p_idpedido and idasesor = mi_idasesor())) then
        raise exception 'Solo el administrador o el asesor del pedido pueden cotizar este envío.';
    end if;
    if p_costo is null or p_costo < 0 or p_costo > 5000 then
        raise exception 'Ingresa un costo de envío válido.';
    end if;
    update pedidos set costo_envio = p_costo, total = subtotal + p_costo, estado = 'cotizado'
        where idpedido = p_idpedido and estado = 'por_cotizar';
    if not found then
        raise exception 'El pedido no existe o ya no está por cotizar.';
    end if;
end;
$$;

-- Al anular un pedido el stock vuelve; la función corre con permisos del dueño
-- para que también funcione cuando anula un asesor (que no puede editar productos)
alter function devolver_stock_al_anular() security definer set search_path = public;

-- 5. Dar o quitar acceso (solo admin). Busca la cuenta con el mismo correo del asesor.
create or replace function dar_acceso_asesor(p_idasesor integer) returns text
language plpgsql security definer set search_path = public as $$
declare v_correo text;
begin
    if not es_admin() then raise exception 'Solo un administrador puede dar acceso.'; end if;
    select correo into v_correo from asesores where idasesor = p_idasesor;
    if v_correo is null then raise exception 'El asesor no tiene correo registrado.'; end if;
    update perfiles set rol = 'asesor' where lower(correo) = lower(v_correo) and rol <> 'admin';
    if not found then
        raise exception 'No hay una cuenta creada con el correo %. Pídele que se registre primero en la página.', v_correo;
    end if;
    return v_correo;
end;
$$;

create or replace function quitar_acceso_asesor(p_idasesor integer) returns void
language plpgsql security definer set search_path = public as $$
begin
    if not es_admin() then raise exception 'Solo un administrador puede quitar acceso.'; end if;
    update perfiles set rol = 'cliente'
        where rol = 'asesor' and lower(correo) = (select lower(correo) from asesores where idasesor = p_idasesor);
end;
$$;

revoke execute on function mi_idasesor() from public, anon;
grant  execute on function mi_idasesor() to authenticated;
revoke execute on function dar_acceso_asesor(integer) from public, anon;
grant  execute on function dar_acceso_asesor(integer) to authenticated;
revoke execute on function quitar_acceso_asesor(integer) from public, anon;
grant  execute on function quitar_acceso_asesor(integer) to authenticated;
