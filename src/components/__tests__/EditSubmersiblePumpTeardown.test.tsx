import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditSubmersiblePumpTeardown from '../EditSubmersiblePumpTeardown';
import apiClient from '@/lib/axios';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('@/lib/axios');
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
  },
}));
jest.mock('react-hot-toast');

describe('EditSubmersiblePumpTeardown Component', () => {
  const mockOnClose = jest.fn();
  const mockOnSaved = jest.fn();
  const mockRecordId = 'test-record-id';

  const mockData = {
    job_order: 'JO-2024-001',
    jo_date: '2024-01-15',
    customer: 'Test Customer',
    pump_model: 'SPT-100',
    serial_number: 'SN123456',
    ext_discharge_findings: 'Good condition',
  };

  const mockUsers = [
    { id: 'user-1', fullName: 'John Doe' },
    { id: 'user-2', fullName: 'Jane Smith' },
  ];

  const mockAttachments = [
    {
      id: 'att-1',
      file_url: 'https://example.com/photo1.jpg',
      file_name: 'Pre-Teardown Photo 1',
      attachment_category: 'pre_teardown',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'att-2',
      file_url: 'https://example.com/photo2.jpg',
      file_name: 'Wet End Photo 1',
      attachment_category: 'wet_end',
      created_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'att-3',
      file_url: 'https://example.com/photo3.jpg',
      file_name: 'Motor Photo 1',
      attachment_category: 'motor',
      created_at: '2024-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock API responses
    (apiClient.get as jest.Mock).mockImplementation((url) => {
      if (url === '/users') {
        return Promise.resolve({ data: { success: true, data: mockUsers } });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    (apiClient.patch as jest.Mock).mockResolvedValue({ status: 200 });
    (apiClient.post as jest.Mock).mockResolvedValue({ status: 200 });

    // Mock Supabase
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockAttachments,
        error: null,
      }),
    });

    (toast.loading as jest.Mock).mockReturnValue('toast-id');
    (toast.success as jest.Mock).mockReturnValue(undefined);
    (toast.error as jest.Mock).mockReturnValue(undefined);
  });

  describe('Rendering', () => {
    it('should render the edit form with all sections', async () => {
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      expect(screen.getByText('Edit Submersible Pump Teardown Report')).toBeInTheDocument();
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Pump Details')).toBeInTheDocument();
      expect(screen.getByText('Signatures')).toBeInTheDocument();
    });

    it('should display existing attachments grouped by category', async () => {
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Pre-Teardown Photos')).toBeInTheDocument();
        expect(screen.getByText('Wet End Teardown Photos')).toBeInTheDocument();
        expect(screen.getByText('Motor Teardown Photos')).toBeInTheDocument();
      });
    });

    it('should fetch and display users for signature fields', async () => {
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalledWith('/users');
      });
    });
  });

  describe('Form Interactions', () => {
    it('should allow editing text fields', async () => {
      const user = userEvent.setup();
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const jobOrderInput = screen.getByDisplayValue('JO-2024-001');
      await user.clear(jobOrderInput);
      await user.type(jobOrderInput, 'JO-2024-002');

      expect(jobOrderInput).toHaveValue('JO-2024-002');
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const closeButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Attachment Management', () => {
    it('should allow editing attachment names', async () => {
      const user = userEvent.setup();
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Pre-Teardown Photo 1')).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue('Pre-Teardown Photo 1');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Photo Title');

      expect(titleInput).toHaveValue('Updated Photo Title');
    });

    it('should delete attachment when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Pre-Teardown Photo 1')).toBeInTheDocument();
      });

      // Find delete buttons (there should be one for each attachment)
      const deleteButtons = screen.getAllByTitle('Delete attachment');
      expect(deleteButtons.length).toBeGreaterThan(0);

      await user.click(deleteButtons[0]);

      // Attachment should be removed from the view
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Pre-Teardown Photo 1')).not.toBeInTheDocument();
      });
    });

    it('should render file upload inputs for each attachment category', async () => {
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Pre-Teardown Photos')).toBeInTheDocument();
      });

      // Check that file upload inputs are rendered
      const fileInputs = screen.getAllByLabelText(/upload new images/i);
      expect(fileInputs.length).toBeGreaterThan(0);
      fileInputs.forEach(input => {
        expect(input).toHaveAttribute('type', 'file');
        expect(input).toHaveAttribute('accept', 'image/*');
      });
    });

    it('should have file inputs configured to accept only images', async () => {
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Pre-Teardown Photos')).toBeInTheDocument();
      });

      // Verify file inputs are configured to accept images
      const fileInputs = screen.getAllByLabelText(/upload new images/i);
      fileInputs.forEach(input => {
        expect(input).toHaveAttribute('accept', 'image/*');
        expect(input).toHaveAttribute('multiple');
      });
    });

    it('should render upload sections for different categories', async () => {
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Pre-Teardown Photos')).toBeInTheDocument();
        expect(screen.getByText('Wet End Teardown Photos')).toBeInTheDocument();
        expect(screen.getByText('Motor Teardown Photos')).toBeInTheDocument();
      });

      // Each section should have upload functionality
      const uploadTexts = screen.getAllByText(/upload new images/i);
      expect(uploadTexts.length).toBe(3); // One for each category
    });
  });

  describe('Form Submission', () => {
    it('should submit form with updated data', async () => {
      const user = userEvent.setup();
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const jobOrderInput = screen.getByDisplayValue('JO-2024-001');
      await user.clear(jobOrderInput);
      await user.type(jobOrderInput, 'JO-2024-002');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalledWith(
          `/forms/submersible-pump-teardown?id=${mockRecordId}`,
          expect.objectContaining({ job_order: 'JO-2024-002' })
        );
      });
    });

    it('should submit attachment changes', async () => {
      const user = userEvent.setup();
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Pre-Teardown Photo 1')).toBeInTheDocument();
      });

      // Edit attachment name
      const titleInput = screen.getByDisplayValue('Pre-Teardown Photo 1');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(apiClient.post).toHaveBeenCalledWith(
          '/forms/submersible-pump-teardown/attachments',
          expect.any(FormData),
          expect.objectContaining({
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })
        );
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      (apiClient.patch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ status: 200 }), 100))
      );

      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
      expect(saveButton).toBeDisabled();

      await waitFor(() => {
        expect(toast.loading).toHaveBeenCalledWith('Saving changes...');
      });
    });

    it('should call onSaved and onClose after successful submission', async () => {
      const user = userEvent.setup();
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Report updated successfully!', {
          id: 'toast-id',
        });
        expect(mockOnSaved).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should handle submission errors', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Failed to update report';
      (apiClient.patch as jest.Mock).mockRejectedValue({
        response: { data: { error: errorMessage } },
      });

      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining(errorMessage),
          { id: 'toast-id' }
        );
        expect(mockOnSaved).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
      });
    });
  });

  describe('Integration - Multiple operations', () => {
    it('should handle editing and deleting attachments', async () => {
      const user = userEvent.setup();
      render(
        <EditSubmersiblePumpTeardown
          data={mockData}
          recordId={mockRecordId}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('Pre-Teardown Photo 1')).toBeInTheDocument();
      });

      // 1. Edit an existing attachment name
      const titleInput = screen.getByDisplayValue('Pre-Teardown Photo 1');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Photo');

      // 2. Delete an attachment
      const deleteButtons = screen.getAllByTitle('Delete attachment');
      await user.click(deleteButtons[1]); // Delete wet end photo

      // Submit the form
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(apiClient.patch).toHaveBeenCalled();
        expect(apiClient.post).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalled();
      });
    });
  });
});
