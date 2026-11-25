import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui-kit";
import { db } from "@/lib/db";
import { deleteAssetType, deletePlatform, saveAssetType, savePlatform } from "@/server/finance-actions";
import { CategoryTargets } from "./category-targets";
import { TemplateEditor } from "./template-editor";
import { GeneralSettings, NameListEditor } from "./general-settings";
import { BackupRestore } from "./data-tools";
import { InstallApp } from "@/components/pwa";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  const [categories, templates, assetTypes, platforms, settings] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
    db.recurringTemplate.findMany({ orderBy: { sortOrder: "asc" } }),
    db.assetType.findMany({ orderBy: { sortOrder: "asc" } }),
    db.platform.findMany({ orderBy: { sortOrder: "asc" } }),
    db.appSetting.findUnique({ where: { id: 1 } }),
  ]);

  return (
    <>
      <PageHeader title="Pengaturan" description="Profil, target kategori, template rutin, jenis aset, dan platform." />
      <div className="grid gap-5 lg:grid-cols-2 md:gap-6">
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
        <Panel title="Template item rutin" className="lg:row-span-2">
          <TemplateEditor
            templates={templates.map(({ id, name, categoryId, defaultAmount, active }) => ({ id, name, categoryId, defaultAmount, active }))}
            categories={categories}
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
