# POS Moderno

Punto de venta para cafeterías, restaurantes, heladerías, panaderías y comidas rápidas. Pensado para tablet horizontal (1280 × 800), funciona también en computador.

## Arrancar

```bash
npm install
npm run dev
```

Abre http://localhost:5173. La primera vez pide el tipo de negocio, el nombre y el administrador (con opción de datos de ejemplo).

Otros comandos: `npm test` (pruebas), `npm run build` (versión para publicar en `dist/`).

## Dónde se guardan los datos

En el navegador del equipo: los datos en localStorage y las fotos del menú y las copias en IndexedDB. No necesita internet. Por eso es importante hacer **copias de seguridad** desde *Ajustes › Copias de seguridad*: se descarga un archivo `.backup` (con las fotos) que se puede restaurar en otra tablet.

Para pasar a la nube: ver [docs/supabase.md](docs/supabase.md). El esquema, el traductor de datos y el script de migración ya están listos.

## Módulos

| Pantalla | Qué hace |
|---|---|
| Menú | Productos, precios, categorías, fotos (subir o tomar con la cámara), opciones y qué está a la venta |
| Caja | Menú del negocio con fotos, opciones por producto (sabores, término, leche…), cobro o envío a cocina por mesa |
| Mesas | Plano de salón y terraza, abrir mesa, pedir cuenta, cobrar, reservar, mover (solo Restaurante) |
| Órdenes | Tablero de cocina: Nuevas → En preparación → Listas → Entregadas |
| Inventario | Insumos con mínimo, estado (suficiente / por reponer / agotado), entradas y ajustes de conteo |
| Reportes | Ventas por hora/día/semana, más vendidos, medios de pago, cierre de caja, exportar CSV |
| Contabilidad | Ingresos (desde la caja), gastos por categoría, utilidad, impuesto por declarar |
| Ajustes | Tipo de negocio, logo, color, impuesto, usuarios y roles, copias de seguridad |

## Código

- `src/data/catalogs.ts` — menú inicial de los 5 tipos de negocio (después se edita en la pantalla Menú).
- `src/data/roles.ts` — qué puede hacer cada rol.
- `src/lib/cart.ts` — precios con opciones, impuestos y totales (con pruebas).
- `src/lib/stats.ts` — cálculos de reportes (con pruebas).
- `src/store.ts` — todos los datos y acciones de la app.
- `src/screens/` — una pantalla por módulo.
- `src/lib/images.ts` — fotos de productos (se achican a 800 px y se guardan en IndexedDB).
- `src/lib/supabaseMap.ts`, `scripts/migrar-a-supabase.ts`, `supabase/migrations/` — paso a Supabase.

## Usuarios y PIN

- Cada usuario puede tener un PIN de 4 números. Se pide al cambiar a esa persona (botón de usuarios en la Caja o *Todos los módulos*).
- El administrador pone, cambia o quita los PIN en *Ajustes › Usuarios y roles*. Al empezar se pide el PIN del administrador.
- Se guarda solo un resumen cifrado (SHA-256), nunca el número. Tras 5 intentos fallidos se bloquea 30 segundos.
- Los usuarios sin PIN aparecen marcados como "Sin PIN": cualquiera puede entrar como ellos.
- Si se olvida el PIN del único administrador, la salida es restaurar una copia o borrar los datos del navegador.

## Pendiente

- Descontar insumos del inventario automáticamente al vender (requiere recetas).
- Conectar la app a Supabase en vivo (inicio de sesión y sincronización). Ver lo que falta en [docs/supabase.md](docs/supabase.md).
