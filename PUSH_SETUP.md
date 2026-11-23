# Notificaciones push — puesta en marcha

Las claves VAPID se han generado fuera del repositorio (archivo `vapid_keys.json` en la carpeta temporal de la sesión; copia el contenido a un lugar seguro). La clave **pública** ya está en `.env.example`. La **privada** nunca debe subirse a Git.

## 1. Base de datos

En el SQL Editor de Supabase:

1. Ejecuta `migrations/004_push.sql` (tabla `push_subscriptions`).
2. Abre `migrations/005_push_cron.sql`, sustituye `<PROJECT_REF>` (la parte `xxxx` de `https://xxxx.supabase.co`) y `<CRON_SECRET>` (una cadena aleatoria larga que inventes, la misma del paso 3) y ejecútalo.
   - Programa el envío diario a las 07:00 UTC = 08:00 en Madrid en invierno / 09:00 en verano.
   - Si `pg_cron`/`pg_net` dan error, actívalos antes en Database → Extensions.

## 2. Desplegar la función

Con la CLI (desde la raíz del proyecto):

```
npx supabase login
npx supabase functions deploy send-reminders --project-ref <PROJECT_REF> --no-verify-jwt
```

(`supabase/config.toml` ya marca `verify_jwt = false`; la función valida ella misma al usuario o el secreto.)

Alternativa sin CLI: Dashboard → Edge Functions → Deploy a new function (editor) → nombre `send-reminders`, pega `supabase/functions/send-reminders/index.ts` y desactiva "Verify JWT".

## 3. Secretos de la función

```
npx supabase secrets set --project-ref <PROJECT_REF> \
  VAPID_PUBLIC_KEY=<publicKey> \
  VAPID_PRIVATE_KEY=<privateKey> \
  VAPID_SUBJECT=mailto:tu@email.com \
  CRON_SECRET=<el mismo valor que en 005_push_cron.sql>
```

(O en Dashboard → Edge Functions → Secrets.) `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya los inyecta Supabase.

## 4. Vercel

Settings → Environment Variables: añade `VITE_VAPID_PUBLIC_KEY` con la clave pública (la misma que `VAPID_PUBLIC_KEY`) y haz Redeploy. Para probar en local, ponla también en `.env`.

## 5. iPhone

1. Abre la web en **Safari** (iOS 16.4 o superior) → Compartir → **Añadir a pantalla de inicio**.
2. Abre El Tiempo desde el icono nuevo (no desde Safari).
3. Agenda → tarjeta "Notificaciones" → **Activar notificaciones** → Permitir.
4. Pulsa **Enviar prueba**: debe llegar "Notificación de prueba".

## Notas

- Solo se envía el resumen si hay algo pendiente (partos en 14 días, herrados vencidos o en 7 días, vacunas vencidas o en 14 días, tareas manuales de hoy o vencidas). No incluye agua/comida.
- Si bloqueaste el permiso: Ajustes del iPhone → Notificaciones → El Tiempo.
- Si desinstalas la app del iPhone, la suscripción caduca y la función la elimina sola en el siguiente envío.
- Probar el envío diario a mano: `curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders -H "x-cron-secret: <CRON_SECRET>"`.
