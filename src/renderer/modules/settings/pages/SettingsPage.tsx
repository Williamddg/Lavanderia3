import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionUser } from '@shared/types';
import { api } from '@renderer/services/api';
import { Button, DataTable, Input, PageHeader } from '@renderer/ui/components';

export const SettingsPage = ({ user }: { user: SessionUser }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<any>({});
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');

  const { data, refetch } = useQuery({
    queryKey: ['company-settings'],
    queryFn: api.companySettings,
    enabled: unlocked
  });

  const { data: backups = [] } = useQuery({
    queryKey: ['backups'],
    queryFn: api.listBackups,
    enabled: unlocked
  });

  useEffect(() => {
    if (unlocked && data) setForm(data);
  }, [unlocked, data]);

  const connectDriveMutation = useMutation({
    mutationFn: api.connectDriveBackup
  });

  const uploadBackupMutation = useMutation({
    mutationFn: api.uploadBackupToDrive,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['backups'] });
    }
  });

  const updateAdminPasswordMutation = useMutation({
    mutationFn: api.updateOrderProtectionPassword,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['order-protection-password'] });

      setCurrentAdminPassword('');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
    }
  });

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwLoading(true);
    try {
      await api.login({ username: user.username, password: pwInput });
      setUnlocked(true);
    } catch {
      setPwError('Contraseña incorrecta. Intenta de nuevo.');
    } finally {
      setPwLoading(false);
    }
  };

  if (!unlocked) {
    return (
      <section className="stack-gap">
        <PageHeader title="Configuración" subtitle="Se requiere tu contraseña para continuar." />
        <div className="card-panel" style={{ maxWidth: 400 }}>
          <form className="stack-gap" onSubmit={handleUnlock}>
            <label>
              <span>Contraseña</span>
              <Input
                type="password"
                value={pwInput}
                onChange={(e) => setPwInput(e.target.value)}
                placeholder="Ingresa tu contraseña de sesión"
                autoFocus
              />
            </label>
            {pwError && <p className="error-text">{pwError}</p>}
            <div className="form-actions">
              <Button type="submit" disabled={pwLoading || !pwInput.trim()}>
                {pwLoading ? 'Verificando...' : 'Confirmar y continuar'}
              </Button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  const handleSave = async () => {
    await api.updateCompanySettings(form);
    await refetch();
    alert('Guardado correctamente ✅');
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();

    reader.onload = () => {
      setForm((prev: any) => ({
        ...prev,
        logoBase64: reader.result
      }));
    };

    reader.readAsDataURL(file);
  };

  return (
    <section className="stack-gap">
      <PageHeader
        title="Configuración"
        subtitle="Datos del negocio, políticas, seguridad y backups."
      />

      <div className="card-panel stack-gap">
        <label>
          <span>Nombre comercial</span>
          <Input
            value={form.companyName || ''}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          />
        </label>

        <label>
          <span>NIT</span>
          <Input
            value={form.nit || ''}
            onChange={(e) => setForm({ ...form, nit: e.target.value })}
          />
        </label>

        <label>
          <span>Nombre legal</span>
          <Input
            value={form.legalName || ''}
            onChange={(e) => setForm({ ...form, legalName: e.target.value })}
          />
        </label>

        <label>
          <span>Teléfono</span>
          <Input
            value={form.phone || ''}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>

        <label>
          <span>Email</span>
          <Input
            value={form.email || ''}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>

        <label>
          <span>Dirección</span>
          <Input
            value={form.address || ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </label>

        <label>
          <span>Logo</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleLogoUpload(e.target.files[0]);
              }
            }}
          />
        </label>

        {form.logoBase64 && (
          <div className="card-panel" style={{ background: '#f8fafc' }}>
            <p style={{ marginTop: 0 }}><strong>Vista previa del logo</strong></p>
            <img
              src={form.logoBase64}
              alt="Logo del negocio"
              style={{
                maxWidth: 140,
                maxHeight: 140,
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>
        )}

        <label>
          <span>Políticas del negocio (factura y WhatsApp)</span>
          <textarea
            className="field"
            rows={6}
            value={form.invoicePolicies || ''}
            onChange={(e) =>
              setForm({ ...form, invoicePolicies: e.target.value })
            }
            placeholder="Ej: No nos hacemos responsables por prendas no reclamadas en 30 días..."
            style={{ resize: 'vertical', paddingTop: 12 }}
          />
        </label>

        <div className="form-actions">
          <Button onClick={handleSave}>
            Guardar configuración
          </Button>
        </div>
      </div>

      <div className="card-panel stack-gap">
  <h3>Seguridad de órdenes</h3>

  <label>
    <span>Contraseña administrativa actual</span>
    <Input
      type="password"
      value={currentAdminPassword}
      onChange={(e) => setCurrentAdminPassword(e.target.value)}
      placeholder="Ingresa la contraseña actual"
    />
  </label>

  <label>
    <span>Nueva contraseña administrativa</span>
    <Input
      type="password"
      value={newAdminPassword}
      onChange={(e) => setNewAdminPassword(e.target.value)}
      placeholder="Ingresa la nueva contraseña"
    />
  </label>

  <label>
    <span>Confirmar nueva contraseña</span>
    <Input
      type="password"
      value={confirmAdminPassword}
      onChange={(e) => setConfirmAdminPassword(e.target.value)}
      placeholder="Repite la nueva contraseña"
    />
  </label>

  <div className="form-actions">
    <Button
      onClick={() =>
        updateAdminPasswordMutation.mutate({
          currentPassword: currentAdminPassword,
          newPassword: newAdminPassword,
          confirmPassword: confirmAdminPassword
        })
      }
      disabled={updateAdminPasswordMutation.isPending}
    >
      {updateAdminPasswordMutation.isPending
        ? 'Guardando...'
        : 'Actualizar contraseña'}
    </Button>
  </div>

  {updateAdminPasswordMutation.isError && (
    <p className="error-text">
      {(updateAdminPasswordMutation.error as Error).message}
    </p>
  )}

  {updateAdminPasswordMutation.isSuccess && (
    <p style={{ color: 'green', margin: 0 }}>
      Contraseña administrativa actualizada correctamente.
    </p>
  )}
</div>

      <div className="card-panel stack-gap">
        <h3>Backups en Google Drive</h3>

        <div className="form-actions">
          <Button
            onClick={() => connectDriveMutation.mutate()}
            disabled={connectDriveMutation.isPending}
          >
            {connectDriveMutation.isPending
              ? 'Conectando...'
              : 'Conectar Google Drive'}
          </Button>

          <Button
            variant="secondary"
            onClick={() => uploadBackupMutation.mutate()}
            disabled={uploadBackupMutation.isPending}
          >
            {uploadBackupMutation.isPending
              ? 'Subiendo...'
              : 'Crear backup y subir'}
          </Button>
        </div>

        {connectDriveMutation.isError && (
          <p className="error-text">
            {(connectDriveMutation.error as Error).message}
          </p>
        )}

        {uploadBackupMutation.isError && (
          <p className="error-text">
            {(uploadBackupMutation.error as Error).message}
          </p>
        )}

        {connectDriveMutation.data && (
          <p>{connectDriveMutation.data.message}</p>
        )}

        {uploadBackupMutation.data && (
          <p>{uploadBackupMutation.data.message}</p>
        )}

        <DataTable
          rows={backups}
          columns={[
            {
              key: 'file',
              header: 'Archivo',
              render: (row) => row.file_name
            },
            {
              key: 'status',
              header: 'Estado',
              render: (row) => row.status
            },
            {
              key: 'message',
              header: 'Mensaje',
              render: (row) => row.message || '—'
            },
            {
              key: 'date',
              header: 'Fecha',
              render: (row) =>
                row.created_at
                  ? new Date(row.created_at).toLocaleString('es-CO')
                  : '—'
            }
          ]}
        />
      </div>
    </section>
  );
};
