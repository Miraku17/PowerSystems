import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================
// INTERFACES FOR MEASUREMENT DATA
// =============================================================

// Generic measurement section with specs and footer
export interface MeasurementSectionMeta {
  spec_min: string;
  spec_max: string;
  spec_wear_limit?: string;
  spec_oversize_limit?: string;
  spec_max_ovality?: string;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 1: Cylinder Bore Data
export interface CylinderBoreRow {
  bank: 'A' | 'B';
  cylinder_no: number;
  data_point: 'a' | 'b';
  measurement_1: string;
  measurement_2: string;
  measurement_3: string;
}

// Page 2: Cylinder Liner Data
export interface CylinderLinerRow {
  section: 'seating' | 'collar';
  cylinder_no: number;
  measurement_a: string;
  measurement_b: string;
  measurement_c: string;
  measurement_d: string;
}

export interface CylinderLinerMeta {
  liner_seating_min: string;
  liner_seating_max: string;
  liner_collar_min: string;
  liner_collar_max: string;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 3: Main Bearing Bore Data
export interface MainBearingBoreRow {
  bore_no: number;
  axis: 'X' | 'Y';
  measurement_a: string;
  measurement_b: string;
  measurement_c: string;
}

// Page 4: Camshaft Bushing Data
export interface CamshaftBushingRow {
  bush_no: number;
  measuring_point: number;
  measurement_a: string;
  measurement_b: string;
}

// Page 5: Main Journal Data
export interface MainJournalRow {
  journal_no: number;
  measuring_point: number;
  measurement_a: string;
  measurement_b: string;
}

// Page 6: Main Journal Width Data
export interface MainJournalWidthRow {
  journal_no: number;
  measurement_a: string;
  measurement_b: string;
  measurement_c: string;
  measurement_d: string;
}

// Page 7: Con Rod Journal Data
export interface ConRodJournalRow {
  journal_no: number;
  axis: 'X' | 'Y';
  measurement_a: string;
  measurement_b: string;
  measurement_c: string;
}

// Page 8: Crankshaft True Running Data
export interface CrankshaftTrueRunningRow {
  journal_no: number;
  measured_value: string;
}

export interface CrankshaftTrueRunningMeta {
  wear_limit_4_cylinder: string;
  wear_limit_6_cylinder: string;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 9: Small End Bush Data
export interface SmallEndBushRow {
  con_rod_arm_no: number;
  datum: number;
  measurement_a: string;
  measurement_b: string;
}

// Page 10: Big End Bearing Data
export interface BigEndBearingRow {
  con_rod_arm_no: number;
  measuring_point: number;
  measurement_a: string;
  measurement_b: string;
}

// Page 11: Connecting Rod Arm Data
export interface ConnectingRodArmRow {
  arm_no: number;
  bank: 'A' | 'B';
  measurement: string;
}

// Page 12: Piston Pin Bush Clearance Data
export interface PistonPinBushClearanceRow {
  conrod_arm_no: number;
  measuring_point: 'X' | 'Y';
  measurement_a: string;
  measurement_b: string;
  measurement_c: string;
}

// Page 13: Camshaft Journal Diameter Data
export interface CamshaftJournalDiameterRow {
  journal_no: number;
  measuring_point: 'X' | 'Y';
  measurement_a: string;
  measurement_b: string;
  measurement_c: string;
}

// Page 14: Camshaft Bush Clearance Data
export interface CamshaftBushClearanceRow {
  journal_no: number;
  measuring_point: 'X' | 'Y';
  measurement_a: string;
  measurement_b: string;
  measurement_c: string;
}

// Page 15: Camlobe Height Data
export interface CamlobeHeightRow {
  journal_no: number;
  measuring_point: 'X' | 'Y';
  measurement_a: string;
  measurement_b: string;
  measurement_c: string;
}

// Page 16: Cylinder Liner Bore Data
export interface CylinderLinerBoreRow {
  cylinder_no: number;
  measuring_point: 'X' | 'Y';
  measurement_a: string;
  measurement_b: string;
  measurement_c: string;
  measurement_d: string;
}

// Page 17: Piston Ring Gap Data
export interface PistonRingGapRow {
  piston_no: number;
  ring_1_value: string;
  ring_2_value: string;
  ring_3_value: string;
}

export interface PistonRingMeta {
  ring_1_min: string;
  ring_1_max: string;
  ring_1_wear_limit: string;
  ring_2_min: string;
  ring_2_max: string;
  ring_2_wear_limit: string;
  ring_3_min: string;
  ring_3_max: string;
  ring_3_wear_limit: string;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 18: Piston Ring Axial Clearance Data (same structure as ring gap)
export interface PistonRingAxialClearanceRow {
  piston_no: number;
  ring_1_value: string;
  ring_2_value: string;
  ring_3_value: string;
}

// Page 19: Valve Unloaded Length Data
export interface ValveUnloadedLengthRow {
  cylinder_no: number;
  intake_value: string;
  exhaust_value: string;
}

export interface ValveUnloadedLengthMeta {
  spring_no_rotator_intake: string;
  spring_no_rotator_exhaust: string;
  spring_with_rotator_intake: string;
  spring_with_rotator_exhaust: string;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 20: Valve Recess Data
export interface ValveRecessRow {
  cylinder_no: number;
  intake_value: string;
  exhaust_value: string;
}

export interface ValveRecessMeta {
  intake_min: string;
  intake_max: string;
  exhaust_min: string;
  exhaust_max: string;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 21: Crankshaft End Clearance
export interface CrankshaftEndClearanceData {
  spec_min: string;
  spec_max: string;
  reading_taken: string;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 21: Lube Oil Pump Backlash
export interface LubeOilPumpBacklashData {
  spec_min: string;
  spec_max: string;
  reading_taken: string;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 22: Camshaft End Clearance
export interface CamshaftEndClearanceData {
  spec_min: string;
  spec_max: string;
  reading_taken: string;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 22: Cylinder Head Cap Screw
export interface CylinderHeadCapScrewData {
  spec_min: string;
  spec_max: string;
  total_count: string;
  ok_count: string;
  not_ok_count: string;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 22-23: Valve Clearance Setting
export interface ValveClearanceSettingData {
  intake_standard: string;
  intake_setting: string;
  exhaust_standard: string;
  exhaust_setting: string;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 23: Piston Cylinder Head Distance Data
export interface PistonCylinderHeadDistanceRow {
  cylinder_no: number;
  measurement_a: string;
  measurement_b: string;
}

export interface PistonCylinderHeadDistanceMeta {
  spec_min: string;
  spec_max: string;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 24: Injection Pump
export interface InjectionPumpData {
  timing: string;
  is_brand_new: boolean;
  is_calibrated: boolean;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 24: Injectors
export interface InjectorsData {
  opening_pressure: string;
  is_brand_new: boolean;
  is_readjusted: boolean;
  is_replace_nozzle_tip: boolean;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// Page 24: Air Cooling Blower
export interface AirCoolingBlowerData {
  is_new_ball_bearing: boolean;
  is_repacked_grease: boolean;
  is_mechanical_blower: boolean;
  is_hydraulic_blower: boolean;
  remarks: string;
  technician: string;
  tool_no: string;
  checked_by: string;
}

// =============================================================
// MAIN FORM DATA INTERFACE
// =============================================================

export interface ComponentsTeardownMeasuringFormData {
  // Header
  customer: string;
  report_date: string;
  engine_model: string;
  serial_no: string;
  job_order_no: string;

