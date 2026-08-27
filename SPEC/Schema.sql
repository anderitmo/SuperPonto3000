-- Habilitar extensão para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela: Departamentos (Jornada Padrão)
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    default_entry_time TIME NOT NULL,
    default_exit_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela: Funcionários
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    matricula VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela: Exceções de Jornada (Individual)
CREATE TABLE employee_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    custom_entry_time TIME NOT NULL,
    custom_exit_time TIME NOT NULL,
    approved_by VARCHAR(100) NOT NULL, -- Nome ou ID do RH
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela: Registros de Ponto
CREATE TABLE time_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    record_type VARCHAR(10) CHECK (record_type IN ('ENTRADA', 'SAIDA')),
    record_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    photo_url TEXT NOT NULL, -- URL do Supabase Storage
    validation_hash VARCHAR(256) UNIQUE NOT NULL,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Políticas de Segurança (RLS - Row Level Security) básicas
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;

-- Exemplo: Permitir leitura pública (Ajustar conforme autenticação da aplicação)
CREATE POLICY "Allow public read for departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Allow public read for employees" ON employees FOR SELECT USING (true);
CREATE POLICY "Allow public read for schedules" ON employee_schedules FOR SELECT USING (true);
CREATE POLICY "Allow public insert for time_records" ON time_records FOR INSERT WITH CHECK (true);