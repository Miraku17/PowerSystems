-- Function to peek at the next JO number without consuming the sequence
CREATE OR REPLACE FUNCTION get_next_jo_number()
RETURNS INTEGER AS $$
DECLARE
  last_val INTEGER;
  is_called_val BOOLEAN;
BEGIN
  SELECT last_value, is_called INTO last_val, is_called_val
  FROM job_order_request_form_jo_number_seq;

  IF is_called_val THEN
    RETURN last_val + 1;
  ELSE
    RETURN last_val;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to read a sequence's last_value (generic helper)
CREATE OR REPLACE FUNCTION get_sequence_last_value(seq_name TEXT)
RETURNS BIGINT AS $$
DECLARE
  last_val BIGINT;
BEGIN
  EXECUTE format('SELECT last_value FROM %I', seq_name) INTO last_val;
  RETURN last_val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
