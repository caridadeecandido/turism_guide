#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================
user_problem_statement: |
  Iteration 5 — Add /about (Sobre o Projeto) tab + Partner CRUD in admin + expanded site config
  (logos, banners, social, mission/vision, promoters).
#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

backend:
  - task: "Partner admin CRUD (POST/PUT/DELETE /api/partners)"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added PartnerCreate / PartnerUpdate. Endpoints: POST /api/partners, PUT /api/partners/{id}, DELETE /api/partners/{id}. All admin-protected (401 without token)."

  - task: "Expanded SiteConfig fields"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Added app_icon_url, hero_image_url, mission_pt/en/es, vision_pt/en/es, contact_address, facebook, youtube, tiktok, website, promoter_logos, promoter_names, show_about_tab. Migration runs on startup."

frontend:
  - task: "/about — Sobre o Projeto public screen"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/about.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Hero with seal + name; about/mission/vision (PT/EN/ES from config); 5 accessibility pillars; contact rows (email/phone/whatsapp/address with tel/mailto/wa.me/intent); social grid (Instagram/Facebook/YouTube/TikTok/Website); promoter logos."

  - task: "Admin Partners CRUD (/admin/partners)"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/admin/partners.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Admin can list, edit, create, delete partners with all fields incl. image_alt. testIDs: new-partner-button, save-partner-button, edit-partner-{id}, delete-partner-{id}, p-* fields."

  - task: "Expanded admin/site.tsx — full editor"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/admin/site.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "New sections: Identidade (logo/icon/hero with image preview); Missão (PT/EN/ES); Visão (PT/EN/ES); Redes sociais (Instagram/Facebook/YouTube/TikTok/Website); Realização (promoter_names/logos arrays); toggle Visibilidade for guides/marketplace/about."

  - task: "Home: Sobre shortcut + menu link"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/index.tsx, /app/frontend/app/menu.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Home shortcut testID=goto-about → /about. Menu: link-about-project + link-guides + admin-partners button visible."

metadata:
  created_by: "main_agent"
  version: "5.0"
  test_sequence: 5
  run_ui: true

test_plan:
  current_focus:
    - "Partner admin CRUD"
    - "Expanded SiteConfig fields"
    - "/about — Sobre o Projeto"
    - "Admin Partners CRUD UI"
    - "Expanded admin/site.tsx editor"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Iteration 5 ready for testing.

      Backend additions:
      - POST/PUT/DELETE /api/partners (admin protected)
      - SiteConfig: added app_icon_url, hero_image_url, mission_pt/en/es, vision_pt/en/es, contact_address, facebook, youtube, tiktok, website, promoter_logos[], promoter_names[], show_about_tab.
      - Migration runs and adds these to existing site_config doc.

      Frontend additions:
      - /about — public Sobre page with hero + about + mission + vision + 5 pillars + contact rows (email/phone/whatsapp/address) + social grid + promoter logos.
      - /admin/partners — admin CRUD with image preview and full fields including image_alt for accessibility.
      - /admin/site — now has 12 sections including Identidade (with logo/hero preview), Missão, Visão, Redes sociais, Realização, Visibilidade.
      - Home has new "Sobre" shortcut (testID `goto-about`). Menu has link-about-project. Admin dashboard now has 6 quick actions (Site/Guias/Parceiros/Traduções/Solicitações/Re-popular).

      Please test all of these, and re-run /app/backend/tests for full regression (50 tests existing + new partner CRUD).

      Admin: `admin@turismoquesesente.com.br` / `Natal@2026!`
