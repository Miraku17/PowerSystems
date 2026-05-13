import { render, screen } from '@testing-library/react';
import SignatorySelect from '../SignatorySelect';
import { useCurrentUser } from '@/stores/authStore';

jest.mock('@/stores/authStore');

const USER_A = {
  id: 'a',
  fullName: 'Alice Engineer',
  signature_url: 'https://sigs.example/a.png',
  position: { id: 'p-user1', name: 'User 1', display_name: 'User 1', description: null },
};
const USER_B = {
  id: 'b',
  fullName: 'Bob Engineer',
  signature_url: 'https://sigs.example/b.png',
  position: { id: 'p-user1', name: 'User 1', display_name: 'User 1', description: null },
};
const SUPER = {
  id: 's',
  fullName: 'Sue Super',
  signature_url: 'https://sigs.example/s.png',
  position: { id: 'p-super', name: 'Super Admin', display_name: 'Super Admin', description: null },
};

const ALL_USERS = [USER_A, USER_B, SUPER];

function renderAs(currentUserId: string, value: string) {
  (useCurrentUser as jest.Mock).mockReturnValue({ id: currentUserId });
  return render(
    <SignatorySelect
      label="Requested By"
      name="requested_by_name"
      value={value}
      signatureValue="https://sigs.example/b.png"
      onChange={jest.fn()}
      onSignatureChange={jest.fn()}
      users={ALL_USERS as any}
      showAllUsers
      lockIfDifferentUser
    />,
  );
}

describe('SignatorySelect lockIfDifferentUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('locks when value is another user (not super admin)', () => {
    // Alice is logged in; field holds Bob's signature.
    renderAs('a', USER_B.fullName);
    const input = screen.getByDisplayValue(USER_B.fullName) as HTMLInputElement;
    expect(input.readOnly).toBe(true);
    // Clear (X) and chevron buttons should be hidden when locked.
    expect(screen.queryAllByRole('button').length).toBe(0);
  });

  it('does NOT lock when value matches the current user', () => {
    // Bob is logged in; field holds Bob's signature — he can still edit.
    renderAs('b', USER_B.fullName);
    const input = screen.getByDisplayValue(USER_B.fullName) as HTMLInputElement;
    // Not in locked styling.
    expect(input.className).not.toContain('bg-gray-50');
    // Chevron + clear buttons should render.
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('does NOT lock when current user is Super Admin', () => {
    renderAs('s', USER_B.fullName);
    const input = screen.getByDisplayValue(USER_B.fullName) as HTMLInputElement;
    expect(input.className).not.toContain('bg-gray-50');
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('does NOT lock when value is empty (nothing to protect yet)', () => {
    renderAs('a', '');
    const input = screen.getByPlaceholderText(/Select a name/i) as HTMLInputElement;
    expect(input.className).not.toContain('bg-gray-50');
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});
