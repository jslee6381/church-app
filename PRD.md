# Community Platform PRD

## 1. Product Vision

### Working title
Grace Community

### Product statement
Grace Community is a calm, trustworthy church community platform designed to create awareness, participation, and connection across generations while leading people back into real-world church life.

### Core problem
Most church communication is fragmented across announcements, paper bulletins, KakaoTalk, WhatsApp, texts, phone trees, social media, and word of mouth. This creates six failures:

1. Younger members often organize in WhatsApp while older members remain in KakaoTalk.
2. Important information becomes fragmented across generational and channel boundaries.
3. Members often do not know what is happening in the broader community.
4. Prayer support is inconsistent and disconnected from church-wide awareness.
5. Official announcements are scattered and easy to miss.
6. Staff and volunteers spend too much time relaying the same information manually.

### Product goal
Create a church-centered coordination platform that:

1. Serves as one trusted community hub.
2. Bridges communication across generations.
3. Encourages in-person fellowship rather than endless online engagement.
4. Makes important information easy to find, trust, and act on.
5. Gives leaders simple publishing and coordination tools without turning the product into a chat app.

### Product principles

1. Real-world first: every digital feature should support offline connection, attendance, care, or service.
2. Calm by default: no noisy feeds, addictive interactions, or high-pressure notifications.
3. Intergenerational by design: younger and older users should both succeed without separate products.
4. Trust through clarity: church members should know what is official, current, and safe to act on.
5. Simplicity over feature richness: every feature must justify itself by reducing confusion or increasing participation.
6. Operational simplicity: church admins should be able to manage the platform without technical staff.

### First release posture
The first release should focus on becoming a trusted church community hub, not a broad platform. It should be intentionally small, easy to understand, and dependable enough that members begin treating it as the official place to check what is happening.

### Success definition
The product succeeds if church members can answer three questions within seconds:

1. What is happening?
2. What do I need to do?
3. How can I show up in person for people and events?

## 2. User Personas

### Persona A: Older adult member
- Age: 60-85
- Goals: find worship times, prayer topics, announcements, ride help, fellowship events
- Behaviors: prefers simple screens, larger text, familiar labels, low-friction navigation
- Pain points: too many tabs, complex account setup, fast-moving KakaoTalk threads, fear of missing important updates
- Needs: one trusted place, minimal typing, clear calls to action, printable/shareable support from family or volunteers

### Persona B: Middle-generation caregiver or family connector
- Age: 35-60
- Goals: help parents or elders stay informed, coordinate household church participation, track upcoming events
- Behaviors: mobile-first, time-constrained, often relays information between church and family
- Pain points: duplicate communication across channels, unclear RSVP status, no easy way to help elders participate
- Needs: quick summaries, household-level visibility, easy sharing, dependable reminders

### Persona C: Young adult / youth volunteer
- Age: 16-34
- Goals: stay informed, join service opportunities, discover fellowship moments, help older members participate
- Behaviors: comfortable with modern apps, expects fast UX, low tolerance for clutter
- Pain points: information feels scattered or outdated, unclear opportunities to contribute, communication buried in WhatsApp or informal group chats
- Needs: lightweight coordination, event context, volunteer signups, opportunities for cross-generational service

### Persona D: Pastor / admin / ministry leader
- Age: 28-70
- Goals: publish trusted updates, coordinate attendance and volunteers, highlight care needs, reduce repetitive admin work
- Behaviors: limited time, mixed technical confidence, needs predictable tools
- Pain points: too many communication channels, uncertainty about who saw what, manual follow-up
- Needs: role-based publishing, approval flows, simple dashboards, safe privacy controls

### Persona E: Care team / deacon / small group leader
- Age: 35-75
- Goals: identify members who need support, mobilize meal trains, rides, visits, prayer, and event hospitality
- Behaviors: relational, service-oriented, often coordinates by phone and text
- Pain points: scattered requests, privacy concerns, unclear ownership, difficult follow-through
- Needs: structured requests, assignment visibility, member-safe contact sharing, simple follow-up tools

## 3. User Journey

### Journey 1: Older member checking weekly life
1. Opens the app from the home screen shortcut.
2. Sees a calm home page with today’s key information.
3. Reads the pinned church announcement and worship schedule.
4. Opens the relevant section to see events, prayer topics, and service opportunities.
5. Taps a large action such as `Need a ride` or `I can help`.
6. Receives confirmation and optionally a phone follow-up from a volunteer.
7. Arrives at church feeling informed and expected.

