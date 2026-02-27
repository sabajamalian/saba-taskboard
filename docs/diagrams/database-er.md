# Database Entity Relationship Diagram

> **Status:** ✅ APPROVED  
> **Prepared by:** Parker (Architect/Diagrammer)  
> **Date:** 2026-02-27

## Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ boards : owns
    users ||--o{ lists : owns
    users ||--o{ board_shares : "shared_with"
    
    boards ||--o{ stages : contains
    boards ||--o{ tasks : contains
    boards ||--o{ board_shares : "shared"
    boards ||--o{ custom_field_definitions : defines
    
    stages ||--o{ tasks : contains
    
    lists ||--o{ list_items : contains

    users {
        int id PK
        string google_id UK
        string email UK
        string name
        string avatar_url
        datetime created_at
        datetime last_login
    }

    boards {
        int id PK
        int owner_id FK
        string title
        string description
        string color_theme
        datetime created_at
        datetime updated_at
    }

    stages {
        int id PK
        int board_id FK
        string name
        int position
        string color
        datetime created_at
    }

    tasks {
        int id PK
        int board_id FK
        int stage_id FK
        string title
        text description
        date due_date
        date scheduled_start
        string color_theme
        text custom_fields "JSON"
        int position
        datetime created_at
        datetime updated_at
    }

    custom_field_definitions {
        int id PK
        int board_id FK
        string field_name
        string field_type
        text options "JSON for select"
        int position
        datetime created_at
    }

    board_shares {
        int id PK
        int board_id FK
        int user_id FK
        string permission "view/edit"
        datetime created_at
    }

    lists {
        int id PK
        int owner_id FK
        string title
        string color_theme
        datetime created_at
        datetime updated_at
    }

    list_items {
        int id PK
        int list_id FK
        string content
        boolean is_checked
        int position
        datetime created_at
        datetime updated_at
    }
```

## Entity Descriptions

### Core Entities

| Entity | Purpose |
|--------|---------|
| **users** | Gmail-authenticated users. Each user has isolated data. |
| **boards** | Projects/workspaces. Owned by a user, can be shared. |
| **stages** | Workflow columns within a board (To Do, In Progress, Done). |
| **tasks** | Work items within boards, assigned to stages. |

### Supporting Entities

| Entity | Purpose |
|--------|---------|
| **custom_field_definitions** | Schema for custom fields per board. |
| **board_shares** | Many-to-many relationship for collaboration. |
| **lists** | Standalone checklists (shopping, grocery, etc.). |
| **list_items** | Individual checkbox items within lists. |

## Key Relationships

- A **user** can own many **boards** and **lists**
- A **board** contains multiple **stages** (default: To Do, In Progress, Done)
- A **board** can define multiple **custom_field_definitions**
- A **task** belongs to one **board** and one **stage**
- A **task** stores custom field values as JSON (validated against definitions)
- A **board** can be shared with multiple **users** via **board_shares**
- A **list** contains multiple **list_items** (checkboxes)

## Notes

- `custom_fields` in tasks is a JSON column storing user-defined field values
- `custom_field_definitions` provides the schema for validation and UI rendering
- This follows the **hybrid approach** proposed in the architecture decisions
