-- Add custom_name to chat_participants
ALTER TABLE public.chat_participants 
ADD COLUMN IF NOT EXISTS custom_chat_name TEXT;

-- Function to get email from unique_code securely (RPC)
-- This function is SECURITY DEFINER to bypass RLS on profiles for this specific lookup
CREATE OR REPLACE FUNCTION get_email_by_unique_code(code_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_email TEXT;
BEGIN
  SELECT email INTO found_email
  FROM public.profiles
  WHERE unique_code = code_input;
  
  RETURN found_email;
END;
$$;

-- Grant execute permission to authenticated users and anon (for login)
GRANT EXECUTE ON FUNCTION get_email_by_unique_code(TEXT) TO anon, authenticated, service_role;
