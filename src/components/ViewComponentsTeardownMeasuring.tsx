"use client";

import React, { useState, useEffect } from "react";
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon, PrinterIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import apiClient from "@/lib/axios";

interface ViewComponentsTeardownMeasuringProps {
  data: any;
  recordId: string;
  onClose: () => void;
}

export default function ViewComponentsTeardownMeasuring({ data, recordId, onClose }: ViewComponentsTeardownMeasuringProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [fullData, setFullData] = useState<any>(null);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    header: true,
    cylinderBore: true,
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

  useEffect(() => {
    const fetchFullData = async () => {
      try {
        const response = await apiClient.get(`/forms/components-teardown-measuring/${recordId}`);
        if (response.data.success) {
          setFullData(response.data.data);
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

  const handlePrint = () => {
    window.print();
  };

  const SectionHeader = ({ title, sectionKey, pageNum }: { title: string; sectionKey: string; pageNum?: string }) => (
    <div
      className="flex items-center justify-between py-3 px-4 bg-gray-100 rounded-lg cursor-pointer mb-2 print:bg-gray-200"
      onClick={() => toggleSection(sectionKey)}
    >
      <div className="flex items-center">
        <div className="w-1 h-5 bg-blue-600 mr-2"></div>
        <h4 className="text-sm font-bold text-gray-800 uppercase">
          {pageNum && <span className="text-blue-600 mr-2">{pageNum}</span>}
          {title}
        </h4>
      </div>
      <span className="print:hidden">
        {expandedSections[sectionKey] ? (
          <ChevronUpIcon className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 text-gray-500" />
        )}
      </span>
    </div>
  );

  const DataField = ({ label, value }: { label: string; value: any }) => (
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-gray-500 uppercase">{label}</span>
      <span className="text-sm text-gray-800">{value || '-'}</span>
    </div>
  );

  const renderMeasurementTable = (dataKey: string, columns: { key: string; label: string }[], rowLabelFn: (row: any) => string) => {
    const rows = fullData?.measurementData?.[dataKey] || [];
    if (rows.length === 0) return <p className="text-sm text-gray-500 italic">No data recorded</p>;

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-1 text-left">Item</th>
              {columns.map(col => (
                <th key={col.key} className="border border-gray-300 px-2 py-1 text-center">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, index: number) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-2 py-1 text-sm font-medium">{rowLabelFn(row)}</td>
                {columns.map(col => (
                  <td key={col.key} className="border border-gray-300 px-2 py-1 text-center">
                    {row[col.key] || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSpecsMeta = (metaKey: string) => {
    const meta = fullData?.measurementData?.[metaKey];
    if (!meta) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-xs bg-blue-50 p-3 rounded">
        {meta.spec_min && <DataField label="Spec Min" value={meta.spec_min} />}
        {meta.spec_max && <DataField label="Spec Max" value={meta.spec_max} />}
        {meta.spec_wear_limit && <DataField label="Wear Limit" value={meta.spec_wear_limit} />}
        {meta.spec_oversize_limit && <DataField label="Oversize Limit" value={meta.spec_oversize_limit} />}
        {meta.spec_max_ovality && <DataField label="Max Ovality" value={meta.spec_max_ovality} />}
        {meta.remarks && <DataField label="Remarks" value={meta.remarks} />}
        {meta.technician && <DataField label="Technician" value={meta.technician} />}
        {meta.tool_no && <DataField label="Tool No" value={meta.tool_no} />}
        {meta.checked_by && <DataField label="Checked By" value={meta.checked_by} />}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading record data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:static print:bg-white print:p-0" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col print:max-w-none print:max-h-none print:rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 print:hidden">
          <h2 className="text-lg font-bold text-gray-800">View Components Teardown Measuring Report</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="p-2 hover:bg-gray-200 rounded" title="Print">
              <PrinterIcon className="h-5 w-5 text-gray-600" />
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
              <XMarkIcon className="h-6 w-6 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block text-center py-4 border-b">
          <h1 className="text-xl font-bold">POWER SYSTEMS, INC.</h1>
          <p className="text-sm text-gray-600">C3 Road cor Torsillo St., Dagat-dagatan, Caloocan City</p>
          <h2 className="text-lg font-bold mt-2 uppercase">Components Teardown Measuring Report</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 print:overflow-visible">
          {/* Header Section */}
          <SectionHeader title="Header Information" sectionKey="header" />
          {expandedSections.header && fullData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DataField label="Customer" value={fullData.customer} />
                <DataField label="Report Date" value={fullData.report_date} />
                <DataField label="Engine Model" value={fullData.engine_model} />
                <DataField label="Serial No." value={fullData.serial_no} />
                <DataField label="Job Order No." value={fullData.job_order_no} />
                <DataField label="Created At" value={new Date(fullData.created_at).toLocaleString()} />
              </div>
            </div>
          )}

          {/* Cylinder Bore */}
          <SectionHeader title="Cylinder Bore" sectionKey="cylinderBore" pageNum="Page 1" />
          {expandedSections.cylinderBore && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('cylinderBoreMeta')}
              {renderMeasurementTable('cylinderBoreData',
                [{ key: 'measurement_1', label: '1' }, { key: 'measurement_2', label: '2' }, { key: 'measurement_3', label: '3' }],
                (row) => `${row.bank}-${row.cylinder_no}-${row.data_point}`)}
            </div>
          )}

          {/* Cylinder Liner */}
          <SectionHeader title="Cylinder Liner" sectionKey="cylinderLiner" pageNum="Page 2" />
          {expandedSections.cylinderLiner && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('cylinderLinerMeta')}
              {renderMeasurementTable('cylinderLinerData',
                [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }, { key: 'measurement_c', label: 'C' }, { key: 'measurement_d', label: 'D' }],
                (row) => `${row.section}-${row.cylinder_no}`)}
            </div>
          )}

          {/* Main Bearing Bore */}
          <SectionHeader title="Main Bearing Bore" sectionKey="mainBearingBore" pageNum="Page 3" />
          {expandedSections.mainBearingBore && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('mainBearingBoreMeta')}
              {renderMeasurementTable('mainBearingBoreData',
                [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }, { key: 'measurement_c', label: 'C' }],
                (row) => `Bore ${row.bore_no} - ${row.axis}`)}
            </div>
          )}

          {/* Camshaft Bushing */}
          <SectionHeader title="Camshaft Bushing" sectionKey="camshaftBushing" pageNum="Page 4" />
          {expandedSections.camshaftBushing && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('camshaftBushingMeta')}
              {renderMeasurementTable('camshaftBushingData',
                [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }],
                (row) => `Bush ${row.bush_no} - MP ${row.measuring_point}`)}
            </div>
          )}

          {/* Main Journal */}
          <SectionHeader title="Main Journal Diameter" sectionKey="mainJournal" pageNum="Page 5" />
          {expandedSections.mainJournal && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('mainJournalMeta')}
              {renderMeasurementTable('mainJournalData',
                [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }],
                (row) => `Journal ${row.journal_no} - MP ${row.measuring_point}`)}
            </div>
          )}

          {/* Main Journal Width */}
          <SectionHeader title="Main Journal Width" sectionKey="mainJournalWidth" pageNum="Page 6" />
          {expandedSections.mainJournalWidth && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('mainJournalWidthMeta')}
              {renderMeasurementTable('mainJournalWidthData',
                [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }, { key: 'measurement_c', label: 'C' }, { key: 'measurement_d', label: 'D' }],
                (row) => `Journal ${row.journal_no}`)}
            </div>
          )}

          {/* Con Rod Journal */}
          <SectionHeader title="Con Rod Journal" sectionKey="conRodJournal" pageNum="Page 7" />
          {expandedSections.conRodJournal && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('conRodJournalMeta')}
              {renderMeasurementTable('conRodJournalData',
                [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }, { key: 'measurement_c', label: 'C' }],
                (row) => `Journal ${row.journal_no} - ${row.axis}`)}
            </div>
          )}

          {/* Crankshaft True Running */}
          <SectionHeader title="Crankshaft True Running" sectionKey="crankshaftTrueRunning" pageNum="Page 8" />
          {expandedSections.crankshaftTrueRunning && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('crankshaftTrueRunningMeta')}
              {renderMeasurementTable('crankshaftTrueRunningData',
                [{ key: 'measured_value', label: 'Measured Value' }],
                (row) => `Journal ${row.journal_no}`)}
            </div>
          )}

          {/* Small End Bush */}
          <SectionHeader title="Small End Bush" sectionKey="smallEndBush" pageNum="Page 9" />
          {expandedSections.smallEndBush && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('smallEndBushMeta')}
              {renderMeasurementTable('smallEndBushData',
                [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }],
                (row) => `Arm ${row.con_rod_arm_no} - Datum ${row.datum}`)}
            </div>
          )}

          {/* Big End Bearing */}
          <SectionHeader title="Big End Bearing" sectionKey="bigEndBearing" pageNum="Page 10" />
          {expandedSections.bigEndBearing && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('bigEndBearingMeta')}
              {renderMeasurementTable('bigEndBearingData',
                [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }],
                (row) => `Arm ${row.con_rod_arm_no} - MP ${row.measuring_point}`)}
            </div>
          )}

          {/* Connecting Rod Arm */}
          <SectionHeader title="Connecting Rod Arm" sectionKey="connectingRodArm" pageNum="Page 11" />
          {expandedSections.connectingRodArm && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('connectingRodArmMeta')}
              {renderMeasurementTable('connectingRodArmData',
                [{ key: 'measurement', label: 'Measurement' }],
                (row) => `Arm ${row.arm_no} - Bank ${row.bank}`)}
            </div>
          )}

          {/* Piston Pin Bush Clearance */}
          <SectionHeader title="Piston Pin Bush Clearance" sectionKey="pistonPinBushClearance" pageNum="Page 12" />
          {expandedSections.pistonPinBushClearance && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('pistonPinBushClearanceMeta')}
              {renderMeasurementTable('pistonPinBushClearanceData',
                [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }, { key: 'measurement_c', label: 'C' }],
                (row) => `Arm ${row.conrod_arm_no} - ${row.measuring_point}`)}
            </div>
          )}

          {/* Camshaft Journal Diameter */}
          <SectionHeader title="Camshaft Journal Diameter" sectionKey="camshaftJournalDiameter" pageNum="Page 13" />
          {expandedSections.camshaftJournalDiameter && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('camshaftJournalDiameterMeta')}
              {renderMeasurementTable('camshaftJournalDiameterData',
                [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }, { key: 'measurement_c', label: 'C' }],
                (row) => `Journal ${row.journal_no} - ${row.measuring_point}`)}
            </div>
          )}

          {/* Camshaft Bush Clearance */}
          <SectionHeader title="Camshaft Bush Clearance" sectionKey="camshaftBushClearance" pageNum="Page 14" />
          {expandedSections.camshaftBushClearance && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('camshaftBushClearanceMeta')}
              {renderMeasurementTable('camshaftBushClearanceData',
                [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }, { key: 'measurement_c', label: 'C' }],
                (row) => `Journal ${row.journal_no} - ${row.measuring_point}`)}
            </div>
          )}

          {/* Camlobe Height */}
          <SectionHeader title="Camlobe Height" sectionKey="camlobeHeight" pageNum="Page 15" />
          {expandedSections.camlobeHeight && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('camlobeHeightMeta')}
              {renderMeasurementTable('camlobeHeightData',
                [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }, { key: 'measurement_c', label: 'C' }],
                (row) => `Journal ${row.journal_no} - ${row.measuring_point}`)}
            </div>
          )}

          {/* Cylinder Liner Bore */}
          <SectionHeader title="Cylinder Liner Bore" sectionKey="cylinderLinerBore" pageNum="Page 16" />
          {expandedSections.cylinderLinerBore && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('cylinderLinerBoreMeta')}
              {renderMeasurementTable('cylinderLinerBoreData',
                [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }, { key: 'measurement_c', label: 'C' }, { key: 'measurement_d', label: 'D' }],
                (row) => `Cyl ${row.cylinder_no} - ${row.measuring_point}`)}
            </div>
          )}

          {/* Piston Ring Gap */}
          <SectionHeader title="Piston Ring Gap" sectionKey="pistonRingGap" pageNum="Page 17" />
          {expandedSections.pistonRingGap && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('pistonRingGapMeta')}
              {renderMeasurementTable('pistonRingGapData',
                [{ key: 'ring_1_value', label: '1st Ring' }, { key: 'ring_2_value', label: '2nd Ring' }, { key: 'ring_3_value', label: '3rd Ring' }],
                (row) => `Piston ${row.piston_no}`)}
            </div>
          )}

          {/* Piston Ring Axial Clearance */}
          <SectionHeader title="Piston Ring Axial Clearance" sectionKey="pistonRingAxialClearance" pageNum="Page 18" />
          {expandedSections.pistonRingAxialClearance && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('pistonRingAxialClearanceMeta')}
              {renderMeasurementTable('pistonRingAxialClearanceData',
                [{ key: 'ring_1_value', label: '1st Ring' }, { key: 'ring_2_value', label: '2nd Ring' }, { key: 'ring_3_value', label: '3rd Ring' }],
                (row) => `Piston ${row.piston_no}`)}
            </div>
          )}

          {/* Valve Unloaded Length */}
          <SectionHeader title="Valve Unloaded Length" sectionKey="valveUnloadedLength" pageNum="Page 19" />
          {expandedSections.valveUnloadedLength && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('valveUnloadedLengthMeta')}
              {renderMeasurementTable('valveUnloadedLengthData',
                [{ key: 'intake_value', label: 'Intake' }, { key: 'exhaust_value', label: 'Exhaust' }],
                (row) => `Cylinder ${row.cylinder_no}`)}
            </div>
          )}

          {/* Valve Recess */}
          <SectionHeader title="Valve Recess" sectionKey="valveRecess" pageNum="Page 20" />
          {expandedSections.valveRecess && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border">
              {renderSpecsMeta('valveRecessMeta')}
              {renderMeasurementTable('valveRecessData',
                [{ key: 'intake_value', label: 'Intake' }, { key: 'exhaust_value', label: 'Exhaust' }],
                (row) => `Cylinder ${row.cylinder_no}`)}
            </div>
          )}

          {/* Miscellaneous */}
          <SectionHeader title="Miscellaneous (Pages 21-24)" sectionKey="miscellaneous" />
          {expandedSections.miscellaneous && fullData?.measurementData && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 print:bg-white print:border space-y-4">
              {/* Crankshaft End Clearance */}
              {fullData.measurementData.crankshaftEndClearance && (
                <div className="border-b pb-3">
                  <h5 className="font-semibold text-gray-700 mb-2">Crankshaft End Clearance</h5>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <DataField label="Spec Min" value={fullData.measurementData.crankshaftEndClearance.spec_min} />
                    <DataField label="Spec Max" value={fullData.measurementData.crankshaftEndClearance.spec_max} />
                    <DataField label="Reading Taken" value={fullData.measurementData.crankshaftEndClearance.reading_taken} />
                  </div>
                </div>
              )}

              {/* Lube Oil Pump Backlash */}
              {fullData.measurementData.lubeOilPumpBacklash && (
                <div className="border-b pb-3">
                  <h5 className="font-semibold text-gray-700 mb-2">Lube Oil Pump Backlash</h5>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <DataField label="Spec Min" value={fullData.measurementData.lubeOilPumpBacklash.spec_min} />
                    <DataField label="Spec Max" value={fullData.measurementData.lubeOilPumpBacklash.spec_max} />
                    <DataField label="Reading Taken" value={fullData.measurementData.lubeOilPumpBacklash.reading_taken} />
                  </div>
                </div>
              )}

              {/* Camshaft End Clearance */}
              {fullData.measurementData.camshaftEndClearance && (
                <div className="border-b pb-3">
                  <h5 className="font-semibold text-gray-700 mb-2">Camshaft End Clearance</h5>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <DataField label="Spec Min" value={fullData.measurementData.camshaftEndClearance.spec_min} />
                    <DataField label="Spec Max" value={fullData.measurementData.camshaftEndClearance.spec_max} />
                    <DataField label="Reading Taken" value={fullData.measurementData.camshaftEndClearance.reading_taken} />
                  </div>
                </div>
              )}

              {/* Cylinder Head Cap Screw */}
              {fullData.measurementData.cylinderHeadCapScrew && (
                <div className="border-b pb-3">
                  <h5 className="font-semibold text-gray-700 mb-2">Cylinder Head Cap Screw</h5>
                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <DataField label="Spec Min" value={fullData.measurementData.cylinderHeadCapScrew.spec_min} />
                    <DataField label="Spec Max" value={fullData.measurementData.cylinderHeadCapScrew.spec_max} />
                    <DataField label="Total Count" value={fullData.measurementData.cylinderHeadCapScrew.total_count} />
                    <DataField label="OK Count" value={fullData.measurementData.cylinderHeadCapScrew.ok_count} />
                    <DataField label="Not OK Count" value={fullData.measurementData.cylinderHeadCapScrew.not_ok_count} />
                  </div>
                </div>
              )}

              {/* Valve Clearance Setting */}
              {fullData.measurementData.valveClearanceSetting && (
                <div className="border-b pb-3">
                  <h5 className="font-semibold text-gray-700 mb-2">Valve Clearance Setting</h5>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <DataField label="Intake Standard" value={fullData.measurementData.valveClearanceSetting.intake_standard} />
                    <DataField label="Intake Setting" value={fullData.measurementData.valveClearanceSetting.intake_setting} />
                    <DataField label="Exhaust Standard" value={fullData.measurementData.valveClearanceSetting.exhaust_standard} />
                    <DataField label="Exhaust Setting" value={fullData.measurementData.valveClearanceSetting.exhaust_setting} />
                  </div>
                </div>
              )}

              {/* Piston Cylinder Head Distance */}
              {fullData.measurementData.pistonCylinderHeadDistanceData && fullData.measurementData.pistonCylinderHeadDistanceData.length > 0 && (
                <div className="border-b pb-3">
                  <h5 className="font-semibold text-gray-700 mb-2">Piston Cylinder Head Distance</h5>
                  {renderMeasurementTable('pistonCylinderHeadDistanceData',
                    [{ key: 'measurement_a', label: 'A' }, { key: 'measurement_b', label: 'B' }],
                    (row) => `Cylinder ${row.cylinder_no}`)}
                </div>
              )}

              {/* Injection Pump */}
              {fullData.measurementData.injectionPump && (
                <div className="border-b pb-3">
                  <h5 className="font-semibold text-gray-700 mb-2">Injection Pump</h5>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <DataField label="Timing" value={fullData.measurementData.injectionPump.timing} />
                    <DataField label="Brand New" value={fullData.measurementData.injectionPump.is_brand_new ? 'Yes' : 'No'} />
                    <DataField label="Calibrated" value={fullData.measurementData.injectionPump.is_calibrated ? 'Yes' : 'No'} />
                  </div>
                </div>
              )}

              {/* Injectors */}
              {fullData.measurementData.injectors && (
                <div className="border-b pb-3">
                  <h5 className="font-semibold text-gray-700 mb-2">Injectors</h5>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <DataField label="Opening Pressure" value={fullData.measurementData.injectors.opening_pressure} />
                    <DataField label="Brand New" value={fullData.measurementData.injectors.is_brand_new ? 'Yes' : 'No'} />
                    <DataField label="Readjusted" value={fullData.measurementData.injectors.is_readjusted ? 'Yes' : 'No'} />
                    <DataField label="Replace Nozzle Tip" value={fullData.measurementData.injectors.is_replace_nozzle_tip ? 'Yes' : 'No'} />
                  </div>
                </div>
              )}

              {/* Air Cooling Blower */}
              {fullData.measurementData.airCoolingBlower && (
                <div>
                  <h5 className="font-semibold text-gray-700 mb-2">Air Cooling Blower</h5>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <DataField label="New Ball Bearing" value={fullData.measurementData.airCoolingBlower.is_new_ball_bearing ? 'Yes' : 'No'} />
                    <DataField label="Repacked Grease" value={fullData.measurementData.airCoolingBlower.is_repacked_grease ? 'Yes' : 'No'} />
                    <DataField label="Mechanical Blower" value={fullData.measurementData.airCoolingBlower.is_mechanical_blower ? 'Yes' : 'No'} />
                    <DataField label="Hydraulic Blower" value={fullData.measurementData.airCoolingBlower.is_hydraulic_blower ? 'Yes' : 'No'} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
