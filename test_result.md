#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================
user_problem_statement: |
  Iteration 4 — Add "Guias Certificados" (certified guides) tab + admin CRUD + multilingual TTS.
  The seal image is now the official "Categoria Ouro" image.
  ALL CMS editable from admin: spots, guides, site (selo, contato, emergência, sobre, idiomas).
#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

backend:
  - task: "Guides CRUD + LLM translation"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added Guide model + endpoints. Public: GET /api/guides (filters: specialty/language/focus/featured/active_only), GET /api/guides/categories, GET /api/guides/{id}, GET /api/guides/{id}/translate. Admin: POST/PUT/DELETE /api/guides. Seeded 4 guides on first run."

  - task: "Inquiries now support guide_id OR partner_id"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "InquiryCreate now accepts either partner_id or guide_id; backend validates the existence of the chosen entity and stores guide_id on the inquiry."

  - task: "Expanded SiteConfig with about/contact/emergency/feature flags"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added app_name, app_logo_url, about_pt/en/es, contact_email/phone/whatsapp, instagram, emergency_police/ambulance/fire/tourist, show_guides_tab, show_marketplace_tab. Migration on startup auto-adds new fields to existing config and replaces old seal URL with the new official Categoria Ouro image."

frontend:
  - task: "Guides public screens (/guides and /guide/[id])"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/guides.tsx, /app/frontend/app/guide/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Listing with specialty + accessibility focus chips. Detail page with seal ribbon over photo, contact buttons (WhatsApp/Phone/Email/Instagram), certification info with course + seal code, inquiry form. Translates name+bio+short_bio via LLM when language is EN/ES."

  - task: "Admin Guides CRUD (/admin/guides)"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/admin/guides.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Admin can create/edit/delete guides with all fields: name, photo, photo_alt, bio, specialties, languages, accessibility_focus, certification course/date, phone, whatsapp, email, instagram, region, rating, years_experience, featured, active toggle."

  - task: "Audio multilingual TTS (PT/EN/ES with correct voice locale)"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/audio/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Play() now uses audioText (translated) instead of original PT, and uses ttsLocale(language) to pick pt-BR/en-US/es-ES voice."

  - task: "Expanded admin/site.tsx with all editable fields"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/admin/site.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added sections: Identidade do app, Sobre o projeto (PT/EN/ES), Contato oficial, Emergência (4 numbers), Visibilidade de seções (toggles for guides/marketplace)."

  - task: "Emergency screen now uses dynamic phone numbers from site config"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/emergency.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "SAMU, Bombeiros, Polícia Militar, Turismo numbers now come from useSiteConfig().config so admin can edit them."

  - task: "Home shows new Guias quick-access shortcut + new official seal image"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/index.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added 5th main shortcut 'Guias' that navigates to /guides. SealFooter at the bottom reads the new official Categoria Ouro seal from migrated site config."

metadata:
  created_by: "main_agent"
  version: "4.0"
  test_sequence: 4
  run_ui: true

test_plan:
  current_focus:
    - "Guides CRUD + LLM translation"
    - "Inquiries now support guide_id OR partner_id"
    - "Expanded SiteConfig with about/contact/emergency/feature flags"
    - "Guides public screens (/guides and /guide/[id])"
    - "Admin Guides CRUD (/admin/guides)"
    - "Audio multilingual TTS (PT/EN/ES with correct voice locale)"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Iteration 4 ready for testing.
      BACKEND: verify GET /api/guides returns 4 seeded guides; GET /api/guides/categories returns specialties/languages/accessibility_focus; GET /api/guides/{id}/translate works for PT/EN/ES; protected POST/PUT/DELETE require admin token; POST /api/inquiries with guide_id (no partner_id) creates an inquiry; PUT /api/admin/site-config persists about_pt/contact_email/emergency_police.
      FRONTEND: /guides shows 4 guides; /guide/{id} shows photo, seal ribbon, contact buttons, inquiry form; /admin/guides shows CRUD + form with all fields; /admin/site has new sections (Identidade, Sobre, Contato, Emergência, Visibilidade); Home has "Guias" shortcut that opens /guides.
      Admin credentials in /app/memory/test_credentials.md.
