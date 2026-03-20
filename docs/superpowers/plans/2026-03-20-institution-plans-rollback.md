# Rollback Plan — Institution Plans & Tier System (PR #44)

**Tanggal:** 2026-03-20
**PR:** #44 `feat/institution-plans`
**Risiko:** Tinggi — ada migrasi database (kolom baru + tabel baru)

---

## Ringkasan Perubahan yang Perlu Di-rollback

### Database (Migration `20260320070000_add_institution_plans`)
- Enum baru: `PlanType`, `UpgradeRequestStatus`
- Kolom baru di `institutions`: `plan_type`, `plan_limit_reached_at`, `plan_changed_at`
- Tabel baru: `upgrade_requests`

### Backend
- Module baru: `PlanModule` (controller, service, dto, guard, interceptor, decorators)
- Modifikasi: `app.module.ts`, `student.controller.ts`, `tutor.controller.ts`, `student.service.ts`, `tutor.service.ts`, `whatsapp.controller.ts`

### Frontend (Platform)
- Komponen baru: `FeatureLock`, `PlanWarningBanner`, `PlansTab`, `UpgradeRequests`
- Modifikasi: `Layout.tsx`, `App.tsx`, `SuperAdminLayout.tsx`, `InstitutionDetail.tsx`, `Institutions.tsx`, `Settings/index.tsx`, `api.ts`, `WhatsApp.tsx`

---

## Analisis Risiko

### Aman untuk di-rollback?

| Aspek | Risiko | Penjelasan |
|-------|--------|------------|
| Kolom baru di `institutions` | **Rendah** | Kolom `plan_type` punya default `STARTER`, tidak mengubah data existing. Semua institusi otomatis jadi STARTER. |
| Tabel `upgrade_requests` | **Rendah** | Tabel baru, tidak ada data legacy. Jika di-rollback, data upgrade request yang sudah masuk akan hilang. |
| Enum baru | **Rendah** | Tidak mengganggu data existing |
| Existing data | **Tidak ada risiko** | Tidak ada ALTER/DROP/UPDATE pada data existing. Semua perubahan bersifat additive. |
| `PlanGuard` global | **Medium** | Guard baru dijalankan di semua request. Jika ada bug, bisa memblokir operasi normal. |

**Kesimpulan:** Migrasi ini **additive only** (hanya menambah, tidak mengubah/menghapus). Data existing tidak tersentuh. Rollback aman dilakukan kapan saja.

---

## Langkah Monitoring Setelah Merge

Setelah merge ke master dan auto-deploy jalan, monitor hal berikut **selama 30 menit pertama**:

### 1. Cek Backend Health (Paling Penting)
```
curl https://api.sinaloka.com/api/health
```
Expected: `200 OK`. Jika gagal, Railway akan auto-rollback dalam 5 menit.

### 2. Cek Migration Berhasil
Lihat Railway deployment logs — pastikan ada log:
```
prisma migrate deploy
```
dan tidak ada error.

### 3. Test Endpoint Baru
```bash
# Login sebagai ADMIN, ambil token
# Test plan info
curl -H "Authorization: Bearer <token>" https://api.sinaloka.com/api/admin/plan
```
Expected: Response JSON dengan `currentPlan: "STARTER"`.

### 4. Test Endpoint Existing (Regresi)
```bash
# Test buat student masih bisa
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com"}' \
  https://api.sinaloka.com/api/admin/students
```
Expected: Student berhasil dibuat (PlanGuard memperbolehkan karena < 30 murid).

### 5. Cek Frontend
- Buka https://platform.sinaloka.com (hard refresh: Ctrl+Shift+R)
- Login sebagai ADMIN
- Cek sidebar: harus ada widget "Starter" (bukan mock "Pro Plan")
- Buka Settings → tab "Plans & Pricing" harus muncul
- Buka WhatsApp → harus ada lock overlay (jika plan Starter)

---

## Prosedur Rollback

### Skenario 1: Backend Error / 500 (Deploy Gagal)

