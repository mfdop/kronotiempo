# KRONOTIEMPO — Contexto completo para Claude Code

## Qué es este proyecto
PWA de gestión ganadera para la Yeguada El Tiempo, una ganadería familiar
de ~50 cabezas Appaloosa orientada a doma vaquera y venta de semen.
Es un regalo personal. Sin intención comercial. Coste: solo el dominio.

## Stack tecnológico
- React 18 + TypeScript + Vite
- Tailwind CSS v3 (solo utilities, NO component classes)
- TanStack Query v5 (estado del servidor)
- React Router v6 (navegación)
- Supabase (DB PostgreSQL + Auth + Storage PDFs)
- date-fns (fechas)
- Vercel (deploy automático desde GitHub)
- PWA instalable en iOS/iPad desde Safari

## Reglas de diseño — MUY IMPORTANTES
- Paleta: granate #7B1F3A (primario), arena #F7F3EE (fondo), blanco #FFFFFF (cards)
- NUNCA usar clases de color Tailwind (bg-red-500 etc). SIEMPRE style inline para colores de marca
- Cards: rounded-2xl, border '1px solid rgba(123,31,58,0.11)', background #fff
- Nav bars: background #7B1F3A, texto blanco
- Hero headers: gradient '165deg, #5C1629 0%, #7B1F3A 100%'
- Textos: primary #1C1010, secondary #6B5555, tertiary #A08888
- Estética: iOS nativo, celdas con chevron, tabs horizontales scrollables
- Azulejos: iconos de caballo estilo azulejo cerámico andaluz con borde granate
- Borde discontinuo en azulejo = animal en custodia

## Estructura de navegación (4 tabs principales)
1. **Animales** — lista de caballos agrupada por categoría
2. **Parcelas** — praderas con contadores agua/comida
3. **Clientes** — contactos con historial de transacciones automático
4. **Agenda** — tareas manuales + alertas automáticas del sistema

## Ficha de cada animal (tabs internas, varían por sexo)
- Info (todos) — editable inline
- Genealogía (todos) — árbol 3 gen + edición con picker
- **Vientre** (solo hembras) — embarazos, interesados, comprador
- **Cubriciones** (solo machos) — ventas de semen, envíos, pagos
- Herrado (todos)
- Salud (todos)
- Genética (todos) — fenotipo + genotipo laboratorio + predicción cruce
- Docs (todos) — PDFs en Supabase Storage
- Balance (todos) — resumen económico (venta de vientre SOLO computa en madre)
- **Manutención** (solo custodia) — mensualidades automáticas

## Animales en custodia
- Mismo comportamiento que animales propios
- Diferencia visual: borde discontinuo en azulejo
- Pestaña extra "Manutención" con mensualidades automáticas mensuales
- Tienen campos custody_owner_name y custody_owner_phone

## Lógica de clientes
- Se crean automáticamente al registrar cualquier operación
- Identificadores únicos: teléfono O Instagram (uno de los dos obligatorio)
- Si se intenta crear con teléfono/Instagram existente: error "Teléfono ya utilizado para XXXXX"
- La ficha de cliente agrega automáticamente TODAS sus transacciones (cubriciones + vientres)
- Tags automáticos según transacciones: Cubriciones, Vientre, Interesado, Vendedor

## Cubriciones (ventas de semen) — COMPLEJO
- Una venta tiene precio total = reserva + pago final
- Hasta 3 envíos incluidos: 1º pago completo, 2º y 3º solo si no preña (sin coste extra)
- Estados de envío: prenez / espera / sin_prenez
- Si sin_prenez → se desbloquea el siguiente envío automáticamente
- Fecha estimada de envío → va al calendario iOS via .ics
- Resumen financiero: cobrado real vs estimado (con reservas pendientes)
- Filtros: por año (selector dinámico) y "solo pendientes de preñez"

## Vientre (embarazos) — COMPLEJO
- Cada embarazo tiene: tipo monta (natural/IA), padre, fechas, resultado
- Resultado: gestante / cria_viva / aborto / gemelar / mortinato / no_prenada
- Parto estimado = fecha cubrición + 340 días (auto-calculado)
- Dentro de cada embarazo: tab Interesados + tab Comprador definitivo
- Comprador: reserva + pago entrega, precio en tag verde en el header del embarazo
- Se puede importar un interesado como comprador con un botón
- Precio de venta del vientre SOLO aparece en Balance de la madre (no duplicar)

