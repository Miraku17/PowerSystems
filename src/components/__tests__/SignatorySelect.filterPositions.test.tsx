/**
 * SignatorySelect dropdown filtering — both legacy `filterPositions` (by position
 * NAME) and the newer `filterByPermission` (by "module.action" key) work.
 *
 * Job Order Request currently uses `filterByPermission` so the dashboard's
 * permission management screen drives which users appear in the
 * Approved By / Service Dept dropdowns — no hardcoded position names.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import SignatorySelect from '../SignatorySelect';
import { useCurrentUser } from '@/stores/authStore';

jest.mock('@/stores/authStore');

const ADMIN1 = {
  id: 'a1', fullName: 'Alice Admin1', signature_url: '',
  position: { id: 'p1', name: 'Admin 1', display_name: 'Admin 1', description: null },
  permissions: ['jo_signatory.approved_by'],
};
const ADMIN2 = {
  id: 'a2', fullName: 'Bob Admin2', signature_url: '',
  position: { id: 'p2', name: 'Admin 2', display_name: 'Admin 2', description: null },
  permissions: ['jo_signatory.approved_by', 'jo_signatory.service_dept'],
};
const ADMIN2_B = {
  id: 'a2b', fullName: 'Cara Admin2', signature_url: '',
  position: { id: 'p2', name: 'Admin 2', display_name: 'Admin 2', description: null },
  permissions: ['jo_signatory.approved_by', 'jo_signatory.service_dept'],
};
const SUPER_USER = {
  id: 'su', fullName: 'Sam Super', signature_url: '',
  position: { id: 'ps', name: 'Super User', display_name: 'Super User', description: null },
  permissions: [],
};
const USER1 = {
  id: 'u1', fullName: 'Tina User1', signature_url: '',
  position: { id: 'pu1', name: 'User 1', display_name: 'User 1', description: null },
  permissions: [],
};
const ALL = [ADMIN1, ADMIN2, ADMIN2_B, SUPER_USER, USER1];

function openDropdown() {
  fireEvent.click(screen.getByPlaceholderText(/Select a name/i));
}

describe('SignatorySelect — filterByPermission', () => {
  beforeEach(() => {
    (useCurrentUser as jest.Mock).mockReturnValue({ id: 'someone' });
  });

  it('Approved By: shows users whose position has jo_signatory.approved_by', () => {
    render(
      <SignatorySelect
        label="Approved By (Department Head)"
        name="approved_by_name"
        value=""
        onChange={() => {}}
        onSignatureChange={() => {}}
        users={ALL as any}
        showAllUsers
        filterByPermission="jo_signatory.approved_by"
      />,
    );
    openDropdown();
    expect(screen.getByText('Alice Admin1')).toBeInTheDocument();
    expect(screen.getByText('Bob Admin2')).toBeInTheDocument();
    expect(screen.getByText('Cara Admin2')).toBeInTheDocument();
    expect(screen.queryByText('Sam Super')).toBeNull();
    expect(screen.queryByText('Tina User1')).toBeNull();
  });

  it('Service Dept: shows users whose position has jo_signatory.service_dept', () => {
    render(
      <SignatorySelect
        label="Service Dept."
        name="received_by_service_dept_name"
        value=""
        onChange={() => {}}
        onSignatureChange={() => {}}
        users={ALL as any}
        showAllUsers
        filterByPermission="jo_signatory.service_dept"
      />,
    );
    openDropdown();
    expect(screen.getByText('Bob Admin2')).toBeInTheDocument();
    expect(screen.getByText('Cara Admin2')).toBeInTheDocument();
    expect(screen.queryByText('Alice Admin1')).toBeNull();
    expect(screen.queryByText('Sam Super')).toBeNull();
    expect(screen.queryByText('Tina User1')).toBeNull();
  });

  it('filterByPermission=undefined (Super Admin override): full list shown', () => {
    render(
      <SignatorySelect
        label="Service Dept."
        name="received_by_service_dept_name"
        value=""
        onChange={() => {}}
        onSignatureChange={() => {}}
        users={ALL as any}
        showAllUsers
        filterByPermission={undefined}
      />,
    );
    openDropdown();
    expect(screen.getByText('Alice Admin1')).toBeInTheDocument();
    expect(screen.getByText('Bob Admin2')).toBeInTheDocument();
    expect(screen.getByText('Sam Super')).toBeInTheDocument();
    expect(screen.getByText('Tina User1')).toBeInTheDocument();
  });

  it('users with no permissions array are excluded when filterByPermission is set', () => {
    const noPerms = [{ ...USER1, permissions: undefined }];
    render(
      <SignatorySelect
        label="Approved By"
        name="approved_by_name"
        value=""
        onChange={() => {}}
        onSignatureChange={() => {}}
        users={noPerms as any}
        showAllUsers
        filterByPermission="jo_signatory.approved_by"
      />,
    );
    openDropdown();
    expect(screen.queryByText('Tina User1')).toBeNull();
  });

  it('legacy filterPositions still works (compose with filterByPermission)', () => {
    render(
      <SignatorySelect
        label="x"
        name="x"
        value=""
        onChange={() => {}}
        onSignatureChange={() => {}}
        users={ALL as any}
        showAllUsers
        filterPositions={['Admin 2']}
        filterByPermission="jo_signatory.service_dept"
      />,
    );
    openDropdown();
    // Both filters apply: Admin 2 position AND has jo_signatory.service_dept
    expect(screen.getByText('Bob Admin2')).toBeInTheDocument();
    expect(screen.getByText('Cara Admin2')).toBeInTheDocument();
    expect(screen.queryByText('Alice Admin1')).toBeNull();
  });
});

describe('JO Request forms wired to filterByPermission (no hardcoded positions)', () => {
  // Source-level guard: catches reverts to the hardcoded approach.
  const fs = require('fs');
  const path = require('path');

  const create = fs.readFileSync(
    path.join(__dirname, '..', 'JobOrderRequestForm.tsx'),
    'utf8',
  );
  const edit = fs.readFileSync(
    path.join(__dirname, '..', 'EditJobOrderRequest.tsx'),
    'utf8',
  );

  function approvedBlock(src: string): string | null {
    const m = src.match(/<SignatorySelect[\s\S]*?\bname="approved_by_name"[\s\S]*?\/>/m);
    return m ? m[0] : null;
  }
  function serviceDeptBlock(src: string): string | null {
    const m = src.match(/<SignatorySelect[\s\S]*?\bname="received_by_service_dept_name"[\s\S]*?\/>/m);
    return m ? m[0] : null;
  }

  it('create form: Approved By uses filterByPermission="jo_signatory.approved_by"', () => {
    const block = approvedBlock(create)!;
    expect(block).toMatch(/showAllUsers/);
    expect(block).toMatch(/filterByPermission=\{isSuperAdmin\s*\?\s*undefined\s*:\s*"jo_signatory\.approved_by"\}/);
    expect(block).not.toMatch(/filterPositions=\{[^}]*Admin/);
  });
  it('create form: Service Dept uses filterByPermission="jo_signatory.service_dept"', () => {
    const block = serviceDeptBlock(create)!;
    expect(block).toMatch(/showAllUsers/);
    expect(block).toMatch(/filterByPermission=\{isSuperAdmin\s*\?\s*undefined\s*:\s*"jo_signatory\.service_dept"\}/);
    expect(block).not.toMatch(/filterPositions=\{[^}]*Admin/);
  });
  it('edit form: Approved By uses filterByPermission="jo_signatory.approved_by"', () => {
    const block = approvedBlock(edit)!;
    expect(block).toMatch(/showAllUsers/);
    expect(block).toMatch(/filterByPermission=\{isSuperAdmin\s*\?\s*undefined\s*:\s*"jo_signatory\.approved_by"\}/);
    expect(block).not.toMatch(/filterPositions=\{[^}]*Admin/);
  });
  it('edit form: Service Dept uses filterByPermission="jo_signatory.service_dept"', () => {
    const block = serviceDeptBlock(edit)!;
    expect(block).toMatch(/showAllUsers/);
    expect(block).toMatch(/filterByPermission=\{isSuperAdmin\s*\?\s*undefined\s*:\s*"jo_signatory\.service_dept"\}/);
    expect(block).not.toMatch(/filterPositions=\{[^}]*Admin/);
  });
});
