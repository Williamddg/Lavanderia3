import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@renderer/services/api';
import { Button, DataTable, Input, PageHeader } from '@renderer/ui/components';

type RowState = {
  fullName: string;
  username: string;
  password: string;
};

export const UsersPage = () => {
  const queryClient = useQueryClient();
  const { data: sellers = [] } = useQuery({
    queryKey: ['seller-users'],
    queryFn: api.listSellerUsers
  });
  const [editing, setEditing] = useState<Record<number, RowState>>({});
  const [message, setMessage] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: RowState }) =>
      api.updateSellerUser(id, {
        fullName: input.fullName,
        username: input.username,
        password: input.password.trim() ? input.password.trim() : null
      }),
    onSuccess: async (_row, vars) => {
      setMessage('Usuario vendedor actualizado.');
      setEditing((prev) => ({
        ...prev,
        [vars.id]: {
          ...prev[vars.id],
          password: ''
        }
      }));
      await queryClient.invalidateQueries({ queryKey: ['seller-users'] });
    }
  });

  const rows = useMemo(
    () =>
      sellers.map((seller) => ({
        ...seller,
        draft: editing[seller.id] ?? {
          fullName: seller.fullName,
          username: seller.username,
          password: ''
        }
      })),
    [sellers, editing]
  );

  return (
    <section className="stack-gap">
      <PageHeader
        title="Usuarios"
        subtitle="Gestión de vendedores: nombre, usuario y cambio de contraseña."
      />

      <div className="card-panel stack-gap">
        <DataTable
          rows={rows}
          columns={[
            {
              key: 'name',
              header: 'Nombre completo',
              render: (row) => (
                <Input
                  value={row.draft.fullName}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev,
                      [row.id]: { ...row.draft, fullName: e.target.value }
                    }))
                  }
                />
              )
            },
            {
              key: 'username',
              header: 'Usuario',
              render: (row) => (
                <Input
                  value={row.draft.username}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev,
                      [row.id]: { ...row.draft, username: e.target.value }
                    }))
                  }
                />
              )
            },
            {
              key: 'password',
              header: 'Contraseña',
              render: (row) => (
                <Input
                  type="password"
                  placeholder="Vacío = no cambiar"
                  value={row.draft.password}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev,
                      [row.id]: { ...row.draft, password: e.target.value }
                    }))
                  }
                />
              )
            },
            {
              key: 'actions',
              header: 'Acción',
              render: (row) => (
                <Button
                  onClick={() => {
                    setMessage(null);
                    updateMutation.mutate({ id: row.id, input: row.draft });
                  }}
                  disabled={updateMutation.isPending}
                >
                  Guardar
                </Button>
              )
            }
          ]}
        />

        {updateMutation.isError && (
          <p className="error-text">{(updateMutation.error as Error).message}</p>
        )}
        {message && <p style={{ color: '#16a34a', margin: 0 }}>{message}</p>}
      </div>
    </section>
  );
};
