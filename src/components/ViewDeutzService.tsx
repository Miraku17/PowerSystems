"use client";

import React from 'react';
import { XMarkIcon, PrinterIcon } from "@heroicons/react/24/outline";

interface ViewDeutzServiceProps {
  data: Record<string, any>;
  onClose: () => void;
  onExportPDF?: () => void;
}

export default function ViewDeutzService({ data, onClose, onExportPDF }: ViewDeutzServiceProps) {
  const Field = ({ label, value, className = "" }: { label: string; value: any; className?: string }) => (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
        {label}
      </label>
      <div className="text-sm text-gray-900 font-medium break-words">
        {value || "-"}
      </div>
    </div>
  );

  const TextField = ({ label, value, className = "" }: { label: string; value: any; className?: string }) => (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
        {label}
      </label>
      <div className="text-sm text-gray-900 font-medium whitespace-pre-wrap break-words">
        {value || "-"}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-slideUp overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Deutz Service Report</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8 max-w-5xl mx-auto">

            {/* Company Header */}
            <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
              <h1 className="text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">Power Systems, Incorporated</h1>
              <p className="text-sm text-gray-600 mt-2">2nd Floor TOPY&apos;s Place #3 Calle Industria cor. Economia Street, Bagumbayan, Libis, Quezon City</p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-bold text-gray-700">Tel:</span> (+63-2) 687-9275 to 78 <span className="mx-2">|</span> <span className="font-bold text-gray-700">Fax:</span> (+63-2) 687-9279
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-bold text-gray-700">Email:</span> sales@psi-deutz.com
              </p>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-[10px] md:text-xs font-bold text-gray-500 tracking-widest uppercase">
                  NAVOTAS • BACOLOD • CEBU • CAGAYAN • DAVAO • GEN SAN • ZAMBOANGA • ILO-ILO • SURIGAO
                </p>
              </div>
              <div className="mt-6">
                <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
                  Deutz Service Form
                </h2>
              </div>
            </div>

            <div className="space-y-8">
              {/* Section: Job Reference */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Job Reference</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Job Order No." value={data.job_order} />
                  <Field label="Date" value={data.report_date} />
                </div>
              </div>

              {/* Section 1: General Information */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">General Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Field label="Reporting Person" value={data.reporting_person_name} />
                  <Field label="Customer Name" value={data.customer_name} className="lg:col-span-2" />
                  <Field label="Contact Person" value={data.contact_person} />
                  <Field label="Address" value={data.address} className="lg:col-span-3" />
                  <Field label="Email Address" value={data.email_address} />
                  <Field label="Phone Number" value={data.phone_number} />
                  <Field label="Equipment Manufacturer" value={data.equipment_manufacturer} />
                </div>
              </div>

              {/* Section 2: Equipment & Engine Details */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Equipment & Engine Details</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Field label="Equipment Model" value={data.equipment_model} />
                  <Field label="Equipment Serial No." value={data.equipment_serial_no} />
                  <Field label="Engine Model" value={data.engine_model} />
                  <Field label="Engine Serial No." value={data.engine_serial_no} />
                  <Field label="Alternator Brand/Model" value={data.alternator_brand_model} />
                  <Field label="Alternator Serial No." value={data.alternator_serial_no} />
                </div>
              </div>

              {/* Section 3: Operational Data */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Operational Data</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Field label="Location" value={data.location} />
                  <Field label="Date in Service" value={data.date_in_service} />
                  <Field label="Date Failed" value={data.date_failed} />
                  <Field label="Rating" value={data.rating} />
                  <Field label="Revolution (RPM)" value={data.revolution} />
                  <Field label="Starting Voltage" value={data.starting_voltage} />
                  <Field label="Running Hours" value={data.running_hours} />
                  <Field label="Lube Oil Type" value={data.lube_oil_type} />
                  <Field label="Fuel Type" value={data.fuel_type} />
                  <Field label="Fuel Pump Code" value={data.fuel_pump_code} />
                  <Field label="Fuel Pump Serial No." value={data.fuel_pump_serial_no} />
                  <Field label="Cooling Water Additives" value={data.cooling_water_additives} className="lg:col-span-2" />
                  <Field label="Turbo Model" value={data.turbo_model} />
                  <Field label="Turbo Serial No." value={data.turbo_serial_no} />
                </div>
              </div>

              {/* Section 4: Customer Complaint */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Customer Complaint</h4>
                </div>
                <div>
                  <Field label="Customer Complaint" value={data.customer_complaint} />
                </div>
              </div>

              {/* Section 5: Possible Cause */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Possible Cause</h4>
                </div>
                <div>
                  <Field label="Possible Cause" value={data.possible_cause} />
                </div>
              </div>

              {/* Section 6: Warranty Coverage */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Warranty Coverage</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field
                    label="Within Coverage Period?"
                    value={data.within_coverage_period === true || data.within_coverage_period === "true" || data.within_coverage_period === "Yes" ? "Yes" : "No"}
                  />
                  <Field
                    label="Warrantable Failure?"
                    value={data.warrantable_failure === true || data.warrantable_failure === "true" || data.warrantable_failure === "Yes" ? "Yes" : "No"}
                  />
                </div>
              </div>

              {/* Section 7: Service Report Details */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Service Report Details</h4>
                </div>
                <div className="space-y-6">
                  <TextField label="Summary Details" value={data.summary_details} />
                  <TextField label="Action Taken" value={data.action_taken} />
                  <TextField label="Observation" value={data.observation} />
                  <TextField label="Findings" value={data.findings} />
                  <TextField label="Recommendations" value={data.recommendations} />

                  {data.attachments && data.attachments.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">
                        Attachments
                      </label>
                      <div className="space-y-2">
                        {data.attachments.map((url: string, index: number) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            Attachment {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 8: Signatures */}
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-1 h-6 bg-blue-600 mr-2"></div>
                  <h4 className="text-sm font-bold text-[#2B4C7E] uppercase tracking-wider">Signatures</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="text-center flex flex-col items-center">
                     <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                         {data.attending_technician_signature ? (
                             <img src={data.attending_technician_signature} alt="Technician Signature" className="max-h-20 max-w-full object-contain" />
                         ) : (
                             <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                         )}
                    </div>
                    <Field label="Service Technician" value={data.service_technician} />
                    <p className="text-xs text-gray-400 mt-1 italic">Signed by Technician</p>
                  </div>
                  <div className="text-center flex flex-col items-center">
                     <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                         {data.noted_by_signature ? (
                             <img src={data.noted_by_signature} alt="Noted By Signature" className="max-h-20 max-w-full object-contain" />
                         ) : (
                             <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                         )}
                    </div>
                    <Field label="Noted By" value={data.noted_by} />
                    <p className="text-xs text-gray-400 mt-1 italic">Service Manager</p>
                  </div>
                  <div className="text-center flex flex-col items-center">
                     <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                         {data.approved_by_signature ? (
                             <img src={data.approved_by_signature} alt="Approved By Signature" className="max-h-20 max-w-full object-contain" />
                         ) : (
                             <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                         )}
                    </div>
                    <Field label="Approved By" value={data.approved_by} />
                    <p className="text-xs text-gray-400 mt-1 italic">Authorized Signature</p>
                  </div>
                  <div className="text-center flex flex-col items-center">
                     <div className="h-24 w-full flex items-end justify-center mb-2 border-b border-gray-300 pb-2">
                         {data.acknowledged_by_signature ? (
                             <img src={data.acknowledged_by_signature} alt="Acknowledged By Signature" className="max-h-20 max-w-full object-contain" />
                         ) : (
                             <span className="text-xs text-gray-400 italic mb-2">No Signature</span>
                         )}
                    </div>
                    <Field label="Acknowledged By" value={data.acknowledged_by} />
                    <p className="text-xs text-gray-400 mt-1 italic">Customer Signature</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              className="flex items-center px-5 py-2.5 bg-[#2B4C7E] text-white rounded-xl font-medium hover:bg-[#1A2F4F] shadow-lg hover:shadow-xl transition-all"
            >
              <PrinterIcon className="h-5 w-5 mr-2" />
              Export PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
