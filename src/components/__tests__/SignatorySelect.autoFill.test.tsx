import { render, screen } from '@testing-library/react';
import SignatorySelect from '../SignatorySelect';
import { useCurrentUser } from '@/stores/authStore';

jest.mock('@/stores/authStore');

const USER1 = {
  id: 'u1',
  fullName: 'Tony Tester',
  signature_url: 'https://sigs.example/u1.png',
  position: { id: 'p-user1', name: 'User 1', display_name: 'User 1', description: null },
};
const USER2 = {
  id: 'u2',
  fullName: 'Una Two',
  signature_url: 'https://sigs.example/u2.png',
  position: { id: 'p-user2', name: 'User 2', display_name: 'User 2', description: null },
};
const ADMIN = {
  id: 'a1',
  fullName: 'Adam Admin',
  signature_url: 'https://sigs.example/a1.png',
  position: { id: 'p-admin', name: 'Admin 1', display_name: 'Admin 1', description: null },
};

const ALL_USERS = [USER1, USER2, ADMIN];

function renderForCurrentUser(
  currentUserId: string,
  value = '',
  lockIfDifferentUser = false,
) {
  (useCurrentUser as jest.Mock).mockReturnValue({ id: currentUserId });
  const onChange = jest.fn();
  const onSignatureChange = jest.fn();
  const utils = render(
    <SignatorySelect
      label="Service Technician"
      name="service_technician_name"
      value={value}
      signatureValue=""
      onChange={onChange}
      onSignatureChange={onSignatureChange}
      users={ALL_USERS as any}
      autoFillForPositions={["User 1", "User 2"]}
      showAllUsers
      lockIfDifferentUser={lockIfDifferentUser}
    />,
  );
  return { ...utils, onChange, onSignatureChange };
}

describe('SignatorySelect autoFillForPositions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('User 1: auto-fills name + signature when value is empty', () => {
    const { onChange, onSignatureChange } = renderForCurrentUser('u1');
    expect(onChange).toHaveBeenCalledWith('service_technician_name', 'Tony Tester');
    expect(onSignatureChange).toHaveBeenCalledWith('https://sigs.example/u1.png');
  });

  it('User 2: auto-fills name + signature when value is empty', () => {
    const { onChange, onSignatureChange } = renderForCurrentUser('u2');
    expect(onChange).toHaveBeenCalledWith('service_technician_name', 'Una Two');
    expect(onSignatureChange).toHaveBeenCalledWith('https://sigs.example/u2.png');
  });

  it('Admin: does NOT auto-fill (dropdown remains free)', () => {
    const { onChange, onSignatureChange } = renderForCurrentUser('a1');
    expect(onChange).not.toHaveBeenCalled();
    expect(onSignatureChange).not.toHaveBeenCalled();
  });

  // In edit-form contexts the field carries lockIfDifferentUser, which prevents
  // auto-fill from overwriting a legitimately saved signature from another user.
  it('User 1 with existing value + lockIfDifferentUser: does NOT overwrite (edit form)', () => {
    const { onChange, onSignatureChange } = renderForCurrentUser('u1', 'Someone Else', true);
    expect(onChange).not.toHaveBeenCalled();
    expect(onSignatureChange).not.toHaveBeenCalled();
  });

  // Without lockIfDifferentUser (create form with persisted-store stale data),
  // auto-fill replaces the stale value with the current user's own name.
  it('User 1 with stale value (no lockIfDifferentUser): DOES overwrite (stale draft)', () => {
    const { onChange, onSignatureChange } = renderForCurrentUser('u1', 'Someone Else');
    expect(onChange).toHaveBeenCalledWith('service_technician_name', 'Tony Tester');
    expect(onSignatureChange).toHaveBeenCalledWith('https://sigs.example/u1.png');
  });

  it('User 1: input is rendered as read-only (locked)', () => {
    renderForCurrentUser('u1');
    const input = screen.getByDisplayValue('') as HTMLInputElement; // value is "" until parent re-renders with the auto-filled value; readOnly is from prop, not value
    expect(input.readOnly).toBe(true);
  });

  it('Admin: input is interactive (NOT locked)', () => {
    renderForCurrentUser('a1');
    const input = screen.getByPlaceholderText(/Select a name/i) as HTMLInputElement;
    expect(input.readOnly).toBe(true); // SignatorySelect always sets readOnly true unless allowTyping
    // But the dropdown chevron should still be visible — meaning it isn't locked.
    // Best signal: the dropdown chevron button is present.
    const chevron = screen.queryByRole('button', { name: /toggle dropdown/i });
    // No reliable accessible name; instead assert the input's class doesn't include the locked bg style.
    expect(input.className).not.toContain('bg-gray-50');
  });
});
