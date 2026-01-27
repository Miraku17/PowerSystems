-- Submersible Pump Commissioning Report Table
-- Based on: SUBMERSIBLE PUMP COMMISIONING REPORT.pdf

CREATE TABLE submersible_pump_commissioning_report (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Header / Basic Information
    reporting_person_name TEXT,
    reporting_person_contact TEXT,
    equipment_manufacturer TEXT,
    job_order TEXT,
    jo_date DATE,
    customer TEXT,
    contact_person TEXT,
    address TEXT,
    email_or_contact TEXT,

    -- Pump Details
    pump_model TEXT,
    pump_serial_number TEXT,
    pump_type TEXT,
    kw_rating_p1 TEXT,
    kw_rating_p2 TEXT,
    voltage TEXT,
    frequency TEXT,
    max_head TEXT,
    max_flow TEXT,
    max_submerged_depth TEXT,
    no_of_leads TEXT,
    configuration TEXT,
    discharge_size_type TEXT,

    -- Installation Details
    location TEXT,
    submerge_depth TEXT,
    length_of_wire_size TEXT,
    pipe_size_type TEXT,
    pipe_length TEXT,
    static_head TEXT,
    check_valve_size_type TEXT,
    no_of_elbows_size TEXT,
    media TEXT,

    -- Other Details
    commissioning_date DATE,
    power_source TEXT,
    controller_type TEXT,
    sump_type TEXT,
    controller_brand TEXT,
    pumping_arrangement TEXT,
    controller_rating TEXT,
    others TEXT,

    -- Actual Operational Details
    actual_voltage TEXT,
    actual_frequency TEXT,
    actual_amps TEXT,
    discharge_pressure TEXT,
    discharge_flow TEXT,
    quality_of_water TEXT,
    water_temp TEXT,
    duration TEXT,

    -- Comments
    comments TEXT,

    -- Signatures (stored as URLs to uploaded images)
    commissioned_by_signature TEXT,
    commissioned_by_name TEXT,
    checked_approved_by_signature TEXT,
    checked_approved_by_name TEXT,
    noted_by_signature TEXT,
    noted_by_name TEXT,
    acknowledged_by_signature TEXT,
    acknowledged_by_name TEXT,

    -- System Fields
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for common queries
CREATE INDEX idx_submersible_pump_commissioning_job_order ON submersible_pump_commissioning_report(job_order);
CREATE INDEX idx_submersible_pump_commissioning_customer ON submersible_pump_commissioning_report(customer);
CREATE INDEX idx_submersible_pump_commissioning_created_at ON submersible_pump_commissioning_report(created_at);
CREATE INDEX idx_submersible_pump_commissioning_deleted_at ON submersible_pump_commissioning_report(deleted_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_submersible_pump_commissioning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_submersible_pump_commissioning_updated_at
    BEFORE UPDATE ON submersible_pump_commissioning_report
    FOR EACH ROW
    EXECUTE FUNCTION update_submersible_pump_commissioning_updated_at();

-- Enable Row Level Security
ALTER TABLE submersible_pump_commissioning_report ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust based on your auth setup)
CREATE POLICY "Users can view all submersible pump commissioning reports"
    ON submersible_pump_commissioning_report
    FOR SELECT
    USING (deleted_at IS NULL);

CREATE POLICY "Users can insert submersible pump commissioning reports"
    ON submersible_pump_commissioning_report
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own submersible pump commissioning reports"
    ON submersible_pump_commissioning_report
    FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete submersible pump commissioning reports"
    ON submersible_pump_commissioning_report
    FOR DELETE
    USING (true);

-- Attachments table for installation photos/drawings
CREATE TABLE submersible_pump_commissioning_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID REFERENCES submersible_pump_commissioning_report(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_submersible_pump_attachments_report_id ON submersible_pump_commissioning_attachments(report_id);

-- Enable RLS for attachments
ALTER TABLE submersible_pump_commissioning_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all submersible pump commissioning attachments"
    ON submersible_pump_commissioning_attachments
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert submersible pump commissioning attachments"
    ON submersible_pump_commissioning_attachments
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can delete submersible pump commissioning attachments"
    ON submersible_pump_commissioning_attachments
    FOR DELETE
    USING (true);
