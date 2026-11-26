import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui-kit";
import { db } from "@/lib/db";
import { baseDb } from "@/lib/db-base";
import { requireAuth } from "@/server/auth";
import { dateKey } from "@/lib/subscription";
import { COLOR_THEME_COOKIE, DEFAULT_THEME, type ColorThemeId } from "@/lib/color-themes";
import { deleteAssetType, deletePlatform, saveAssetType, savePlatform } from "@/server/finance-actions";
import { AppearanceSettings } from "./appearance-settings";
import { CategoryTargets } from "./category-targets";
import { TemplateEditor } from "./template-editor";
import { GeneralSettings, NameListEditor } from "./general-settings";
import { BackupRestore } from "./data-tools";
import { ManageAccounts, MyAccount } from "./account-settings";
import { InstallApp } from "@/components/pwa";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  const me = await requireAuth();
  const accounts = me.isAdmin
    ? await baseDb.user.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, username: true, isAdmin: true, createdAt: true, subscriptionUntil: true } })
    : [];
  const colorTheme = ((await cookies()).get(COLOR_THEME_COOKIE)?.value ?? DEFAULT_THEME) as ColorThemeId;
  const [categories, templates, assetTypes, platforms, settings, debts] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.recurringTemplate.findMany({ orderBy: { sortOrder: "asc" } }),
    db.assetType.findMany({ orderBy: { sortOrder: "asc" } }),
    db.platform.findMany({ orderBy: { sortOrder: "asc" } }),
    db.appSetting.findFirst(),
    db.debt.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, name: true, active: true } }),
  ]);

  return (
    <>
      <PageHeader title="Pengaturan" description="Akun, profil, target kategori, template rutin, jenis aset, dan platform." />
      <div className="grid gap-5 lg:grid-cols-2 md:gap-6">
        <Panel title="Akun saya" description="Nama, username untuk masuk, dan password.">
          <MyAccount name={me.name} username={me.username} isAdmin={me.isAdmin} subscriptionUntil={me.subscriptionUntil} />
        </Panel>
        {me.isAdmin && (
          <Panel title="Kelola akun" description="Tiap akun punya data keuangan sendiri dan tidak bisa melihat data akun lain.">
            <ManageAccounts
              accounts={accounts.map((a) => ({
                ...a,
                createdAt: a.createdAt.toISOString(),
                subscriptionUntil: a.subscriptionUntil ? dateKey(a.subscriptionUntil) : null,
              }))}
              meId={me.id}
            />
          </Panel>
        )}
        <Panel title="Tampilan" description="Mode terang/gelap dan warna utama aplikasi.">
          <AppearanceSettings currentColor={colorTheme} />
        </Panel>
        <Panel title="Profil & kalkulator" description="Dipakai di Target & FIRE dan Asset Tracker.">
          <GeneralSettings
            birthDate={settings?.birthDate ? settings.birthDate.toISOString().slice(0, 10) : null}
            depositRateBps={settings?.depositRateBps ?? 750}
            interestTaxBps={settings?.interestTaxBps ?? 2000}
            assetDropAlertBps={settings?.assetDropAlertBps ?? 3000}
          />
        </Panel>
        <Panel title="Target kategori (% dari gaji)">
          <CategoryTargets categories={categories} />
        </Panel>
        <Panel title="Template item rutin" description="Item yang terhubung ke kartu/cicilan mengikuti rencana bayar di Hutang tiap bulan." className="lg:row-span-2">
          <TemplateEditor
            templates={templates.map(({ id, name, categoryId, defaultAmount, active, debtId }) => ({ id, name, categoryId, defaultAmount, active, debtId }))}
            categories={categories}
            debts={debts}
          />
        </Panel>
        <Panel title="Jenis aset" description="Urutan menentukan warna di grafik.">
          <NameListEditor
            items={assetTypes.map((a) => ({ id: a.id, name: a.name }))}
            onSave={saveAssetType}
            onDelete={deleteAssetType}
            addLabel="Tambah jenis"
            deleteWarning={'Hapus jenis "{name}"? Nilai Asset Tracker dan target portofolio jenis ini ikut terhapus.'}
          />
        </Panel>
        <Panel title="Platform">
          <NameListEditor
            items={platforms.map((p) => ({ id: p.id, name: p.name }))}
            onSave={savePlatform}
            onDelete={deletePlatform}
            addLabel="Tambah platform"
            deleteWarning={'Hapus platform "{name}"?'}
          />
        </Panel>
        <Panel title="Backup & pulihkan" description="Juga dipakai untuk memindahkan data ke server (Neon).">
          <BackupRestore />
        </Panel>
        <Panel title="Pasang di HP" description="Android, iPhone, dan iPad.">
          <InstallApp />
        </Panel>
      </div>
    </>
  );
}