## Parcelas
- Lista simple (sin mapa)
- Cada card: icono emoji elegible, barra color (low opacity), nombre, ha, nº animales
- Contadores agua y comida: semáforo basado en media histórica automática
  - Verde: dentro de la media
  - Ámbar: superada la mitad de la media → genera alerta en Agenda
  - Rojo: superada la media completa → aparece como tarea "Hoy" en Agenda
- Pulsar contador → toast de confirmación → resetea a hoy + guarda en historial
- Detalle parcela: info + ref catastral + historial agua + historial comida
- Tab Animales dentro de parcela: lista + botón mover (elimina de la otra)

## Agenda
- Secciones en orden: Pendientes (vencidas no completadas) / Hoy / Esta semana / Próximamente (2 semanas) / Completadas
- Tareas manuales: título, descripción, fecha, prioridad
- Alertas automáticas generadas por el sistema (origen en campo `origin`):
  - auto_parto: X días antes del parto estimado
  - auto_herrado: cuando se acerca fecha estimada siguiente herrado
  - auto_vacuna: cuando vence una vacuna
  - auto_agua / auto_comida: cuando parcela llega a ámbar
- Agua/comida en rojo → aparece en "Hoy". En ámbar → aparece en "Esta semana"
- "Próximamente" NO muestra tareas de agua/comida
- Botón "Importar a calendario" → genera .ics con tareas de la semana (sin agua/comida)
- Nota del día: texto libre, una por día, editable directamente en pantalla

## Genética de capas — lógica
- Color base (excluyente): Negro / Castaño / Alazán
- Patrón (excluyente): Lisa / Pío / Appaloosa  
- Marcas adicionales independientes: Careto / Cuatroalbo
- Loci visibles por defecto: Grey, Extension, Agouti, Cream, Pearl, Appaloosa(LP)
- Loci secundarios colapsados: Dun, Silver, Roan, Tobiano, Overo, Sabino
- Predicción de cruce: selector de pareja → % por color base + % por patrón separados
- Grey es epistático (domina sobre todo si tiene al menos un alelo G)

## Balance económico
- Semental: cobrado en cubriciones + crías vendidas - coste adquisición
- Yegua: cobrado en vientres - coste adquisición (las cubriciones del semental no cuentan aquí)
- Potro: su venta aparece SOLO en el Balance de su madre
- Animal custodia: cobrado en manutención
- Timeline cronológico de todos los movimientos

## Fix pendiente — NuevoAnimalPage
Las fechas vacías se envían como string vacío "" en lugar de null.
Arreglo: antes de hacer mutateAsync, convertir cualquier campo de fecha vacío a undefined/null:
```ts
birth_date: form.birth_date || null,
purchase_date: form.purchase_date || null,  // solo si isComprado
```
Fecha de nacimiento NO es obligatoria (quitar validación).
Fecha de compra es completamente opcional (no mostrar si no es comprado).

## Sesiones completadas
- ✅ Sesión 0: Infraestructura, Supabase schema, Auth, deploy Vercel
- ✅ Sesión 1: Lista animales, Ficha shell, TabInfo, TabGenealogy, NuevoAnimal, Azulejo
- ✅ Sesión 2: TabVientre, TabCubriciones (+ 9 bugs UX corregidos en sesión 2b)
- ✅ Sesión 3: TabHerrado, TabSalud, TabDocs
- ✅ Sesión 4: TabGenética, TabBalance, TabManutención + fix fechas NuevoAnimalPage
- ✅ Sesión 5: Parcelas completo (lista + detalle) + Clientes completo (lista + detalle)
- ✅ Sesión 6: Agenda completo
- ✅ Sesión 7: PWA icons, auto-alertas en app level, lazy loading, verificaciones QA

