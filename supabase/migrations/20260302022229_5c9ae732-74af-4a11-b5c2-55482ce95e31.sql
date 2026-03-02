
-- 1. Organizations (Multi-tenant)
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    crypto_wallet_address VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Leads (with Intent Scoring)
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    client_name VARCHAR(255) NOT NULL,
    contact_info JSONB DEFAULT '{}'::jsonb,
    intent_score INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Unique index for upsert by org + email
CREATE UNIQUE INDEX leads_org_email_unique ON public.leads (organization_id, ((contact_info->>'email')));

-- 3. Appointments
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',
    service_type VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Agent Sessions (Conversational Memory)
CREATE TABLE public.agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id),
    history JSONB DEFAULT '[]'::jsonb,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (public-facing sales agent, no auth required)
CREATE POLICY "Allow public read on organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Allow public insert on organizations" ON public.organizations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read on leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Allow public insert on leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on leads" ON public.leads FOR UPDATE USING (true);

CREATE POLICY "Allow public read on appointments" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Allow public insert on appointments" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on appointments" ON public.appointments FOR UPDATE USING (true);

CREATE POLICY "Allow public read on agent_sessions" ON public.agent_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert on agent_sessions" ON public.agent_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on agent_sessions" ON public.agent_sessions FOR UPDATE USING (true);

-- Insert default organization
INSERT INTO public.organizations (id, name) VALUES ('00000000-0000-0000-0000-000000000000', 'Aura AI Default Org');
