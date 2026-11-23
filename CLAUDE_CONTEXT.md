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
- **Vientre** (solo hembras) — embarazos y comprador
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
- Tags automáticos según transacciones: Cubriciones, Vientre, Vendedor

## Cubriciones (ventas de semen) — COMPLEJO
- Una venta tiene un precio acordado que se paga en N pagos (tabla `payments`)
- Hasta 5 envíos (intentos): el siguiente se desbloquea si el anterior es sin_prenez (sin coste extra)
- Estados de envío: prenez / espera / sin_prenez
- Si sin_prenez → se desbloquea el siguiente envío automáticamente
- Fecha estimada de envío → va al calendario iOS via .ics
- Resumen financiero: cobrado real (suma de pagos) vs precio acordado
- Filtros: por año (selector dinámico) y "solo pendientes de preñez"

## Vientre (embarazos) — COMPLEJO
- Cada embarazo tiene: tipo monta (natural/IA), padre, fechas, resultado
- Resultado: gestante / cria_viva / aborto / gemelar / mortinato / no_prenada
- Parto estimado = fecha cubrición + 340 días (auto-calculado)
- Dentro de cada embarazo: tab Info + tab Comprador (se crea/selecciona con ClientPicker y queda como cliente normal)
- Comprador: precio acordado + pagos parciales (PaymentsPanel); precio en tag del header del embarazo
- Precio de venta del vientre SOLO aparece en Balance de la madre (no duplicar)

## Parcelas
- Lista simple (sin mapa)
- Cada card: icono emoji elegible, barra color (low opacity), nombre, ha, nº animales
- Contadores agua y comida: semáforo basado en media histórica automática
  - Verde: dentro de la media
  - Ámbar: superada la mitad de la media
  - Rojo: superada la media completa
  - Solo semáforo visual en Parcelas; NO se generan tareas automáticas de agua/comida en Agenda
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
- Ya no se generan tareas auto_agua / auto_comida (las antiguas que queden en BD se ocultan)
- Botón "Importar a calendario" → genera .ics con tareas de la semana
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
- ✅ Sesión 12: 8 bugfixes (azulejo legs overflow, parcelas animal list refresh, genealogy grandparent picker, agenda water/food dedup, parcelas media 1 decimal, TabInfo pradera real name, cliente edit inline, TabVientre notas interesados)
- ✅ Sesión 13: Azulejo pezuñas (T y-offset 631→611) + Historial de praderas popup en TabInfo
- ✅ Post-sesión: vercel.json SPA rewrite (fix 404 en refresh), PWA icons actualizados (icon-192.png, icon-512.png), logo.png actualizado, seed_demo.sql + seed_demo_purge.sql creados
- ✅ Sesión 14: Edición inline del embarazo en TabVientre (tab Info)
- ✅ Sesión 15: Fases 1-3 de cambios (ver notas)

## Notas sesión 15 (fases 1-3, migraciones en /migrations)
- Fase 1 (77de13d): fix guardado fecha de envío de semen (upsert por semen_sale_id+attempt_number), razas, etiqueta UELN, vacuna West Nile, balance de semental (solo cubriciones), eliminadas las tareas automáticas de agua/comida.
- Fase 2 (2ceeb76, migrations/002_phase2.sql): parcelas con `has_water`, media de comida aprendida, herrado solo completo/recorte/perdida con próximo a 90 días, hasta 5 envíos de semen, datos de la yegua en cubriciones (nacimiento, chip, UELN), locus PATN1, DNI en clientes.
- Fase 3 (migrations/003_phase3.sql, destructiva, solo datos demo):
  - Eliminado el concepto "Interesados" (tabla `pregnancy_interested`, hooks, tag 'interesado', chip y historial en Clientes). El comprador de un vientre se elige/crea en TabVientre con ClientPicker y es un cliente normal.
  - Nueva tabla `payments` (pagos parciales de `pregnancy_sales` o `semen_sales`, check de exactamente un id de venta, RLS por owner_id). Se eliminan `deposit_amount`, `final_amount`, `payment_status` de ambas tablas de ventas (migrados a payments).
  - Estado de pago DERIVADO (src/lib/payments.ts `summarizePayments`): sin_pagos (suma 0) / parcial / completo (suma >= precio acordado); pendiente = max(0, precio - suma).
  - UI: `PaymentsPanel` (lista de pagos, pagado/pendiente/progreso, "+ Añadir pago", borrar con confirmación) en el comprador del vientre y en el detalle de cubrición; formularios de creación con "Pago inicial" opcional. Balance, Clientes (totales y filtro "Con deuda") y ClienteDetail leen de payments.
  - seed_demo.sql / seed_demo_purge.sql actualizados al nuevo esquema.

