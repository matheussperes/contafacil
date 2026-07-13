# Diagrama ER — ContaFácil

```mermaid
erDiagram
    AUTH_USERS ||--o{ PARTICIPANTS : "dispositivo anônimo (ADR-006)"
    TABLES ||--o{ PARTICIPANTS : "tem"
    TABLES ||--o{ ITEMS : "tem"
    TABLES ||--o{ ASSIGNMENTS : "tem (desnormalizado)"
    TABLES ||--o{ ASSIGNMENT_MEMBERS : "tem (desnormalizado)"
    TABLES ||--o{ PAYMENTS : "gera no fechamento"
    TABLES }o--o| PARTICIPANTS : "payee (modos A/B)"
    ITEMS ||--o{ ASSIGNMENTS : "é coberto por"
    ASSIGNMENTS ||--|{ ASSIGNMENT_MEMBERS : "divide entre"
    PARTICIPANTS ||--o{ ASSIGNMENT_MEMBERS : "consome"
    PARTICIPANTS ||--o{ ITEMS : "criou (created_by)"
    PARTICIPANTS ||--o| PAYMENTS : "deve (1 por mesa)"

    TABLES {
        uuid id PK
        text join_code UK "RN-001, sem 0/O/1/I"
        text name
        table_status status "ABERTA|FECHANDO|FECHADA"
        settlement_mode settlement_mode "A|B|C (RN-002)"
        int service_fee_bp "basis points (RN-004)"
        uuid payee_participant_id FK
        text payee_pix_key "sensível — nunca logar"
        text establishment_pix_key "modo C, opcional"
        timestamptz closing_started_at
        timestamptz closed_at
        bigint version
    }

    PARTICIPANTS {
        uuid id PK
        uuid table_id FK
        uuid auth_user_id FK "auth.users"
        text name "único na mesa (RN-007)"
        participant_status status "ATIVO|SAIU"
        participant_role role "CRIADOR|MEMBRO"
        bigint join_order "desempate do maior resto (RN-042)"
        timestamptz left_at
        bigint version
    }

    ITEMS {
        uuid id PK
        uuid table_id FK
        text description
        numeric quantity "3 casas (peso)"
        bigint unit_price_cents "ADR-001"
        bigint total_cents "trigger: qtd × unitário"
        item_source source "MANUAL|NFCE"
        uuid created_by FK
        bigint version
    }

    ASSIGNMENTS {
        uuid id PK
        uuid table_id FK "desnormalizado, trigger"
        uuid item_id FK
        assignment_mode mode "TODOS|PESSOA|GRUPO"
        numeric quantity "unidades cobertas (I-I2)"
        bigint version
    }

    ASSIGNMENT_MEMBERS {
        uuid id PK
        uuid assignment_id FK
        uuid table_id FK "desnormalizado, trigger"
        uuid participant_id FK
        numeric quantity "XOR weight (RN-024)"
        int weight "XOR quantity"
        bigint version
    }

    PAYMENTS {
        uuid id PK
        uuid table_id FK
        uuid participant_id FK "devedor, único por mesa"
        bigint amount_cents "imutável"
        payment_status status "PENDENTE|INFORMADO|PAGO"
        timestamptz paid_declared_at
        timestamptz confirmed_at
        bigint version
    }
```

## Cardinalidades e observações

- **Mesa → Participantes**: 1‑N; exatamente **um** `CRIADOR` `ATIVO` por mesa (índice único parcial, I-M5); uma participação `ATIVO` por dispositivo por mesa (ADR-006).
- **Item → Assignments**: 1‑N; a soma de `assignments.quantity` por item nunca excede `items.quantity` (trigger diferido, I-I2).
- **Assignment → Members**: 1‑N (≥1 no commit); refinamento homogêneo (todos por quantidade ou todos por peso).
- **Mesa → Payments**: só nascem durante `FECHANDO`, no máximo um por participante (I-G1/G2).
- **Recebedor** (`payee_participant_id`): definido na criação (modo A), no fechamento (modo B) ou nunca (modo C).
- Todas as tabelas: `created_at`, `updated_at` e `version` (contador por linha, usado pela idempotência do realtime — FA-91).
