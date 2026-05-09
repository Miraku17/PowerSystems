/**
 * Verifies the SignatorySelect dropdown filters by position name.
 *
 * Background — Job Order Request requirements:
 *   • "Approved By (Department Head)" must list only Admin 1 / Admin 2
 *   • "Service Dept." must list only Admin 2
 *   • Super Admin gets full list (no filter applied)
 *
 * The filtering itself lives in SignatorySelect via `filterPositions` +
 * `showAllUsers`. These tests prove the prop works regardless of the calling
 * form, so any caller (JO create + edit) gets correct behavior.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import SignatorySelect from '../SignatorySelect';
import { useCurrentUser } from '@/stores/authStore';

jest.mock('@/stores/authStore');

const ADMIN1 = {
  id: 'a1', fullName: 'Alice Admin1',
  signature_url: '', position: { id: 'p1', name: 'Admin 1', display_name: 'Admin 1', description: null },
};
const ADMIN2 = {
  id: 'a2', fullName: 'Bob Admin2',
  signature_url: '', position: { id: 'p2', name: 'Admin 2', display_name: 'Admin 2', description: null },
};
const ADMIN2_B = {
  id: 'a2b', fullName: 'Cara Admin2',
  signature_url: '', position: { id: 'p2', name: 'Admin 2', display_name: 'Admin 2', description: null },
};
const SUPER_USER = {
  id: 'su', fullName: 'Sam Super',
  signature_url: '', position: { id: 'ps', name: 'Super User', display_name: 'Super User', description: null },
};
const USER1 = {
  id: 'u1', fullName: 'Tina User1',
  signature_url: '', position: { id: 'pu1', name: 'User 1', display_name: 'User 1', description: null },
};
const ALL = [ADMIN1, ADMIN2, ADMIN2_B, SUPER_USER, USER1];

function openDropdown() {
  fireEvent.click(screen.getByPlaceholderText(/Select a name/i));
}

describe('SignatorySelect filterPositions', () => {
  beforeEach(() => {
    (useCurrentUser as jest.Mock).mockReturnValue({ id: 'someone' });
  });

  it('Approved By: only Admin 1 + Admin 2 are in the dropdown', () => {
    render(
      <SignatorySelect
        label="Approved By (Department Head)"
        name="approved_by_name"
        value=""
        onChange={() => {}}
        onSignatureChange={() => {}}
        users={ALL as any}
        showAllUsers
        filterPositions={['Admin 1', 'Admin 2']}
      />,
    );
    openDropdown();
    expect(screen.getByText('Alice Admin1')).toBeInTheDocument();
    expect(screen.getByText('Bob Admin2')).toBeInTheDocument();
    expect(screen.getByText('Cara Admin2')).toBeInTheDocument();
    expect(screen.queryByText('Sam Super')).toBeNull();
    expect(screen.queryByText('Tina User1')).toBeNull();
  });

  it('Service Dept: only Admin 2 users are listed', () => {
    render(
      <SignatorySelect
        label="Service Dept."
        name="received_by_service_dept_name"
        value=""
        onChange={() => {}}
        onSignatureChange={() => {}}
        users={ALL as any}
        showAllUsers
        filterPositions={['Admin 2']}
      />,
    );
    openDropdown();
    expect(screen.getByText('Bob Admin2')).toBeInTheDocument();
    expect(screen.getByText('Cara Admin2')).toBeInTheDocument();
    expect(screen.queryByText('Alice Admin1')).toBeNull();
    expect(screen.queryByText('Sam Super')).toBeNull();
    expect(screen.queryByText('Tina User1')).toBeNull();
  });

  it('Super Admin override (filterPositions=undefined): full list shown', () => {
    render(
      <SignatorySelect
        label="Service Dept."
        name="received_by_service_dept_name"
        value=""
        onChange={() => {}}
        onSignatureChange={() => {}}
        users={ALL as any}
        showAllUsers
        filterPositions={undefined}
      />,
    );
    openDropdown();
    expect(screen.getByText('Alice Admin1')).toBeInTheDocument();
    expect(screen.getByText('Bob Admin2')).toBeInTheDocument();
    expect(screen.getByText('Sam Super')).toBeInTheDocument();
    expect(screen.getByText('Tina User1')).toBeInTheDocument();
  });

  it('position match is case-insensitive', () => {
    render(
      <SignatorySelect
        label="Approved By"
        name="approved_by_name"
        value=""
        onChange={() => {}}
        onSignatureChange={() => {}}
        users={ALL as any}
        showAllUsers
        filterPositions={['admin 1', 'ADMIN 2']}
      />,
    );
    openDropdown();
    expect(screen.getByText('Alice Admin1')).toBeInTheDocument();
    expect(screen.getByText('Bob Admin2')).toBeInTheDocument();
    expect(screen.queryByText('Sam Super')).toBeNull();
  });
});

describe('JO Request form sources match the design', () => {
  // Source-level guard: catches accidental removal of the prop wiring.
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

  it('create form: Approved By has Admin 1 + Admin 2 filter (Super Admin override)', () => {
    const block = approvedBlock(create)!;
    expect(block).toMatch(/showAllUsers/);
    expect(block).toMatch(/filterPositions=\{isSuperAdmin\s*\?\s*undefined\s*:\s*\["Admin 1",\s*"Admin 2"\]\}/);
  });
  it('create form: Service Dept has Admin 2 filter (Super Admin override)', () => {
    const block = serviceDeptBlock(create)!;
    expect(block).toMatch(/showAllUsers/);
    expect(block).toMatch(/filterPositions=\{isSuperAdmin\s*\?\s*undefined\s*:\s*\["Admin 2"\]\}/);
  });
  it('edit form: Approved By has Admin 1 + Admin 2 filter (Super Admin override)', () => {
    const block = approvedBlock(edit)!;
    expect(block).toMatch(/showAllUsers/);
    expect(block).toMatch(/filterPositions=\{isSuperAdmin\s*\?\s*undefined\s*:\s*\["Admin 1",\s*"Admin 2"\]\}/);
  });
  it('edit form: Service Dept has Admin 2 filter (Super Admin override)', () => {
    const block = serviceDeptBlock(edit)!;
    expect(block).toMatch(/showAllUsers/);
    expect(block).toMatch(/filterPositions=\{isSuperAdmin\s*\?\s*undefined\s*:\s*\["Admin 2"\]\}/);
  });
});