## Notas sesión 14
- TabVientre.tsx: `PregnancyDetailSheet` — añadido modo edición en el tab Info.
- Campos editables: tipo de monta (toggle natural/IA), veterinario (solo IA), padre (selector sementales propios + nombre externo), fecha cubrición, confirmación ecografía, parto estimado (auto-recalculado al cambiar cubrición + 340 días, editable manualmente), fecha real de parto, notas.
- Flujo: vista de solo lectura con botón «✏️ Editar información» → formulario inline → «Guardar cambios» llama `useUpdatePregnancy.mutateAsync()` → éxito cierra el modo edición.
- Los campos opcionales se envían como `undefined` (no `null`) para respetar el tipo `Partial<Pregnancy>`.
- `useAnimals` añadido a `PregnancyDetailSheet` para el picker de sementales propios.
- `useEffect` en `TabVientre` padre mantiene `selected` sincronizado con el array `pregnancies` refrescado tras el guardado, de modo que el sheet muestra los datos actualizados sin cerrarse.

## Notas sesión 13
- Azulejo.tsx: constante T reducida de Y=631 a Y=611 (−20 viewBox units). Todos los paths (cuerpo, clipPaths, manchas, calcetines) comparten el mismo T, por lo que el caballo sube uniformemente sin desalineaciones. SVG mantiene overflow:visible de sesión 12.
- useMeadows.ts: añadido tipo `MeadowHistoryEntry` y hook `useAnimalMeadowHistory(animalId)` — consulta `animal_meadow_history` con join `meadows(name, icon_emoji)`, ordenado DESC por entered_at.
- TabInfo.tsx: fila «Historial de praderas» en sección Ubicación. Botón «Ver (N) ›» abre BottomSheet con lista de movimientos. Entrada con left_at=null muestra badge verde «Actual». Retorno envuelto en Fragment `<>` para permitir BottomSheet como sibling.

## Notas sesión 12
- Azulejo.tsx: `overflow: visible` en el SVG para que las patas (P_BODY y > 495 viewBox) no se recorten. El tile con overflow:hidden actúa de clip natural.
- TabInfo.tsx: «Pradera actual» muestra nombre real via `useMeadow(animal.meadow_id)`. Botón «Ver ›» navega a `/parcelas/:id`.
- TabGenealogy.tsx: condición picker abuelos simplificada de `!sire && !!sire_external_name` a `!sire`. Añadido feedback de error en fallo de guardado.
- useAnimals.ts: `useUpdateAnimal.onSuccess` ahora invalida también `['animals-meadow']` → lista de animales en parcela se refresca al instante.
- useMeadows.ts: `computeWaterFoodStatus` usa 1 decimal (`Math.round(...*10)/10`). ParcelasDetailPage muestra filas «Media relleno agua» y «Media relleno comida» con >= 2 registros.
- AgendaPage: `classifyTasks` lleva un `Set` de claves `origin:title` para evitar duplicados de agua/comida por parcela.
- ClienteDetailPage: botón «Editar» en tarjeta contacto. Formulario inline con nombre, teléfono, Instagram, ciudad, yeguada y notas via `useUpsertClient`.

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
- ClientesPage: buscador en header granate, chips filtro (Todos/Cubriciones/Vientres/Con deuda), cards con avatar inicial, tags de color, stats 3 columnas. Ruta: /clientes
- ClienteDetailPage: hero con avatar inicial, tags chips, total cobrado/pendiente. Card contacto con tel (llamada directa), @instagram, ciudad, yeguada, notas. Historial unificado con icono por tipo (💉cubricion, 🐴vientre), importe, badge pago, fecha. Ruta: /clientes/:id
- App.tsx: añadidas rutas /parcelas/:id y /clientes/:id
- SQL pendiente: tablas meadows, meadow_water_logs, meadow_food_logs deben existir con FK meadow_id. FK client_id en semen_sales, pregnancy_sales, pregnancy_interested
- El campo "vendedor" de ClientTagType no se implementa (requeriría join inverso desde animals.sold_client_id → fácil de añadir en sesión futura)

## Estado del deploy
- **Vercel**: deploy automático desde `main`. `vercel.json` con rewrite SPA activo (fix 404 en refresh).
- **PWA**: manifest apunta a `icon-192.png` e `icon-512.png`. Para cambiar icono instalado hay que reinstalar la PWA en el móvil.
- **Datos demo**: `seed_demo.sql` en raíz del proyecto (16 caballos, 4 parcelas, 6 clientes, vientres, cubriciones, herrado, salud, agenda). Purgar con `seed_demo_purge.sql` antes de entregar a producción.

## Sesiones pendientes
- Sesión 7: QA final, test iPhone real, entrega

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
