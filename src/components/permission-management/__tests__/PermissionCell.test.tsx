import { render, screen, fireEvent } from '@testing-library/react';
import { PermissionCell } from '../PermissionCell';
import { Permission } from '@/lib/permission-management/types';

const BINARY: Permission = { id: 'p1', module: 'leave', action: 'access', description: null, is_scoped: false };
const SCOPED: Permission = { id: 'p2', module: 'form_records', action: 'read', description: null, is_scoped: true };

describe('PermissionCell', () => {
  it('renders a checkbox for binary permissions and toggles', () => {
    const onChange = jest.fn();
    render(
      <PermissionCell
        permission={BINARY}
        value={{ granted: false, scope: null }}
        disabled={false}
        onChange={onChange}
      />,
    );
    const cb = screen.getByRole('checkbox');
    fireEvent.click(cb);
    expect(onChange).toHaveBeenCalledWith({ granted: true, scope: null });
  });

  it('renders a select for scoped permissions with off/own/branch/all and emits grant on first non-off pick', () => {
    const onChange = jest.fn();
    render(
      <PermissionCell
        permission={SCOPED}
        value={{ granted: false, scope: null }}
        disabled={false}
        onChange={onChange}
      />,
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'all' } });
    expect(onChange).toHaveBeenCalledWith({ granted: true, scope: 'all' });
  });

  it('emits revoke when scope select returns to "off"', () => {
    const onChange = jest.fn();
    render(
      <PermissionCell
        permission={SCOPED}
        value={{ granted: true, scope: 'all' }}
        disabled={false}
        onChange={onChange}
      />,
    );
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ granted: false, scope: null });
  });

  it('disables the input when disabled', () => {
    render(
      <PermissionCell
        permission={BINARY}
        value={{ granted: true, scope: null }}
        disabled={true}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
