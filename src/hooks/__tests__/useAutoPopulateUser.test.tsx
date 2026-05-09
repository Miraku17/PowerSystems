import { renderHook } from '@testing-library/react';
import { useAutoPopulateUser } from '../useAutoPopulateUser';
import { useCurrentUser } from '@/stores/authStore';
import { useUsers } from '@/hooks/useSharedQueries';

jest.mock('@/stores/authStore');
jest.mock('@/hooks/useSharedQueries');

const USER = {
  id: 'user-1',
  fullName: 'Hannah Grace Mongaya',
  signature_url: 'https://example.com/sig.png',
};

describe('useAutoPopulateUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('populates name + signature when field is empty', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ id: 'user-1' });
    (useUsers as jest.Mock).mockReturnValue({ data: [USER] });
    const setFormData = jest.fn();

    renderHook(() =>
      useAutoPopulateUser(setFormData, 'requested_by_name', 'requested_by_signature', ''),
    );

    expect(setFormData).toHaveBeenCalledWith({
      requested_by_name: 'Hannah Grace Mongaya',
      requested_by_signature: 'https://example.com/sig.png',
    });
  });

  it('does NOT overwrite a non-empty field (preserves user edits)', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ id: 'user-1' });
    (useUsers as jest.Mock).mockReturnValue({ data: [USER] });
    const setFormData = jest.fn();

    renderHook(() =>
      useAutoPopulateUser(
        setFormData,
        'requested_by_name',
        'requested_by_signature',
        'Someone Else',
      ),
    );

    expect(setFormData).not.toHaveBeenCalled();
  });

  it('does nothing while users list is still loading', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ id: 'user-1' });
    (useUsers as jest.Mock).mockReturnValue({ data: [] });
    const setFormData = jest.fn();

    renderHook(() =>
      useAutoPopulateUser(setFormData, 'requested_by_name', 'requested_by_signature', ''),
    );

    expect(setFormData).not.toHaveBeenCalled();
  });

  it('does nothing when current user is not yet known', () => {
    (useCurrentUser as jest.Mock).mockReturnValue(null);
    (useUsers as jest.Mock).mockReturnValue({ data: [USER] });
    const setFormData = jest.fn();

    renderHook(() =>
      useAutoPopulateUser(setFormData, 'requested_by_name', 'requested_by_signature', ''),
    );

    expect(setFormData).not.toHaveBeenCalled();
  });

  it('handles users with no signature (writes empty string)', () => {
    (useCurrentUser as jest.Mock).mockReturnValue({ id: 'user-1' });
    (useUsers as jest.Mock).mockReturnValue({
      data: [{ id: 'user-1', fullName: 'Hannah Grace Mongaya', signature_url: null }],
    });
    const setFormData = jest.fn();

    renderHook(() =>
      useAutoPopulateUser(setFormData, 'requested_by_name', 'requested_by_signature', ''),
    );

    expect(setFormData).toHaveBeenCalledWith({
      requested_by_name: 'Hannah Grace Mongaya',
      requested_by_signature: '',
    });
  });
});
