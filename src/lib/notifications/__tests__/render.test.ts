import { renderTitle, renderLink } from '../render';

describe('renderTitle', () => {
  it('form.submitted uses friendly form label', () => {
    expect(renderTitle({
      type: 'form.submitted', formType: 'daily-time-sheet',
      recordId: 'r1', actorId: 'a1', actorName: 'Juan Cruz',
    })).toBe('New Daily Time Sheet from Juan Cruz needs your signature');
  });

  it('form.approved includes actor name', () => {
    expect(renderTitle({
      type: 'form.approved', formType: 'daily-time-sheet',
      recordId: 'r1', actorId: 'a1', actorName: 'Admin 1',
    })).toBe('Your Daily Time Sheet was approved by Admin 1');
  });

  it('form.rejected includes actor name', () => {
    expect(renderTitle({
      type: 'form.rejected', formType: 'job-order-request',
      recordId: 'r1', actorId: 'a1', actorName: 'Admin 2',
    })).toBe('Your Job Order Request was rejected by Admin 2');
  });

  it('jo.assigned', () => {
    expect(renderTitle({
      type: 'jo.assigned', recordId: 'r1',
      assignedUserIds: [], actorId: 'a1', actorName: 'Boss',
    })).toBe("You've been assigned to a Job Order Request");
  });

  it('leave.submitted includes actor', () => {
    expect(renderTitle({
      type: 'leave.submitted', recordId: 'r1', actorId: 'a1', actorName: 'Juan',
    })).toBe('Juan filed a leave request');
  });

  it('leave.approved is generic', () => {
    expect(renderTitle({
      type: 'leave.approved', recordId: 'r1', recipientId: 'u1', actorId: 'a1', actorName: 'Admin',
    })).toBe('Your leave request was approved');
  });

  it('leave.rejected is generic', () => {
    expect(renderTitle({
      type: 'leave.rejected', recordId: 'r1', recipientId: 'u1', actorId: 'a1', actorName: 'Admin',
    })).toBe('Your leave request was rejected');
  });
});

describe('renderLink', () => {
  it('form.submitted (DTS) → pending-dts with open query', () => {
    expect(renderLink({
      type: 'form.submitted', formType: 'daily-time-sheet',
      recordId: 'r1', actorId: 'a1', actorName: 'X',
    })).toBe('/dashboard/pending-dts?open=r1');
  });

  it('form.submitted (JO) → pending-jo-requests', () => {
    expect(renderLink({
      type: 'form.submitted', formType: 'job-order-request',
      recordId: 'r1', actorId: 'a1', actorName: 'X',
    })).toBe('/dashboard/pending-jo-requests?open=r1');
  });

  it('form.submitted (other) → pending-forms with type+open', () => {
    expect(renderLink({
      type: 'form.submitted', formType: 'engine-teardown',
      recordId: 'r1', actorId: 'a1', actorName: 'X',
    })).toBe('/dashboard/pending-forms?type=engine-teardown&open=r1');
  });

  it('form.approved → records', () => {
    expect(renderLink({
      type: 'form.approved', formType: 'daily-time-sheet',
      recordId: 'r1', actorId: 'a1', actorName: 'X',
    })).toBe('/dashboard/records?type=daily-time-sheet&open=r1');
  });

  it('jo.assigned → job-order-request', () => {
    expect(renderLink({
      type: 'jo.assigned', recordId: 'r1', assignedUserIds: [],
      actorId: 'a1', actorName: 'X',
    })).toBe('/dashboard/job-order-request?open=r1');
  });

  it('leave.* → leave page', () => {
    expect(renderLink({
      type: 'leave.submitted', recordId: 'r1', actorId: 'a1', actorName: 'X',
    })).toBe('/dashboard/leave?open=r1');
  });
});
