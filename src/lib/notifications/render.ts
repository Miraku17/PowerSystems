import type { NotificationEvent, FormType } from './recipients';

const FORM_LABEL: Record<FormType, string> = {
  'daily-time-sheet':                    'Daily Time Sheet',
  'job-order-request':                   'Job Order Request',
  'engine-inspection-receiving':         'Engine Inspection / Receiving',
  'engine-teardown':                     'Engine Teardown',
  'components-teardown-measuring':       'Components Teardown / Measuring',
  'engine-surface-pump-commissioning':   'Engine Surface Pump Commissioning',
  'engine-surface-pump-service':         'Engine Surface Pump Service',
  'submersible-pump-commissioning':      'Submersible Pump Commissioning',
  'submersible-pump-service':            'Submersible Pump Service',
  'submersible-pump-teardown':           'Submersible Pump Teardown',
  'electric-surface-pump-commissioning': 'Electric Surface Pump Commissioning',
  'electric-surface-pump-service':       'Electric Surface Pump Service',
  'electric-surface-pump-teardown':      'Electric Surface Pump Teardown',
  'deutz-commissioning':                 'Deutz Commissioning',
};

export function renderTitle(event: NotificationEvent): string {
  switch (event.type) {
    case 'form.submitted':
      return `New ${FORM_LABEL[event.formType]} from ${event.actorName} needs your signature`;
    case 'form.approved':
      return `Your ${FORM_LABEL[event.formType]} was approved by ${event.actorName}`;
    case 'form.rejected':
      return `Your ${FORM_LABEL[event.formType]} was rejected by ${event.actorName}`;
    case 'jo.assigned':
      return "You've been assigned to a Job Order Request";
    case 'leave.submitted':
      return `${event.actorName} filed a leave request`;
    case 'leave.approved':
      return 'Your leave request was approved';
    case 'leave.rejected':
      return 'Your leave request was rejected';
  }
}

export function renderLink(event: NotificationEvent): string {
  switch (event.type) {
    case 'form.submitted':
      if (event.formType === 'daily-time-sheet')   return `/dashboard/pending-dts?open=${event.recordId}`;
      if (event.formType === 'job-order-request')  return `/dashboard/pending-jo-requests?open=${event.recordId}`;
      return `/dashboard/pending-forms?type=${event.formType}&open=${event.recordId}`;
    case 'form.approved':
    case 'form.rejected':
      return `/dashboard/records?type=${event.formType}&open=${event.recordId}`;
    case 'jo.assigned':
      return `/dashboard/job-order-request?open=${event.recordId}`;
    case 'leave.submitted':
    case 'leave.approved':
    case 'leave.rejected':
      return `/dashboard/leave?open=${event.recordId}`;
  }
}