### Journey 2: Young volunteer joining real-world service
1. Opens the app and sees open volunteer needs for Sunday.
2. Views event details, role descriptions, and who the role supports.
3. Signs up for greeting, setup, meal service, tech help, or elder assistance.
4. Receives a simple reminder before the event.
5. Checks in on site and meets a coordinator in person.

### Journey 3: Care request becoming community support
1. A member, family member, or leader submits a care need such as meals, rides, prayer, or visitation.
2. The request enters a moderated queue.
3. A leader reviews and categorizes the request.
4. Eligible volunteers see clear ways to respond.
5. Commitments are assigned and visible to coordinators.
6. The member receives practical support without needing to navigate a chat thread.

### Journey 4: Admin publishing a weekly rhythm
1. Admin logs into the management area.
2. Creates or updates announcements, events, prayer topics, volunteer needs, and community updates.
3. Pins the most important update for the week.
4. Reviews what is public, member-only, or leader-only.
5. Publishes with confidence that the home page stays simple and current.

### Journey 5: Member posting a prayer request
1. A member opens the Prayer page.
2. They see a scrollable prayer feed with recent approved requests.
3. They tap the fixed input bar at the bottom and the keyboard opens immediately.
4. The input expands naturally as they type a prayer request.
5. They submit with very little friction and see a clear message that the request is pending manual approval.
6. An administrator reviews the request before it becomes visible to the community.

## 4. Information Architecture

### Primary member navigation
1. Home
2. Announcements
3. Events
4. Prayer
5. Serve
6. More

### Recommended MVP simplification
For MVP, keep the product intentionally small:

1. Home
2. Announcements
3. Events
4. Prayer
5. Serve

### Home structure
- Pinned update
- Worship and service times
- Next upcoming event
- Community Updates
- Open care or volunteer opportunities
- Prayer focus
- Quick actions

### Community Updates
- Recent church activities
- Fellowship moments
- Ministry highlights
- Service recaps
- Lightweight photo or text updates
- No comments, reactions, or feed mechanics

### Announcements
- Pinned announcement
- Weekly updates
- Ministry-specific updates
- Archived announcements

### Events
- Calendar list by upcoming date
- Event detail pages
- RSVP / attendance intent
- Transportation or accessibility details

### Prayer
- Scrollable feed of approved prayer requests
- Fixed bottom input bar
- Expandable input area
- Submission confirmation and pending state
- Sensitive requests only visible to authorized roles until approved

### Serve
- Volunteer opportunities by ministry
- Shift signup
- Role descriptions
- Commitment status

### Admin IA
1. Dashboard
2. Content
3. Events
4. Prayer Queue
5. Volunteer Coordination
6. Members
7. Invitations
8. Roles & Permissions
9. Notifications
10. Settings

## 5. Database Design

### Core entities

#### churches
- id
- name
- slug
- timezone
- address
- contact_phone
- contact_email
- created_at
- updated_at

#### members
- id
- church_id
- invitation_token_id
- full_name
- phone
- birth_year
- generation_label
- language_preference
- access_code_hash
- status
- last_seen_at
- created_at
- updated_at

#### profiles
- id
- member_id
- preferred_name
- accessibility_preferences
- profile_photo_url
- bio
- created_at
- updated_at

#### households
- id
- church_id
- household_name
- address
- created_at
- updated_at

#### household_members
- id
- household_id
- member_id
- relationship_label
- is_primary_contact

#### roles
- id
- church_id
- name
- description

#### member_roles
- id
- member_id
- role_id

#### invitation_tokens
- id
- church_id
- code
- qr_payload
- issued_for_name
- issued_by_member_id
- claimed_by_member_id
- expires_at
- claimed_at
- status
- created_at
- updated_at

#### announcements
- id
- church_id
- title
- summary
- body
- status
- visibility
- pinned_until
- published_at
- author_member_id
- created_at
- updated_at

#### community_updates
- id
- church_id
- title
- summary
- body
- image_url
- activity_date
- visibility
- published_at
- author_member_id
- created_at
- updated_at

#### events
- id
- church_id
- title
- summary
- description
- category
- location_name
- location_address
- starts_at
- ends_at
- capacity
- visibility
- requires_rsvp
- transportation_notes
- accessibility_notes
- published_by_member_id
- created_at
- updated_at

#### event_rsvps
- id
- event_id
- member_id
- status
- attendee_count
- note
- created_at
- updated_at

#### prayer_requests
- id
- church_id
- requester_member_id
- subject_name
- title
- details
- privacy_level
- approval_status
- approved_by_member_id
- approved_at
- published_at
- expires_at
- created_at
- updated_at

