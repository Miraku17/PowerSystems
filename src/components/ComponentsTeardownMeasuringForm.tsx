"use client";

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import ConfirmationModal from './ConfirmationModal';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import {
  useComponentsTeardownMeasuringFormStore,
  type MeasurementSectionMeta,
  type CylinderLinerMeta,
  type CrankshaftTrueRunningMeta,
  type PistonRingMeta,
  type ValveUnloadedLengthMeta,
  type ValveRecessMeta,
  type PistonCylinderHeadDistanceMeta,
} from '@/stores/componentsTeardownMeasuringFormStore';
import { useOfflineSubmit } from '@/hooks/useOfflineSubmit';
import JobOrderAutocomplete from './JobOrderAutocomplete';
import { useApprovedJobOrders } from '@/hooks/useApprovedJobOrders';
import { useUsers, useCustomers } from "@/hooks/useSharedQueries";

interface Customer {
  id: string;
  name: string;
  address?: string;
}

export default function ComponentsTeardownMeasuringForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { formData, setFormData, updateMeasurementRow, resetFormData } = useComponentsTeardownMeasuringFormStore();

  // Offline-aware submission
  const { submit, isSubmitting, isOnline } = useOfflineSubmit();
  const { data: users = [] } = useUsers();
  const { data: customers = [] } = useCustomers();
  const approvedJOs = useApprovedJobOrders();

  // Collapsible sections state
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ [name]: checked } as any);
    } else {
      setFormData({ [name]: value } as any);
    }
  };

  const handleCustomerSelect = (customer: any) => {
    setFormData({ customer: customer.name || customer.customer || '' });
  };

  // Stable meta update function to prevent input focus loss
  // Using getState() ensures we always get the latest data without causing re-renders
  const updateMeta = useCallback((metaKey: string, field: string, value: string | boolean) => {
    const currentFormData = useComponentsTeardownMeasuringFormStore.getState().formData;
    const currentMeta = (currentFormData as any)[metaKey];
    setFormData({
      [metaKey]: { ...currentMeta, [field]: value }
    } as any);
  }, [setFormData]);

  const handleConfirmSubmit = async () => {
    setIsModalOpen(false);

    // Prepare form data with measurement data as JSON string
    const submissionData: Record<string, unknown> = {
      customer: formData.customer,
      report_date: formData.report_date,
      engine_model: formData.engine_model,
      serial_no: formData.serial_no,
      job_order_no: formData.job_order_no,
      measurementData: JSON.stringify({
        cylinderBoreMeta: formData.cylinderBoreMeta,
        cylinderBoreData: formData.cylinderBoreData,
        cylinderLinerMeta: formData.cylinderLinerMeta,
        cylinderLinerData: formData.cylinderLinerData,
        mainBearingBoreMeta: formData.mainBearingBoreMeta,
        mainBearingBoreData: formData.mainBearingBoreData,
        camshaftBushingMeta: formData.camshaftBushingMeta,
        camshaftBushingData: formData.camshaftBushingData,
        mainJournalMeta: formData.mainJournalMeta,
        mainJournalData: formData.mainJournalData,
        mainJournalWidthMeta: formData.mainJournalWidthMeta,
        mainJournalWidthData: formData.mainJournalWidthData,
        conRodJournalMeta: formData.conRodJournalMeta,
        conRodJournalData: formData.conRodJournalData,
        crankshaftTrueRunningMeta: formData.crankshaftTrueRunningMeta,
        crankshaftTrueRunningData: formData.crankshaftTrueRunningData,
        smallEndBushMeta: formData.smallEndBushMeta,
        smallEndBushData: formData.smallEndBushData,
        bigEndBearingMeta: formData.bigEndBearingMeta,
        bigEndBearingData: formData.bigEndBearingData,
        connectingRodArmMeta: formData.connectingRodArmMeta,
        connectingRodArmData: formData.connectingRodArmData,
        pistonPinBushClearanceMeta: formData.pistonPinBushClearanceMeta,
        pistonPinBushClearanceData: formData.pistonPinBushClearanceData,
        camshaftJournalDiameterMeta: formData.camshaftJournalDiameterMeta,
        camshaftJournalDiameterData: formData.camshaftJournalDiameterData,
        camshaftBushClearanceMeta: formData.camshaftBushClearanceMeta,
        camshaftBushClearanceData: formData.camshaftBushClearanceData,
        camlobeHeightMeta: formData.camlobeHeightMeta,
        camlobeHeightData: formData.camlobeHeightData,
        cylinderLinerBoreMeta: formData.cylinderLinerBoreMeta,
        cylinderLinerBoreData: formData.cylinderLinerBoreData,
        pistonRingGapMeta: formData.pistonRingGapMeta,
        pistonRingGapData: formData.pistonRingGapData,
        pistonRingAxialClearanceMeta: formData.pistonRingAxialClearanceMeta,
        pistonRingAxialClearanceData: formData.pistonRingAxialClearanceData,
        valveUnloadedLengthMeta: formData.valveUnloadedLengthMeta,
        valveUnloadedLengthData: formData.valveUnloadedLengthData,
        valveRecessMeta: formData.valveRecessMeta,
        valveRecessData: formData.valveRecessData,
        crankshaftEndClearance: formData.crankshaftEndClearance,
        lubeOilPumpBacklash: formData.lubeOilPumpBacklash,
        camshaftEndClearance: formData.camshaftEndClearance,
        cylinderHeadCapScrew: formData.cylinderHeadCapScrew,
        valveClearanceSetting: formData.valveClearanceSetting,
        pistonCylinderHeadDistanceMeta: formData.pistonCylinderHeadDistanceMeta,
        pistonCylinderHeadDistanceData: formData.pistonCylinderHeadDistanceData,
        injectionPump: formData.injectionPump,
        injectors: formData.injectors,
        airCoolingBlower: formData.airCoolingBlower,
      }),
    };

    await submit({
      formType: 'components-teardown-measuring',
      formData: submissionData,
      onSuccess: () => {
        resetFormData();
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.job_order_no || formData.job_order_no.trim() === '') {
      toast.error('Job Order No. is required');
      return;
    }

    setIsModalOpen(true);
  };

  // Section Header Component
  const SectionHeader = ({ title, sectionKey, pageNum }: { title: string; sectionKey: string; pageNum?: string }) => (
    <div
      className="flex items-center justify-between mb-4 cursor-pointer select-none"
      onClick={() => toggleSection(sectionKey)}
    >
      <div className="flex items-center">
        <div className="w-1 h-6 bg-blue-600 mr-2"></div>
        <h3 className="text-lg font-bold text-gray-800 uppercase">
          {pageNum && <span className="text-blue-600 mr-2">{pageNum}</span>}
          {title}
        </h3>
      </div>
      {expandedSections[sectionKey] ? (
        <ChevronUpIcon className="h-5 w-5 text-gray-500" />
      ) : (
        <ChevronDownIcon className="h-5 w-5 text-gray-500" />
      )}
    </div>
  );

  // Standard specs input row
  // Standard specs input row - render function pattern
  const renderSpecsRow = (
    meta: MeasurementSectionMeta,
    metaKey: string,
    options: { showWearLimit?: boolean; showOversizeLimit?: boolean; showMaxOvality?: boolean } = {}
  ) => {
    const { showWearLimit = true, showOversizeLimit = false, showMaxOvality = false } = options;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-blue-50 p-4 rounded-lg">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Spec Min</label>
          <input
            type="text"
            value={meta.spec_min}
            onChange={(e) => updateMeta(metaKey, 'spec_min', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Spec Max</label>
          <input
            type="text"
            value={meta.spec_max}
            onChange={(e) => updateMeta(metaKey, 'spec_max', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {showWearLimit && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Wear Limit</label>
            <input
              type="text"
              value={meta.spec_wear_limit || ''}
              onChange={(e) => updateMeta(metaKey, 'spec_wear_limit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
        {showOversizeLimit && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Oversize Limit</label>
            <input
              type="text"
              value={meta.spec_oversize_limit || ''}
              onChange={(e) => updateMeta(metaKey, 'spec_oversize_limit', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
        {showMaxOvality && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Max Ovality</label>
            <input
              type="text"
              value={meta.spec_max_ovality || ''}
              onChange={(e) => updateMeta(metaKey, 'spec_max_ovality', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}
      </div>
    );
  };

  // Standard footer row (remarks, technician, tool_no, checked_by) - render function pattern
  const renderFooterRow = (meta: any, metaKey: string) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 bg-gray-50 p-4 rounded-lg">
      <div className="md:col-span-2">
        <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks</label>
        <input
          type="text"
          value={meta.remarks}
          onChange={(e) => updateMeta(metaKey, 'remarks', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <UserAutocomplete
        label="Technician"
        value={meta.technician}
        onChange={(value) => updateMeta(metaKey, 'technician', value)}
        onSelect={(user) => updateMeta(metaKey, 'technician', user.fullName)}
        users={users}
      />
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Tool No.</label>
        <input
          type="text"
          value={meta.tool_no}
          onChange={(e) => updateMeta(metaKey, 'tool_no', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <UserAutocomplete
        label="Checked By"
        value={meta.checked_by}
        onChange={(value) => updateMeta(metaKey, 'checked_by', value)}
        onSelect={(user) => updateMeta(metaKey, 'checked_by', user.fullName)}
        users={users}
      />
    </div>
  );

  // =========================================================
  // RENDER MEASUREMENT TABLES
  // =========================================================

  // Page 1: Cylinder Bore Table
  const renderCylinderBoreTable = () => {
    const banks = ['A', 'B'] as const;
    const cylinders = [1, 2, 3, 4, 5, 6];
    const dataPoints = ['a', 'b'] as const;

    return (
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-2 text-left">Bank</th>
              <th className="border border-gray-300 px-2 py-2 text-left">CYL</th>
              <th className="border border-gray-300 px-2 py-2 text-left">Data</th>
              <th className="border border-gray-300 px-2 py-2 text-center">1</th>
              <th className="border border-gray-300 px-2 py-2 text-center">2</th>
              <th className="border border-gray-300 px-2 py-2 text-center">3</th>
            </tr>
          </thead>
          <tbody>
            {formData.cylinderBoreData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-2 py-1 font-medium">{row.bank}</td>
                <td className="border border-gray-300 px-2 py-1">{row.cylinder_no}</td>
                <td className="border border-gray-300 px-2 py-1">{row.data_point}</td>
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={row.measurement_1}
                    onChange={(e) => updateMeasurementRow('cylinderBoreData', index, { measurement_1: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={row.measurement_2}
                    onChange={(e) => updateMeasurementRow('cylinderBoreData', index, { measurement_2: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={row.measurement_3}
                    onChange={(e) => updateMeasurementRow('cylinderBoreData', index, { measurement_3: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Page 2: Cylinder Liner Table
  const renderCylinderLinerTable = () => {
    const handleLinerMetaChange = (field: string, value: string) => {
      const scrollY = window.scrollY;
      setFormData({ cylinderLinerMeta: { ...formData.cylinderLinerMeta, [field]: value } });
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    };
    return (
    <>
      {/* Specs for Liner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-blue-50 p-4 rounded-lg">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Liner Seating Min</label>
          <input
            type="text"
            value={formData.cylinderLinerMeta.liner_seating_min}
            onChange={(e) => handleLinerMetaChange('liner_seating_min', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Liner Seating Max</label>
          <input
            type="text"
            value={formData.cylinderLinerMeta.liner_seating_max}
            onChange={(e) => handleLinerMetaChange('liner_seating_max', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Liner Collar Min</label>
          <input
            type="text"
            value={formData.cylinderLinerMeta.liner_collar_min}
            onChange={(e) => handleLinerMetaChange('liner_collar_min', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Liner Collar Max</label>
          <input
            type="text"
            value={formData.cylinderLinerMeta.liner_collar_max}
            onChange={(e) => handleLinerMetaChange('liner_collar_max', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-2 text-left">Section</th>
              <th className="border border-gray-300 px-2 py-2 text-left">CYL</th>
              <th className="border border-gray-300 px-2 py-2 text-center">A</th>
              <th className="border border-gray-300 px-2 py-2 text-center">B</th>
              <th className="border border-gray-300 px-2 py-2 text-center">C</th>
              <th className="border border-gray-300 px-2 py-2 text-center">D</th>
            </tr>
          </thead>
          <tbody>
            {formData.cylinderLinerData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-2 py-1 font-medium capitalize">{row.section}</td>
                <td className="border border-gray-300 px-2 py-1">{row.cylinder_no}</td>
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={row.measurement_a}
                    onChange={(e) => updateMeasurementRow('cylinderLinerData', index, { measurement_a: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={row.measurement_b}
                    onChange={(e) => updateMeasurementRow('cylinderLinerData', index, { measurement_b: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={row.measurement_c}
                    onChange={(e) => updateMeasurementRow('cylinderLinerData', index, { measurement_c: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={row.measurement_d}
                    onChange={(e) => updateMeasurementRow('cylinderLinerData', index, { measurement_d: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
    );
  };

  // Generic table for Bore/Journal with Axis X/Y and 3 columns (A, B, C)
  const renderAxisTable3Col = (
    dataKey: 'mainBearingBoreData' | 'conRodJournalData',
    labelField: string,
    labelName: string
  ) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-2 text-left">{labelName}</th>
            <th className="border border-gray-300 px-2 py-2 text-left">Axis</th>
            <th className="border border-gray-300 px-2 py-2 text-center">A</th>
            <th className="border border-gray-300 px-2 py-2 text-center">B</th>
            <th className="border border-gray-300 px-2 py-2 text-center">C</th>
          </tr>
        </thead>
        <tbody>
          {formData[dataKey].map((row: any, index: number) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-2 py-1">{row[labelField]}</td>
              <td className="border border-gray-300 px-2 py-1 font-medium">{row.axis}</td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_a}
                  onChange={(e) => updateMeasurementRow(dataKey, index, { measurement_a: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_b}
                  onChange={(e) => updateMeasurementRow(dataKey, index, { measurement_b: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_c}
                  onChange={(e) => updateMeasurementRow(dataKey, index, { measurement_c: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Generic table with Measuring Point 1/2 and 2 columns (A, B)
  const renderMeasuringPointTable2Col = (
    dataKey: 'camshaftBushingData' | 'mainJournalData' | 'smallEndBushData' | 'bigEndBearingData',
    labelField: string,
    labelName: string,
    mpField: string = 'measuring_point'
  ) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-2 text-left">{labelName}</th>
            <th className="border border-gray-300 px-2 py-2 text-left">MP</th>
            <th className="border border-gray-300 px-2 py-2 text-center">A</th>
            <th className="border border-gray-300 px-2 py-2 text-center">B</th>
          </tr>
        </thead>
        <tbody>
          {formData[dataKey].map((row: any, index: number) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-2 py-1">{row[labelField]}</td>
              <td className="border border-gray-300 px-2 py-1 font-medium">{row[mpField]}</td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_a}
                  onChange={(e) => updateMeasurementRow(dataKey, index, { measurement_a: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_b}
                  onChange={(e) => updateMeasurementRow(dataKey, index, { measurement_b: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Page 6: Main Journal Width Table (4 columns A, B, C, D)
  const renderMainJournalWidthTable = () => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-2 text-left">Journal</th>
            <th className="border border-gray-300 px-2 py-2 text-center">A</th>
            <th className="border border-gray-300 px-2 py-2 text-center">B</th>
            <th className="border border-gray-300 px-2 py-2 text-center">C</th>
            <th className="border border-gray-300 px-2 py-2 text-center">D</th>
          </tr>
        </thead>
        <tbody>
          {formData.mainJournalWidthData.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-2 py-1">{row.journal_no}</td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_a}
                  onChange={(e) => updateMeasurementRow('mainJournalWidthData', index, { measurement_a: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_b}
                  onChange={(e) => updateMeasurementRow('mainJournalWidthData', index, { measurement_b: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_c}
                  onChange={(e) => updateMeasurementRow('mainJournalWidthData', index, { measurement_c: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_d}
                  onChange={(e) => updateMeasurementRow('mainJournalWidthData', index, { measurement_d: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Page 8: Crankshaft True Running Table (single value)
  const renderCrankshaftTrueRunningTable = () => {
    const handleMetaChange = (field: string, value: string) => {
      const scrollY = window.scrollY;
      setFormData({ crankshaftTrueRunningMeta: { ...formData.crankshaftTrueRunningMeta, [field]: value } });
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    };
    return (
    <>
      <div className="grid grid-cols-2 gap-4 mb-4 bg-blue-50 p-4 rounded-lg">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Wear Limit (4 Cylinder)</label>
          <input
            type="text"
            value={formData.crankshaftTrueRunningMeta.wear_limit_4_cylinder}
            onChange={(e) => handleMetaChange('wear_limit_4_cylinder', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Wear Limit (6 Cylinder)</label>
          <input
            type="text"
            value={formData.crankshaftTrueRunningMeta.wear_limit_6_cylinder}
            onChange={(e) => handleMetaChange('wear_limit_6_cylinder', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-2 py-2 text-left">Journal</th>
              <th className="border border-gray-300 px-2 py-2 text-center">Measured Value</th>
            </tr>
          </thead>
          <tbody>
            {formData.crankshaftTrueRunningData.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-2 py-1">{row.journal_no}</td>
                <td className="border border-gray-300 px-1 py-1">
                  <input
                    type="text"
                    value={row.measured_value}
                    onChange={(e) => updateMeasurementRow('crankshaftTrueRunningData', index, { measured_value: e.target.value })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
    );
  };

  // Page 11: Connecting Rod Arm Table (Bank A/B, single measurement)
  const renderConnectingRodArmTable = () => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-2 text-left">Arm</th>
            <th className="border border-gray-300 px-2 py-2 text-left">Bank</th>
            <th className="border border-gray-300 px-2 py-2 text-center">Measurement</th>
          </tr>
        </thead>
        <tbody>
          {formData.connectingRodArmData.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-2 py-1">{row.arm_no}</td>
              <td className="border border-gray-300 px-2 py-1 font-medium">{row.bank}</td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement}
                  onChange={(e) => updateMeasurementRow('connectingRodArmData', index, { measurement: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Generic table with X/Y and 3 columns (A, B, C)
  const renderXYTable3Col = (
    dataKey: 'pistonPinBushClearanceData' | 'camshaftJournalDiameterData' | 'camshaftBushClearanceData' | 'camlobeHeightData',
    labelField: string,
    labelName: string
  ) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-2 text-left">{labelName}</th>
            <th className="border border-gray-300 px-2 py-2 text-left">MP</th>
            <th className="border border-gray-300 px-2 py-2 text-center">A</th>
            <th className="border border-gray-300 px-2 py-2 text-center">B</th>
            <th className="border border-gray-300 px-2 py-2 text-center">C</th>
          </tr>
        </thead>
        <tbody>
          {formData[dataKey].map((row: any, index: number) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-2 py-1">{row[labelField]}</td>
              <td className="border border-gray-300 px-2 py-1 font-medium">{row.measuring_point}</td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_a}
                  onChange={(e) => updateMeasurementRow(dataKey, index, { measurement_a: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_b}
                  onChange={(e) => updateMeasurementRow(dataKey, index, { measurement_b: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_c}
                  onChange={(e) => updateMeasurementRow(dataKey, index, { measurement_c: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Page 16: Cylinder Liner Bore Table (X/Y, 4 columns)
  const renderCylinderLinerBoreTable = () => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-2 text-left">Cylinder</th>
            <th className="border border-gray-300 px-2 py-2 text-left">MP</th>
            <th className="border border-gray-300 px-2 py-2 text-center">A</th>
            <th className="border border-gray-300 px-2 py-2 text-center">B</th>
            <th className="border border-gray-300 px-2 py-2 text-center">C</th>
            <th className="border border-gray-300 px-2 py-2 text-center">D</th>
          </tr>
        </thead>
        <tbody>
          {formData.cylinderLinerBoreData.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-2 py-1">{row.cylinder_no}</td>
              <td className="border border-gray-300 px-2 py-1 font-medium">{row.measuring_point}</td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_a}
                  onChange={(e) => updateMeasurementRow('cylinderLinerBoreData', index, { measurement_a: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_b}
                  onChange={(e) => updateMeasurementRow('cylinderLinerBoreData', index, { measurement_b: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_c}
                  onChange={(e) => updateMeasurementRow('cylinderLinerBoreData', index, { measurement_c: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_d}
                  onChange={(e) => updateMeasurementRow('cylinderLinerBoreData', index, { measurement_d: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Piston Ring Table (3 rings)
  const renderPistonRingTable = (
    dataKey: 'pistonRingGapData' | 'pistonRingAxialClearanceData',
    metaKey: 'pistonRingGapMeta' | 'pistonRingAxialClearanceMeta'
  ) => {
    const meta = formData[metaKey] as PistonRingMeta;
    const handleMetaChange = (field: string, value: string) => {
      const scrollY = window.scrollY;
      setFormData({ [metaKey]: { ...meta, [field]: value } } as any);
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    };
    return (
      <>
        <div className="grid grid-cols-3 md:grid-cols-9 gap-2 mb-4 bg-blue-50 p-4 rounded-lg text-xs">
          <div className="md:col-span-3">
            <div className="font-semibold text-gray-700 mb-1">1st Ring</div>
            <div className="grid grid-cols-3 gap-1">
              <input placeholder="Min" value={meta.ring_1_min} onChange={(e) => handleMetaChange('ring_1_min', e.target.value)} className="px-2 py-1 border rounded" />
              <input placeholder="Max" value={meta.ring_1_max} onChange={(e) => handleMetaChange('ring_1_max', e.target.value)} className="px-2 py-1 border rounded" />
              <input placeholder="Wear" value={meta.ring_1_wear_limit} onChange={(e) => handleMetaChange('ring_1_wear_limit', e.target.value)} className="px-2 py-1 border rounded" />
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="font-semibold text-gray-700 mb-1">2nd Ring</div>
            <div className="grid grid-cols-3 gap-1">
              <input placeholder="Min" value={meta.ring_2_min} onChange={(e) => handleMetaChange('ring_2_min', e.target.value)} className="px-2 py-1 border rounded" />
              <input placeholder="Max" value={meta.ring_2_max} onChange={(e) => handleMetaChange('ring_2_max', e.target.value)} className="px-2 py-1 border rounded" />
              <input placeholder="Wear" value={meta.ring_2_wear_limit} onChange={(e) => handleMetaChange('ring_2_wear_limit', e.target.value)} className="px-2 py-1 border rounded" />
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="font-semibold text-gray-700 mb-1">3rd Ring</div>
            <div className="grid grid-cols-3 gap-1">
              <input placeholder="Min" value={meta.ring_3_min} onChange={(e) => handleMetaChange('ring_3_min', e.target.value)} className="px-2 py-1 border rounded" />
              <input placeholder="Max" value={meta.ring_3_max} onChange={(e) => handleMetaChange('ring_3_max', e.target.value)} className="px-2 py-1 border rounded" />
              <input placeholder="Wear" value={meta.ring_3_wear_limit} onChange={(e) => handleMetaChange('ring_3_wear_limit', e.target.value)} className="px-2 py-1 border rounded" />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-2 text-left">Piston</th>
                <th className="border border-gray-300 px-2 py-2 text-center">1st Ring</th>
                <th className="border border-gray-300 px-2 py-2 text-center">2nd Ring</th>
                <th className="border border-gray-300 px-2 py-2 text-center">3rd Ring</th>
              </tr>
            </thead>
            <tbody>
              {formData[dataKey].map((row: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-2 py-1">{row.piston_no}</td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="text"
                      value={row.ring_1_value}
                      onChange={(e) => updateMeasurementRow(dataKey, index, { ring_1_value: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="text"
                      value={row.ring_2_value}
                      onChange={(e) => updateMeasurementRow(dataKey, index, { ring_2_value: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="border border-gray-300 px-1 py-1">
                    <input
                      type="text"
                      value={row.ring_3_value}
                      onChange={(e) => updateMeasurementRow(dataKey, index, { ring_3_value: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  // Valve Table (Intake/Exhaust)
  const renderValveTable = (
    dataKey: 'valveUnloadedLengthData' | 'valveRecessData'
  ) => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-2 text-left">Cylinder</th>
            <th className="border border-gray-300 px-2 py-2 text-center">Intake</th>
            <th className="border border-gray-300 px-2 py-2 text-center">Exhaust</th>
          </tr>
        </thead>
        <tbody>
          {formData[dataKey].map((row: any, index: number) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-2 py-1">{row.cylinder_no}</td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.intake_value}
                  onChange={(e) => updateMeasurementRow(dataKey, index, { intake_value: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.exhaust_value}
                  onChange={(e) => updateMeasurementRow(dataKey, index, { exhaust_value: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Piston Cylinder Head Distance Table
  const renderPistonCylinderHeadDistanceTable = () => (
    <div className="overflow-x-auto mb-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-2 text-left">Cylinder</th>
            <th className="border border-gray-300 px-2 py-2 text-center">A</th>
            <th className="border border-gray-300 px-2 py-2 text-center">B</th>
          </tr>
        </thead>
        <tbody>
          {formData.pistonCylinderHeadDistanceData.map((row, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-2 py-1">{row.cylinder_no}</td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_a}
                  onChange={(e) => updateMeasurementRow('pistonCylinderHeadDistanceData', index, { measurement_a: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
              <td className="border border-gray-300 px-1 py-1">
                <input
                  type="text"
                  value={row.measurement_b}
                  onChange={(e) => updateMeasurementRow('pistonCylinderHeadDistanceData', index, { measurement_b: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Single reading section (for Pages 21-22)
  const renderSingleReadingSection = (
    title: string,
    data: any,
    dataKey: string
  ) => {
    const handleChange = (field: string, value: string | boolean) => {
      const scrollY = window.scrollY;
      setFormData({ [dataKey]: { ...data, [field]: value } } as any);
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    };

    return (
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <h4 className="font-semibold text-gray-700 mb-3">{title}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Spec Min</label>
            <input
              type="text"
              value={data.spec_min}
              onChange={(e) => handleChange('spec_min', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Spec Max</label>
            <input
              type="text"
              value={data.spec_max}
              onChange={(e) => handleChange('spec_max', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reading Taken</label>
            <input
              type="text"
              value={data.reading_taken}
              onChange={(e) => handleChange('reading_taken', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Remarks</label>
            <input
              type="text"
              value={data.remarks}
              onChange={(e) => handleChange('remarks', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <UserAutocomplete
            label="Technician"
            value={data.technician}
            onChange={(value) => handleChange('technician', value)}
            onSelect={(user) => handleChange('technician', user.fullName)}
            users={users}
          />
          <UserAutocomplete
            label="Checked By"
            value={data.checked_by}
            onChange={(value) => handleChange('checked_by', value)}
            onSelect={(user) => handleChange('checked_by', user.fullName)}
            users={users}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white shadow-xl rounded-lg p-4 md:p-8 max-w-6xl mx-auto border border-gray-200 print:shadow-none print:border-none">
      {/* Company Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
        <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 uppercase tracking-tight font-serif">
          Power Systems, Inc.
        </h1>
        <p className="text-xs md:text-sm text-gray-600 mt-2">
          C3 Road cor Torsillo St., Dagat-dagatan, Caloocan City
        </p>
        <p className="text-xs md:text-sm text-gray-600 mt-1">
          <span className="font-bold text-gray-700">Tel No.:</span> 287.8916, 285.0923
        </p>
        <div className="mt-6">
          <h2 className="text-2xl font-black text-[#1A2F4F] uppercase inline-block px-6 py-2 border-2 border-[#1A2F4F] tracking-wider">
            Components Teardown Measuring Report
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Section */}
        <div className="border border-gray-200 rounded-lg">
          <SectionHeader title="Header Information" sectionKey="header" />
          {expandedSections.header && (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                <CustomerAutocomplete
                  label="Customer"
                  name="customer"
                  value={formData.customer}
                  onChange={handleChange}
                  onSelect={handleCustomerSelect}
                  customers={customers}
                  searchKey="name"
                  disabled
                />
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Report Date</label>
                  <input
                    type="date"
                    name="report_date"
                    value={formData.report_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Engine Model</label>
                  <input
                    type="text"
                    name="engine_model"
                    value={formData.engine_model}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Serial No.</label>
                  <input
                    type="text"
                    name="serial_no"
                    value={formData.serial_no}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <JobOrderAutocomplete
                    label="Job Order No."
                    value={formData.job_order_no}
                    onChange={(value) => setFormData({ job_order_no: value, customer: "" } as any)}
                    onSelect={(jo) => setFormData({
                      job_order_no: jo.shop_field_jo_number || "",
                      customer: jo.full_customer_name || "",
                    } as any)}
                    jobOrders={approvedJOs}
                    required
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 1: Cylinder Bore */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Cylinder Bore" sectionKey="cylinderBore" pageNum="Page 1" />
          {expandedSections.cylinderBore && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderSpecsRow(formData.cylinderBoreMeta, "cylinderBoreMeta")}
                {renderCylinderBoreTable()}
                {renderFooterRow(formData.cylinderBoreMeta, "cylinderBoreMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/cylinder_bore.png" alt="Cylinder Bore Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 2: Cylinder Liner */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Cylinder Liner" sectionKey="cylinderLiner" pageNum="Page 2" />
          {expandedSections.cylinderLiner && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderCylinderLinerTable()}
                {renderFooterRow(formData.cylinderLinerMeta, "cylinderLinerMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-200 rounded-lg p-2 border border-gray-300 shadow-sm">
                  <Image src="/images/teardown_measuring_report/cylinder_liner.png" alt="Cylinder Liner Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 3: Main Bearing Bore */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Main Bearing Bore" sectionKey="mainBearingBore" pageNum="Page 3" />
          {expandedSections.mainBearingBore && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderSpecsRow(formData.mainBearingBoreMeta, "mainBearingBoreMeta")}
                {renderAxisTable3Col('mainBearingBoreData', 'bore_no', 'Bore')}
                {renderFooterRow(formData.mainBearingBoreMeta, "mainBearingBoreMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/main_bearing_bore.png" alt="Main Bearing Bore Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 4: Camshaft Bushing */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Camshaft Bushing" sectionKey="camshaftBushing" pageNum="Page 4" />
          {expandedSections.camshaftBushing && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderSpecsRow(formData.camshaftBushingMeta, "camshaftBushingMeta")}
                {renderMeasuringPointTable2Col('camshaftBushingData', 'bush_no', 'Bush')}
                {renderFooterRow(formData.camshaftBushingMeta, "camshaftBushingMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/camshaft_bushing.png" alt="Camshaft Bushing Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 5: Main Journal */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Main Journal Diameter" sectionKey="mainJournal" pageNum="Page 5" />
          {expandedSections.mainJournal && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderSpecsRow(formData.mainJournalMeta, "mainJournalMeta", { showWearLimit: false, showMaxOvality: true })}
                {renderMeasuringPointTable2Col('mainJournalData', 'journal_no', 'Journal')}
                {renderFooterRow(formData.mainJournalMeta, "mainJournalMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/main_journal.png" alt="Main Journal Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 6: Main Journal Width */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Main Journal Width (Thrust Bearing)" sectionKey="mainJournalWidth" pageNum="Page 6" />
          {expandedSections.mainJournalWidth && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderSpecsRow(formData.mainJournalWidthMeta, "mainJournalWidthMeta", { showWearLimit: false, showOversizeLimit: true })}
                {renderMainJournalWidthTable()}
                {renderFooterRow(formData.mainJournalWidthMeta, "mainJournalWidthMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/main_journal_width.png" alt="Main Journal Width Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 7: Con Rod Journal */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Con Rod Journal Diameter" sectionKey="conRodJournal" pageNum="Page 7" />
          {expandedSections.conRodJournal && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderSpecsRow(formData.conRodJournalMeta, "conRodJournalMeta", { showWearLimit: false, showOversizeLimit: true })}
                {renderAxisTable3Col('conRodJournalData', 'journal_no', 'Journal')}
                {renderFooterRow(formData.conRodJournalMeta, "conRodJournalMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/con_rod_journal.png" alt="Con Rod Journal Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 8: Crankshaft True Running */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Crankshaft True Running (Straightness)" sectionKey="crankshaftTrueRunning" pageNum="Page 8" />
          {expandedSections.crankshaftTrueRunning && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderCrankshaftTrueRunningTable()}
                {renderFooterRow(formData.crankshaftTrueRunningMeta, "crankshaftTrueRunningMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/CRANKSHAFT TRUE RUNNING.png" alt="Crankshaft True Running Diagram" width={300} height={300} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 9: Small End Bush */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Small End Bush" sectionKey="smallEndBush" pageNum="Page 9" />
          {expandedSections.smallEndBush && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderSpecsRow(formData.smallEndBushMeta, "smallEndBushMeta")}
                {renderMeasuringPointTable2Col('smallEndBushData', 'con_rod_arm_no', 'Con Rod Arm', 'datum')}
                {renderFooterRow(formData.smallEndBushMeta, "smallEndBushMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/small_end_bush.png" alt="Small End Bush Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 10: Big End Bearing */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Big End Bearing" sectionKey="bigEndBearing" pageNum="Page 10" />
          {expandedSections.bigEndBearing && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderSpecsRow(formData.bigEndBearingMeta, "bigEndBearingMeta")}
                {renderMeasuringPointTable2Col('bigEndBearingData', 'con_rod_arm_no', 'Con Rod Arm')}
                {renderFooterRow(formData.bigEndBearingMeta, "bigEndBearingMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/big_end_bearing.png" alt="Big End Bearing Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 11: Connecting Rod Arm */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Connecting Rod Arm" sectionKey="connectingRodArm" pageNum="Page 11" />
          {expandedSections.connectingRodArm && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderSpecsRow(formData.connectingRodArmMeta, "connectingRodArmMeta")}
                {renderConnectingRodArmTable()}
                {renderFooterRow(formData.connectingRodArmMeta, "connectingRodArmMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/CONNECTING ROD & PISTON GROUP.png" alt="Connecting Rod & Piston Group Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 12: Piston Pin Bush Clearance */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Piston Pin Bush Radial Clearance" sectionKey="pistonPinBushClearance" pageNum="Page 12" />
          {expandedSections.pistonPinBushClearance && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderSpecsRow(formData.pistonPinBushClearanceMeta, "pistonPinBushClearanceMeta")}
                {renderXYTable3Col('pistonPinBushClearanceData', 'conrod_arm_no', 'Conrod Arm')}
                {renderFooterRow(formData.pistonPinBushClearanceMeta, "pistonPinBushClearanceMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/PSITON PIN BUSH RADIAL CLEARANCE.png" alt="Piston Pin Bush Radial Clearance Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 13: Camshaft Journal Diameter */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Camshaft Journal Diameter" sectionKey="camshaftJournalDiameter" pageNum="Page 13" />
          {expandedSections.camshaftJournalDiameter && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderSpecsRow(formData.camshaftJournalDiameterMeta, "camshaftJournalDiameterMeta")}
                {renderXYTable3Col('camshaftJournalDiameterData', 'journal_no', 'Journal')}
                {renderFooterRow(formData.camshaftJournalDiameterMeta, "camshaftJournalDiameterMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/CAMSHAFT JOURNAL DIAMETER.png" alt="Camshaft Journal Diameter Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 14: Camshaft Bush Clearance */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Camshaft Bush Radial Clearance" sectionKey="camshaftBushClearance" pageNum="Page 14" />
          {expandedSections.camshaftBushClearance && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderSpecsRow(formData.camshaftBushClearanceMeta, "camshaftBushClearanceMeta")}
                {renderXYTable3Col('camshaftBushClearanceData', 'journal_no', 'Journal')}
                {renderFooterRow(formData.camshaftBushClearanceMeta, "camshaftBushClearanceMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/CAMSHAFT BUSH RADIAL CLEARANCE.png" alt="Camshaft Bush Radial Clearance Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 15: Camlobe Height */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Camlobe Height" sectionKey="camlobeHeight" pageNum="Page 15" />
          {expandedSections.camlobeHeight && (
            <>
              {renderSpecsRow(formData.camlobeHeightMeta, "camlobeHeightMeta")}
              {renderXYTable3Col('camlobeHeightData', 'journal_no', 'Journal')}
              {renderFooterRow(formData.camlobeHeightMeta, "camlobeHeightMeta")}
            </>
          )}
        </div>

        {/* Page 16: Cylinder Liner Bore */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Cylinder Liner Bore" sectionKey="cylinderLinerBore" pageNum="Page 16" />
          {expandedSections.cylinderLinerBore && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderSpecsRow(formData.cylinderLinerBoreMeta, "cylinderLinerBoreMeta")}
                {renderCylinderLinerBoreTable()}
                {renderFooterRow(formData.cylinderLinerBoreMeta, "cylinderLinerBoreMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/CYLINDER LINER BORE.png" alt="Cylinder Liner Bore Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 17: Piston Ring Gap */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Piston Ring Gap" sectionKey="pistonRingGap" pageNum="Page 17" />
          {expandedSections.pistonRingGap && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderPistonRingTable('pistonRingGapData', 'pistonRingGapMeta')}
                {renderFooterRow(formData.pistonRingGapMeta, "pistonRingGapMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/PISTON RING GAP.png" alt="Piston Ring Gap Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 18: Piston Ring Axial Clearance */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Piston Ring Axial Clearance" sectionKey="pistonRingAxialClearance" pageNum="Page 18" />
          {expandedSections.pistonRingAxialClearance && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                {renderPistonRingTable('pistonRingAxialClearanceData', 'pistonRingAxialClearanceMeta')}
                {renderFooterRow(formData.pistonRingAxialClearanceMeta, "pistonRingAxialClearanceMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/PISTON RING AXIAL CLEARANCE.png" alt="Piston Ring Axial Clearance Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 19: Valve Unloaded Length */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Valve Spring Unloaded Length" sectionKey="valveUnloadedLength" pageNum="Page 19" />
          {expandedSections.valveUnloadedLength && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-blue-50 p-4 rounded-lg">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Spring (No Rotator) - Intake</label>
                  <input
                    type="text"
                    value={formData.valveUnloadedLengthMeta.spring_no_rotator_intake}
                    onChange={(e) => setFormData({ valveUnloadedLengthMeta: { ...formData.valveUnloadedLengthMeta, spring_no_rotator_intake: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Spring (No Rotator) - Exhaust</label>
                  <input
                    type="text"
                    value={formData.valveUnloadedLengthMeta.spring_no_rotator_exhaust}
                    onChange={(e) => setFormData({ valveUnloadedLengthMeta: { ...formData.valveUnloadedLengthMeta, spring_no_rotator_exhaust: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Spring (With Rotator) - Intake</label>
                  <input
                    type="text"
                    value={formData.valveUnloadedLengthMeta.spring_with_rotator_intake}
                    onChange={(e) => setFormData({ valveUnloadedLengthMeta: { ...formData.valveUnloadedLengthMeta, spring_with_rotator_intake: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Spring (With Rotator) - Exhaust</label>
                  <input
                    type="text"
                    value={formData.valveUnloadedLengthMeta.spring_with_rotator_exhaust}
                    onChange={(e) => setFormData({ valveUnloadedLengthMeta: { ...formData.valveUnloadedLengthMeta, spring_with_rotator_exhaust: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              {renderValveTable('valveUnloadedLengthData')}
              {renderFooterRow(formData.valveUnloadedLengthMeta, "valveUnloadedLengthMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/VALVE UNLOADED LENGTH.png" alt="Valve Unloaded Length Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page 20: Valve Recess */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Valve Depth from Head Surface (Recess)" sectionKey="valveRecess" pageNum="Page 20" />
          {expandedSections.valveRecess && (
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 bg-blue-50 p-4 rounded-lg">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Intake Min</label>
                  <input
                    type="text"
                    value={formData.valveRecessMeta.intake_min}
                    onChange={(e) => setFormData({ valveRecessMeta: { ...formData.valveRecessMeta, intake_min: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Intake Max</label>
                  <input
                    type="text"
                    value={formData.valveRecessMeta.intake_max}
                    onChange={(e) => setFormData({ valveRecessMeta: { ...formData.valveRecessMeta, intake_max: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Exhaust Min</label>
                  <input
                    type="text"
                    value={formData.valveRecessMeta.exhaust_min}
                    onChange={(e) => setFormData({ valveRecessMeta: { ...formData.valveRecessMeta, exhaust_min: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Exhaust Max</label>
                  <input
                    type="text"
                    value={formData.valveRecessMeta.exhaust_max}
                    onChange={(e) => setFormData({ valveRecessMeta: { ...formData.valveRecessMeta, exhaust_max: e.target.value } })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              {renderValveTable('valveRecessData')}
              {renderFooterRow(formData.valveRecessMeta, "valveRecessMeta")}
              </div>
              <div className="lg:w-80 flex-shrink-0">
                <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <Image src="/images/teardown_measuring_report/VALVE DEPTH FROM HEAD SURFACE (VALVE RECESS).png" alt="Valve Recess Diagram" width={300} height={200} className="w-full h-auto object-contain" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pages 21-24: Miscellaneous */}
        <div className="border border-gray-200 rounded-lg p-4">
          <SectionHeader title="Miscellaneous Measurements (Pages 21-24)" sectionKey="miscellaneous" />
          {expandedSections.miscellaneous && (
            <>
              {/* Page 21: Crankshaft End Clearance */}
              <div className="flex flex-col lg:flex-row gap-4 mb-4">
                <div className="flex-1">
                  {renderSingleReadingSection('Crankshaft End Clearance', formData.crankshaftEndClearance, 'crankshaftEndClearance')}
                </div>
                <div className="lg:w-64 flex-shrink-0">
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <Image src="/images/teardown_measuring_report/CRANKSHAFT END CLEARANCE.png" alt="Crankshaft End Clearance Diagram" width={250} height={150} className="w-full h-auto object-contain" />
                  </div>
                </div>
              </div>

              {/* Page 21: Lube Oil Pump Backlash */}
              {renderSingleReadingSection('Lube Oil Pump Gear Backlash', formData.lubeOilPumpBacklash, 'lubeOilPumpBacklash')}

              {/* Page 22: Camshaft End Clearance */}
              <div className="flex flex-col lg:flex-row gap-4 mb-4">
                <div className="flex-1">
                  {renderSingleReadingSection('Camshaft End Clearance', formData.camshaftEndClearance, 'camshaftEndClearance')}
                </div>
                <div className="lg:w-64 flex-shrink-0">
                  <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <Image src="/images/teardown_measuring_report/CAMSHAFT END CLEARANCE.png" alt="Camshaft End Clearance Diagram" width={250} height={150} className="w-full h-auto object-contain" />
                  </div>
                </div>
              </div>

              {/* Page 22: Cylinder Head Cap Screw */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-700 mb-3">Cylinder Head Cap Screw Free Length</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Spec Min</label>
                    <input
                      type="text"
                      value={formData.cylinderHeadCapScrew.spec_min}
                      onChange={(e) => setFormData({ cylinderHeadCapScrew: { ...formData.cylinderHeadCapScrew, spec_min: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Spec Max</label>
                    <input
                      type="text"
                      value={formData.cylinderHeadCapScrew.spec_max}
                      onChange={(e) => setFormData({ cylinderHeadCapScrew: { ...formData.cylinderHeadCapScrew, spec_max: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Total Count</label>
                    <input
                      type="text"
                      value={formData.cylinderHeadCapScrew.total_count}
                      onChange={(e) => setFormData({ cylinderHeadCapScrew: { ...formData.cylinderHeadCapScrew, total_count: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">OK Count</label>
                    <input
                      type="text"
                      value={formData.cylinderHeadCapScrew.ok_count}
                      onChange={(e) => setFormData({ cylinderHeadCapScrew: { ...formData.cylinderHeadCapScrew, ok_count: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Not OK Count</label>
                    <input
                      type="text"
                      value={formData.cylinderHeadCapScrew.not_ok_count}
                      onChange={(e) => setFormData({ cylinderHeadCapScrew: { ...formData.cylinderHeadCapScrew, not_ok_count: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                {renderFooterRow(formData.cylinderHeadCapScrew, "cylinderHeadCapScrew")}
              </div>

              {/* Page 22-23: Valve Clearance Setting */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-700 mb-3">Valve Clearance Setting</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Intake Standard</label>
                    <input
                      type="text"
                      value={formData.valveClearanceSetting.intake_standard}
                      onChange={(e) => setFormData({ valveClearanceSetting: { ...formData.valveClearanceSetting, intake_standard: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Intake Setting</label>
                    <input
                      type="text"
                      value={formData.valveClearanceSetting.intake_setting}
                      onChange={(e) => setFormData({ valveClearanceSetting: { ...formData.valveClearanceSetting, intake_setting: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Exhaust Standard</label>
                    <input
                      type="text"
                      value={formData.valveClearanceSetting.exhaust_standard}
                      onChange={(e) => setFormData({ valveClearanceSetting: { ...formData.valveClearanceSetting, exhaust_standard: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Exhaust Setting</label>
                    <input
                      type="text"
                      value={formData.valveClearanceSetting.exhaust_setting}
                      onChange={(e) => setFormData({ valveClearanceSetting: { ...formData.valveClearanceSetting, exhaust_setting: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                {renderFooterRow(formData.valveClearanceSetting, "valveClearanceSetting")}
              </div>

              {/* Page 23: Piston Cylinder Head Distance */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-700 mb-3">Distance Between Piston and Cylinder Head</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Spec Min</label>
                    <input
                      type="text"
                      value={formData.pistonCylinderHeadDistanceMeta.spec_min}
                      onChange={(e) => setFormData({ pistonCylinderHeadDistanceMeta: { ...formData.pistonCylinderHeadDistanceMeta, spec_min: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Spec Max</label>
                    <input
                      type="text"
                      value={formData.pistonCylinderHeadDistanceMeta.spec_max}
                      onChange={(e) => setFormData({ pistonCylinderHeadDistanceMeta: { ...formData.pistonCylinderHeadDistanceMeta, spec_max: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
                {renderPistonCylinderHeadDistanceTable()}
                {renderFooterRow(formData.pistonCylinderHeadDistanceMeta, "pistonCylinderHeadDistanceMeta")}
              </div>

              {/* Page 24: Injection Pump */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-700 mb-3">Injection Pump</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Timing</label>
                    <input
                      type="text"
                      value={formData.injectionPump.timing}
                      onChange={(e) => setFormData({ injectionPump: { ...formData.injectionPump, timing: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-4 col-span-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.injectionPump.is_brand_new}
                        onChange={(e) => setFormData({ injectionPump: { ...formData.injectionPump, is_brand_new: e.target.checked } })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Brand New</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.injectionPump.is_calibrated}
                        onChange={(e) => setFormData({ injectionPump: { ...formData.injectionPump, is_calibrated: e.target.checked } })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Calibrated</span>
                    </label>
                  </div>
                </div>
                {renderFooterRow(formData.injectionPump, "injectionPump")}
              </div>

              {/* Page 24: Injectors */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-700 mb-3">Injectors</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Opening Pressure</label>
                    <input
                      type="text"
                      value={formData.injectors.opening_pressure}
                      onChange={(e) => setFormData({ injectors: { ...formData.injectors, opening_pressure: e.target.value } })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-4 col-span-3 flex-wrap gap-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.injectors.is_brand_new}
                        onChange={(e) => setFormData({ injectors: { ...formData.injectors, is_brand_new: e.target.checked } })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Brand New</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.injectors.is_readjusted}
                        onChange={(e) => setFormData({ injectors: { ...formData.injectors, is_readjusted: e.target.checked } })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Readjusted</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.injectors.is_replace_nozzle_tip}
                        onChange={(e) => setFormData({ injectors: { ...formData.injectors, is_replace_nozzle_tip: e.target.checked } })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Replace Nozzle Tip</span>
                    </label>
                  </div>
                </div>
                {renderFooterRow(formData.injectors, "injectors")}
              </div>

              {/* Page 24: Air Cooling Blower */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-semibold text-gray-700 mb-3">Air Cooling Blower</h4>
                <div className="flex items-center space-x-4 flex-wrap gap-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.airCoolingBlower.is_new_ball_bearing}
                      onChange={(e) => setFormData({ airCoolingBlower: { ...formData.airCoolingBlower, is_new_ball_bearing: e.target.checked } })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">New Ball Bearing</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.airCoolingBlower.is_repacked_grease}
                      onChange={(e) => setFormData({ airCoolingBlower: { ...formData.airCoolingBlower, is_repacked_grease: e.target.checked } })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Repacked Grease</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.airCoolingBlower.is_mechanical_blower}
                      onChange={(e) => setFormData({ airCoolingBlower: { ...formData.airCoolingBlower, is_mechanical_blower: e.target.checked } })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Mechanical Blower</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.airCoolingBlower.is_hydraulic_blower}
                      onChange={(e) => setFormData({ airCoolingBlower: { ...formData.airCoolingBlower, is_hydraulic_blower: e.target.checked } })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">Hydraulic Blower</span>
                  </label>
                </div>
                {renderFooterRow(formData.airCoolingBlower, "airCoolingBlower")}
              </div>
            </>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => { resetFormData(); }}
            className="px-6 py-3 bg-white text-gray-700 font-bold rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={isModalOpen}
        title="Submit Components Teardown Measuring Report"
        message="Are you sure you want to submit this Components Teardown Measuring Report? Please make sure all information is correct."
        onConfirm={handleConfirmSubmit}
        onClose={() => setIsModalOpen(false)}
        confirmText="Submit"
        type="info"
      />
    </div>
  );
}

// CustomerAutocomplete component for searchable/typeable customer dropdown
interface CustomerAutocompleteProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSelect: (customer: any) => void;
  customers: any[];
  searchKey?: string;
  disabled?: boolean;
}

const CustomerAutocomplete = ({ label, name, value, onChange, onSelect, customers, searchKey = "name", disabled = false }: CustomerAutocompleteProps) => {
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

  const handleSelectCustomer = (customer: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const scrollY = window.scrollY;
    onSelect(customer);
    setShowDropdown(false);
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const scrollY = window.scrollY;
    onChange(e);
    setShowDropdown(true);
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  };

  const handleToggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const scrollY = window.scrollY;
    setShowDropdown(!showDropdown);
    inputRef.current?.focus();
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  };

  const filteredCustomers = customers.filter((c) =>
    (c[searchKey] || "").toLowerCase().includes((value || "").toLowerCase())
  ).sort((a, b) => (a[searchKey] || "").localeCompare(b[searchKey] || ""));

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={value}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => { if (!disabled) setShowDropdown(true); }}
          className={`w-full px-4 py-2.5 pr-10 border rounded-lg transition ${disabled ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed" : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"}`}
          placeholder={`Enter ${label.toLowerCase()}`}
          autoComplete="off"
        />
        {!disabled && (
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={handleToggleDropdown}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <ChevronDownIcon className={`h-5 w-5 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
        )}
        {!disabled && showDropdown && filteredCustomers.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onMouseDown={(e) => handleSelectCustomer(customer, e)}
                className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm text-gray-900 border-b last:border-b-0 border-gray-100"
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

// UserAutocomplete component for searchable/typeable user dropdown (Technician, Checked By)
interface UserAutocompleteProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (user: { id: string; fullName: string }) => void;
  users: Array<{ id: string; fullName: string }>;
}

const UserAutocomplete = ({ label, value, onChange, onSelect, users }: UserAutocompleteProps) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
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

  const handleSelectUser = (user: { id: string; fullName: string }, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const scrollY = window.scrollY;
    onSelect(user);
    setShowDropdown(false);
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const scrollY = window.scrollY;
    onChange(e.target.value);
    setShowDropdown(true);
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  };

  const handleFocus = () => {
    setIsFocused(true);
    setShowDropdown(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleToggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const scrollY = window.scrollY;
    setShowDropdown(!showDropdown);
    inputRef.current?.focus();
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  };

  const filteredUsers = users.filter((u) =>
    (u.fullName || "").toLowerCase().includes((value || "").toLowerCase())
  );

  return (
    <div className="flex flex-col w-full" ref={dropdownRef}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value || ''}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={`Enter ${label.toLowerCase()}`}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={handleToggleDropdown}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>
        {showDropdown && filteredUsers.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onMouseDown={(e) => handleSelectUser(user, e)}
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
