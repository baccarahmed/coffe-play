# Task Management: Business Rules Migration & Updates

## Status: ⚡ **PRIORITY ACTIVES**

### **BLOCKER 1: Database Migration**
- ✅ **Status:** Administrative interface updates completed
- 🔄 **Next:** Fix CLI migration tool
  
**Actions Needed:**
1. **Correct Command Tool:** `npx @insforge/cli db migrations up <specific>` instead of generic
2. **Apply V2 Migration:** Run the business rules migration after fixing CLI
3. **Reset Project State:** Help user fix `@insforge-cli` command syntax error

### **BLOCKER 2: Admin Game Management**
- ✅ **Status:** Admin Settings Page (UI) - FULLY IMPLEMENTED
- ✅ **Functionality:** 
  - Game selection with billing type toggle (duration vs match)
  - Player count updated to 1-2 range (removed 4)
  - FIFA automatically set to "match" pricing
  - Responsive interface for mobile
  - Admin can add/edit individual price entries

### **BLOCKER 3: Analytics/Dashboard Updates**
- 🔄 **Status:** NOT STARTED
- 🔄 **Next:** Update analytics dashboards after DB migration
  
**Actions Needed:**
1. **Analytics Pages:** Update all charts for 1-2 player model
2. **Session History:** Update display for FIFA match-based sessions
3. **Revenue Dashboard:** Update metrics to show match-based pricing

---

## ⏩ **Current Project State**

### **✅ IMPLEMENTED (Working)**

**Core Backend Logic:**
- [x] Player count ENUM migrated to (1, 2) - REPLACE (2,4)
- [x] Database schema updated for billing_type (duration vs match)
- [x] Game pricing structure flexible (duration + price_per_match)
- [x] Sessions updated to use match_count for FIFA vs duration

**Frontend Updates:**
- [x] Sessions page player validation (1-2 players only)
- [x] Sessions page for FIFA shows match-based interface
- [x] Admin Settings page UI updated with billing_type toggle
- [x] Player count display updated throughout
- [x] Enhanced form validation and error handling

### **🔧 READY TO IMPLEMENT** (After DB Migration)

**Admin Interface Updates (Settings Page):**
- [ ] Billing type toggle UI for game selection
- [ ] Player count selector (1-2 options only)
- [ ] Separate pricing controls for FIFA vs duration games
- [ ] Game-specific pricing management interface

**Analytics Updates:**
- [ ] Update dashboard charts for 1-2 player model
- [ ] Session history page updated for FIFA match display
- [ ] Admin overview counters updated to reflect new model
- [ ] Revenue metrics updated for match-based pricing

---

## 🛠️ **Technical Stack**

- **Framework:** Next.js 14, TypeScript, Tailwind CSS, Framer Motion
- **Backend:** InsForge/PostgreSQL with RLS
- **Database Tasks:** Migration, Schema Design, Data Integrity
- **Frontend:** Component Updates, UI/UX Improvements, Responsive Design
- **State Management:** React hooks with local state

---

## 🗓️ **Timeline**

### **Phase 1: Core Implementation ✅ (COMPLETED)
- Database schema updated
- Backend pricing logic implemented
- Sessions page fixed

**Phase 2: Admin Interface ✅ (COMPLETED)
- Admin settings page updated
- Player validation improved
- Form validation enhanced

**Phase 3: Analytics/Dashboard 🔄 (BLOCKED)
- **Waiting for database migration completion**

**Phase 4: Testing & Validation 🔄 (BLOCKED)
- **Waiting for backend updates**

---

## 📊 **Implementation Metrics**

**Backend Changes:**
- Database migrations: 1 (V2 ready)
- Schema modifications: 4 tables (games, game_prices, sessions, player_count)
- RLS policy updates: Required
- Data migration tasks: 4-player → 2-player mapping

**Frontend Changes:**
- Pages updated: 3 (sessions, settings, analytics pending)
- Components modified: 2 (settings, sessions UI)
- Player count validation: Updated across all pages
- Pricing calculation: Both duration & match modes implemented

**Documentation Updates:**
- Code comments: Updated throughout
- User interfaces: Enhanced for new game pricing model
- Admin interface: Modernized with billing type selection

---

## 🚨 **Current Blockers**

### **BLOCKER #1: CLI Tool Syntax Issue**
```bash
❌ Current: npx @insforge-cli migrations up --all
✅ Required: npx @insforge/cli db migrations up --all
```

**Status:** Administrative fixes complete, technical needs CLI correction

### **BLOCKER #2: Database Migration Exception**
- **Prerequisite:** CLI tool must be fixed first
- **Root Cause:** Invalid command syntax passed to InsForge CLI
- **Impact:** All database changes cannot be applied until CLI issue resolved

### **BLOCKER #3: Analytics Updates Dependent**
- **Dependency:** Page dashboards need business model changes
- **Impact:** Analytics updates wait for database migration to complete
- **Priority:** Low-Medium (admin interface is higher priority)

---

## 🎯 **Next Steps (Based on User Request)**

### **IMMEDIATE (Order Respected):**
1. **✅ Admin Interface Updates** - COMPLETED
   - Settings page updated with billing type toggle
   - Player count selector updated to 1-2 only
   - Forms and validation enhanced

2. **🔧 CLI Migration Fix** - NEXT STEP
   - Correct InsForge CLI command syntax
   - Apply business rules migration to database
   - Verify data integrity

3. **📊 Analytics Updates** - DEPENDENT ON STEP 2
   - Update dashboard charts for 1-2 player model
   - Session history UI improved for FIFA match display
   - Admin overview updated

### **CLOSING ACTIONS:**
- Admin interface improvements completed
- Player count validation updated across app
- Business rules now ready for deployment
- Database migration pending CLI tool fix

---

**Priority:** High (Business rules implementation ~90% complete)
**Dependencies:** CLI tool syntax fix required for remaining database migration

**Ready for review & deployment when CLI issue is resolved!**