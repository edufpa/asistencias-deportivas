# Sistema de Asistencias Deportivas

Aplicación web para gestión de asistencias, convocatorias y cortes de deportistas.

## Stack

- Next.js 16 (App Router)
- Prisma 7 + PostgreSQL (Vercel/Neon)
- NextAuth v5 (autenticación)
- Tailwind CSS + shadcn/ui

---

## Guía de Deploy en Vercel

### Paso 1: Crear la base de datos en Vercel

1. Ir a [vercel.com](https://vercel.com) → tu proyecto → pestaña **Storage**
2. Hacer clic en **Create Database** → elegir **Postgres** (Neon)
3. Una vez creada, ir a **Settings** de la base de datos → copiar las variables de entorno

Vercel va a darte estas variables:
```
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NO_SSL
POSTGRES_URL_NON_POOLING
POSTGRES_USER
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_DATABASE
```

### Paso 2: Configurar las variables de entorno

En tu proyecto Vercel → **Settings** → **Environment Variables**, agregar:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | El valor de `POSTGRES_PRISMA_URL` (incluye pgbouncer) |
| `AUTH_SECRET` | Generar con: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NEXTAUTH_URL` | Tu URL de Vercel, ej: `https://tu-app.vercel.app` |

### Paso 3: Subir el código a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/tu-repo.git
git push -u origin main
```

### Paso 4: Conectar GitHub con Vercel

1. En Vercel → **Add New Project** → importar tu repo de GitHub
2. Vercel va a detectar Next.js automáticamente
3. Agregar las variables de entorno del Paso 2
4. Hacer clic en **Deploy**

### Paso 5: Ejecutar migraciones

Después del primer deploy, ejecutar desde tu computadora (con `.env` configurado):

```bash
# Aplicar el schema a la base de datos
npx prisma db push

# Crear el usuario administrador inicial
npm run db:seed
```

El seed crea:
- **Email**: `admin@asistencias.com`
- **Contraseña**: `admin123`

> **IMPORTANTE**: Cambiar la contraseña después del primer login.

---

## Desarrollo local

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Vercel Postgres

# 3. Aplicar schema
npm run db:push

# 4. Crear usuario admin
npm run db:seed

# 5. Iniciar servidor de desarrollo
npm run dev
```

La app queda disponible en http://localhost:3000

---

## Funcionalidades

### Jugadores
- Registrar jugadores con: nombre, apellido, documento, club, fecha de nacimiento
- Buscar y filtrar jugadores
- Ver historial de convocatorias de cada jugador

### Convocatorias
- Crear convocatorias con nombre y descripción
- Invitar jugadores de la base de datos
- Cerrar convocatorias

### Cortes
- Marcar un jugador como cortado dentro de una convocatoria
- Requiere descripción obligatoria del motivo
- Registro de quién realizó el corte y cuándo

### Asistencia Diaria
Por cada sesión (Turno Mañana / Turno Tarde / Pesas), para cada jugador:
- **No aplica**: dejar en blanco (el jugador no debía asistir)
- **Asistió**: con puntaje de desempeño del 1 al 4
- **Inasistencia Justificada**: requiere motivo escrito
- **Inasistencia Injustificada**: sin motivo requerido

---

## Crear nuevos entrenadores

Solo el administrador puede crear usuarios. Usar la API:

```bash
POST /api/users
{
  "name": "Juan Pérez",
  "email": "juan@club.com",
  "password": "contraseña123",
  "role": "COACH"
}
```