  // Page 1: Cylinder Bore
  cylinderBoreMeta: MeasurementSectionMeta;
  cylinderBoreData: CylinderBoreRow[];

  // Page 2: Cylinder Liner
  cylinderLinerMeta: CylinderLinerMeta;
  cylinderLinerData: CylinderLinerRow[];

  // Page 3: Main Bearing Bore
  mainBearingBoreMeta: MeasurementSectionMeta;
  mainBearingBoreData: MainBearingBoreRow[];

  // Page 4: Camshaft Bushing
  camshaftBushingMeta: MeasurementSectionMeta;
  camshaftBushingData: CamshaftBushingRow[];

  // Page 5: Main Journal
  mainJournalMeta: MeasurementSectionMeta;
  mainJournalData: MainJournalRow[];

  // Page 6: Main Journal Width
  mainJournalWidthMeta: MeasurementSectionMeta;
  mainJournalWidthData: MainJournalWidthRow[];

  // Page 7: Con Rod Journal
  conRodJournalMeta: MeasurementSectionMeta;
  conRodJournalData: ConRodJournalRow[];

  // Page 8: Crankshaft True Running
  crankshaftTrueRunningMeta: CrankshaftTrueRunningMeta;
  crankshaftTrueRunningData: CrankshaftTrueRunningRow[];