## Notas sesión 7
- PWA icons: icon-192.png + icon-512.png generados desde public/logo.png (JPEG 498×501) con Python Pillow → resize LANCZOS → RGBA PNG. Ya referenciados en index.html (apple-touch-icon) y manifest.json.
- Auto-alertas: componente AutoAlerts() en App.tsx llama useAutoTasks() inmediatamente tras autenticación (no hay que esperar a que el usuario visite /agenda). La ref guard en useAutoTasks evita doble-ejecución.
- Lazy loading: todas las páginas excepto LoginPage y AnimalesPage se cargan con React.lazy + Suspense(fallback=LoadingScreen). Bundle principal pasó de 728KB → 219KB minified (68KB gzip). Total gzipped ~207KB (< 600KB target).
- NuevoAnimalPage: verificado que todos los campos opcionales ya envían null/undefined correcto desde Sesión 4 (birth_date||null, alias||undefined, etc.). Sin cambios necesarios.
- AnimalDetailPage: verificado que getTabs() ya filtra Vientre (yegua/potra), Cubriciones (semental), Manutención (custodia). Sin cambios necesarios.

## Notas sesión 6
- useTasks.ts (nuevo): useTasks() (todas las tareas ordenadas por due_date nullsLast), useCreateTask(), useUpdateTask(), useCompleteTask() (sets status+completed_at), useDailyNote(date), useUpsertDailyNote() (upsert onConflict owner_id,date), useAutoTasks() (effect con ref guard: queries pregnancies gestantes ≤14 días, shoeing_records overdue, vaccines overdue → createAutoTask si no existe ya pendiente con mismo origin|animal_id)
- AgendaPage: nota del día (textarea + debounce 1s → upsert); 5 secciones en orden estricto: PENDIENTES (accent rojo, tareas vencidas o sin fecha), HOY (accent granate), ESTA SEMANA (accent ámbar, 1-6 días), PRÓXIMAMENTE (accent gris, 7-13 días, sin auto_agua/comida), COMPLETADAS HOY
- Cada tarea: checkbox circular (tap → completeTask), badges prioridad/Auto/📅, borde ámbar izquierdo en tareas auto
- Auto badge muestra "Auto · Parto|Herrado|Vacuna|Agua|Comida". 📅 badge en tareas manuales con fecha
- FAB + granate (fijo bottom-20 right-5) → NewTaskSheet con: título, notas, date picker, chips prioridad Baja/Media/Alta
- Botón "📅 Exportar" en header → ical-generator default import → ICS con tareas de today+week+soon, excluye auto_agua/auto_comida, descarga kronotiempo_semana.ics
- ical-generator v10 API: import ical from 'ical-generator'; cal = ical({name}); cal.createEvent({start,end,summary,description}); cal.toString()
- SQL pendiente: tabla tasks (id, owner_id, title, description, due_date, status, origin, animal_id, priority, completed_at, created_at)
- SQL pendiente: tabla daily_notes (id, owner_id, date, content, updated_at) + UNIQUE(owner_id, date)

## Notas sesión 3
- Hooks añadidos a useReproduction.ts: useShoeingRecords, useCreateShoeingRecord, useHealthEpisodes, useCreateHealthEpisode, useUpdateHealthEpisode, useVaccines, useCreateVaccine, useAnimalDocs, useCreateAnimalDoc, useDeleteAnimalDoc, createAutoTask
- TabHerrado: banner ámbar/rojo próximo herrado, stats, historial con badges de tipo, sheet add con auto-task auto_herrado
- TabSalud: estado general semáforo, vacunas con semáforo (verde/ámbar/rojo) y auto-sugestión de próxima fecha, episodios con tap para cambiar estado, sheets add episodio y add vacuna con auto-task auto_vacuna
- TabDocs: chips filtro, upload zone → Supabase Storage bucket 'animal-docs', path {user_id}/{animal_id}/{ts}_{filename}, preview con signed URL, delete con confirmación
- SQL pendiente: el bucket 'animal-docs' debe crearse en Supabase Storage (public: false, tamaño: sin límite)
- SQL pendiente: columnas grandparent externas en animals (sire_gs_external_name, sire_gd_external_name, dam_gs_external_name, dam_gd_external_name) — ver sesión 2b