#### care_requests
- id
- church_id
- requester_member_id
- care_type
- title
- details
- recipient_member_id
- status
- privacy_level
- assigned_coordinator_member_id
- start_date
- end_date
- created_at
- updated_at

#### care_commitments
- id
- care_request_id
- member_id
- commitment_type
- commitment_date
- status
- note
- created_at
- updated_at

#### volunteer_opportunities
- id
- church_id
- linked_event_id
- ministry_name
- title
- description
- role_type
- slots_total
- slots_filled
- starts_at
- ends_at
- visibility
- created_at
- updated_at

#### volunteer_signups
- id
- opportunity_id
- member_id
- status
- note
- created_at
- updated_at

#### ministries
- id
- church_id
- name
- description

#### notifications
- id
- church_id
- type
- title
- body
- deep_link
- audience_filter
- scheduled_at
- sent_at
- created_by_member_id
- created_at

#### directory_visibility_settings
- id
- member_id
- show_phone
- show_address
- show_household
- show_birth_year

#### audit_logs
- id
- church_id
- actor_member_id
- entity_type
- entity_id
- action
- metadata_json
- created_at

### Design notes
1. Multi-tenant support begins at `church_id`, even if MVP launches for a single church.
2. Sensitive care workflows are separated from public content.
3. Household structure matters because church participation often happens relationally, not individually.
4. Visibility and privacy need to be first-class fields, not afterthoughts.
5. Invitation-based access should keep onboarding simple while avoiding open registration.
6. Prayer request visibility must always be mediated by manual admin approval.

## 6. UI Principles

1. Calm over crowded: show fewer things, more clearly.
2. Large tap targets: optimize for shaky hands, older eyes, and quick use after service.
3. Obvious hierarchy: the single most important update should be unmistakable.
4. Familiar wording: prefer `Need a ride` over abstract system labels.
5. Trustworthy surfaces: show timestamps, author/source, and status labels like `Official`, `Updated today`, or `Leaders only`.
6. Gentle warmth: use welcoming typography, soft contrast, and restrained color without feeling childish or overly “churchy.”
7. Accessibility first: large type scale, high contrast, screen reader support, predictable focus order.
8. Progressive disclosure: keep detail one tap away rather than all on one screen.
9. Consistency across generations: younger users should find the app refined; older users should find it understandable.
10. The Prayer page should feel especially low-friction and familiar to anyone who has used a modern input-first interface.

### Visual direction
- Apple-like clarity in spacing and restraint
- Notion-like readability and calm structure
- Linear-like precision in states and hierarchy
- ChatGPT-like confidence and simplicity in the Prayer input experience only

### Recommended design system tone
- Warm neutrals with one trustworthy accent color
- Rounded but not playful components
- Strong spacing rhythm
- Minimal icon dependence
- Text-forward cards and lists

## 7. Interaction Principles

1. One primary action per screen.
2. Reduce typing whenever possible.
3. Prefer explicit states over hidden logic.
4. Confirm important actions with plain language.
5. Avoid infinite feeds, read receipts, and social pressure mechanics.
6. Use notifications sparingly and in digest form when possible.
7. Offer offline-friendly flows for worship-day use.
8. Make every coordination loop close cleanly: request, accept, confirm, complete.
9. Use invitation codes and QR codes to remove registration friction for members.

### Key interaction patterns
- Quick actions on Home: `View this week`, `RSVP`, `Need prayer`, `Volunteer`
- RSVP with three states: `Going`, `Maybe`, `Cannot attend`
- Prayer page with a scrollable feed, fixed bottom input bar, tap-to-focus keyboard behavior, and expandable input
- Prayer submission confirmation that clearly explains the request is pending approval
- Volunteer signup with explicit slot counts and contact expectations
- Admin publishing flow with preview before publish
- Invitation onboarding via QR code scan or short invitation code entry

## 8. MVP Scope

### MVP objective
Ship the smallest product that becomes the single trusted community hub for one church, replacing fragmented weekly communication and increasing real-world participation.

### MVP user-facing features
1. Home dashboard with pinned update, worship times, next event, and Community Updates
2. Announcements feed with pinned and archived items
3. Events list and event detail pages
4. RSVP for events
5. Prayer page with approved public prayer requests and low-friction submission
6. Care request submission with leader moderation
7. Volunteer opportunity listing and signup
8. Installable mobile-first web app experience
9. Invitation-based member access via QR code or invitation code only