  // Page 9: Small End Bush
  smallEndBushMeta: MeasurementSectionMeta;
  smallEndBushData: SmallEndBushRow[];

  // Page 10: Big End Bearing
  bigEndBearingMeta: MeasurementSectionMeta;
  bigEndBearingData: BigEndBearingRow[];

  // Page 11: Connecting Rod Arm
  connectingRodArmMeta: MeasurementSectionMeta;
  connectingRodArmData: ConnectingRodArmRow[];

  // Page 12: Piston Pin Bush Clearance
  pistonPinBushClearanceMeta: MeasurementSectionMeta;
  pistonPinBushClearanceData: PistonPinBushClearanceRow[];

  // Page 13: Camshaft Journal Diameter
  camshaftJournalDiameterMeta: MeasurementSectionMeta;
  camshaftJournalDiameterData: CamshaftJournalDiameterRow[];

  // Page 14: Camshaft Bush Clearance
  camshaftBushClearanceMeta: MeasurementSectionMeta;
  camshaftBushClearanceData: CamshaftBushClearanceRow[];

  // Page 15: Camlobe Height
  camlobeHeightMeta: MeasurementSectionMeta;
  camlobeHeightData: CamlobeHeightRow[];

  // Page 16: Cylinder Liner Bore
  cylinderLinerBoreMeta: MeasurementSectionMeta;
  cylinderLinerBoreData: CylinderLinerBoreRow[];

  // Page 17: Piston Ring Gap
  pistonRingGapMeta: PistonRingMeta;
  pistonRingGapData: PistonRingGapRow[];

  // Page 18: Piston Ring Axial Clearance
  pistonRingAxialClearanceMeta: PistonRingMeta;
  pistonRingAxialClearanceData: PistonRingAxialClearanceRow[];

  // Page 19: Valve Unloaded Length
  valveUnloadedLengthMeta: ValveUnloadedLengthMeta;
  valveUnloadedLengthData: ValveUnloadedLengthRow[];

  // Page 20: Valve Recess
  valveRecessMeta: ValveRecessMeta;
  valveRecessData: ValveRecessRow[];

  // Page 21: Crankshaft End Clearance
  crankshaftEndClearance: CrankshaftEndClearanceData;

  // Page 21: Lube Oil Pump Backlash
  lubeOilPumpBacklash: LubeOilPumpBacklashData;

  // Page 22: Camshaft End Clearance
  camshaftEndClearance: CamshaftEndClearanceData;

  // Page 22: Cylinder Head Cap Screw
  cylinderHeadCapScrew: CylinderHeadCapScrewData;

  // Page 22-23: Valve Clearance Setting
  valveClearanceSetting: ValveClearanceSettingData;

  // Page 23: Piston Cylinder Head Distance
  pistonCylinderHeadDistanceMeta: PistonCylinderHeadDistanceMeta;
  pistonCylinderHeadDistanceData: PistonCylinderHeadDistanceRow[];

  // Page 24: Injection Pump
  injectionPump: InjectionPumpData;

  // Page 24: Injectors
  injectors: InjectorsData;

