# Pasar POS Moderno a Supabase

Hoy la app guarda todo en la tablet (navegador). Este documento explica qué ya está listo para Supabase y los pasos para migrar cuando se decida.

## Qué ya está listo

| Pieza | Dónde | Qué hace |
|---|---|---|
| Esquema de base de datos | `supabase/migrations/20261024120000_esquema_inicial.sql` | 15 tablas, índices, `updated_at` automático, seguridad por fila (RLS) y el bucket privado `product-images` |
| Traductor de datos | `src/lib/supabaseMap.ts` (con pruebas) | Convierte una copia `.backup` en filas para cada tabla y en archivos para Storage |
| Script de migración | `scripts/migrar-a-supabase.ts` | Sube una copia a un proyecto de Supabase; se puede repetir sin duplicar |
| Ids | `src/lib/format.ts` (`uid`) | Todo lo nuevo se crea con UUID, el mismo formato de Supabase |

## Cómo está organizado

- **Un negocio = una fila en `businesses`.** Todas las demás tablas tienen `business_id`, así una misma base puede tener varios locales.
- **Cuentas de Supabase (`auth.users`)** entran a un negocio por `business_members` (rol `owner`, `manager` o `device`). Una tablet puede iniciar sesión con una cuenta tipo `device`.
- **El personal de la caja** (cajeros, baristas, administradores con PIN) está en `staff`. No son cuentas de Supabase: el PIN se sigue validando en la tablet.
- **RLS:** cada cuenta solo ve y cambia filas de los negocios a los que pertenece. Los negocios nuevos se crean con la función `create_business(nombre, tipo)`, que deja a quien la llama como dueño.
- **Fotos:** bucket privado `product-images`, ruta `<business_id>/<product_id>.jpg`. Solo los miembros del negocio las leen o suben.

| Tabla | Viene de |
|---|---|
| `businesses` | Ajustes (nombre, NIT, tipo, color, impuesto, logo, contador de órdenes) |
| `staff` | Usuarios y roles (con `pin_hash` y `pin_salt`) |
| `categories`, `products` | Menú (opciones en `products.options`, formato JSON) |
| `zones`, `dining_tables` | Zonas del local y mesas (plano y estado) |
| `orders`, `order_items` | Órdenes y lo que se pidió |
| `sales`, `sale_items` | Cobros y lo que se vendió (nombre y precio del momento) |
| `cash_closures` | Cierres de caja |
| `inventory_items`, `inventory_moves` | Inventario y sus movimientos |
| `expenses` | Gastos de Contabilidad |

## Pasos para migrar

1. **Crear el proyecto** en supabase.com (región São Paulo, la más cercana a Colombia).
2. **Aplicar el esquema**, con la CLI de Supabase (`supabase db push`) o pegando el archivo SQL en el SQL Editor del panel.
3. **Crear la cuenta del dueño** en Authentication › Users y copiar su UUID.
4. **En la tablet:** Ajustes › Copias de seguridad › *Crear copia ahora*. Se descarga un archivo `.backup` que incluye las fotos.
5. **Probar sin enviar nada:**
   ```bash
   npm run migrar:supabase -- --archivo pos-moderno-copia.backup --negocio <uuid-nuevo> --prueba
   ```
   Muestra cuántas filas van a cada tabla. Para `<uuid-nuevo>` sirve cualquier UUID (por ejemplo de uuidgenerator.net).
6. **Subir de verdad** con la llave `service_role` (Project Settings › API). Esa llave nunca va en la app, solo en el computador desde el que se migra:
   ```bash
   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run migrar:supabase -- --archivo pos-moderno-copia.backup --negocio <uuid-nuevo> --dueno <uuid-del-dueño>
   ```
7. **Revisar en el panel** (Table Editor y Storage) que estén las ventas, el menú y las fotos.

## Lo que falta en la app para trabajar contra Supabase

El esquema y los datos están listos. La app todavía lee y escribe en el navegador. Para conectarla falta:

- **Inicio de sesión** con Supabase Auth (cuenta del negocio o de la tablet), antes de la pantalla de PIN.
- **Capa de datos:** cambiar las acciones de `src/store.ts` para que además escriban en Supabase (con `@supabase/supabase-js` y la llave `anon`), y leer al abrir la app. La forma recomendada es mantener lo local como caché y sincronizar, para que la caja siga funcionando si se cae el internet.
- **Fotos:** al subir una foto, guardarla en `product-images` en vez de (o además de) IndexedDB, y mostrarla con una URL firmada.
- **Número de orden:** con varias cajas a la vez conviene sacarlo de una función en la base de datos, para que no se repita.
- **PIN:** se valida en la tablet. Si se quiere que ni los miembros del negocio puedan leer `pin_hash`, mover la validación a una función `security definer`.
