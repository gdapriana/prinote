# Prinote

Backend REST API untuk mengelola todo pribadi, dibangun dengan Express, TypeScript, PostgreSQL, dan Drizzle ORM. Setiap pengguna memiliki session berbasis cookie dan hanya dapat mengakses todo miliknya.

Repository saat ini berisi aplikasi backend di folder [`server/`](server/). Belum ada aplikasi frontend di repository ini.

## Daftar isi

- [Fitur](#fitur)
- [Stack dan package](#stack-dan-package)
- [Struktur project](#struktur-project)
- [Menjalankan secara lokal](#menjalankan-secara-lokal)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Endpoint API](#endpoint-api)
- [Format request dan response](#format-request-dan-response)
- [Contoh penggunaan](#contoh-penggunaan)
- [Database dan migration](#database-dan-migration)
- [Testing](#testing)
- [Deploy ke Vercel](#deploy-ke-vercel)
- [Catatan implementasi](#catatan-implementasi)

## Fitur

- Register, login, logout, dan profil pengguna yang sedang login.
- Password di-hash dengan Argon2; token session disimpan sebagai hash SHA-256 di database.
- CRUD todo dengan pemeriksaan pemilik data.
- Pencarian berdasarkan nama atau deskripsi, filter status dan prioritas, sorting, serta cursor pagination.
- Soft delete menggunakan `deletedAt`.
- Validasi input menggunakan Zod.
- Pembatasan request pada register dan login.
- Health check, database readiness, logging, dan graceful shutdown untuk server lokal.
- Swagger UI untuk development dan konfigurasi deployment Vercel Express.

## Stack dan package

Versi di bawah mengikuti rentang yang dideklarasikan di [`server/package.json`](server/package.json). Versi dependency yang terkunci tersedia di [`server/bun.lock`](server/bun.lock).

### Runtime dan bahasa

| Teknologi  | Versi / penggunaan                                                        |
| ---------- | ------------------------------------------------------------------------- |
| Node.js    | `24.x`, runtime production                                                |
| Bun        | Package manager, test runner, dan eksekusi script seed                    |
| TypeScript | `~5.9.3`, mode ESM dengan `NodeNext`                                      |
| PostgreSQL | Database relasional; versi server database tidak dipatok dalam repository |

### Dependency aplikasi

| Package              | Versi deklarasi | Penggunaan                                                                |
| -------------------- | --------------- | ------------------------------------------------------------------------- |
| `express`            | `^5.3.0`        | HTTP server dan routing API                                               |
| `drizzle-orm`        | `^0.45.4`       | Schema, relasi, dan query database                                        |
| `pg`                 | `^8.23.1`       | Driver serta connection pool PostgreSQL                                   |
| `zod`                | `^4.6.7`        | Validasi request dan environment                                          |
| `@node-rs/argon2`    | `^2.2.2`        | Hash dan verifikasi password                                              |
| `cookie-parser`      | `^1.4.7`        | Membaca cookie session                                                    |
| `express-rate-limit` | `^8.7.1`        | Pembatasan request autentikasi                                            |
| `helmet`             | `^8.3.0`        | Security headers HTTP                                                     |
| `cors`               | `^2.8.6`        | Konfigurasi akses lintas origin                                           |
| `dotenv-flow`        | `^4.1.0`        | Memuat environment dari file `.env`                                       |
| `pino`               | `^10.4.0`       | Structured logging                                                        |
| `pino-pretty`        | `^13.2.0`       | Format log pada environment non-production                                |
| `morgan`             | `^1.12.1`       | Access log HTTP                                                           |
| `swagger-ui-express` | `^5.0.1`        | Menampilkan Swagger UI                                                    |
| `swagger-autogen`    | `^2.23.7`       | Generate dokumentasi route                                                |
| `drizzle-seed`       | `^0.3.1`        | Seed data development                                                     |
| `cross-env`          | `^10.1.0`       | Menetapkan environment pada script lintas platform                        |
| `source-map-support` | `^0.5.21`       | Memetakan stack trace ke source TypeScript                                |
| `drizzle-zod`        | `^0.8.3`        | Terdaftar sebagai dependency; tidak digunakan oleh validasi todo saat ini |
| `slugify`            | `^1.6.9`        | Terdaftar sebagai dependency; slug saat ini dibuat oleh utilitas internal |

### Tooling development

| Package                                                                   | Penggunaan                                                    |
| ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `typescript`, `tsx`                                                       | Type checking, kompilasi, dan development dengan watch mode   |
| `drizzle-kit`                                                             | Generate migration, menjalankan migration, dan Drizzle Studio |
| `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin` | Pemeriksaan kode TypeScript                                   |
| `prettier`, `eslint-plugin-prettier`                                      | Formatting dan integrasi formatting dengan lint               |
| `@types/*`                                                                | Deklarasi tipe untuk Node.js dan library terkait              |

## Struktur project

```text
prinote/
├── README.md
└── server/
    ├── .env.example
    ├── package.json
    ├── bun.lock
    ├── tsconfig.json
    ├── drizzle.config.ts
    ├── swagger.config.ts
    ├── vercel.json
    ├── src/
    │   ├── app.ts              # Express app dan middleware
    │   ├── server.ts           # Listener untuk server lokal / hasil build
    │   ├── configs/            # Environment, database, Swagger
    │   ├── constants/          # Status HTTP dan pesan response
    │   ├── controllers/        # Adapter HTTP request/response
    │   ├── services/           # Logika aplikasi dan query database
    │   ├── routes/             # Definisi endpoint
    │   ├── middlewares/        # Autentikasi, security headers, error handler
    │   ├── validations/        # Schema validasi Zod
    │   ├── drizzle/
    │   │   ├── schemas/        # Schema users, sessions, dan todos
    │   │   ├── migrations/     # Migration SQL dan snapshot schema
    │   │   └── seed.ts
    │   ├── docs/swagger.json
    │   └── utils/              # Session, response, logger, slug, shutdown
    └── tests/                  # Tes regresi dan pemeriksaan interop CJS
```

Alur utama request: `Route → Middleware → Controller → Service → Database`.

## Menjalankan secara lokal

Siapkan Node.js 24, Bun, serta database PostgreSQL yang dapat diakses. Dari root repository:

```bash
cd server
bun install --frozen-lockfile
cp .env.example .env
```

Sesuaikan `DATABASE_URL` di `.env` dengan database lokal yang sudah dibuat. Sesuaikan juga `CORS_ORIGIN` dengan origin frontend, lalu jalankan:

```bash
bun run db:migrate
bun run dev
```

Dengan `PORT=3000`, API tersedia di `http://localhost:3000`. Root `/` mengarahkan request ke `/api/v1/health`.

Untuk menjalankan hasil kompilasi:

```bash
bun run build
bun run start
```

`start` menetapkan `NODE_ENV=production`, sehingga Swagger UI dinonaktifkan dan cookie session memakai atribut `Secure`. Gunakan mode development untuk mencoba autentikasi melalui HTTP lokal.

## Environment variables

Konfigurasi divalidasi saat startup. Lihat [`server/.env.example`](server/.env.example) untuk contoh tanpa credential asli.

| Variable               | Default       | Keterangan                                                                                                                          |
| ---------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`             | `development` | `development`, `test`, atau `production`; script `dev` dan `start` menetapkannya secara eksplisit                                   |
| `PORT`                 | `3000`        | Port server lokal, bilangan bulat 1–65535                                                                                           |
| `DATABASE_URL`         | Wajib diisi   | Connection string PostgreSQL, termasuk pengaturan TLS sesuai penyedia database                                                      |
| `LOG_LEVEL`            | `info`        | `fatal`, `error`, `warn`, `info`, `debug`, atau `trace`                                                                             |
| `CORS_ORIGIN`          | Opsional      | Satu URL origin frontend. Tanpa nilai: origin `http://localhost:3000` pada development dan akses CORS dinonaktifkan pada production |
| `ALLOW_DATABASE_RESET` | Tidak aktif   | Harus bernilai `true` untuk menjalankan seed yang mereset database development                                                      |

Contoh:

```dotenv
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/prinote
```

Simpan credential hanya di `.env` lokal atau environment settings penyedia hosting. File `.env` diabaikan oleh Git.

## Scripts

Semua perintah berikut dijalankan dari folder `server/`.

| Perintah               | Fungsi                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `bun run dev`          | Menjalankan development server dengan watch mode                                       |
| `bun run build`        | Mengompilasi TypeScript ke `dist/`                                                     |
| `bun run start`        | Menjalankan `dist/server.js` dengan environment production                             |
| `bun run typecheck`    | Memeriksa tipe normal dan jalur deklarasi CommonJS Helmet / express-rate-limit         |
| `bun test`             | Menjalankan tes otomatis                                                               |
| `bun run lint:check`   | Memeriksa kode dengan ESLint                                                           |
| `bun run lint:fix`     | Menjalankan perbaikan otomatis ESLint                                                  |
| `bun run format:check` | Memeriksa formatting dengan Prettier                                                   |
| `bun run format:fix`   | Memformat file menggunakan Prettier                                                    |
| `bun run db:generate`  | Generate migration berdasarkan perubahan schema                                        |
| `bun run db:migrate`   | Menerapkan migration pada database yang dikonfigurasi                                  |
| `bun run db:push`      | Menyinkronkan schema langsung ke database; mengubah database tanpa alur file migration |
| `bun run db:studio`    | Membuka Drizzle Studio                                                                 |
| `bun run db:seed`      | Mereset dan mengisi data contoh setelah opt-in eksplisit                               |
| `bun run docs`         | Generate ulang `src/docs/swagger.json` berdasarkan route aplikasi                      |

## Endpoint API

Base URL lokal: `http://localhost:3000`. Endpoint autentikasi dan todo menggunakan prefix `/api/auth` dan `/api/todos`; hanya health check yang saat ini memakai prefix `/api/v1`.

### Health dan dokumentasi

| Method | Endpoint                  | Auth  | Response normal                                     |
| ------ | ------------------------- | ----- | --------------------------------------------------- |
| `GET`  | `/`                       | Tidak | `302`, redirect ke health check                     |
| `GET`  | `/api/v1/health`          | Tidak | `200`, status proses dan uptime                     |
| `GET`  | `/api/v1/health/ready`    | Tidak | `200` jika database dapat diakses; `503` jika tidak |
| `GET`  | `/api/v1/health/detailed` | Tidak | `200`, informasi environment, memory, dan CPU       |
| `GET`  | `/api/docs`               | Tidak | Swagger UI, hanya saat `NODE_ENV=development`       |

### Autentikasi

| Method   | Endpoint             | Auth             | Fungsi                                             | Status sukses     |
| -------- | -------------------- | ---------------- | -------------------------------------------------- | ----------------- |
| `POST`   | `/api/auth/register` | Tidak            | Membuat pengguna dan session                       | `201`             |
| `POST`   | `/api/auth/login`    | Tidak            | Memverifikasi credential dan membuat session       | `200`             |
| `DELETE` | `/api/auth/logout`   | Tidak diwajibkan | Menghapus session saat ini dan membersihkan cookie | `204`, tanpa body |
| `GET`    | `/api/auth/me`       | Ya               | Mengambil `id`, `name`, dan `email` pengguna       | `200`             |

Register menerima `name` sepanjang 1–200 karakter setelah trim, email valid maksimal 200 karakter, serta password sepanjang 8–1000 karakter. Login menerima email dan password tidak kosong; password lama yang lebih pendek tetap dapat digunakan.

Register dan login berbagi limiter sebesar **20 request per IP per 15 menit** pada satu instance aplikasi. Melebihi batas menghasilkan `429`.

### Todo

Seluruh endpoint todo memerlukan cookie session yang valid dan membatasi data berdasarkan pemiliknya.

| Method   | Endpoint                              | Fungsi                                             | Status sukses |
| -------- | ------------------------------------- | -------------------------------------------------- | ------------- |
| `GET`    | `/api/todos/get?by=id&value=<uuid>`   | Mengambil satu todo berdasarkan ID                 | `200`         |
| `GET`    | `/api/todos/get?by=slug&value=<slug>` | Mengambil satu todo berdasarkan slug               | `200`         |
| `GET`    | `/api/todos/query`                    | Mengambil daftar todo dengan filter dan pagination | `200`         |
| `POST`   | `/api/todos`                          | Membuat todo                                       | `201`         |
| `PATCH`  | `/api/todos/:todoId`                  | Mengubah sebagian field todo                       | `200`         |
| `DELETE` | `/api/todos/:todoId`                  | Soft delete todo                                   | `200`         |

Create, update, dan delete mengembalikan `data: { "id": "<uuid>" }`. Detail mengembalikan objek todo. Todo yang tidak ditemukan, bukan milik pengguna, atau sudah dihapus menghasilkan `404`.

### Query daftar todo

| Parameter  | Nilai                                                    | Default          |
| ---------- | -------------------------------------------------------- | ---------------- |
| `search`   | Teks 1–1000 karakter, dicari pada nama dan deskripsi     | Tidak ada        |
| `status`   | `CHECK`, `UNCHECK`, `PENDING`                            | Tidak ada filter |
| `priority` | `LOW`, `MEDIUM`, `HIGH`                                  | Tidak ada filter |
| `take`     | Bilangan bulat 1–100                                     | `10`             |
| `cursor`   | UUID dari `nextCursor` pada response sebelumnya          | Tidak ada        |
| `sortBy`   | `name`, `created_at`, `updated_at`, `priority`, `status` | `name`           |
| `orderBy`  | `asc`, `desc`                                            | `desc`           |

Gunakan filter dan urutan yang sama saat melanjutkan pagination. Cursor harus merujuk todo aktif milik pengguna yang sesuai filter; cursor yang tidak sesuai menghasilkan `400`. Sorting `status` dan `priority` mengikuti urutan enum PostgreSQL, bukan urutan alfabet.

## Format request dan response

Gunakan `Content-Type: application/json` untuk body JSON.

### Register / login

```json
{
  "name": "Pengguna Demo",
  "email": "demo@example.com",
  "password": "contoh-password-123"
}
```

Field `name` hanya diperlukan saat register. Response autentikasi tidak mengembalikan password atau token session dalam body; session diberikan melalui header `Set-Cookie`.

### Create / update todo

```json
{
  "name": "Menyiapkan release",
  "description": "Memeriksa endpoint dan konfigurasi environment",
  "archived": false,
  "status": "PENDING",
  "priority": "HIGH",
  "dueDate": "2026-12-01T09:00:00+08:00"
}
```

| Field         | Aturan                                                  |
| ------------- | ------------------------------------------------------- |
| `name`        | Wajib saat create; 1–225 karakter setelah trim          |
| `description` | Opsional, maksimal 10.000 karakter, boleh `null`        |
| `archived`    | Opsional, boolean; default database `false`             |
| `status`      | Opsional, enum status; default database `UNCHECK`       |
| `priority`    | Opsional, enum prioritas; default database `LOW`        |
| `dueDate`     | Opsional, string ISO 8601 dengan timezone; boleh `null` |

PATCH harus memuat setidaknya satu field yang diizinkan. Field internal seperti `id`, `userId`, `slug`, `createdAt`, `updatedAt`, dan `deletedAt` tidak dapat dikirim melalui create/update. Field lain yang tidak dikenal juga ditolak.

### Response sukses

```json
{
  "success": true,
  "message": "todo created successfully",
  "statusCode": 201,
  "data": {
    "id": "33333333-3333-4333-8333-333333333333"
  }
}
```

Untuk daftar todo, `data` memiliki bentuk berikut:

```json
{
  "data": [],
  "hasMore": false,
  "nextCursor": null,
  "totalData": 0
}
```

`totalData` menghitung seluruh todo aktif yang sesuai filter, bukan hanya jumlah item pada halaman saat ini.

### Response error

```json
{
  "success": false,
  "message": "Validation error",
  "statusCode": 400,
  "errors": [
    {
      "path": "name",
      "message": "Contoh pesan validasi",
      "code": "too_small"
    }
  ]
}
```

Pesan validasi mengikuti error Zod. Field `errors` bersifat opsional; `stack` hanya ditambahkan oleh error handler pada development. Response `204` tidak memiliki body. Limiter autentikasi memakai response bawaan library sehingga tidak mengikuti envelope JSON ini.

| Status | Kondisi umum                                               |
| ------ | ---------------------------------------------------------- |
| `400`  | Input tidak valid, JSON rusak, atau cursor tidak sesuai    |
| `401`  | Belum login atau credential login salah                    |
| `404`  | Route/todo tidak ditemukan atau todo tidak dapat diakses   |
| `409`  | Email sudah terdaftar                                      |
| `413`  | Ukuran body request melewati batas parser                  |
| `429`  | Batas request autentikasi terlampaui                       |
| `500`  | Error internal yang tidak ditangani sebagai error aplikasi |
| `503`  | Database readiness gagal                                   |

## Contoh penggunaan

Contoh berikut memakai `curl` dan cookie jar lokal. Jalankan development server terlebih dahulu. Jangan commit file cookie jar karena berisi credential session.

Register sekaligus menyimpan session:

```bash
curl -i -c /tmp/prinote-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"name":"Pengguna Demo","email":"demo@example.com","password":"contoh-password-123"}' \
  http://localhost:3000/api/auth/register
```

Login untuk akun yang sudah terdaftar:

```bash
curl -i -c /tmp/prinote-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"contoh-password-123"}' \
  http://localhost:3000/api/auth/login
```

Mengambil profil dan membuat todo:

```bash
curl -b /tmp/prinote-cookies.txt http://localhost:3000/api/auth/me

curl -b /tmp/prinote-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"name":"Todo pertama","priority":"HIGH"}' \
  http://localhost:3000/api/todos
```

Mengambil daftar dengan filter:

```bash
curl -b /tmp/prinote-cookies.txt --get \
  --data-urlencode 'search=Todo' \
  --data-urlencode 'priority=HIGH' \
  --data-urlencode 'take=10' \
  --data-urlencode 'sortBy=created_at' \
  --data-urlencode 'orderBy=desc' \
  http://localhost:3000/api/todos/query
```

Mengubah todo, menghapus todo, lalu logout; ganti `TODO_ID` dengan ID hasil create:

```bash
curl -X PATCH -b /tmp/prinote-cookies.txt \
  -H 'Content-Type: application/json' \
  -d '{"status":"CHECK"}' \
  http://localhost:3000/api/todos/TODO_ID

curl -X DELETE -b /tmp/prinote-cookies.txt \
  http://localhost:3000/api/todos/TODO_ID

curl -i -X DELETE -b /tmp/prinote-cookies.txt -c /tmp/prinote-cookies.txt \
  http://localhost:3000/api/auth/logout
```

Di browser, sertakan cookie saat memanggil API:

```js
const response = await fetch("http://localhost:3000/api/auth/me", {
  credentials: "include"
});
const result = await response.json();
```

## Database dan migration

| Tabel      | Isi utama                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------- |
| `users`    | Identitas pengguna, email unik, hash password, timestamp                                      |
| `sessions` | Hash token, relasi pengguna, waktu kedaluwarsa, metadata client                               |
| `todos`    | Pemilik, nama, slug unik, deskripsi, status, prioritas, arsip, tanggal jatuh tempo, timestamp |

Schema ada di [`server/src/drizzle/schemas/`](server/src/drizzle/schemas/), sedangkan migration ada di [`server/src/drizzle/migrations/`](server/src/drizzle/migrations/).

Setelah mengubah schema, generate dan periksa SQL sebelum menerapkannya:

```bash
cd server
bun run db:generate
bun run db:migrate
```

`db:migrate` menggunakan `DATABASE_URL` yang sedang aktif. Migration tidak dijalankan otomatis oleh build atau startup aplikasi.

Seed bersifat destruktif: seluruh data pada schema terkait direset, lalu diisi akun contoh dengan password `11111111`. Jalankan hanya pada database development yang dapat dibuang:

```bash
ALLOW_DATABASE_RESET=true bun run db:seed
```

Seed ditolak ketika `NODE_ENV=production`, dijalankan pada Vercel, atau flag reset tidak diberikan.

## Testing

```bash
cd server
bun run typecheck
bun run lint:check
bun run format:check
bun test
bun run build
```

Tes mencakup validasi input, pembatasan query berdasarkan pemilik, soft delete, pagination, renewal session, readiness saat database gagal, dan pemasangan security headers Helmet. Tes service menggunakan database mock sehingga tidak mengubah database asli. Tes tersebut tidak menggantikan pengujian integrasi dengan PostgreSQL atau pemeriksaan deployment production.

Pemeriksaan tipe tambahan di [`server/tests/tsconfig.cjs-interop.json`](server/tests/tsconfig.cjs-interop.json) memeriksa jalur deklarasi CommonJS Helmet dan express-rate-limit untuk menangkap error import yang dapat muncul saat deploy.

## Deploy ke Vercel

Konfigurasi project tersedia di [`server/vercel.json`](server/vercel.json). Gunakan pengaturan berikut untuk backend ini:

| Pengaturan       | Nilai                  |
| ---------------- | ---------------------- |
| Root Directory   | `server`               |
| Framework Preset | `Express`              |
| Node.js Version  | `24.x`                 |
| Build Command    | Default, Override mati |
| Output Directory | Default, Override mati |
| Install Command  | Default, Override mati |

Vercel menggunakan entrypoint Express TypeScript `src/app.ts`. Folder `dist/` digunakan untuk menjalankan hasil build secara lokal; jangan menetapkannya sebagai output website statis.

Tahapan deployment:

1. Jalankan pemeriksaan lokal pada bagian Testing.
2. Isi environment Production di Vercel: `NODE_ENV=production`, `DATABASE_URL`, `LOG_LEVEL=info`, dan `CORS_ORIGIN` sesuai origin frontend. `PORT` opsional.
3. Pastikan database dapat diakses dari Vercel, termasuk persyaratan TLS penyedia database.
4. Tinjau dan terapkan migration terhadap database tujuan sebagai langkah release terpisah.
5. Commit dan push source serta lockfile, lalu deploy commit terbaru. Untuk percobaan ulang setelah mengubah konfigurasi modul, nonaktifkan penggunaan build cache.
6. Periksa `/api/v1/health`, `/api/v1/health/ready`, dan Runtime Logs. Uji juga login serta operasi todo dengan client yang mempertahankan cookie.

Source menggunakan import relatif dengan ekstensi `.js`, termasuk pada file `.ts`, agar output ESM dapat di-resolve Node.js. `express-rate-limit` memakai named export `rateLimit`; Helmet dimuat melalui entrypoint CommonJS secara eksplisit di middleware security headers.

## Catatan implementasi

- Session menggunakan cookie `session` dengan `HttpOnly`, `SameSite=Lax`, dan `Secure` pada production. Masa berlaku awal 30 hari dan diperpanjang ketika tersisa kurang dari 15 hari.
- CORS mengizinkan credential untuk origin yang dikonfigurasi. Untuk browser production, susunan domain frontend dan API perlu sesuai dengan kebijakan cookie `SameSite=Lax`; mengubah CORS saja tidak membuat cookie lintas site dapat dikirim.
- Limiter menggunakan memory store per instance. Counter tidak dibagikan ke seluruh instance Vercel dan tidak persisten setelah instance dihentikan.
- Todo yang dihapus tetap tersimpan dengan `deletedAt`, tetapi dikeluarkan dari pembacaan, hitungan, update, dan delete berikutnya. Belum tersedia endpoint restore.
- Slug dibuat server dengan suffix UUID dan berubah ketika nama todo diperbarui. Field `archived` disimpan, tetapi bukan filter otomatis pada daftar todo.
- Swagger UI hanya aktif pada development. Hasil generator mendokumentasikan route, tetapi detail request/response di README ini juga merujuk schema dan implementasi source.
- Endpoint reset password dan verifikasi email belum diimplementasikan, meskipun beberapa konstanta pesannya sudah tersedia di source.

Informasi backend tambahan tersedia di [`server/README.md`](server/README.md).