## Notas sesión 4
- Hooks añadidos a useReproduction.ts: useAnimalGenetics, useUpsertAnimalGenetics, usePregnancySalesForMare, useMaintenanceFees, useCreateMaintenanceFee, useMaintenanceEntries, useCreateMaintenanceEntry, useUpdateMaintenanceEntry
- TabGenética: fenotipo inline (coat_base/pattern/marcas → animals table), genotipo 6+6 loci en sheet editable, PDF lab → bucket 'genetics-docs', predicción cruce Mendeliana con epistasis Grey
- TabBalance: semental (cubriciones + crías vendidas − adquisición), yegua (vientres + crías − adquisición), custodia (manutención cobrada), otros (solo adquisición). Timeline cronológico
- TabManutención (solo custodia): configurar mensualidad, auto-crear entrada mes actual si falta, toggle pagado/pendiente inline, sumario cobrado/pendiente
- SQL pendiente: bucket 'genetics-docs' en Supabase Storage (public: false)
- SQL pendiente: tabla animal_genetics (id, animal_id, grey, extension, agouti, cream, pearl, appaloosa, dun, silver, roan, tobiano, overo, sabino, lab_pdf_path, lab_date, lab_institution, notes, updated_at)
- SQL pendiente: tabla maintenance_fees (id, animal_id, monthly_amount, effective_from, notes, created_at)
- SQL pendiente: tabla maintenance_entries (id, animal_id, fee_id, month, amount, payment_status, paid_date, created_at)
- Fix NuevoAnimalPage: fechas vacías → null, strings vacíos → undefined en payload

## Notas sesión 5
- useMeadows.ts: useMeadows (con nested logs+animals), useMeadow, useUpdateMeadow, useMeadowWaterLogs, useMeadowFoodLogs, useLogWater, useLogFood. Helper computeWaterFoodStatus(logs[], defaultAvg) + statusTextColor(status)
- ParcelasPage: lista cards con band color, emoji, contador animales, agua (días + semáforo), comida. ConfirmToast + auto-task auto_agua/auto_comida por sesión (ref guard)
- ParcelasDetailPage: hero con emoji+color, tabs Info/Animales. Tab Info: big buttons agua/comida, historial 10 registros c/u, info editable. Tab Animales: lista con Azulejo, Mover (sheet destino), +Añadir (picker animales). EditMeadowSheet con color+emoji picker. Ruta: /parcelas/:id
- useReproduction.ts: useClientSummaries (clients con semen_sales+pregnancy_sales+pregnancy_interested embed → tags+totales), useClientById, useClientTransactions (3 arrays paralelas)
- ClientesPage: buscador en header granate, chips filtro (Todos/Cubriciones/Vientres/Interesados/Con deuda), cards con avatar inicial, tags de color, stats 3 columnas. Ruta: /clientes
- ClienteDetailPage: hero con avatar inicial, tags chips, total cobrado/pendiente. Card contacto con tel (llamada directa), @instagram, ciudad, yeguada, notas. Historial unificado con icono por tipo (💉cubricion, 🐴vientre, ⭐interesado), importe, badge pago, fecha. Ruta: /clientes/:id
- App.tsx: añadidas rutas /parcelas/:id y /clientes/:id
- SQL pendiente: tablas meadows, meadow_water_logs, meadow_food_logs deben existir con FK meadow_id. FK client_id en semen_sales, pregnancy_sales, pregnancy_interested
- El campo "vendedor" de ClientTagType no se implementa (requeriría join inverso desde animals.sold_client_id → fácil de añadir en sesión futura)

## Sesiones completadas (continuación)
- ✅ Sesión 8: Eliminación de entidades con doble confirmación desde la webapp

## Notas sesión 8
- ui/index.tsx: componente DeleteZone reutilizable con 2-step (tap → ¿Seguro? → Sí, eliminar). Importa useState.
- useReproduction.ts: añade useDeletePregnancy(mareId), useDeleteSemenSale(stallionId), useDeleteClient()
- useMeadows.ts: añade useDeleteMeadow()
- TabInfo.tsx: useDeleteAnimal + useNavigate → DeleteZone al final → navega a /animales al borrar
- TabVientre.tsx: useDeletePregnancy en PregnancyDetailSheet → DeleteZone al final del sheet
- TabCubriciones.tsx: useDeleteSemenSale en SaleDetailSheet (recibe stallionId nuevo prop) → DeleteZone al final
- TabDocs.tsx: reemplaza confirm() nativo por 2-step inline en DocRow (estado delStep 0/1)
- ClienteDetailPage.tsx: useDeleteClient → DeleteZone al final de la lista de transacciones → navega a /clientes
- ParcelasDetailPage.tsx: useDeleteMeadow → DeleteZone al final del tab Info → navega a /parcelas

