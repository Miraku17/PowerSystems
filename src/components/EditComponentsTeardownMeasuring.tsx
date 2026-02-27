"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import { useUsers, useCustomers } from "@/hooks/useSharedQueries";

interface EditComponentsTeardownMeasuringProps {
  data: any;
  recordId: string;
  onClose: () => void;
  onSaved: () => void;
}

const Input = ({ label, value, disabled = false, onChange }: { label: string; value: any; disabled?: boolean; onChange: (value: string) => void }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1 uppercase">{label}</label>
    <input
      type="text"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full border border-gray-300 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2 ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
    />
  </div>
);

const DateInput = ({ label, value, onChange }: { label: string; value: any; onChange: (value: string) => void }) => (
  <div className="flex flex-col w-full">
    <label className="text-xs font-bold text-gray-600 mb-1 uppercase">{label}</label>
    <input
      type="date"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-300 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
    />
  </div>
);

export default function EditComponentsTeardownMeasuring({ data, recordId, onClose, onSaved }: EditComponentsTeardownMeasuringProps) {
  const { data: users = [] } = useUsers();
  const { data: customers = [] } = useCustomers();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fullData, setFullData] = useState<any>(null);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    header: true,
    cylinderBore: false,
    cylinderLiner: false,
    mainBearingBore: false,
    camshaftBushing: false,
    mainJournal: false,
    mainJournalWidth: false,
    conRodJournal: false,
    crankshaftTrueRunning: false,
    smallEndBush: false,
    bigEndBearing: false,
    connectingRodArm: false,
    pistonPinBushClearance: false,
    camshaftJournalDiameter: false,
    camshaftBushClearance: false,
    camlobeHeight: false,
    cylinderLinerBore: false,
    pistonRingGap: false,
    pistonRingAxialClearance: false,
    valveUnloadedLength: false,
    valveRecess: false,
    miscellaneous: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Form state
  const [formState, setFormState] = useState({
    customer: data.customer || '',
    report_date: data.report_date || '',
    engine_model: data.engine_model || '',
    serial_no: data.serial_no || '',
    job_order_no: data.job_order_no || '',
    measurementData: null as any,
  });

  useEffect(() => {
    const fetchFullData = async () => {
      try {
        const response = await apiClient.get(`/forms/components-teardown-measuring/${recordId}`);
        if (response.data.success) {
          const record = response.data.data;
          setFullData(record);
          setFormState({
            customer: record.customer || '',
            report_date: record.report_date || '',
            engine_model: record.engine_model || '',
            serial_no: record.serial_no || '',
            job_order_no: record.job_order_no || '',
            measurementData: record.measurementData || null,
          });
        }
      } catch (error) {
        console.error("Failed to fetch full record", error);
        toast.error("Failed to load record data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFullData();
  }, [recordId]);

  const handleFieldChange = (name: string, value: any) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleMeasurementMetaChange = (sectionKey: string, field: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      measurementData: {
        ...prev.measurementData,
        [sectionKey]: {
          ...prev.measurementData?.[sectionKey],
          [field]: value,
        },
      },
    }));
  };

  const handleMeasurementDataChange = (sectionKey: string, index: number, field: string, value: any) => {
    setFormState((prev) => {
      const currentData = prev.measurementData?.[sectionKey] || [];
      const newData = [...currentData];
      newData[index] = { ...newData[index], [field]: value };
      return {
        ...prev,
        measurementData: {
          ...prev.measurementData,
          [sectionKey]: newData,
        },
      };
    });
  };

  const handleSave = async () => {
    if (!formState.job_order_no || formState.job_order_no.trim() === '') {
      toast.error('Job Order No. is required');
      return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading('Saving changes...');

    try {
      await apiClient.patch(`/forms/components-teardown-measuring?id=${recordId}`, formState);
      toast.success('Report updated successfully!', { id: loadingToast });
      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Save error:', error);
      const errMsg = error.response?.data?.error;
      const errorMessage = typeof errMsg === 'string' ? errMsg : (errMsg && typeof errMsg === 'object' ? (errMsg.message || JSON.stringify(errMsg)) : (error.message || 'Failed to save changes.'));
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  const SectionHeader = ({ title, sectionKey, pageNum }: { title: string; sectionKey: string; pageNum?: string }) => (
    <div
      className="flex items-center justify-between py-3 px-4 bg-gray-100 rounded-lg cursor-pointer mb-2"
      onClick={() => toggleSection(sectionKey)}
    >
      <div className="flex items-center">
        <div className="w-1 h-5 bg-blue-600 mr-2"></div>
        <h4 className="text-sm font-bold text-gray-800 uppercase">
          {pageNum && <span className="text-blue-600 mr-2">{pageNum}</span>}
          {title}
        </h4>
      </div>
      {expandedSections[sectionKey] ? (
        <ChevronUpIcon className="h-4 w-4 text-gray-500" />
      ) : (
        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
      )}
    </div>
  );

  const renderMeasurementTable = (dataKey: string, columns: string[], rowLabelFn: (row: any) => string) => {
    const rows = formState.measurementData?.[dataKey] || [];
    if (rows.length === 0) return <p className="text-sm text-gray-500 italic">No data available</p>;

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1 text-left">Item</th>
              {columns.map(col => (
                <th key={col} className="border px-2 py-1 text-center uppercase">{col.replace('_', ' ')}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, index: number) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border px-2 py-1 text-sm">{rowLabelFn(row)}</td>
                {columns.map(col => (
                  <td key={col} className="border px-1 py-1">
                    <input
                      type="text"
                      value={row[col] || ''}
                      onChange={(e) => handleMeasurementDataChange(dataKey, index, col, e.target.value)}
                      className="w-full px-1 py-0.5 border rounded text-xs"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading record data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Edit Components Teardown Measuring Report</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
            <XMarkIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Header Section */}
          <SectionHeader title="Header Information" sectionKey="header" />
          {expandedSections.header && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CustomerAutocomplete
                  label="Customer"
                  value={formState.customer}
                  onChange={(v) => handleFieldChange('customer', v)}
                  onSelect={(customer) => handleFieldChange('customer', customer.name || customer.customer || '')}
                  customers={customers}
                  searchKey="name"
                />
                <DateInput label="Report Date" value={formState.report_date} onChange={(v) => handleFieldChange('report_date', v)} />
                <Input label="Engine Model" value={formState.engine_model} onChange={(v) => handleFieldChange('engine_model', v)} />
                <Input label="Serial No." value={formState.serial_no} onChange={(v) => handleFieldChange('serial_no', v)} />
                <Input label="Job Order No. *" value={formState.job_order_no} onChange={(v) => handleFieldChange('job_order_no', v)} disabled />
              </div>
            </div>
          )}

          {/* Cylinder Bore */}
          <SectionHeader title="Cylinder Bore" sectionKey="cylinderBore" pageNum="Page 1" />
          {expandedSections.cylinderBore && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('cylinderBoreData', ['measurement_1', 'measurement_2', 'measurement_3'],
                (row) => `${row.bank}-${row.cylinder_no}-${row.data_point}`)}
            </div>
          )}

          {/* Cylinder Liner */}
          <SectionHeader title="Cylinder Liner" sectionKey="cylinderLiner" pageNum="Page 2" />
          {expandedSections.cylinderLiner && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('cylinderLinerData', ['measurement_a', 'measurement_b', 'measurement_c', 'measurement_d'],
                (row) => `${row.section}-${row.cylinder_no}`)}
            </div>
          )}

          {/* Main Bearing Bore */}
          <SectionHeader title="Main Bearing Bore" sectionKey="mainBearingBore" pageNum="Page 3" />
          {expandedSections.mainBearingBore && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('mainBearingBoreData', ['measurement_a', 'measurement_b', 'measurement_c'],
                (row) => `Bore ${row.bore_no} - ${row.axis}`)}
            </div>
          )}

          {/* Camshaft Bushing */}
          <SectionHeader title="Camshaft Bushing" sectionKey="camshaftBushing" pageNum="Page 4" />
          {expandedSections.camshaftBushing && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('camshaftBushingData', ['measurement_a', 'measurement_b'],
                (row) => `Bush ${row.bush_no} - MP ${row.measuring_point}`)}
            </div>
          )}

          {/* Main Journal */}
          <SectionHeader title="Main Journal Diameter" sectionKey="mainJournal" pageNum="Page 5" />
          {expandedSections.mainJournal && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('mainJournalData', ['measurement_a', 'measurement_b'],
                (row) => `Journal ${row.journal_no} - MP ${row.measuring_point}`)}
            </div>
          )}

          {/* Main Journal Width */}
          <SectionHeader title="Main Journal Width" sectionKey="mainJournalWidth" pageNum="Page 6" />
          {expandedSections.mainJournalWidth && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('mainJournalWidthData', ['measurement_a', 'measurement_b', 'measurement_c', 'measurement_d'],
                (row) => `Journal ${row.journal_no}`)}
            </div>
          )}

          {/* Con Rod Journal */}
          <SectionHeader title="Con Rod Journal" sectionKey="conRodJournal" pageNum="Page 7" />
          {expandedSections.conRodJournal && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('conRodJournalData', ['measurement_a', 'measurement_b', 'measurement_c'],
                (row) => `Journal ${row.journal_no} - ${row.axis}`)}
            </div>
          )}

          {/* Crankshaft True Running */}
          <SectionHeader title="Crankshaft True Running" sectionKey="crankshaftTrueRunning" pageNum="Page 8" />
          {expandedSections.crankshaftTrueRunning && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('crankshaftTrueRunningData', ['measured_value'],
                (row) => `Journal ${row.journal_no}`)}
            </div>
          )}

          {/* Small End Bush */}
          <SectionHeader title="Small End Bush" sectionKey="smallEndBush" pageNum="Page 9" />
          {expandedSections.smallEndBush && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('smallEndBushData', ['measurement_a', 'measurement_b'],
                (row) => `Arm ${row.con_rod_arm_no} - Datum ${row.datum}`)}
            </div>
          )}

          {/* Big End Bearing */}
          <SectionHeader title="Big End Bearing" sectionKey="bigEndBearing" pageNum="Page 10" />
          {expandedSections.bigEndBearing && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('bigEndBearingData', ['measurement_a', 'measurement_b'],
                (row) => `Arm ${row.con_rod_arm_no} - MP ${row.measuring_point}`)}
            </div>
          )}

          {/* Connecting Rod Arm */}
          <SectionHeader title="Connecting Rod Arm" sectionKey="connectingRodArm" pageNum="Page 11" />
          {expandedSections.connectingRodArm && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('connectingRodArmData', ['measurement'],
                (row) => `Arm ${row.arm_no} - Bank ${row.bank}`)}
            </div>
          )}

          {/* Piston Pin Bush Clearance */}
          <SectionHeader title="Piston Pin Bush Clearance" sectionKey="pistonPinBushClearance" pageNum="Page 12" />
          {expandedSections.pistonPinBushClearance && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('pistonPinBushClearanceData', ['measurement_a', 'measurement_b', 'measurement_c'],
                (row) => `Arm ${row.conrod_arm_no} - ${row.measuring_point}`)}
            </div>
          )}

          {/* Camshaft Journal Diameter */}
          <SectionHeader title="Camshaft Journal Diameter" sectionKey="camshaftJournalDiameter" pageNum="Page 13" />
          {expandedSections.camshaftJournalDiameter && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('camshaftJournalDiameterData', ['measurement_a', 'measurement_b', 'measurement_c'],
                (row) => `Journal ${row.journal_no} - ${row.measuring_point}`)}
            </div>
          )}

          {/* Camshaft Bush Clearance */}
          <SectionHeader title="Camshaft Bush Clearance" sectionKey="camshaftBushClearance" pageNum="Page 14" />
          {expandedSections.camshaftBushClearance && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('camshaftBushClearanceData', ['measurement_a', 'measurement_b', 'measurement_c'],
                (row) => `Journal ${row.journal_no} - ${row.measuring_point}`)}
            </div>
          )}

          {/* Camlobe Height */}
          <SectionHeader title="Camlobe Height" sectionKey="camlobeHeight" pageNum="Page 15" />
          {expandedSections.camlobeHeight && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('camlobeHeightData', ['measurement_a', 'measurement_b', 'measurement_c'],
                (row) => `Journal ${row.journal_no} - ${row.measuring_point}`)}
            </div>
          )}

          {/* Cylinder Liner Bore */}
          <SectionHeader title="Cylinder Liner Bore" sectionKey="cylinderLinerBore" pageNum="Page 16" />
          {expandedSections.cylinderLinerBore && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('cylinderLinerBoreData', ['measurement_a', 'measurement_b', 'measurement_c', 'measurement_d'],
                (row) => `Cyl ${row.cylinder_no} - ${row.measuring_point}`)}
            </div>
          )}

          {/* Piston Ring Gap */}
          <SectionHeader title="Piston Ring Gap" sectionKey="pistonRingGap" pageNum="Page 17" />
          {expandedSections.pistonRingGap && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('pistonRingGapData', ['ring_1_value', 'ring_2_value', 'ring_3_value'],
                (row) => `Piston ${row.piston_no}`)}
            </div>
          )}

          {/* Piston Ring Axial Clearance */}
          <SectionHeader title="Piston Ring Axial Clearance" sectionKey="pistonRingAxialClearance" pageNum="Page 18" />
          {expandedSections.pistonRingAxialClearance && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('pistonRingAxialClearanceData', ['ring_1_value', 'ring_2_value', 'ring_3_value'],
                (row) => `Piston ${row.piston_no}`)}
            </div>
          )}

          {/* Valve Unloaded Length */}
          <SectionHeader title="Valve Unloaded Length" sectionKey="valveUnloadedLength" pageNum="Page 19" />
          {expandedSections.valveUnloadedLength && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('valveUnloadedLengthData', ['intake_value', 'exhaust_value'],
                (row) => `Cylinder ${row.cylinder_no}`)}
            </div>
          )}

          {/* Valve Recess */}
          <SectionHeader title="Valve Recess" sectionKey="valveRecess" pageNum="Page 20" />
          {expandedSections.valveRecess && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('valveRecessData', ['intake_value', 'exhaust_value'],
                (row) => `Cylinder ${row.cylinder_no}`)}
            </div>
          )}

          {/* Miscellaneous */}
          <SectionHeader title="Miscellaneous (Pages 21-24)" sectionKey="miscellaneous" />
          {expandedSections.miscellaneous && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-4">
              <p className="text-sm text-gray-600">
                Additional sections: Crankshaft End Clearance, Lube Oil Pump Backlash, Camshaft End Clearance,
                Cylinder Head Cap Screw, Valve Clearance Setting, Piston Cylinder Head Distance,
                Injection Pump, Injectors, Air Cooling Blower.
              </p>
              {formState.measurementData?.pistonCylinderHeadDistanceData && (
                <>
                  <h5 className="font-semibold text-gray-700">Piston Cylinder Head Distance</h5>
                  {renderMeasurementTable('pistonCylinderHeadDistanceData', ['measurement_a', 'measurement_b'],
                    (row) => `Cylinder ${row.cylinder_no}`)}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// CustomerAutocomplete component for searchable/typeable customer dropdown
interface CustomerAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (customer: any) => void;
  customers: any[];
  searchKey?: string;
}

const CustomerAutocomplete = ({ label, value, onChange, onSelect, customers, searchKey = "name" }: CustomerAutocompleteProps) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer: any) => {
    onSelect(customer);
    setShowDropdown(false);
  };

  const filteredCustomers = customers.filter((c) =>
    (c[searchKey] || "").toLowerCase().includes((value || "").toLowerCase())
  ).sort((a, b) => (a[searchKey] || "").localeCompare(b[searchKey] || ""));

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1 uppercase">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => { onChange(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          className="w-full border border-gray-300 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 p-2"
          placeholder={`Enter ${label.toLowerCase()}`}
          autoComplete="off"
        />
        {showDropdown && filteredCustomers.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900 border-b last:border-b-0 border-gray-100"
              >
                <div className="font-medium">{customer.name}</div>
                {customer.customer && customer.customer !== customer.name && (
                  <div className="text-xs text-gray-500">{customer.customer}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
