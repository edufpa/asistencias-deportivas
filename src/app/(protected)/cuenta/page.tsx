"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { PageHeader, PageShell } from "@/components/layout";

export default function CuentaPage() {
  return (
    <PageShell>
      <PageHeader
        title="Mi cuenta"
        description="Administrá la seguridad de tu acceso al sistema"
      />
      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>
            Para cambiar tu contraseña necesitás ingresar la actual. Si la olvidaste, cerrá sesión
            y usá la opción &quot;¿Olvidaste tu contraseña?&quot; en el login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </PageShell>
  );
}
