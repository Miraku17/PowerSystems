"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";
import { useUsers, useCustomers } from "@/hooks/useSharedQueries";
import { usePermissions } from "@/hooks/usePermissions";
import {
  buildMainBearingRadialClearanceData,
  buildCrankshaftMainJournalDiameterData,
  buildConnectingRodBearingBoreData,
} from "@/stores/componentsTeardownMeasuringFormStore";

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
  const { hasPermission } = usePermissions();
  const canEditTechnician = hasPermission('components_teardown_signatory', 'technician');
  const canEditCheckedBy = hasPermission('components_teardown_signatory', 'checked_by');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fullData, setFullData] = useState<any>(null);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    header: true,
    cylinderBore: false,
    cylinderLiner: false,
    mainBearingBore: false,
    mainBearingRadialClearance: false,
    camshaftBushing: false,
    mainJournal: false,
    crankshaftMainJournalDiameter: false,
    mainJournalWidth: false,
    conRodJournal: false,
    connectingRodBearingBore: false,
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
    crankshaftEndClearance: false,
    lubeOilPumpBacklash: false,
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

          // Backfill sections added after the record was created
          const md = record.measurementData || {};
          if (!md.mainBearingRadialClearanceData || md.mainBearingRadialClearanceData.length === 0) {
            md.mainBearingRadialClearanceData = buildMainBearingRadialClearanceData();
          }
          if (!md.crankshaftMainJournalDiameterData || md.crankshaftMainJournalDiameterData.length === 0) {
            md.crankshaftMainJournalDiameterData = buildCrankshaftMainJournalDiameterData();
          }
          if (!md.connectingRodBearingBoreData || md.connectingRodBearingBoreData.length === 0) {
            md.connectingRodBearingBoreData = buildConnectingRodBearingBoreData();
          }

          setFormState({
            customer: record.customer || '',
            report_date: record.report_date || '',
            engine_model: record.engine_model || '',
            serial_no: record.serial_no || '',
            job_order_no: record.job_order_no || '',
            measurementData: md,
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

  const handleAddJournal = (sectionKey: string, pairField: string, pairValues: [string, string]) => {
    setFormState((prev) => {
      const rows = prev.measurementData?.[sectionKey] || [];
      const maxJournal = rows.reduce((max: number, r: any) => Math.max(max, r.journal_no || 0), 0);
      const nextJournal = maxJournal + 1;
      const newRows = [
        ...rows,
        { journal_no: nextJournal, [pairField]: pairValues[0], measurement_a: '', measurement_b: '', measurement_c: '' },
        { journal_no: nextJournal, [pairField]: pairValues[1], measurement_a: '', measurement_b: '', measurement_c: '' },
      ];
      return { ...prev, measurementData: { ...prev.measurementData, [sectionKey]: newRows } };
    });
  };

  const handleRemoveJournal = (sectionKey: string, journalNo: number) => {
    setFormState((prev) => {
      const rows = prev.measurementData?.[sectionKey] || [];
      return {
        ...prev,
        measurementData: {
          ...prev.measurementData,
          [sectionKey]: rows.filter((r: any) => r.journal_no !== journalNo),
        },
      };
    });
  };

  const renderDynamicJournalTable = (
    sectionKey: string,
    pairField: string,
    pairLabel: string,
    pairValues: [string, string]
  ) => {
    const rows = (formState.measurementData?.[sectionKey] || []) as any[];
    const journalNumbers = Array.from(new Set(rows.map((r: any) => r.journal_no))).sort((a: any, b: any) => a - b);

    return (
      <>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-1 text-left">Journal</th>
                <th className="border px-2 py-1 text-left">{pairLabel}</th>
                <th className="border px-2 py-1 text-center">A</th>
                <th className="border px-2 py-1 text-center">B</th>
                <th className="border px-2 py-1 text-center">C</th>
                <th className="border px-2 py-1 text-center w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {journalNumbers.map((journalNo: any) => {
                const journalRows = rows
                  .map((r: any, i: number) => ({ row: r, index: i }))
                  .filter(({ row }) => row.journal_no === journalNo);

                return journalRows.map(({ row, index }, rowIdx) => (
                  <tr key={`${journalNo}-${row[pairField]}-${index}`} className="hover:bg-gray-50">
                    {rowIdx === 0 && (
                      <td
                        rowSpan={journalRows.length}
                        className="border px-2 py-1 text-center font-medium align-middle"
                      >
                        {journalNo}
                      </td>
                    )}
                    <td className="border px-2 py-1 font-medium">{row[pairField]}</td>
                    {['measurement_a', 'measurement_b', 'measurement_c'].map((col) => (
                      <td key={col} className="border px-1 py-1">
                        <input
                          type="text"
                          value={row[col] || ''}
                          onChange={(e) => handleMeasurementDataChange(sectionKey, index, col, e.target.value)}
                          className="w-full px-1 py-0.5 border rounded text-xs"
                        />
                      </td>
                    ))}
                    {rowIdx === 0 && (
                      <td
                        rowSpan={journalRows.length}
                        className="border px-1 py-1 text-center align-middle"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveJournal(sectionKey, journalNo)}
                          disabled={journalNumbers.length <= 1}
                          className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-2">
          <button
            type="button"
            onClick={() => handleAddJournal(sectionKey, pairField, pairValues)}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
          >
            + Add Journal
          </button>
        </div>
      </>
    );
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

  const renderMetaFooter = (metaKey: string) => {
    const meta = formState.measurementData?.[metaKey] || {};
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="md:col-span-2">
          <Input label="Remarks" value={meta.remarks || ''} onChange={(v) => handleMeasurementMetaChange(metaKey, 'remarks', v)} />
        </div>
        <UserAutocompleteEdit
          label="Technician"
          value={meta.technician || ''}
          onChange={(v) => handleMeasurementMetaChange(metaKey, 'technician', v)}
          onSelect={(user) => handleMeasurementMetaChange(metaKey, 'technician', user.fullName)}
          users={users}
          disabled={!canEditTechnician}
        />
        <Input label="Tool No." value={meta.tool_no || ''} onChange={(v) => handleMeasurementMetaChange(metaKey, 'tool_no', v)} />
        <UserAutocompleteEdit
          label="Checked By"
          value={meta.checked_by || ''}
          onChange={(v) => handleMeasurementMetaChange(metaKey, 'checked_by', v)}
          onSelect={(user) => handleMeasurementMetaChange(metaKey, 'checked_by', user.fullName)}
          users={users}
          disabled={!canEditCheckedBy}
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.3)", backdropFilter: "blur(4px)" }}
      >
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading record data...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)", backdropFilter: "blur(4px)" }}
    >
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
              {renderMetaFooter('cylinderBoreMeta')}
            </div>
          )}

          {/* Cylinder Liner */}
          <SectionHeader title="Cylinder Liner" sectionKey="cylinderLiner" pageNum="Page 2" />
          {expandedSections.cylinderLiner && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('cylinderLinerData', ['measurement_a', 'measurement_b', 'measurement_c', 'measurement_d'],
                (row) => `${row.section}-${row.cylinder_no}`)}
              {renderMetaFooter('cylinderLinerMeta')}
            </div>
          )}

          {/* Main Bearing Bore */}
          <SectionHeader title="Main Bearing Bore" sectionKey="mainBearingBore" pageNum="Page 3" />
          {expandedSections.mainBearingBore && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('mainBearingBoreData', ['measurement_a', 'measurement_b', 'measurement_c'],
                (row) => `Bore ${row.bore_no} - ${row.axis}`)}
              {renderMetaFooter('mainBearingBoreMeta')}
            </div>
          )}

          {/* Main Bearing Radial Clearance */}
          <SectionHeader title="Main Bearing Radial Clearance" sectionKey="mainBearingRadialClearance" pageNum="Page 3b" />
          {expandedSections.mainBearingRadialClearance && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderDynamicJournalTable('mainBearingRadialClearanceData', 'data_point', 'Data', ['X', 'Y'])}
              {renderMetaFooter('mainBearingRadialClearanceMeta')}
            </div>
          )}

          {/* Camshaft Bushing */}
          <SectionHeader title="Camshaft Bushing" sectionKey="camshaftBushing" pageNum="Page 4" />
          {expandedSections.camshaftBushing && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('camshaftBushingData', ['measurement_a', 'measurement_b'],
                (row) => `Bush ${row.bush_no} - MP ${row.measuring_point}`)}
              {renderMetaFooter('camshaftBushingMeta')}
            </div>
          )}

          {/* Main Journal */}
          <SectionHeader title="Main Journal Diameter" sectionKey="mainJournal" pageNum="Page 5" />
          {expandedSections.mainJournal && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('mainJournalData', ['measurement_a', 'measurement_b'],
                (row) => `Journal ${row.journal_no} - MP ${row.measuring_point}`)}
              {renderMetaFooter('mainJournalMeta')}
            </div>
          )}

          {/* Crankshaft Main Journal Diameter */}
          <SectionHeader title="Crankshaft Main Journal Diameter" sectionKey="crankshaftMainJournalDiameter" pageNum="Page 5b" />
          {expandedSections.crankshaftMainJournalDiameter && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderDynamicJournalTable('crankshaftMainJournalDiameterData', 'datum', 'Datum', ['X', 'y'])}
              {renderMetaFooter('crankshaftMainJournalDiameterMeta')}
            </div>
          )}

          {/* Main Journal Width */}
          <SectionHeader title="Main Journal Width" sectionKey="mainJournalWidth" pageNum="Page 6" />
          {expandedSections.mainJournalWidth && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('mainJournalWidthData', ['measurement_a', 'measurement_b', 'measurement_c', 'measurement_d'],
                (row) => `Journal ${row.journal_no}`)}
              {renderMetaFooter('mainJournalWidthMeta')}
            </div>
          )}

          {/* Con Rod Journal */}
          <SectionHeader title="Con Rod Journal" sectionKey="conRodJournal" pageNum="Page 7" />
          {expandedSections.conRodJournal && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('conRodJournalData', ['measurement_a', 'measurement_b', 'measurement_c'],
                (row) => `Journal ${row.journal_no} - ${row.axis}`)}
              {renderMetaFooter('conRodJournalMeta')}
            </div>
          )}

          {/* Connecting Rod Bearing Bore */}
          <SectionHeader title="Connecting Rod Bearing Bore" sectionKey="connectingRodBearingBore" pageNum="Page 7b" />
          {expandedSections.connectingRodBearingBore && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderDynamicJournalTable('connectingRodBearingBoreData', 'datum', 'Datum', ['X', 'y'])}
              {renderMetaFooter('connectingRodBearingBoreMeta')}
            </div>
          )}

          {/* Crankshaft True Running */}
          <SectionHeader title="Crankshaft True Running" sectionKey="crankshaftTrueRunning" pageNum="Page 8" />
          {expandedSections.crankshaftTrueRunning && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('crankshaftTrueRunningData', ['measured_value'],
                (row) => `Journal ${row.journal_no}`)}
              {renderMetaFooter('crankshaftTrueRunningMeta')}
            </div>
          )}

          {/* Small End Bush */}
          <SectionHeader title="Small End Bush" sectionKey="smallEndBush" pageNum="Page 9" />
          {expandedSections.smallEndBush && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('smallEndBushData', ['measurement_a', 'measurement_b'],
                (row) => `Arm ${row.con_rod_arm_no} - Datum ${row.datum}`)}
              {renderMetaFooter('smallEndBushMeta')}
            </div>
          )}

          {/* Big End Bearing */}
          <SectionHeader title="Big End Bearing" sectionKey="bigEndBearing" pageNum="Page 10" />
          {expandedSections.bigEndBearing && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('bigEndBearingData', ['measurement_a', 'measurement_b'],
                (row) => `Arm ${row.con_rod_arm_no} - MP ${row.measuring_point}`)}
              {renderMetaFooter('bigEndBearingMeta')}
            </div>
          )}

          {/* Connecting Rod Arm */}
          <SectionHeader title="Connecting Rod Arm" sectionKey="connectingRodArm" pageNum="Page 11" />
          {expandedSections.connectingRodArm && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('connectingRodArmData', ['measurement'],
                (row) => `Arm ${row.arm_no} - Bank ${row.bank}`)}
              {renderMetaFooter('connectingRodArmMeta')}
            </div>
          )}

          {/* Piston Pin Bush Clearance */}
          <SectionHeader title="Piston Pin Bush Clearance" sectionKey="pistonPinBushClearance" pageNum="Page 12" />
          {expandedSections.pistonPinBushClearance && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('pistonPinBushClearanceData', ['measurement_a', 'measurement_b', 'measurement_c'],
                (row) => `Arm ${row.conrod_arm_no} - ${row.measuring_point}`)}
              {renderMetaFooter('pistonPinBushClearanceMeta')}
            </div>
          )}

          {/* Camshaft Journal Diameter */}
          <SectionHeader title="Camshaft Journal Diameter" sectionKey="camshaftJournalDiameter" pageNum="Page 13" />
          {expandedSections.camshaftJournalDiameter && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderDynamicJournalTable('camshaftJournalDiameterData', 'measuring_point', 'Datum', ['X', 'Y'])}
              {renderMetaFooter('camshaftJournalDiameterMeta')}
            </div>
          )}

          {/* Camshaft Bush Clearance */}
          <SectionHeader title="Camshaft Bush Clearance" sectionKey="camshaftBushClearance" pageNum="Page 14" />
          {expandedSections.camshaftBushClearance && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('camshaftBushClearanceData', ['measurement_a', 'measurement_b', 'measurement_c'],
                (row) => `Journal ${row.journal_no} - ${row.measuring_point}`)}
              {renderMetaFooter('camshaftBushClearanceMeta')}
            </div>
          )}

          {/* Camlobe Height */}
          <SectionHeader title="Camlobe Height" sectionKey="camlobeHeight" pageNum="Page 15" />
          {expandedSections.camlobeHeight && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('camlobeHeightData', ['measurement_a', 'measurement_b', 'measurement_c'],
                (row) => `Journal ${row.journal_no} - ${row.measuring_point}`)}
              {renderMetaFooter('camlobeHeightMeta')}
            </div>
          )}

          {/* Cylinder Liner Bore */}
          <SectionHeader title="Cylinder Liner Bore" sectionKey="cylinderLinerBore" pageNum="Page 16" />
          {expandedSections.cylinderLinerBore && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('cylinderLinerBoreData', ['measurement_a', 'measurement_b', 'measurement_c', 'measurement_d'],
                (row) => `Cyl ${row.cylinder_no} - ${row.measuring_point}`)}
              {renderMetaFooter('cylinderLinerBoreMeta')}
            </div>
          )}

          {/* Piston Ring Gap */}
          <SectionHeader title="Piston Ring Gap" sectionKey="pistonRingGap" pageNum="Page 17" />
          {expandedSections.pistonRingGap && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('pistonRingGapData', ['ring_1_value', 'ring_2_value', 'ring_3_value'],
                (row) => `Piston ${row.piston_no}`)}
              {renderMetaFooter('pistonRingGapMeta')}
            </div>
          )}

          {/* Piston Ring Axial Clearance */}
          <SectionHeader title="Piston Ring Axial Clearance" sectionKey="pistonRingAxialClearance" pageNum="Page 18" />
          {expandedSections.pistonRingAxialClearance && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('pistonRingAxialClearanceData', ['ring_1_value', 'ring_2_value', 'ring_3_value'],
                (row) => `Piston ${row.piston_no}`)}
              {renderMetaFooter('pistonRingAxialClearanceMeta')}
            </div>
          )}

          {/* Valve Unloaded Length */}
          <SectionHeader title="Valve Unloaded Length" sectionKey="valveUnloadedLength" pageNum="Page 19" />
          {expandedSections.valveUnloadedLength && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('valveUnloadedLengthData', ['intake_value', 'exhaust_value'],
                (row) => `Cylinder ${row.cylinder_no}`)}
              {renderMetaFooter('valveUnloadedLengthMeta')}
            </div>
          )}

          {/* Valve Recess */}
          <SectionHeader title="Valve Recess" sectionKey="valveRecess" pageNum="Page 20" />
          {expandedSections.valveRecess && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              {renderMeasurementTable('valveRecessData', ['intake_value', 'exhaust_value'],
                (row) => `Cylinder ${row.cylinder_no}`)}
              {renderMetaFooter('valveRecessMeta')}
            </div>
          )}

          {/* Miscellaneous */}
          {/* Crankshaft End Clearance */}
          <SectionHeader title="Crankshaft End Clearance" sectionKey="crankshaftEndClearance" pageNum="Page 21" />
          {expandedSections.crankshaftEndClearance && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <Input label="Spec Min" value={formState.measurementData?.crankshaftEndClearance?.spec_min} onChange={(v) => handleMeasurementMetaChange('crankshaftEndClearance', 'spec_min', v)} />
                <Input label="Spec Max" value={formState.measurementData?.crankshaftEndClearance?.spec_max} onChange={(v) => handleMeasurementMetaChange('crankshaftEndClearance', 'spec_max', v)} />
                <Input label="Reading Taken" value={formState.measurementData?.crankshaftEndClearance?.reading_taken} onChange={(v) => handleMeasurementMetaChange('crankshaftEndClearance', 'reading_taken', v)} />
              </div>
              {renderMetaFooter('crankshaftEndClearance')}
            </div>
          )}

          {/* Lube Oil Pump Gear Backlash */}
          <SectionHeader title="Lube Oil Pump Gear Backlash" sectionKey="lubeOilPumpBacklash" pageNum="Page 21" />
          {expandedSections.lubeOilPumpBacklash && formState.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <Input label="Spec Min" value={formState.measurementData?.lubeOilPumpBacklash?.spec_min} onChange={(v) => handleMeasurementMetaChange('lubeOilPumpBacklash', 'spec_min', v)} />
                <Input label="Spec Max" value={formState.measurementData?.lubeOilPumpBacklash?.spec_max} onChange={(v) => handleMeasurementMetaChange('lubeOilPumpBacklash', 'spec_max', v)} />
                <Input label="Reading Taken" value={formState.measurementData?.lubeOilPumpBacklash?.reading_taken} onChange={(v) => handleMeasurementMetaChange('lubeOilPumpBacklash', 'reading_taken', v)} />
              </div>
              {renderMetaFooter('lubeOilPumpBacklash')}
            </div>
          )}

          <SectionHeader title="Miscellaneous (Pages 22-24)" sectionKey="miscellaneous" />
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
                  {renderMetaFooter('pistonCylinderHeadDistanceMeta')}
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

