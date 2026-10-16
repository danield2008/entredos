# Cercora — Más cerca, pregunta a pregunta

Cercora es una web estática en español con preguntas, juegos y planes para compartir en pareja.

## Incluye
- Seis formas de jugar: preguntas para conectar, ¿quién de los dos?, verdad o reto, recuerdos, planes de cita y charla profunda.
- Biblioteca de preguntas por temas, buscador y preguntas guardadas en el navegador.
- Personalización con los nombres de las dos personas.
- Diseño adaptable a móviles, sin dependencias de instalación.

## Publicación con GitHub Pages
El archivo principal de la web es `index.html`. El flujo de GitHub Actions incluido en `.github/workflows/pages.yml` publicará el sitio cuando GitHub Pages esté configurado para usar **GitHub Actions** como origen.

Después de activar esa opción en **Settings → Pages**, la dirección habitual del proyecto será:
`https://danield2008.github.io/entredos/`


## Accounts, profiles and linked couples

The `feature/accounts-couples` branch adds an account dialog to the existing website and a Supabase account layer:
- Email/password registration and login, email confirmation and password reset.
- Google and Apple OAuth buttons (provider credentials must be enabled in Supabase first).
- Personal display name and optional anniversary.
- Pair invitation code, acceptance and unlinking.
- Account favorites and memories, private by default, with explicit sharing consent.
- Row-level security policies and server-side invite RPCs.

### Supabase setup before publishing

1. The account tables and RPC functions have been added to the existing Supabase project `EntreDos` in region EU West.
2. In Supabase **Authentication → URL Configuration**, set the Site URL to `https://danield2008.github.io/entredos/` and add that URL to the redirect allow list.
3. In **Authentication → Providers**, enable Email. For Google and Apple, add the provider credentials from those providers' developer consoles. OAuth cannot work until those secrets and callback URLs are configured.
4. Test email confirmation, password reset, sign-in, invitation creation/acceptance, shared and private memories, and unlinking using two separate test accounts.
5. Review the Supabase Security Advisor and confirm the existing online-room access policies before making the feature public.

The browser only uses the Supabase publishable key. Never place a Supabase service-role key or OAuth client secret in frontend files.

### Important status

The changes are on a feature branch and do not replace the live `main` branch automatically. Merge the pull request after testing, then confirm GitHub Pages is publishing from `main` (or the configured Actions workflow).