### MVP admin features
1. Secure admin authentication
2. Create, edit, publish, and archive announcements
3. Create and manage events
4. Manually review and approve prayer requests before publication
5. Create volunteer opportunities linked to events
6. Basic member, invitation, and role management
7. Create and publish Community Updates
8. Send limited push notifications or SMS/email digests for important updates

### MVP explicitly out of scope
1. Real-time chat or group messaging
2. Rich social feed with comments and reactions
3. Sermon streaming platform
4. Donations / payments
5. Full pastoral CRM
6. AI assistant, AI summaries, AI moderation, AI chat, and AI search
7. Member-to-member messaging
8. Multi-campus complexity beyond basic church tenancy

### MVP success metrics
1. 60%+ of active households view weekly updates in-platform
2. 40%+ of event responses happen through the platform
3. 25%+ of volunteer needs are filled through the platform
4. Admin time spent repeating logistics drops meaningfully week over week
5. Older adult adoption reaches a defined threshold, such as 30% of senior households using the home screen shortcut monthly

## 9. Future Roadmap

### Phase 2
1. Household-level attendance and participation views
2. Ride coordination with assignment workflow
3. Meal train templates
4. Ministry-specific pages
5. Digest personalization by ministry or life stage
6. Printable companion summaries for offline distribution
7. Directory with privacy controls if not included in MVP

### Phase 3
1. Care team workboard
2. Volunteer scheduling recurrence
3. Follow-up tasks for leaders after events or care requests
4. Multilingual support
5. Smart onboarding for new members
6. Deeper accessibility settings such as large-text mode toggle

### Phase 4
1. Cross-church or district-level templates
2. Sermon and study resource hub
3. Family coordination features
4. Integrations with church management systems

## 10. Technical Architecture

### Product architecture recommendation
- Frontend: Next.js App Router PWA
- Backend: Supabase or Postgres-backed API layer
- Auth: invitation QR code or invitation code onboarding with session-based access and role-based admin controls
- Storage: object storage for images and documents
- Notifications: web push first, optional SMS/email via provider integration
- Hosting: Vercel for frontend, managed Postgres and storage for backend

### Why this fits
1. The existing workspace already points toward a mobile-first Next.js PWA.
2. A PWA keeps install friction low for older adults.
3. Postgres supports relational church data such as households, roles, events, and care assignments.
4. Role-based moderation is easier to manage with structured backend policies.
5. Invitation-based access fits the need for a closed, trusted church environment without forcing email/password registration.

### System components

#### Client
- Next.js app
- Responsive mobile-first UI
- PWA manifest and service worker
- Accessibility-focused component system

#### API / application layer
- Server actions or REST/GraphQL endpoints for content, events, RSVPs, prayer, care, and volunteer workflows
- Permission checks by church, role, and visibility level
- Audit logging for admin actions
- Invitation claim and session issuance flows
- Manual prayer approval workflow

#### Data layer
- Postgres schema with row-level security
- Object storage for uploaded images and attachments
- Background jobs for reminders and notification digests

#### Admin operations
- Prayer approval queue
- Publish scheduling
- Notification dispatch
- Reporting for adoption and participation metrics

### Security and privacy requirements
1. Role-based access controls for member, volunteer, leader, and admin roles
2. Sensitive care data separated from public prayer content
3. Audit logging on publish, edit, approve, and delete actions
4. Consent-based directory visibility controls
5. Data retention policy for care requests and personal information
6. Invitation codes and QR payloads must expire, be revocable, and be protected against reuse

### Non-functional requirements
1. Home screen should load quickly on older mobile devices and weak church Wi-Fi
2. Core content should be readable with minimal network dependency after first load
3. The app should support large text and keyboard navigation
4. Publishing flows should be operable by non-technical church staff
5. Architecture should support scaling from one church to many without a rewrite
6. Prayer submission and approval flows should remain fast and easy on mobile devices

## Recommendation

The strongest MVP is not a broad “community platform” in the consumer-social sense. It is a trusted church awareness and participation layer that combines:

1. Official weekly communication
2. Event participation
3. Prayer and care coordination
4. Volunteer mobilization
5. Community Updates that reflect real church life without becoming a social network

This keeps the product differentiated from messaging apps while directly serving the intergenerational church problem.

## Open product decisions for approval

1. Should the first release target one church or be designed from day one as a reusable multi-church SaaS?
2. Should the directory be included in MVP or delayed for privacy and simplicity reasons?
3. Should care coordination in MVP include rides and meals, or begin with prayer and simple help requests only?
4. Should notifications be web-push only at first, or should SMS/email be included in MVP?
