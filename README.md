# Finanzo - Sistema de Gestão Financeira Robustos

Finanzo é uma aplicação completa de gestão financeira desenvolvida com **React**, **Tailwind CSS** e **Supabase**. O sistema permite o controle total de contas a pagar e a receber, oferecendo dashboards detalhados e uma interface otimizada para dispositivos móveis.

## 🚀 Funcionalidades

- **Dashboard Inteligente**: Visualize saldo atual, dívidas pendentes, contas pagas e valores a receber em um único lugar.
- **Contas a Pagar**: Registre suas dívidas, categorize-as e marque como pagas com um clique.
- **Contas a Receber**: Acompanhe todos os seus recebimentos futuros.
- **Relatórios Detalhados**: Gráficos de fluxo de caixa (Projeção) e distribuição de gastos por categoria.
- **Interface Premium**: Design moderno com Glassmorphism, animações suaves (Framer Motion) e totalmente responsivo (Mobile-First).
- **Persistência na Nuvem**: Integração total com Supabase para armazenamento seguro dos dados.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Vite.
- **Estilização**: Tailwind CSS 4.
- **Animações**: Motion (Framer Motion).
- **Gráficos**: Recharts.
- **Backend/Banco de Dados**: Supabase (PostgreSQL).
- **Ícones**: Lucide React.
- **Datas**: date-fns.

## ⚙️ Configuração do Banco de Dados (Supabase)

Para rodar o projeto com o backend, execute o seguinte SQL no seu editor do Supabase:

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('payable', 'receivable')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Política de Acesso Público (Ajustar para produção)
CREATE POLICY "Allow public access" ON transactions FOR ALL USING (true) WITH CHECK (true);
```

## 📄 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes chaves:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
```

## 📦 Instalação e Execução

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Abra o navegador em `http://localhost:3000`.

---
Desenvolvido para ser o sistema financeiro mais "top" e robusto para sua gestão pessoal ou empresarial.
