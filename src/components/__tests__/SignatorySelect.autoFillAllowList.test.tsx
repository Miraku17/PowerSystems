import { fireEvent, render, screen } from '@testing-library/react';
import SignatorySelect from '../SignatorySelect';
import { useCurrentUser } from '@/stores/authStore';

jest.mock('@/stores/authStore');

/**
 * Regression guard: `autoFillForPositions` is the ONLY thing that may auto-sign
 * a signatory field.
 *
 * `isCurrentUserOnlyField` (added in ee9b615, removed here) treated "showAllUsers
 * is falsy" as "this field belongs to the logged-in user" and auto-filled name +
 * signature. `showAllUsers` defaults to false and most call sites omit it, so the
 * fallback fired almost everywhere: it overrode the allow-list sitting beside it,
 * and it signed approval boxes as a side effect of merely opening a form.
 *
 * The existing autoFill suite missed this because every case in it passes
 * `showAllUsers` — the one condition under which the fallback did not apply.
 * These tests deliberately omit it, mirroring the real call sites.
 */

const USER1 = {
  id: 'u1',
  fullName: 'Tony Tester',
  signature_url: 'https://sigs.example/u1.png',
  position: { id: 'p-user1', name: 'User 1', display_name: 'User 1', description: null },
};
const ADMIN2 = {
  id: 'a2',
  fullName: 'Russell Licuanan',
  signature_url: 'https://sigs.example/a2.png',
  position: { id: 'p-admin2', name: 'Admin 2', display_name: 'Admin 2', description: null },
};
const FINANCE = {
  id: 'f1',
  fullName: 'Fiona Finance',
  signature_url: 'https://sigs.example/f1.png',
  position: { id: 'p-finance', name: 'Finance', display_name: 'Finance', description: null },
};

const ALL_USERS = [USER1, ADMIN2, FINANCE];

/** Mirrors the real call sites, which omit `showAllUsers`. */
function renderField(
  currentUserId: string,
  autoFillForPositions: string[],
  label = 'Service Technician',
  name = 'service_technician_name',
) {
  (useCurrentUser as jest.Mock).mockReturnValue({ id: currentUserId });
  const onChange = jest.fn();
  const onSignatureChange = jest.fn();
  render(
    <SignatorySelect
      label={label}
      name={name}
      value=""
      signatureValue=""
      onChange={onChange}
      onSignatureChange={onSignatureChange}
      users={ALL_USERS as any}
      autoFillForPositions={autoFillForPositions}
    />,
  );
  return { onChange, onSignatureChange };
}

describe('SignatorySelect — autoFillForPositions is authoritative', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does NOT auto-sign a position outside the allow-list (Service Technician)', () => {
    // Mirrors EngineSurfacePumpServiceForm et al: allow-list is User 1/User 2,
    // so an Admin 2 opening the report must not be signed into it.
    const { onChange, onSignatureChange } = renderField('a2', ['User 1', 'User 2']);
    expect(onChange).not.toHaveBeenCalled();
    expect(onSignatureChange).not.toHaveBeenCalled();
  });

  it('does NOT auto-sign a non-Finance user into Credit & Collection', () => {
    // Mirrors JobOrderRequestForm's "Credit & Collection" field.
    const { onChange, onSignatureChange } = renderField(
      'u1',
      ['Finance'],
      'Credit & Collection',
      'received_by_credit_collection_name',
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(onSignatureChange).not.toHaveBeenCalled();
  });

  it('does NOT auto-sign a non-Super-Admin into Verified By', () => {
    // Mirrors JobOrderRequestForm's "Verified By" field.
    const { onChange, onSignatureChange } = renderField(
      'a2',
      ['Super Admin'],
      'Verified By',
      'verified_by_name',
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(onSignatureChange).not.toHaveBeenCalled();
  });

  it('still auto-signs a position that IS on the allow-list', () => {
    const { onChange, onSignatureChange } = renderField('u1', ['User 1', 'User 2']);
    expect(onChange).toHaveBeenCalledWith('service_technician_name', 'Tony Tester');
    expect(onSignatureChange).toHaveBeenCalledWith('https://sigs.example/u1.png');
  });
});

/**
 * Approval boxes must never be signed as a side effect of opening a form.
 *
 * "Approved By" / "Noted By" / "Requested By" declare no allow-list, so the
 * current-user-only fallback used to sign whoever held the matching permission
 * the moment the form rendered — Admin 2 (approved_by) and Admin 1 (noted_by)
 * found themselves already signed on every report they opened. Approving is a
 * deliberate act: the dropdown still offers them their own name to click.
 */
describe('SignatorySelect — fields with no allow-list never auto-sign', () => {
  beforeEach(() => jest.clearAllMocks());

  function renderNoAllowList(currentUserId: string, label: string, name: string) {
    (useCurrentUser as jest.Mock).mockReturnValue({ id: currentUserId });
    const onChange = jest.fn();
    const onSignatureChange = jest.fn();
    render(
      <SignatorySelect
        label={label}
        name={name}
        value=""
        signatureValue=""
        onChange={onChange}
        onSignatureChange={onSignatureChange}
        users={ALL_USERS as any}
      />,
    );
    return { onChange, onSignatureChange };
  }

  it('does not pre-sign Approved By for the position that can approve', () => {
    // Admin 2 holds service_report_signatory.approved_by, so the field is
    // enabled for them — but enabled must not mean already signed.
    const { onChange, onSignatureChange } = renderNoAllowList('a2', 'Approved By', 'approved_by_name');
    expect(onChange).not.toHaveBeenCalled();
    expect(onSignatureChange).not.toHaveBeenCalled();
  });

  it('does not pre-sign Noted By', () => {
    const { onChange, onSignatureChange } = renderNoAllowList('u1', 'Noted By', 'noted_by_name');
    expect(onChange).not.toHaveBeenCalled();
    expect(onSignatureChange).not.toHaveBeenCalled();
  });

  it('does not pre-sign Requested By', () => {
    const { onChange, onSignatureChange } = renderNoAllowList('u1', 'Requested By', 'requested_by_name');
    expect(onChange).not.toHaveBeenCalled();
    expect(onSignatureChange).not.toHaveBeenCalled();
  });

  it('leaves the field signable: the user can open the dropdown and pick themselves', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ id: 'a2' });
    const onChange = jest.fn();
    const onSignatureChange = jest.fn();
    render(
      <SignatorySelect
        label="Approved By"
        name="approved_by_name"
        value=""
        signatureValue=""
        onChange={onChange}
        onSignatureChange={onSignatureChange}
        users={ALL_USERS as any}
      />,
    );

    // Not locked, so the open-dropdown chevron is rendered.
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    fireEvent.click(buttons[buttons.length - 1]);

    // The dropdown is current-user-only, so Admin 2 sees exactly themselves.
    fireEvent.click(screen.getByText('Russell Licuanan'));

    expect(onChange).toHaveBeenCalledWith('approved_by_name', 'Russell Licuanan');
    expect(onSignatureChange).toHaveBeenCalledWith('https://sigs.example/a2.png');
  });
});
