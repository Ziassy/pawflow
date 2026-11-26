"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { useReadOnly } from "@/components/read-only"

/**
 * Primitive tombol + aturan read-only. Dipisah dari button.tsx agar button.tsx
 * (dan buttonVariants) tetap bisa dipakai dari server component.
 */
export function ButtonBase({
  write,
  disabled,
  ...props
}: ButtonPrimitive.Props & {
  /** Tombol yang mengubah data (tambah/edit/hapus): mati saat akun read-only */
  write?: boolean
}) {
  const readOnly = useReadOnly()
  return <ButtonPrimitive disabled={disabled || (write && readOnly)} {...props} />
}
