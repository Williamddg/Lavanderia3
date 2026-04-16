import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '@renderer/services/api';
import type { DeliveryInput } from '@shared/types';
import { Button, DataTable, Input, Modal, PageHeader } from '@renderer/ui/components';
import { currency, dateTime } from '@renderer/utils/format';

const emptyForm: DeliveryInput = {
  orderId: 0,
  deliveredTo: '',
  receiverDocument: null,
  receiverPhone: null,
  relationshipToClient: null,
  receiverSignature: null,
  ticketCode: ''
};

const getOrderSequence = (orderNumber?: string | null) => {
  const raw = String(orderNumber ?? '').toUpperCase();
  const match = raw.match(/ORD-(\d+)/);
  if (!match) return '';
  return String(Number(match[1]));
};

const normalizeSearch = (value: string) => {
  const raw = String(value ?? '').trim().toUpperCase();

  if (!raw) return '';

  if (/^\d+$/.test(raw)) return String(Number(raw));

  const match = raw.match(/ORD-(\d+)/);
  if (match) return String(Number(match[1]));

  return raw;
};

export const DeliveriesPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: deliveries = [] } = useQuery({
    queryKey: ['deliveries'],
    queryFn: api.listDeliveries
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: api.listOrders
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DeliveryInput>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  const [orderFilter, setOrderFilter] = useState('');
  const [modalOrderFilter, setModalOrderFilter] = useState('');

  const requestedOrderId = Number(searchParams.get('orderId') || 0);
  const shouldOpenFromOrder = searchParams.get('open') === '1';

  const mutation = useMutation({
    mutationFn: api.createDelivery,
    onSuccess: async () => {
      setOpen(false);
      setForm(emptyForm);
      setFormError(null);
      setModalOrderFilter('');

      await queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });

  const deliverableOrders = orders.filter(
    (order) =>
      !['ENTREGADO', 'DELIVERED', 'CANCELADO', 'CANCELED'].includes(
        order.statusName.toUpperCase()
      )
  );

  // 🔥 AUTO ABRIR DESDE ORDEN
  useEffect(() => {
    if (!shouldOpenFromOrder || !requestedOrderId || !deliverableOrders.length) return;

    const selectedOrder = deliverableOrders.find(
      (order) => order.id === requestedOrderId
    );

    if (!selectedOrder) return;

    setOpen(true);

    setForm((prev) => ({
      ...prev,
      orderId: selectedOrder.id,
      ticketCode: selectedOrder.orderNumber,
      deliveredTo: selectedOrder.clientName ?? ''
      // ❌ NO teléfono automático
    }));

    setModalOrderFilter(selectedOrder.orderNumber);
    setFormError(null);

    setSearchParams({}, { replace: true });
  }, [
    shouldOpenFromOrder,
    requestedOrderId,
    deliverableOrders,
    setSearchParams
  ]);

  const filteredDeliverableOrders = useMemo(() => {
    const raw = modalOrderFilter.trim();
    if (!raw) return deliverableOrders;

    const term = normalizeSearch(raw);

    return deliverableOrders.filter((order) => {
      const orderNumber = String(order.orderNumber ?? '').toUpperCase();
      const clientName = String(order.clientName ?? '').toLowerCase();
      const sequence = getOrderSequence(order.orderNumber);

      if (/^\d+$/.test(raw)) return sequence === term;
      if (/^ORD-\d+$/i.test(raw)) return orderNumber === raw.toUpperCase();

      return (
        orderNumber.includes(raw.toUpperCase()) ||
        clientName.includes(raw.toLowerCase())
      );
    });
  }, [deliverableOrders, modalOrderFilter]);

  // 🔥 VALIDACIÓN NEGOCIO
  const validateOrder = () => {
    const selected = orders.find((o) => o.id === form.orderId);

    if (!selected) return 'Debes seleccionar una orden válida.';

    const status = selected.statusName.toUpperCase();

if (
  ![
    'LISTO PARA ENTREGAR',
    'READY FOR DELIVERY'
  ].includes(status)
) {
  return 'La orden no está lista para entrega. Debes cambiar el estado a "LISTO PARA ENTREGAR".';
}

    if (Number(selected.balanceDue ?? 0) > 0) {
      return `La orden tiene saldo pendiente (${currency(
        selected.balanceDue
      )}). Debes registrar el pago antes de entregarla.`;
    }

    return null;
  };

  const filteredDeliveries = useMemo(() => {
    const filter = orderFilter.trim().toLowerCase();
    if (!filter) return deliveries;

    return deliveries.filter((delivery) => {
      const relatedOrder = orders.find((order) => order.id === delivery.orderId);
      const orderNumber = relatedOrder?.orderNumber?.toLowerCase() ?? '';
      const orderIdText = String(delivery.orderId).toLowerCase();

      return orderNumber.includes(filter) || orderIdText.includes(filter);
    });
  }, [deliveries, orders, orderFilter]);

  const handleSubmit = () => {
    if (!form.orderId) {
      setFormError('Debes seleccionar una orden.');
      return;
    }

    if (!form.deliveredTo.trim()) {
      setFormError('Debes ingresar el nombre de quien recibe.');
      return;
    }

    const validationError = validateOrder();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    mutation.mutate(form);
  };

  const getOrderDisplay = (orderId: number) => {
    const relatedOrder = orders.find((order) => order.id === orderId);
    return relatedOrder?.orderNumber ?? `#${orderId}`;
  };

  return (
    <section className="stack-gap">
      <PageHeader
        title="Entregas"
        subtitle="Listado de entregas y confirmación de órdenes listas."
        actions={
          <Button
            onClick={() => {
              setOpen(true);
              setModalOrderFilter('');
              setForm(emptyForm);
              setFormError(null);
              setSearchParams({}, { replace: true });
            }}
          >
            Entregar orden
          </Button>
        }
      />

      <div className="card-panel stack-gap">
        <Input
          placeholder="Filtrar por número de orden"
          value={orderFilter}
          onChange={(e) => setOrderFilter(e.target.value)}
        />

        <DataTable
          rows={filteredDeliveries}
          columns={[
            {
              key: 'order',
              header: 'Orden',
              render: (row) => getOrderDisplay(row.orderId)
            },
            {
              key: 'who',
              header: 'Recibe',
              render: (row) => row.deliveredTo
            },
            {
              key: 'ticket',
              header: 'Ticket',
              render: (row) => row.ticketCode || '—'
            },
            {
              key: 'balance',
              header: 'Saldo entregado',
              render: (row) => currency(row.outstandingBalance)
            },
            {
              key: 'date',
              header: 'Fecha',
              render: (row) => dateTime(row.createdAt)
            }
          ]}
        />
      </div>

      <Modal open={open} title="Confirmar entrega" onClose={() => setOpen(false)}>
        <div className="stack-gap">

          <label>
            <span>Buscar orden</span>
            <Input
              value={modalOrderFilter}
              onChange={(e) => setModalOrderFilter(e.target.value)}
            />
          </label>

          <label>
            <span>Orden *</span>
            <select
              className="field"
              value={form.orderId}
              onChange={(e) => {
                const selectedId = Number(e.target.value);
                const selectedOrder = deliverableOrders.find((o) => o.id === selectedId);

                setForm((prev) => ({
                  ...prev,
                  orderId: selectedId,
                  ticketCode: selectedOrder?.orderNumber ?? prev.ticketCode,
                  deliveredTo: selectedOrder?.clientName ?? prev.deliveredTo
                }));

                setModalOrderFilter(selectedOrder?.orderNumber ?? '');
              }}
            >
              <option value={0}>Selecciona</option>
              {filteredDeliverableOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.orderNumber} · {order.clientName}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Nombre receptor *</span>
            <Input
              value={form.deliveredTo}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  deliveredTo: e.target.value
                }))
              }
            />
          </label>

          {/* 🔥 TELÉFONO OPCIONAL */}
          <label>
            <span>Teléfono (opcional)</span>
            <Input
              value={form.receiverPhone ?? ''}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  receiverPhone: e.target.value || null
                }))
              }
            />
          </label>

          <div className="form-actions">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>Confirmar entrega</Button>
          </div>

          {formError && <p className="error-text">{formError}</p>}
        </div>
      </Modal>
    </section>
  );
};