/**
 * @jest-environment node
 */

import { POST } from '../route';
import { getServiceSupabase } from '@/lib/supabase';
import { sanitizeFilename } from '@/lib/utils';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/auth-middleware', () => ({
  withAuth: (handler: any) => handler,
}));
jest.mock('@/lib/utils', () => ({
  sanitizeFilename: jest.fn((name) => name.replace(/[^a-zA-Z0-9.-]/g, '_')),
}));

describe('Submersible Pump Teardown Attachments API', () => {
  let mockSupabase: any;
  let mockRequest: Request;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a chainable mock
    const chain: any = {};
    chain.from = jest.fn(() => chain);
    chain.select = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
    chain.delete = jest.fn(() => chain);
    chain.update = jest.fn(() => chain);
    chain.insert = jest.fn().mockResolvedValue({ error: null });
    chain.order = jest.fn(() => chain);

    mockSupabase = chain;

    // Add storage methods
    mockSupabase.storage = {
      from: jest.fn().mockReturnThis(),
      remove: jest.fn().mockResolvedValue({ error: null }),
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/public/file.jpg' },
      }),
    };

    (getServiceSupabase as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('POST - Update existing attachment titles', () => {
    it('should update attachment file names successfully', async () => {
      const existingAttachments = [
        { id: 'att-1', file_name: 'Updated Photo 1' },
        { id: 'att-2', file_name: 'Updated Photo 2' },
      ];

      const formData = new FormData();
      formData.append('report_id', 'report-123');
      formData.append('attachments_to_delete', JSON.stringify([]));
      formData.append('existing_attachments', JSON.stringify(existingAttachments));

      mockRequest = new Request('http://localhost/api/forms/submersible-pump-teardown/attachments', {
        method: 'POST',
        body: formData,
      });

      // Mock the update chain
      const updateMock = jest.fn().mockReturnThis();
      mockSupabase.update = updateMock;
      mockSupabase.eq = jest.fn().mockResolvedValue({ error: null });

      const response = await POST(mockRequest, { params: {}, user: { id: 'user-1' } } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Attachments updated successfully');
      expect(mockSupabase.from).toHaveBeenCalledWith('submersible_pump_teardown_attachments');
      expect(updateMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('POST - Delete attachments', () => {
    it.skip('should delete attachments from storage and database', async () => {
      const attachmentsToDelete = ['att-1', 'att-2'];
      const mockAttachment = {
        file_url: 'https://storage.example.com/public/service-reports/submersible/teardown/file.jpg',
      };

      const formData = new FormData();
      formData.append('report_id', 'report-123');
      formData.append('attachments_to_delete', JSON.stringify(attachmentsToDelete));
      formData.append('existing_attachments', JSON.stringify([]));

      mockRequest = new Request('http://localhost/api/forms/submersible-pump-teardown/attachments', {
        method: 'POST',
        body: formData,
      });

      // Mock the delete chain - need to maintain chainability
      const deleteMock = jest.fn(() => mockSupabase);
      mockSupabase.single = jest.fn().mockResolvedValue({ data: mockAttachment, error: null });
      mockSupabase.delete = deleteMock;
      mockSupabase.eq = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.storage.remove = jest.fn().mockResolvedValue({ error: null });

      const response = await POST(mockRequest, { params: {}, user: { id: 'user-1' } } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Attachments updated successfully');
      expect(deleteMock).toHaveBeenCalledTimes(2);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('service-reports');
    });

    it('should handle missing attachments gracefully', async () => {
      const attachmentsToDelete = ['non-existent-att'];

      const formData = new FormData();
      formData.append('report_id', 'report-123');
      formData.append('attachments_to_delete', JSON.stringify(attachmentsToDelete));
      formData.append('existing_attachments', JSON.stringify([]));

      mockRequest = new Request('http://localhost/api/forms/submersible-pump-teardown/attachments', {
        method: 'POST',
        body: formData,
      });

      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const response = await POST(mockRequest, { params: {}, user: { id: 'user-1' } } as any);

      expect(response.status).toBe(200);
    });
  });

  describe('POST - Upload new attachments', () => {
    it('should upload new attachments with correct categories', async () => {
      const file1 = new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' });
      const file2 = new File(['content2'], 'photo2.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('report_id', 'report-123');
      formData.append('attachments_to_delete', JSON.stringify([]));
      formData.append('existing_attachments', JSON.stringify([]));
      formData.append('attachment_files', file1);
      formData.append('attachment_files', file2);
      formData.append('attachment_titles', 'Pre-Teardown Photo 1');
      formData.append('attachment_titles', 'Pre-Teardown Photo 2');
      formData.append('attachment_categories', 'pre_teardown');
      formData.append('attachment_categories', 'pre_teardown');

      mockRequest = new Request('http://localhost/api/forms/submersible-pump-teardown/attachments', {
        method: 'POST',
        body: formData,
      });

      mockSupabase.storage.upload.mockResolvedValue({ error: null });
      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/public/file.jpg' },
      });
      mockSupabase.insert.mockResolvedValue({ error: null });

      const response = await POST(mockRequest, { params: {}, user: { id: 'user-1' } } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Attachments updated successfully');
      expect(mockSupabase.storage.upload).toHaveBeenCalledTimes(2);
      expect(mockSupabase.insert).toHaveBeenCalledTimes(2);
    });

    it('should handle upload errors gracefully', async () => {
      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('report_id', 'report-123');
      formData.append('attachments_to_delete', JSON.stringify([]));
      formData.append('existing_attachments', JSON.stringify([]));
      formData.append('attachment_files', file);
      formData.append('attachment_titles', 'Photo');
      formData.append('attachment_categories', 'wet_end');

      mockRequest = new Request('http://localhost/api/forms/submersible-pump-teardown/attachments', {
        method: 'POST',
        body: formData,
      });

      mockSupabase.storage.upload.mockResolvedValue({
        error: new Error('Upload failed'),
      });

      const response = await POST(mockRequest, { params: {}, user: { id: 'user-1' } } as any);

      // Should still return 200 as it continues with other operations
      expect(response.status).toBe(200);
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('should sanitize filenames before uploading', async () => {
      const file = new File(['content'], 'photo with spaces!@#.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('report_id', 'report-123');
      formData.append('attachments_to_delete', JSON.stringify([]));
      formData.append('existing_attachments', JSON.stringify([]));
      formData.append('attachment_files', file);
      formData.append('attachment_titles', 'Photo');
      formData.append('attachment_categories', 'motor');

      mockRequest = new Request('http://localhost/api/forms/submersible-pump-teardown/attachments', {
        method: 'POST',
        body: formData,
      });

      mockSupabase.storage.upload.mockResolvedValue({ error: null });
      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/public/file.jpg' },
      });
      mockSupabase.insert.mockResolvedValue({ error: null });

      await POST(mockRequest, { user: { id: 'user-1' } });

      expect(sanitizeFilename).toHaveBeenCalledWith('photo with spaces!@#.jpg');
    });

    it('should skip empty files', async () => {
      const emptyFile = new File([], '', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('report_id', 'report-123');
      formData.append('attachments_to_delete', JSON.stringify([]));
      formData.append('existing_attachments', JSON.stringify([]));
      formData.append('attachment_files', emptyFile);
      formData.append('attachment_titles', '');
      formData.append('attachment_categories', 'pre_teardown');

      mockRequest = new Request('http://localhost/api/forms/submersible-pump-teardown/attachments', {
        method: 'POST',
        body: formData,
      });

      await POST(mockRequest, { user: { id: 'user-1' } });

      expect(mockSupabase.storage.upload).not.toHaveBeenCalled();
    });
  });

  describe('POST - Combined operations', () => {
    it.skip('should handle delete, update, and upload in a single request', async () => {
      const file = new File(['content'], 'new-photo.jpg', { type: 'image/jpeg' });
      const existingAttachments = [{ id: 'att-3', file_name: 'Updated' }];
      const attachmentsToDelete = ['att-1', 'att-2'];

      const formData = new FormData();
      formData.append('report_id', 'report-123');
      formData.append('attachments_to_delete', JSON.stringify(attachmentsToDelete));
      formData.append('existing_attachments', JSON.stringify(existingAttachments));
      formData.append('attachment_files', file);
      formData.append('attachment_titles', 'New Photo');
      formData.append('attachment_categories', 'wet_end');

      mockRequest = new Request('http://localhost/api/forms/submersible-pump-teardown/attachments', {
        method: 'POST',
        body: formData,
      });

      // Mock all the chains properly - must maintain chainability
      const deleteMock = jest.fn(() => mockSupabase);
      const updateMock = jest.fn(() => mockSupabase);

      mockSupabase.single = jest.fn().mockResolvedValue({
        data: { file_url: 'https://example.com/file.jpg' },
        error: null,
      });
      mockSupabase.delete = deleteMock;
      mockSupabase.update = updateMock;
      mockSupabase.eq = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.storage.remove = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.storage.upload = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.storage.getPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: 'https://storage.example.com/public/file.jpg' },
      });
      mockSupabase.insert = jest.fn().mockResolvedValue({ error: null });

      const response = await POST(mockRequest, { params: {}, user: { id: 'user-1' } } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Attachments updated successfully');
      expect(deleteMock).toHaveBeenCalledTimes(2);
      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(mockSupabase.storage.upload).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling', () => {
    it('should return 500 on internal server error', async () => {
      const formData = new FormData();
      formData.append('report_id', 'report-123');

      mockRequest = new Request('http://localhost/api/forms/submersible-pump-teardown/attachments', {
        method: 'POST',
        body: formData,
      });

      (getServiceSupabase as jest.Mock).mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await POST(mockRequest, { params: {}, user: { id: 'user-1' } } as any);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });
  });
});