  // Page 24: Air Cooling Blower
  airCoolingBlower: AirCoolingBlowerData;
}

// =============================================================
// HELPER FUNCTIONS TO BUILD INITIAL DATA
// =============================================================

// Base meta without any special spec field - just the common fields
const createBaseMeta = () => ({
  spec_min: '',
  spec_max: '',
  remarks: '',
  technician: '',
  tool_no: '',
  checked_by: '',
});

// Meta with spec_wear_limit for tables that have it
const createEmptyMeta = (): MeasurementSectionMeta => ({
  ...createBaseMeta(),
  spec_wear_limit: '',
});

// Meta with spec_oversize_limit for main_journal_width and con_rod_journal tables
const createMetaWithOversizeLimit = () => ({
  ...createBaseMeta(),
  spec_oversize_limit: '',
});

// Meta with spec_max_ovality for main_journal table
const createMetaWithMaxOvality = () => ({
  ...createBaseMeta(),
  spec_max_ovality: '',
});

// Page 1: Build Cylinder Bore rows (A/B Bank, CYL 1-6, data points a/b)
const buildCylinderBoreData = (): CylinderBoreRow[] => {
  const rows: CylinderBoreRow[] = [];
  const banks: Array<'A' | 'B'> = ['A', 'B'];
  const dataPoints: Array<'a' | 'b'> = ['a', 'b'];

  for (const bank of banks) {
    for (let cyl = 1; cyl <= 6; cyl++) {
      for (const dp of dataPoints) {
        rows.push({
          bank,
          cylinder_no: cyl,
          data_point: dp,
          measurement_1: '',
          measurement_2: '',
          measurement_3: '',
        });
      }
    }
  }
  return rows;
};

// Page 2: Build Cylinder Liner rows (seating/collar, CYL 1-12)
const buildCylinderLinerData = (): CylinderLinerRow[] => {
  const rows: CylinderLinerRow[] = [];
  const sections: Array<'seating' | 'collar'> = ['seating', 'collar'];

  for (const section of sections) {
    for (let cyl = 1; cyl <= 12; cyl++) {
      rows.push({
        section,
        cylinder_no: cyl,
        measurement_a: '',
        measurement_b: '',
        measurement_c: '',
        measurement_d: '',
      });
    }
  }
  return rows;
};

// Page 3: Build Main Bearing Bore rows (Bore 1-6, Axis X/Y)
const buildMainBearingBoreData = (): MainBearingBoreRow[] => {
  const rows: MainBearingBoreRow[] = [];
  const axes: Array<'X' | 'Y'> = ['X', 'Y'];

  for (let bore = 1; bore <= 6; bore++) {
    for (const axis of axes) {
      rows.push({
        bore_no: bore,
        axis,
        measurement_a: '',
        measurement_b: '',
        measurement_c: '',
      });
    }
  }
  return rows;
};

// Page 4: Build Camshaft Bushing rows (Bush 1-6, Measuring Point 1/2)
const buildCamshaftBushingData = (): CamshaftBushingRow[] => {
  const rows: CamshaftBushingRow[] = [];

  for (let bush = 1; bush <= 6; bush++) {
    for (let mp = 1; mp <= 2; mp++) {
      rows.push({
        bush_no: bush,
        measuring_point: mp,
        measurement_a: '',
        measurement_b: '',
      });
    }
  }
  return rows;
};

// Page 5: Build Main Journal rows (Journal 1-6, Measuring Point 1/2)
const buildMainJournalData = (): MainJournalRow[] => {
  const rows: MainJournalRow[] = [];

  for (let j = 1; j <= 6; j++) {
    for (let mp = 1; mp <= 2; mp++) {
      rows.push({
        journal_no: j,
        measuring_point: mp,
        measurement_a: '',
        measurement_b: '',
      });
    }
  }
  return rows;
};

// Page 6: Build Main Journal Width rows (Journal 1-6)
const buildMainJournalWidthData = (): MainJournalWidthRow[] => {
  const rows: MainJournalWidthRow[] = [];

  for (let j = 1; j <= 6; j++) {
    rows.push({
      journal_no: j,
      measurement_a: '',
      measurement_b: '',
      measurement_c: '',
      measurement_d: '',
    });
  }
  return rows;
};

// Page 7: Build Con Rod Journal rows (Journal 1-5, Axis X/Y)
const buildConRodJournalData = (): ConRodJournalRow[] => {
  const rows: ConRodJournalRow[] = [];
  const axes: Array<'X' | 'Y'> = ['X', 'Y'];

  for (let j = 1; j <= 5; j++) {
    for (const axis of axes) {
      rows.push({
        journal_no: j,
        axis,
        measurement_a: '',
        measurement_b: '',
        measurement_c: '',
      });
    }
  }
  return rows;
};

// Page 8: Build Crankshaft True Running rows (Journal 1-6)
const buildCrankshaftTrueRunningData = (): CrankshaftTrueRunningRow[] => {
  const rows: CrankshaftTrueRunningRow[] = [];

  for (let j = 1; j <= 6; j++) {
    rows.push({
      journal_no: j,
      measured_value: '',
    });
  }
  return rows;
};

// Page 9: Build Small End Bush rows (Con rod Arm 1-8, Datum 1/2)
const buildSmallEndBushData = (): SmallEndBushRow[] => {
  const rows: SmallEndBushRow[] = [];

  for (let arm = 1; arm <= 8; arm++) {
    for (let datum = 1; datum <= 2; datum++) {
      rows.push({
        con_rod_arm_no: arm,
        datum,
        measurement_a: '',
        measurement_b: '',
      });
    }
  }
  return rows;
};

// Page 10: Build Big End Bearing rows (Con rod Arm 1-8, Measuring Point 1/2)
const buildBigEndBearingData = (): BigEndBearingRow[] => {
  const rows: BigEndBearingRow[] = [];

  for (let arm = 1; arm <= 8; arm++) {
    for (let mp = 1; mp <= 2; mp++) {
      rows.push({
        con_rod_arm_no: arm,
        measuring_point: mp,
        measurement_a: '',
        measurement_b: '',
      });
    }
  }
  return rows;
};

// Page 11: Build Connecting Rod Arm rows (Arm 1-4, Bank A/B)
const buildConnectingRodArmData = (): ConnectingRodArmRow[] => {
  const rows: ConnectingRodArmRow[] = [];
  const banks: Array<'A' | 'B'> = ['A', 'B'];

  for (let arm = 1; arm <= 4; arm++) {
    for (const bank of banks) {
      rows.push({
        arm_no: arm,
        bank,
        measurement: '',
      });
    }
  }
  return rows;
};

// Page 12: Build Piston Pin Bush Clearance rows (Conrod Arm 1-8, Measuring point X/Y)
const buildPistonPinBushClearanceData = (): PistonPinBushClearanceRow[] => {
  const rows: PistonPinBushClearanceRow[] = [];
  const mps: Array<'X' | 'Y'> = ['X', 'Y'];

  for (let arm = 1; arm <= 8; arm++) {
    for (const mp of mps) {
      rows.push({
        conrod_arm_no: arm,
        measuring_point: mp,
        measurement_a: '',
        measurement_b: '',
        measurement_c: '',
      });
    }
  }
  return rows;
};

// Page 13: Build Camshaft Journal Diameter rows (Journal 1-5, Measuring point X/Y)
const buildCamshaftJournalDiameterData = (): CamshaftJournalDiameterRow[] => {
  const rows: CamshaftJournalDiameterRow[] = [];
  const mps: Array<'X' | 'Y'> = ['X', 'Y'];

  for (let j = 1; j <= 5; j++) {
    for (const mp of mps) {
      rows.push({
        journal_no: j,
        measuring_point: mp,
        measurement_a: '',
        measurement_b: '',
        measurement_c: '',
      });
    }
  }
  return rows;
};

// Page 14: Build Camshaft Bush Clearance rows (Journal 1-5, Measuring point X/Y)
const buildCamshaftBushClearanceData = (): CamshaftBushClearanceRow[] => {
  const rows: CamshaftBushClearanceRow[] = [];
  const mps: Array<'X' | 'Y'> = ['X', 'Y'];

  for (let j = 1; j <= 5; j++) {
    for (const mp of mps) {
      rows.push({
        journal_no: j,
        measuring_point: mp,
        measurement_a: '',
        measurement_b: '',
        measurement_c: '',
      });
    }
  }
  return rows;
};

// Page 15: Build Camlobe Height rows (Journal 1-8, Measuring point X/Y)
const buildCamlobeHeightData = (): CamlobeHeightRow[] => {
  const rows: CamlobeHeightRow[] = [];
  const mps: Array<'X' | 'Y'> = ['X', 'Y'];

  for (let j = 1; j <= 8; j++) {
    for (const mp of mps) {
      rows.push({
        journal_no: j,
        measuring_point: mp,
        measurement_a: '',
        measurement_b: '',
        measurement_c: '',
      });
    }
  }
  return rows;
};

// Page 16: Build Cylinder Liner Bore rows (Cylinder 1-8, Measuring point X/Y)
const buildCylinderLinerBoreData = (): CylinderLinerBoreRow[] => {
  const rows: CylinderLinerBoreRow[] = [];
  const mps: Array<'X' | 'Y'> = ['X', 'Y'];

  for (let cyl = 1; cyl <= 8; cyl++) {
    for (const mp of mps) {
      rows.push({
        cylinder_no: cyl,
        measuring_point: mp,
        measurement_a: '',
        measurement_b: '',
        measurement_c: '',
        measurement_d: '',
      });
    }
  }
  return rows;
};

// Page 17: Build Piston Ring Gap rows (Piston 1-8)
const buildPistonRingGapData = (): PistonRingGapRow[] => {
  const rows: PistonRingGapRow[] = [];

  for (let p = 1; p <= 8; p++) {
    rows.push({
      piston_no: p,
      ring_1_value: '',
      ring_2_value: '',
      ring_3_value: '',
    });
  }
  return rows;
};

// Page 18: Build Piston Ring Axial Clearance rows (Piston 1-8)
const buildPistonRingAxialClearanceData = (): PistonRingAxialClearanceRow[] => {
  const rows: PistonRingAxialClearanceRow[] = [];

  for (let p = 1; p <= 8; p++) {
    rows.push({
      piston_no: p,
      ring_1_value: '',
      ring_2_value: '',
      ring_3_value: '',
    });
  }
  return rows;
};

// Page 19: Build Valve Unloaded Length rows (Cylinder 1-8)
const buildValveUnloadedLengthData = (): ValveUnloadedLengthRow[] => {
  const rows: ValveUnloadedLengthRow[] = [];

  for (let cyl = 1; cyl <= 8; cyl++) {
    rows.push({
      cylinder_no: cyl,
      intake_value: '',
      exhaust_value: '',
    });
  }
  return rows;
};

// Page 20: Build Valve Recess rows (Cylinder 1-8)
const buildValveRecessData = (): ValveRecessRow[] => {
  const rows: ValveRecessRow[] = [];

  for (let cyl = 1; cyl <= 8; cyl++) {
    rows.push({
      cylinder_no: cyl,
      intake_value: '',
      exhaust_value: '',
    });
  }
  return rows;
};

// Page 23: Build Piston Cylinder Head Distance rows (Cylinder 1-8)
const buildPistonCylinderHeadDistanceData = (): PistonCylinderHeadDistanceRow[] => {
  const rows: PistonCylinderHeadDistanceRow[] = [];

  for (let cyl = 1; cyl <= 8; cyl++) {
    rows.push({
      cylinder_no: cyl,
      measurement_a: '',
      measurement_b: '',
    });
  }
  return rows;
};

const createEmptyPistonRingMeta = (): PistonRingMeta => ({
  ring_1_min: '',
  ring_1_max: '',
  ring_1_wear_limit: '',
  ring_2_min: '',
  ring_2_max: '',
  ring_2_wear_limit: '',
  ring_3_min: '',
  ring_3_max: '',
  ring_3_wear_limit: '',
  remarks: '',
  technician: '',
  tool_no: '',
  checked_by: '',
});

// =============================================================
// INITIAL FORM DATA
// =============================================================

const initialFormData: ComponentsTeardownMeasuringFormData = {
  // Header
  customer: '',
  report_date: '',
  engine_model: '',
  serial_no: '',
  job_order_no: '',

  // Page 1: Cylinder Bore
  cylinderBoreMeta: createEmptyMeta(),
  cylinderBoreData: buildCylinderBoreData(),

  // Page 2: Cylinder Liner
  cylinderLinerMeta: {
    liner_seating_min: '',
    liner_seating_max: '',
    liner_collar_min: '',
    liner_collar_max: '',
    remarks: '',
    technician: '',
    tool_no: '',
    checked_by: '',
  },
  cylinderLinerData: buildCylinderLinerData(),

  // Page 3: Main Bearing Bore
  mainBearingBoreMeta: createEmptyMeta(),
  mainBearingBoreData: buildMainBearingBoreData(),

  // Page 4: Camshaft Bushing
  camshaftBushingMeta: createEmptyMeta(),
  camshaftBushingData: buildCamshaftBushingData(),

  // Page 5: Main Journal (uses spec_max_ovality, NOT spec_wear_limit)
  mainJournalMeta: createMetaWithMaxOvality(),
  mainJournalData: buildMainJournalData(),

  // Page 6: Main Journal Width (uses spec_oversize_limit, NOT spec_wear_limit)
  mainJournalWidthMeta: createMetaWithOversizeLimit(),
  mainJournalWidthData: buildMainJournalWidthData(),

  // Page 7: Con Rod Journal (uses spec_oversize_limit, NOT spec_wear_limit)
  conRodJournalMeta: createMetaWithOversizeLimit(),
  conRodJournalData: buildConRodJournalData(),

  // Page 8: Crankshaft True Running
  crankshaftTrueRunningMeta: {
    wear_limit_4_cylinder: '',
    wear_limit_6_cylinder: '',
    remarks: '',
    technician: '',
    tool_no: '',
    checked_by: '',
  },
  crankshaftTrueRunningData: buildCrankshaftTrueRunningData(),

  // Page 9: Small End Bush
  smallEndBushMeta: createEmptyMeta(),
  smallEndBushData: buildSmallEndBushData(),

  // Page 10: Big End Bearing
  bigEndBearingMeta: createEmptyMeta(),
  bigEndBearingData: buildBigEndBearingData(),

  // Page 11: Connecting Rod Arm
  connectingRodArmMeta: createEmptyMeta(),
  connectingRodArmData: buildConnectingRodArmData(),

  // Page 12: Piston Pin Bush Clearance
  pistonPinBushClearanceMeta: createEmptyMeta(),
  pistonPinBushClearanceData: buildPistonPinBushClearanceData(),

  // Page 13: Camshaft Journal Diameter
  camshaftJournalDiameterMeta: createEmptyMeta(),
  camshaftJournalDiameterData: buildCamshaftJournalDiameterData(),

  // Page 14: Camshaft Bush Clearance
  camshaftBushClearanceMeta: createEmptyMeta(),
  camshaftBushClearanceData: buildCamshaftBushClearanceData(),

  // Page 15: Camlobe Height
  camlobeHeightMeta: createEmptyMeta(),
  camlobeHeightData: buildCamlobeHeightData(),

  // Page 16: Cylinder Liner Bore
  cylinderLinerBoreMeta: createEmptyMeta(),
  cylinderLinerBoreData: buildCylinderLinerBoreData(),

  // Page 17: Piston Ring Gap
  pistonRingGapMeta: createEmptyPistonRingMeta(),
  pistonRingGapData: buildPistonRingGapData(),

  // Page 18: Piston Ring Axial Clearance
  pistonRingAxialClearanceMeta: createEmptyPistonRingMeta(),
  pistonRingAxialClearanceData: buildPistonRingAxialClearanceData(),

  // Page 19: Valve Unloaded Length
  valveUnloadedLengthMeta: {
    spring_no_rotator_intake: '',
    spring_no_rotator_exhaust: '',
    spring_with_rotator_intake: '',
    spring_with_rotator_exhaust: '',
    remarks: '',
    technician: '',
    tool_no: '',
    checked_by: '',
  },
  valveUnloadedLengthData: buildValveUnloadedLengthData(),

  // Page 20: Valve Recess
  valveRecessMeta: {
    intake_min: '',
    intake_max: '',
    exhaust_min: '',
    exhaust_max: '',
    remarks: '',
    technician: '',
    tool_no: '',
    checked_by: '',
  },
  valveRecessData: buildValveRecessData(),

  // Page 21: Crankshaft End Clearance
  crankshaftEndClearance: {
    spec_min: '',
    spec_max: '',
    reading_taken: '',
    remarks: '',
    technician: '',
    tool_no: '',
    checked_by: '',
  },

  // Page 21: Lube Oil Pump Backlash
  lubeOilPumpBacklash: {
    spec_min: '',
    spec_max: '',
    reading_taken: '',
    remarks: '',
    technician: '',
    tool_no: '',
    checked_by: '',
  },

  // Page 22: Camshaft End Clearance
  camshaftEndClearance: {
    spec_min: '',
    spec_max: '',
    reading_taken: '',
    remarks: '',
    technician: '',
    tool_no: '',
    checked_by: '',
  },

  // Page 22: Cylinder Head Cap Screw
  cylinderHeadCapScrew: {
    spec_min: '',
    spec_max: '',
    total_count: '',
    ok_count: '',
    not_ok_count: '',
    remarks: '',
    technician: '',
    tool_no: '',
    checked_by: '',
  },

  // Page 22-23: Valve Clearance Setting
  valveClearanceSetting: {
    intake_standard: '',
    intake_setting: '',
    exhaust_standard: '',
    exhaust_setting: '',
    remarks: '',
    technician: '',
    tool_no: '',
    checked_by: '',
  },

  // Page 23: Piston Cylinder Head Distance
  pistonCylinderHeadDistanceMeta: {
    spec_min: '',
    spec_max: '',
    remarks: '',
    technician: '',
    tool_no: '',
    checked_by: '',
  },
  pistonCylinderHeadDistanceData: buildPistonCylinderHeadDistanceData(),

  // Page 24: Injection Pump
  injectionPump: {
    timing: '',
    is_brand_new: false,
    is_calibrated: false,
    remarks: '',
    technician: '',
    tool_no: '',
    checked_by: '',
  },

  // Page 24: Injectors
  injectors: {
    opening_pressure: '',
    is_brand_new: false,
    is_readjusted: false,
    is_replace_nozzle_tip: false,
    remarks: '',
    technician: '',
    tool_no: '',
    checked_by: '',
  },

  // Page 24: Air Cooling Blower
  airCoolingBlower: {
    is_new_ball_bearing: false,
    is_repacked_grease: false,
    is_mechanical_blower: false,
    is_hydraulic_blower: false,
    remarks: '',
    technician: '',
    tool_no: '',
    checked_by: '',
  },
};

// =============================================================
// STORE INTERFACE
// =============================================================

interface ComponentsTeardownMeasuringFormStore {
  formData: ComponentsTeardownMeasuringFormData;
  setFormData: (data: Partial<ComponentsTeardownMeasuringFormData>) => void;
  updateMeasurementRow: <T extends keyof ComponentsTeardownMeasuringFormData>(
    section: T,
    index: number,
    data: Partial<ComponentsTeardownMeasuringFormData[T] extends Array<infer U> ? U : never>
  ) => void;
  resetFormData: () => void;
}

// =============================================================
// ZUSTAND STORE
// =============================================================

export const useComponentsTeardownMeasuringFormStore = create<ComponentsTeardownMeasuringFormStore>()(
  persist(
    (set) => ({
      formData: initialFormData,

      setFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      updateMeasurementRow: (section, index, data) =>
        set((state) => {
          const currentArray = state.formData[section];
          if (!Array.isArray(currentArray)) return state;

          const newArray = [...currentArray];
          newArray[index] = { ...newArray[index], ...data };

          return {
            formData: {
              ...state.formData,
              [section]: newArray,
            },
          };
        }),

      resetFormData: () =>
        set({
          formData: {
            ...initialFormData,
            cylinderBoreData: buildCylinderBoreData(),
            cylinderLinerData: buildCylinderLinerData(),
            mainBearingBoreData: buildMainBearingBoreData(),
            camshaftBushingData: buildCamshaftBushingData(),
            mainJournalData: buildMainJournalData(),
            mainJournalWidthData: buildMainJournalWidthData(),
            conRodJournalData: buildConRodJournalData(),
            crankshaftTrueRunningData: buildCrankshaftTrueRunningData(),
            smallEndBushData: buildSmallEndBushData(),
            bigEndBearingData: buildBigEndBearingData(),
            connectingRodArmData: buildConnectingRodArmData(),
            pistonPinBushClearanceData: buildPistonPinBushClearanceData(),
            camshaftJournalDiameterData: buildCamshaftJournalDiameterData(),
            camshaftBushClearanceData: buildCamshaftBushClearanceData(),
            camlobeHeightData: buildCamlobeHeightData(),
            cylinderLinerBoreData: buildCylinderLinerBoreData(),
            pistonRingGapData: buildPistonRingGapData(),
            pistonRingAxialClearanceData: buildPistonRingAxialClearanceData(),
            valveUnloadedLengthData: buildValveUnloadedLengthData(),
            valveRecessData: buildValveRecessData(),
            pistonCylinderHeadDistanceData: buildPistonCylinderHeadDistanceData(),
          },
        }),
    }),
    {
      name: 'psi-components-teardown-measuring-form-draft',
    }
  )
);

// =============================================================
// EXPORT BUILDER FUNCTIONS FOR RESETTING
// =============================================================

export {
  buildCylinderBoreData,
  buildCylinderLinerData,
  buildMainBearingBoreData,
  buildCamshaftBushingData,
  buildMainJournalData,
  buildMainJournalWidthData,
  buildConRodJournalData,
  buildCrankshaftTrueRunningData,
  buildSmallEndBushData,
  buildBigEndBearingData,
  buildConnectingRodArmData,
  buildPistonPinBushClearanceData,
  buildCamshaftJournalDiameterData,
  buildCamshaftBushClearanceData,
  buildCamlobeHeightData,
  buildCylinderLinerBoreData,
  buildPistonRingGapData,
  buildPistonRingAxialClearanceData,
  buildValveUnloadedLengthData,
  buildValveRecessData,
  buildPistonCylinderHeadDistanceData,
};