const CustomerAutocomplete = (props: CustomerAutocompleteProps) => {
  const { label, value, onChange } = props;
  return (
    <div className="flex flex-col w-full">
      <label className="text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border text-sm rounded-md block p-2.5 transition-colors duration-200 ease-in-out shadow-sm bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500"
        placeholder={`Enter ${label.toLowerCase()}`}
        autoComplete="off"
      />
    </div>
  );
};

// UserAutocomplete component for Technician / Checked By fields
interface UserAutocompleteEditProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (user: { id: string; fullName: string }) => void;
  users: Array<{ id: string; fullName: string }>;
  disabled?: boolean;
}

const UserAutocompleteEdit = ({ label, value, onChange, onSelect, users, disabled = false }: UserAutocompleteEditProps) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = users.filter((u) =>
    (u.fullName || "").toLowerCase().includes((value || "").toLowerCase())
  );

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="text-xs font-bold text-gray-600 mb-1 uppercase">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value || ''}
          onChange={(e) => { if (!disabled) { onChange(e.target.value); setShowDropdown(true); } }}
          onFocus={() => { if (!disabled) setShowDropdown(true); }}
          disabled={disabled}
          className={`w-full border text-sm rounded-md p-2 pr-8 ${disabled ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"}`}
          placeholder={`Enter ${label.toLowerCase()}`}
          autoComplete="off"
        />
        {!disabled && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => { e.preventDefault(); setShowDropdown(!showDropdown); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
        )}
        {!disabled && showDropdown && filteredUsers.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onMouseDown={(e) => { e.preventDefault(); onSelect(user); setShowDropdown(false); }}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm text-gray-900 border-b last:border-b-0 border-gray-100"
              >
                {user.fullName}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
