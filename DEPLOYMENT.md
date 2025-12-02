# 🚀 Panduan Deployment ke Vercel

Panduan lengkap untuk deploy aplikasi **Absensi Karyawan dengan Face Recognition** ke Vercel.

---

## 📋 Prasyarat

- Akun [Vercel](https://vercel.com) (gratis)
- Akun GitHub (untuk deploy via Git)
- Database PostgreSQL (pilih salah satu):
  - **Vercel Postgres** (recommended, terintegrasi)
  - **Supabase** (gratis tier bagus)
  - **Neon** (serverless PostgreSQL)
  - **Railway**

---

## 🗄️ Step 1: Setup Database PostgreSQL

### Opsi A: Vercel Postgres (Recommended)

1. Login ke [Vercel Dashboard](https://vercel.com/dashboard)
2. Pilih tab **Storage** → **Create Database**
3. Pilih **Postgres** → **Continue**
4. Pilih region terdekat (Singapore untuk Indonesia)
5. Beri nama database: `absensi-db`
6. Klik **Create**
7. Setelah dibuat, copy **Connection String**:
   - `POSTGRES_URL` → untuk `DATABASE_URL`
   - `POSTGRES_URL_NON_POOLING` → untuk `DIRECT_URL`

### Opsi B: Supabase

1. Login ke [Supabase](https://supabase.com)
2. Klik **New Project**
3. Isi detail project:
   - Name: `absensi-karyawan`
   - Database Password: (buat password kuat)
   - Region: Singapore
4. Tunggu setup selesai (~2 menit)
5. Buka **Settings** → **Database**
6. Copy **Connection String** (URI format)
7. Ganti `[YOUR-PASSWORD]` dengan password yang Anda buat

### Opsi C: Neon

1. Login ke [Neon](https://neon.tech)
2. Klik **Create Project**
3. Pilih region: Singapore
4. Copy **Connection String**

---

## 🔧 Step 2: Setup Environment Variables Lokal

1. Buka file `.env` di project Anda
2. Update `DATABASE_URL` dan `DIRECT_URL` dengan connection string dari database Anda:

```bash
# Contoh untuk Vercel Postgres:
DATABASE_URL="postgres://default:xxxxx@ep-xxxxx.ap-southeast-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require"
DIRECT_URL="postgres://default:xxxxx@ep-xxxxx.ap-southeast-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require"

# Contoh untuk Supabase:
DATABASE_URL="postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres"
```

---

## 🔄 Step 3: Migrasi Database

Jalankan perintah berikut untuk membuat tabel di database PostgreSQL:

```bash
# Generate Prisma Client
npx prisma generate

# Push schema ke database (untuk pertama kali)
npx prisma db push

# Atau gunakan migration (recommended untuk production)
npx prisma migrate dev --name init

# Seed database dengan data awal
npm run prisma:seed
```

> **⚠️ Catatan**: Jika Anda punya data di SQLite (`dev.db`), Anda perlu export dan import manual ke PostgreSQL.

---

## 📦 Step 4: Test Build Lokal

Pastikan aplikasi bisa di-build tanpa error:

```bash
# Install dependencies
npm install

# Build aplikasi
npm run build

# Test production build
npm start
```

Buka `http://localhost:3000` dan pastikan semua fitur berfungsi.

---

## 🌐 Step 5: Deploy ke Vercel

### Via Vercel CLI (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login ke Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Ikuti prompt:
   - Set up and deploy? **Y**
   - Which scope? Pilih akun Anda
   - Link to existing project? **N**
   - Project name? `absensi-karyawan` (atau nama lain)
   - In which directory is your code located? `./`
   - Override settings? **N**

5. Vercel akan otomatis detect Next.js dan deploy

### Via GitHub (Alternative)

1. Push code ke GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/repo-name.git
git push -u origin main
```

2. Login ke [Vercel Dashboard](https://vercel.com/dashboard)
3. Klik **Add New** → **Project**
4. Import repository dari GitHub
5. Vercel akan auto-detect Next.js configuration
6. Klik **Deploy**

---

## 🔐 Step 6: Configure Environment Variables di Vercel

1. Buka project di [Vercel Dashboard](https://vercel.com/dashboard)
2. Pilih **Settings** → **Environment Variables**
3. Tambahkan variable berikut:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | Connection string dari database | Production, Preview, Development |
| `DIRECT_URL` | Direct connection string (non-pooled) | Production, Preview, Development |

> **💡 Tips**: Jika menggunakan Vercel Postgres, Anda bisa langsung connect database ke project dan environment variables akan otomatis ditambahkan.

4. Klik **Save**
5. Redeploy aplikasi: **Deployments** → pilih latest → **Redeploy**

---

## ✅ Step 7: Verifikasi Deployment

1. Buka URL deployment Anda: `https://your-project.vercel.app`
2. Test fitur-fitur utama:
   - ✅ Login/Authentication
   - ✅ Dashboard
   - ✅ Employee Management
   - ✅ Face Recognition Check-in/Check-out
   - ✅ Attendance Reports
   - ✅ Leave Requests

---

## 🔍 Troubleshooting

### Error: "Prisma Client not found"

**Solusi**: Pastikan `vercel.json` sudah include `prisma generate` di build command:
```json
{
  "buildCommand": "prisma generate && next build"
}
```

### Error: "Can't reach database server"

**Solusi**: 
1. Cek `DATABASE_URL` di Vercel environment variables
2. Pastikan connection string benar
3. Pastikan database tidak sleep (untuk free tier)

### Error: "Module not found: Can't resolve '@prisma/client'"

**Solusi**: Pindahkan `@prisma/client` dari `devDependencies` ke `dependencies`:
```bash
npm install @prisma/client --save
npm uninstall @prisma/client --save-dev
```

### Face Recognition tidak berfungsi

**Solusi**: 
1. Pastikan model face-api.js ter-load dengan benar
2. Check browser console untuk error
3. Vercel serverless functions punya timeout limit (10s untuk hobby plan)

### Database connection pool exhausted

**Solusi**: Gunakan `DIRECT_URL` untuk migrations dan connection pooling untuk queries.

---

## 📊 Monitoring & Logs

1. **Vercel Logs**: Dashboard → Project → Deployments → View Function Logs
2. **Database Monitoring**: 
   - Vercel Postgres: Dashboard → Storage → Database → Insights
   - Supabase: Dashboard → Database → Logs

---

## 🔄 Update Aplikasi

Setiap kali ada perubahan code:

```bash
# Via Vercel CLI
vercel --prod

# Via GitHub
git add .
git commit -m "Update feature"
git push origin main
# Vercel akan auto-deploy
```

---

## 💰 Biaya

| Service | Free Tier | Paid Plan |
|---------|-----------|-----------|
| **Vercel Hosting** | 100GB bandwidth/month | $20/month (Pro) |
| **Vercel Postgres** | 256MB storage, 60 hours compute | $20/month |
| **Supabase** | 500MB database, 2GB bandwidth | $25/month |
| **Neon** | 512MB storage, 1 project | $19/month |

> **💡 Rekomendasi**: Untuk production, gunakan paid plan untuk performa dan reliability lebih baik.

---

## 📝 Checklist Deployment

- [ ] Database PostgreSQL sudah dibuat
- [ ] `.env` sudah diupdate dengan connection string
- [ ] `npx prisma db push` berhasil
- [ ] `npm run build` berhasil tanpa error
- [ ] Code sudah di-push ke GitHub (jika deploy via GitHub)
- [ ] Project sudah dibuat di Vercel
- [ ] Environment variables sudah dikonfigurasi di Vercel
- [ ] Deployment berhasil
- [ ] Semua fitur sudah ditest di production URL

---

## 🆘 Butuh Bantuan?

- [Vercel Documentation](https://vercel.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Selamat! 🎉** Aplikasi Anda sekarang sudah live di Vercel!