Railway akan **auto-rollback** jika healthcheck gagal selama 5 menit. Tidak perlu tindakan manual.

Jika auto-rollback tidak jalan:
1. Buka https://railway.com → project sinaloka-education
2. Klik service Backend → Deployments
3. Pilih deployment **sebelum** merge PR #44
4. Klik **Rollback**

### Skenario 2: Backend Deploy Sukses tapi Ada Bug Runtime

1. **Rollback Backend dulu:**
   - Railway dashboard → Deployments → Rollback ke deploy sebelumnya

2. **Rollback Frontend:**
   - Cloudflare dashboard → Workers & Pages → sinaloka-platform → Deployments
   - Pilih deployment sebelum merge → Rollback

3. **Database TIDAK perlu di-rollback** karena:
   - Kolom baru punya default value → code lama mengabaikannya
   - Tabel baru tidak direferensi code lama
   - Backend lama tetap jalan normal dengan kolom/tabel tambahan di DB

### Skenario 3: Database Migration Gagal

Jika `prisma migrate deploy` gagal:
1. Deploy otomatis gagal → Railway **tidak akan** deploy backend baru
2. Backend lama tetap jalan
3. Cek Railway logs untuk error message
4. Fix migration dan push ulang, ATAU rollback PR di GitHub

### Skenario 4: Data Corrupt / Grace Period Salah Block User

Jika PlanGuard salah memblokir operasi normal (user tidak bisa tambah murid/tutor padahal belum limit):

**Quick fix tanpa rollback** — langsung di database:
```sql
-- Reset grace period semua institusi
UPDATE institutions SET plan_limit_reached_at = NULL;

-- Atau set semua ke BUSINESS (unlimited) sementara
UPDATE institutions SET plan_type = 'BUSINESS';
```

Jalankan via Railway → Database → Query tab, atau psql.

### Skenario 5: Perlu Rollback Database Penuh (Worst Case)

**HANYA jika benar-benar diperlukan** — jangan dilakukan kecuali ada data corruption:

```sql
-- 1. Hapus tabel upgrade_requests
DROP TABLE IF EXISTS "upgrade_requests";

-- 2. Hapus kolom baru dari institutions
ALTER TABLE "institutions" DROP COLUMN IF EXISTS "plan_type";
ALTER TABLE "institutions" DROP COLUMN IF EXISTS "plan_limit_reached_at";
ALTER TABLE "institutions" DROP COLUMN IF EXISTS "plan_changed_at";

-- 3. Hapus enum types
DROP TYPE IF EXISTS "UpgradeRequestStatus";
DROP TYPE IF EXISTS "PlanType";

-- 4. Hapus migration record agar Prisma tidak bingung
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260320070000_add_institution_plans';
```

**Setelah SQL di atas**, pastikan backend yang jalan adalah versi SEBELUM PR #44 (rollback via Railway dulu).

---

## Urutan Rollback yang Benar

```
1. Rollback Frontend (Cloudflare) ← paling aman, lakukan duluan
2. Rollback Backend (Railway)
3. Database fix (HANYA jika diperlukan) ← lakukan terakhir
```

**Jangan rollback database duluan** sebelum rollback backend — backend baru masih expect kolom-kolom tersebut ada.

---

## Checklist Pre-Merge

- [ ] Backend build pass (`npm run build`)
- [ ] Frontend build pass (`npm run build`)
- [ ] CI checks pass di PR
- [ ] Sudah dibaca rollback plan ini
- [ ] Tahu cara akses Railway dashboard
- [ ] Tahu cara akses Cloudflare dashboard
- [ ] Siap monitor 30 menit setelah merge

---

## Kontak & Dashboard

| Platform | URL |
|----------|-----|
| Railway | https://railway.com (project: sinaloka-education) |
| Cloudflare | https://dash.cloudflare.com (Workers & Pages) |
| GitHub Actions | https://github.com/ghifarizuhir/sinaloka-education/actions |
| PR #44 | https://github.com/ghifarizuhir/sinaloka-education/pull/44 |
