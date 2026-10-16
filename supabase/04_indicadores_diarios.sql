-- =====================================================================
-- El Galpón del Costo — Función para Indicadores por período
-- Ejecutar UNA vez en Supabase > SQL Editor sobre una base ya creada
-- (no borra nada). Ya está incluida en 01_esquema.sql para instalaciones nuevas.
-- =====================================================================

create or replace function indicadores_diarios()
returns table (fecha date, idsede integer, sede text, tipo text, idasesor integer,
               pedidos integer, ventas numeric, margen numeric)
language sql stable security definer set search_path = public as $$
    select (p.fecha at time zone 'America/Lima')::date, p.idsede, s.nombre, p.tipo, p.idasesor,
           count(*)::int,
           sum(p.subtotal),
           coalesce(sum((select sum(d.margen) from pedido_detalle d where d.idpedido = p.idpedido)), 0)
    from pedidos p
    join sedes s on s.idsede = p.idsede
    where es_admin() and p.estado <> 'anulado' and p.pago_estado = 'pagado'
    group by 1, 2, 3, 4, 5;
$$;

revoke execute on function indicadores_diarios() from public, anon;
grant  execute on function indicadores_diarios() to authenticated;
