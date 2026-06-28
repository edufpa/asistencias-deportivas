"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangeEmailForm } from "@/components/account/ChangeEmailForm";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { PageHeader, PageShell } from "@/components/layout";

export default function CuentaPage() {
  return (
    <PageShell>
      <PageHeader
        title="Mi cuenta"
        description="Administrá tu correo y la seguridad de tu acceso al sistema"
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cambiar correo</CardTitle>
            <CardDescription>
              Actualizá el email con el que iniciás sesión. Necesitás confirmar tu contraseña
              actual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangeEmailForm />
          </CardContent>
        </Card>

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
      </div>
    </PageShell>
  );
}
