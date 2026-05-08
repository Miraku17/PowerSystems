import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PermissionMatrixPage } from '../PermissionMatrixPage';
import apiClient from '@/lib/axios';

jest.mock('@/lib/axios');

const matrix = {
  positions: [
    { id: 'pos-super', name: 'Super Admin' },
    { id: 'pos-a', name: 'Admin 1' },
  ],
  permissions: [
    { id: 'p1', module: 'leave', action: 'access', description: 'Access leave page', is_scoped: false },
    { id: 'p2', module: 'form_records', action: 'read', description: null, is_scoped: true },
  ],
  assignments: [
    { position_id: 'pos-super', permission_id: 'p1', scope: null },
  ],
};

function withClient(node: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{node}</QueryClientProvider>;
}

describe('PermissionMatrixPage', () => {
  beforeEach(() => {
    (apiClient.get as jest.Mock).mockResolvedValue({ data: { success: true, data: matrix } });
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        batch_id: 'b-1',
        data: { ...matrix, assignments: [...matrix.assignments, { position_id: 'pos-a', permission_id: 'p1', scope: null }] },
      },
    });
  });

  it('renders modules and positions, with Super Admin column locked', async () => {
    render(withClient(<PermissionMatrixPage />));
    await waitFor(() => screen.getByText('Admin 1'));
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('leave')).toBeInTheDocument();
    expect(screen.getAllByText(/form_records/).length).toBeGreaterThan(0);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(
      checkboxes.find(
        (c) => c.getAttribute('aria-label') === 'leave.access' && (c as HTMLInputElement).disabled,
      ),
    ).toBeTruthy();
  });

  it('toggling a non-Super-Admin cell increments dirty count', async () => {
    render(withClient(<PermissionMatrixPage />));
    await waitFor(() => screen.getByText('Admin 1'));
    expect(screen.getByText(/No unsaved changes/i)).toBeInTheDocument();
    const adminCheckbox = screen
      .getAllByRole('checkbox')
      .filter((c) => !(c as HTMLInputElement).disabled && c.getAttribute('aria-label') === 'leave.access')[0];
    fireEvent.click(adminCheckbox);
    expect(screen.getByText(/1 unsaved change/i)).toBeInTheDocument();
  });
});
