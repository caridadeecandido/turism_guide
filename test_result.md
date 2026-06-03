#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================
# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================


user_problem_statement: |
  Build an accessible mobile app/website "Turismo que se sente" (Tourism that you feel) for Natal/RN.
  - Audio descriptions of tourist spots, real images, easy-to-use CMS admin panel.
  - Google Login for tourists; JWT-protected Admin with isolated state.
  - Real-time map (OpenStreetMap), emergency button, marketplace + inquiry forms.
  - Digital Seal certification (editable via admin), Geolocation ("near me"), Multi-language PT/EN/ES via LLM.
  - Floating Accessibility Panel (TTS, beeps, haptics, large buttons) — globally visible.

backend:
  - task: "Admin JWT auth + protected CRUD"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Implemented /api/admin/login (bcrypt+JWT), /admin/me, protected POST/PUT/DELETE /spots, /admin/site-config, /admin/inquiries, /admin/upload-image, POST /seed. Default admin seeded on startup."

  - task: "Site Config (public read / admin write)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/site-config public; PUT /api/admin/site-config admin-only. Editable seal image, welcome strings PT/EN/ES, footer."

  - task: "Translations (manual + LLM cache)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/spots/{id}/translate?lang= returns manual override → LLM cache → live LLM (gpt-4o-mini via emergentintegrations)."

  - task: "Partners + Marketplace + Inquiries + Seal verify"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "testing"
        comment: "Iteration 1: passing. Iteration 2: needs retest after admin auth lockdown of POST /seed."

frontend:
  - task: "Admin Panel (login → dashboard → CMS) with JWT gate"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/admin/_layout.tsx, /app/frontend/app/admin/login.tsx, /app/frontend/app/admin/index.tsx, /app/frontend/app/admin/site.tsx, /app/frontend/app/admin/translations.tsx, /app/frontend/app/admin/inquiries.tsx, /app/frontend/src/admin-auth.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "AdminAuthProvider scoped to /admin layout. AdminGate redirects to /admin/login when no token. After login redirects to /admin. Logout clears token + returns to /admin/login."

  - task: "Floating Accessibility Panel (global)"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/AccessibilityPanel.tsx, /app/frontend/src/accessibility.tsx, /app/frontend/app/_layout.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "FAB top-right opens panel with 4 toggles (audio on focus, beeps, haptics, large buttons). Persisted in SecureStore/localStorage. Synced with /menu toggles."

  - task: "Digital Seal global branding"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/components/SealBranding.tsx, /app/frontend/app/index.tsx, /app/frontend/app/menu.tsx, /app/frontend/app/seal.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "SealFooter component reads from site_config and shows seal image + footer text on Home, Menu, Seal screens."

  - task: "Home with dynamic welcome from site config + language switcher"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/index.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Home welcome title/subtitle now reads config.welcome_pt/en/es. PT/EN/ES chips switch language."

metadata:
  created_by: "main_agent"
  version: "3.0"
  test_sequence: 3
  run_ui: true

test_plan:
  current_focus:
    - "Admin JWT auth + protected CRUD"
    - "Site Config (public read / admin write)"
    - "Translations (manual + LLM cache)"
    - "Admin Panel (login → dashboard → CMS) with JWT gate"
    - "Floating Accessibility Panel (global)"
    - "Digital Seal global branding"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Iteration 3 ready for testing.
      Tester: please verify
      (1) backend: admin login flow + protection (401 without token, 200 with valid token), site-config public GET + admin PUT, translations PT/EN/ES (cache should be faster on 2nd call), spots CRUD requires admin, inquiries (public POST, admin GET).
      (2) frontend: home loads, language switching works, /admin redirects to /admin/login if not authenticated, login with admin@turismoquesesente.com.br / Natal@2026! works, the floating a11y FAB (top-right purple circle) opens a panel with 4 toggles, /seal shows the seal image, /marketplace + /partner/[id] + inquiry submit, /near GPS list.
      Admin credentials are in /app/memory/test_credentials.md.