## Sesiones pendientes
- (ninguna — proyecto completado)

## ✅ Sesión 10: Bug fixes (6 bugs)

### Bugs corregidos
1. **TabGenealogy — abuelos no se guardaban**: `handleSelect` para `sire_gs/sire_gd/dam_gs/dam_gd` usaba solo `extName` (siempre `''` cuando se selecciona un animal de la app). Fix: `selected?.name || extName || undefined`.
2. **TabCubriciones — "pendiente" mostraba el total**: El valor mostrado era `estimado` (total acordado) en vez de `estimado - cobrado`. Fix: cambiar a `(estimado - cobrado)` y etiquetar como "Pendiente de cobrar".
3. **TabGenetica — genotipos no se guardaban visiblemente**: 
   - Añadido error state (`saveError`) en `EditLociSheet` con feedback visible cuando la mutación falla.
   - Añadido botón "Guardar datos" para los campos de metadatos del laboratorio (`lab_date`, `lab_institution`) que antes solo se guardaban al subir un PDF.
   - **NOTA**: Si persiste el error, es un problema de RLS en Supabase. Ejecutar el SQL de la sección de deudas técnicas.
4. **TabDocs — RLS error al subir**: Problema de políticas RLS en Supabase Storage (no en el código). Ver SQL en deudas técnicas.
5. **ClienteDetailPage — transacciones no eran clickables**: 
   - `useClientTransactions` actualizado para hacer join con `pregnancies!inner(id, mare_id)` en pregSales e interested.
   - `TxItem` añadido campo `animalId`.
   - `TxRow` convertido en `<button>` cuando hay `animalId`, navega a `/animales/:id`.
6. **TabVientre — resumen financiero y precio por fila**:
   - Añadido `usePregnancySalesForMare` para obtener todas las ventas de vientre de la yegua.
   - Card granate en la parte superior con cobrado/pendiente (igual que TabCubriciones).
   - Cada fila de embarazo muestra un badge de precio si existe una venta vinculada.

### Deuda técnica — SQL pendiente en Supabase

#### RLS para tabla `animal_genetics`
```sql
CREATE POLICY "Users manage own genetics" ON animal_genetics
  FOR ALL USING (
    auth.uid() = (SELECT owner_id FROM animals WHERE id = animal_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM animals WHERE id = animal_id)
  );
```

#### RLS para bucket `animal-docs` (Storage)
```sql
CREATE POLICY "Users can upload their animal docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'animal-docs' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can read their animal docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'animal-docs' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete their animal docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'animal-docs' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);
```

#### Columna faltante en animals
```sql
ALTER TABLE animals ADD COLUMN IF NOT EXISTS azulejo_spot_ink TEXT DEFAULT '#1A100C';
```

## Archivos clave a leer para entender el proyecto
1. src/types/index.ts — TODAS las entidades TypeScript
2. src/lib/constants.ts — paleta, opciones, loci genéticos
3. src/lib/supabase.ts — cliente
4. src/hooks/useAuth.tsx — autenticación
5. src/hooks/useAnimals.ts — CRUD animales
6. src/hooks/useReproduction.ts — pregnancies, semen, clients
7. src/components/ui/index.tsx — primitivos UI reutilizables
8. src/components/ui/ClientPicker.tsx — selector/creador de clientes
9. src/components/horse/Azulejo.tsx — icono azulejo + customizer
10. src/components/horse/TabVientre.tsx — patrón de referencia para tabs complejas
11. src/components/layout/AppLayout.tsx — navegación principal
12. src/App.tsx — router completo

## Comandos útiles
```bash
npm run dev      # desarrollo local
npm run build    # verificar TypeScript + build
git add -A && git commit -m "mensaje" && git push  # deploy a Vercel
```

## Variables de entorno necesarias (.env)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
