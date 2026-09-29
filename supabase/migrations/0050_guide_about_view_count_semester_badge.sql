-- EWU StudyHub Update 0050
-- Guide content rewrite + About story entry point.
-- This migration intentionally keeps the existing guide tables/Admin editor and
-- only refreshes published content/order, with redundant legacy items archived.

do $$
begin
  -- Keep the Guide focused: merge/archive duplicate operational explanations.
  update public.guide_sections
  set status = 'archived', updated_at = now()
  where slug in (
    'general-download',
    'general-saved-requests',
    'seller-pricing',
    'seller-payout',
    'admin-storage',
    'admin-finance'
  );

  -- Refresh the main general sections with action-first, conversational copy.
  update public.guide_sections
  set
    section_group = 'general',
    title = 'শুরু করবেন যেভাবে',
    summary = 'প্রথমবার এলে আগে বুঝে নিন কোথায় Resource খুঁজবেন, কীভাবে Preview করবেন এবং পরে চাইলে নিজের Resource নিয়েও কাজ করবেন।',
    what_is = 'EWU StudyHub-এ Guest হিসেবে public অংশ দেখা যায়। Login করলে নিজের Saved, Purchase, Notifications এবং অন্যান্য account-based feature ব্যবহার করতে পারবেন। Seller হলে Resource Upload ও selling workflow যোগ হবে।',
    how_to = 'প্রথমে Home থেকে Search বা Courses-এ যান। প্রয়োজনের Resource খুলে Preview/Details দেখুন। নিজের Resource share করতে চাইলে Guide-এর Seller section থেকে শুরু করুন।',
    benefits = 'পুরো website শেখার আগে শুধু আপনার দরকারি flow বুঝে কাজ শুরু করতে পারবেন।',
    notes = 'কিছু action-এর জন্য Login বা Seller access প্রয়োজন হতে পারে।',
    action_label = 'Open Dashboard',
    action_href = '/dashboard',
    required_access = 'none',
    locked_message = null,
    locked_action_label = null,
    locked_action_href = null,
    status = 'published',
    sort_order = 20,
    updated_at = now()
  where slug = 'general-getting-started';

  update public.guide_sections
  set
    section_group = 'general',
    title = 'Account & Profile',
    summary = 'Profile ও account information ঠিক রাখলে verification, seller workflow এবং support সহজ থাকে।',
    what_is = 'Account section-এ profile, contact information, EWU identity এবং প্রয়োজনীয় account settings manage করা হয়।',
    how_to = 'Account খুলে আপনার information review করুন এবং প্রয়োজনীয় verification/phone step থাকলে complete করুন।',
    benefits = 'সঠিক information থাকলে account-related action ও support দ্রুত করা সহজ হয়।',
    notes = 'নিজের account access ও sensitive information অন্যের সঙ্গে share করবেন না।',
    action_label = 'Open Account',
    action_href = '/account',
    required_access = 'none',
    status = 'published',
    sort_order = 30,
    updated_at = now()
  where slug = 'general-account';

  update public.guide_sections
  set
    section_group = 'general',
    title = 'Course & Department',
    summary = 'Course বা Department ধরে Resource discovery করলে প্রয়োজনের material খুঁজে পাওয়া সহজ হয়।',
    what_is = 'Courses এবং Departments StudyHub-এর academic structure তৈরি করে; Resource এই structure-এর সঙ্গে যুক্ত থাকে।',
    how_to = 'Courses page থেকে Course খুলুন, তারপর related Resource দেখুন। চাইলে Department ধরে আরও Course explore করুন।',
    benefits = 'Random file list-এর বদলে আপনার academic context অনুযায়ী Resource খুঁজতে পারবেন।',
    notes = 'Course code বা name মিলিয়ে Resource-এর context যাচাই করুন।',
    action_label = 'Browse Courses',
    action_href = '/courses',
    required_access = 'none',
    status = 'published',
    sort_order = 40,
    updated_at = now()
  where slug = 'general-courses';

  update public.guide_sections
  set
    section_group = 'general',
    title = 'Search & Filters',
    summary = 'Keyword, Course code, Course name বা natural query দিয়ে Resource খুঁজুন।',
    what_is = 'Search আপনার প্রয়োজনের Resource দ্রুত বের করার primary discovery tool। AI-powered Resource discovery থাকায় natural language দিয়েও search করা যায়।',
    how_to = 'Search box-এ যা দরকার লিখুন। Course, Department, pricing বা available Filter ব্যবহার করে result আরও narrow করুন।',
    benefits = 'কম result scan করে আপনার প্রয়োজনের Resource দ্রুত shortlist করতে পারবেন।',
    notes = 'Result দেখার সময় title-এর পাশাপাশি Course, category, semester এবং description মিলিয়ে দেখুন।',
    action_label = 'Search Resources',
    action_href = '/search',
    required_access = 'none',
    status = 'published',
    sort_order = 50,
    updated_at = now()
  where slug = 'general-search';

  update public.guide_sections
  set
    section_group = 'general',
    title = 'Resource Preview',
    summary = 'কেনার আগে available Preview দেখে Resource আপনার প্রয়োজনের সঙ্গে মিলছে কি না যাচাই করুন।',
    what_is = 'Preview হলো Resource-এর available sample দেখার সুবিধা। Paid Resource-এর ক্ষেত্রে Preview সম্পূর্ণ original file নয়।',
    how_to = 'Resource detail page-এ Preview option ব্যবহার করুন এবং topic, quality ও visible sample দেখে সিদ্ধান্ত নিন।',
    benefits = 'Purchase-এর আগে Resource-এর suitability বোঝা সহজ হয়।',
    notes = 'Preview limited হতে পারে; protected original file authorization ছাড়া পাওয়া যাবে না।',
    action_label = 'Search & Preview',
    action_href = '/search',
    required_access = 'none',
    status = 'published',
    sort_order = 60,
    updated_at = now()
  where slug = 'general-preview';

  update public.guide_sections
  set
    section_group = 'student',
    title = 'Save, Purchase & Access',
    summary = 'ভালো Resource Save করে রাখুন; Paid হলে Preview দেখে Purchase করুন এবং approval-এর পরে authorized access নিন।',
    what_is = 'Save পরে ফিরে আসতে সাহায্য করে। Purchase-এর জন্য seller price, applicable platform fee ও buyer pays amount দেখা যায়। Approved Purchase-এর পরে View/Download access পাওয়া যায়।',
    how_to = 'Resource Save করতে Save option ব্যবহার করুন। Paid Resource হলে Preview দেখে Checkout-এ যান, payment submit করুন এবং Notifications/Purchases থেকে status দেখুন।',
    benefits = 'একই Resource বারবার খুঁজতে হয় না এবং Purchase-এর পর access history পরিষ্কার থাকে।',
    notes = 'Payment pending থাকলে duplicate payment submit করবেন না। Paid original access approval-এর ওপর নির্ভর করে।',
    action_label = 'Browse Resources',
    action_href = '/search',
    required_access = 'authenticated_student',
    locked_message = 'Save বা Purchase workflow ব্যবহার করতে আগে Login করতে হবে।',
    locked_action_label = 'Login করুন',
    locked_action_href = '/login',
    status = 'published',
    sort_order = 70,
    updated_at = now()
  where slug = 'general-purchase';

  update public.guide_sections
  set
    section_group = 'general',
    title = 'Notifications & Support',
    summary = 'Purchase, approval, request, seller activity এবং গুরুত্বপূর্ণ system update Notifications-এ দেখুন; সমস্যা হলে Support ব্যবহার করুন।',
    what_is = 'Notifications status change ও important activity জানায়। Support সমস্যাকে structuredভাবে জানাতে সাহায্য করে।',
    how_to = 'Notification খুলে দরকারি linked action নিন। Support দরকার হলে clear description দিন।',
    benefits = 'Pending কাজ ও important update মিস করার সম্ভাবনা কমে।',
    notes = 'Payment, approval বা security-related notification সময়মতো দেখুন।',
    action_label = 'Open Notifications',
    action_href = '/notifications',
    required_access = 'none',
    status = 'published',
    sort_order = 120,
    updated_at = now()
  where slug = 'general-notifications';

  -- Seller flow: no bKash during verification. bKash is kept for paid publishing/payout readiness.
  update public.guide_sections
  set
    section_group = 'seller',
    title = 'Seller হওয়া',
    summary = 'নিজের useful Academic Resource share বা sell করতে Seller workflow দিয়ে শুরু করুন।',
    what_is = 'Eligible Student Seller verification complete করে Resource Upload ও selling workflow ব্যবহার করতে পারেন। Manual EWU verification-এর সময় bKash Number লাগে না।',
    how_to = 'EWU student email এবং required student ID document দিয়ে verification request submit করুন। Admin review-এর পরে Seller access পাওয়া যায়।',
    benefits = 'Student account থেকেই নিজের Resource-এর value তৈরি এবং eligible হলে Earnings-এর opportunity পাওয়া যায়।',
    notes = 'Paid Resource publish বা Earnings/Payout-এর প্রয়োজন অনুযায়ী পরে Payment Settings-এ bKash যোগ করতে হবে।',
    action_label = 'Become a Seller',
    action_href = '/dashboard/become-seller',
    required_access = 'authenticated_student',
    locked_message = 'Seller workflow শুরু করতে আগে Login করুন।',
    locked_action_label = 'Login করুন',
    locked_action_href = '/login',
    status = 'published',
    sort_order = 140,
    updated_at = now()
  where slug = 'seller-overview';

  update public.guide_sections
  set
    section_group = 'seller',
    title = 'Resource Upload',
    summary = 'নিজের Resource Upload করার সময় file, Course, academic information, semester/year এবং pricing ঠিক রাখুন।',
    what_is = 'Upload form-এ Resource file, title, description, Course, category, semester/year এবং pricing information দেওয়া হয়।',
    how_to = 'File select করুন, selected file Preview করে verify করুন, তারপর required information পূরণ করে Submit for review করুন।',
    benefits = 'ভুল submission কমে এবং future buyer-এর জন্য Resource-এর context পরিষ্কার থাকে।',
    notes = 'এক batch-এ সর্বোচ্চ {{MAX_UPLOAD_BATCH_FILES}}টি file এবং প্রতিটি file-এর {{MAX_UPLOAD_FILE_SIZE_MB}}MB size limit আছে; ZIP, RAR বা 7Z archive দেওয়া যাবে না। Seller verification-এর সময় bKash লাগে না।',
    action_label = 'Upload Resource',
    action_href = '/dashboard/upload',
    required_access = 'seller',
    locked_message = 'Resource Upload করতে আগে Seller access প্রয়োজন।',
    locked_action_label = 'Become a Seller',
    locked_action_href = '/dashboard/become-seller',
    status = 'published',
    sort_order = 150,
    updated_at = now()
  where slug = 'seller-upload';

  update public.guide_sections
  set
    section_group = 'seller',
    title = 'Review & Publish',
    summary = 'Submit করার পরে Resource publish হওয়ার আগে review-এর মধ্য দিয়ে যায়।',
    what_is = 'Pending review মানে Resource moderation queue-এ আছে। Admin approve করলে publish হবে; reject হলে reason অনুযায়ী correction করা যায়।',
    how_to = 'Seller dashboard বা Notifications থেকে status দেখুন। Rejected হলে reason পড়ে প্রয়োজনীয় change করে আবার submit করুন।',
    benefits = 'Review marketplace-এর Resource quality ও trust বজায় রাখতে সাহায্য করে।',
    notes = 'Rejection reason না বুঝে একই Resource repeatedly submit করবেন না।',
    action_label = 'Seller Dashboard',
    action_href = '/dashboard',
    required_access = 'seller',
    locked_message = 'Review status দেখতে Seller access প্রয়োজন।',
    locked_action_label = 'Become a Seller',
    locked_action_href = '/dashboard/become-seller',
    status = 'published',
    sort_order = 160,
    updated_at = now()
  where slug = 'seller-approval';

  update public.guide_sections
  set
    section_group = 'seller',
    title = 'Earnings & Payout',
    summary = 'Approved Paid Sale থেকে Earnings তৈরি হয়; available earning থেকে eligible হলে payout request করা যায়।',
    what_is = 'Sales approved হলে seller earning financial records-এ তৈরি হয়। Wallet এবং Payout status সেই flow track করতে সাহায্য করে।',
    how_to = 'Sales/Earnings দেখে approved transaction মিলিয়ে নিন। Payout-এর আগে Payment Settings-এ valid bKash number রাখুন এবং eligible balance থেকে request দিন।',
    benefits = 'Sale → Earnings → Payout flow কোথায় আছে তা পরিষ্কারভাবে বোঝা যায়।',
    notes = 'Pending বা processing payout থাকলে duplicate request করবেন না। Seller verification-এর সময় bKash লাগে না; payout-এর জন্য valid bKash লাগে।',
    action_label = 'Open Sales',
    action_href = '/dashboard/sales',
    required_access = 'seller',
    locked_message = 'Earnings ও Payout দেখতে Seller access প্রয়োজন।',
    locked_action_label = 'Become a Seller',
    locked_action_href = '/dashboard/become-seller',
    status = 'published',
    sort_order = 170,
    updated_at = now()
  where slug = 'seller-sales';

  -- Admin content is intentionally one section to avoid repeating the same operations in three places.
  update public.guide_sections
  set
    section_group = 'admin',
    title = 'Admin',
    summary = 'Admin Panel থেকে Users, Sellers, Resources, Payments, Payouts, Reports, Notifications ও Storage-এর core operations manage করা হয়।',
    what_is = 'Admin-এর মূল কাজ হলো authoritative source record দেখে operational action নেওয়া, তারপর result verify করা।',
    how_to = 'Needs Attention বা pending work দেখুন → source record খুলুন → প্রয়োজনীয় action নিন → result verify করুন → audit/history মিলিয়ে নিন।',
    benefits = 'একই জায়গা থেকে controlledভাবে marketplace ও academic platform-এর গুরুত্বপূর্ণ operations manage করা যায়।',
    notes = 'Financial বা sensitive action-এর সময় stale UI balance-এর বদলে authoritative record ব্যবহার করুন। Storage cleanup-এর আগে dependency verify করুন।',
    action_label = 'Open Admin Panel',
    action_href = '/admin',
    required_access = 'admin',
    locked_message = 'এই section কেবল Admin account-এর জন্য।',
    locked_action_label = null,
    locked_action_href = null,
    status = 'published',
    sort_order = 220,
    updated_at = now()
  where slug = 'admin-operations';

  -- Add concise sections that were previously missing from the guide.
  insert into public.guide_sections (
    slug, section_group, title, summary, what_is, how_to, benefits, notes,
    action_label, action_href, required_access, locked_message, locked_action_label, locked_action_href,
    status, sort_order
  ) values
  (
    'general-resource-request', 'student', 'Resource Request',
    'প্রয়োজনীয় Resource খুঁজে না পেলে Request দিয়ে আপনার demand জানাতে পারেন।',
    'Resource Request marketplace-এ unmet academic need জানাতে সাহায্য করে।',
    'Request page-এ Course, topic, semester/year বা প্রয়োজনীয় detail পরিষ্কারভাবে লিখে submit করুন।',
    'আপনার মতো অন্য Student-এরও প্রয়োজন হতে পারে এমন Resource-এর demand platform জানতে পারে।',
    'Existing request status দেখে একই ধরনের duplicate request এড়িয়ে চলুন।',
    'Request a Resource', '/tools/resource-request', 'authenticated_student',
    'Resource Request ব্যবহার করতে আগে Login করতে হবে।', 'Login করুন', '/login', 'published', 190
  ),
  (
    'general-academic-tools', 'general', 'Academic Tools',
    'StudyHub-এর academic utilityগুলো দিয়ে semester planning ও academic tracking-এর কিছু কাজ এক জায়গা থেকে করতে পারেন।',
    'Academic Calendar, Deadline Tracker, Final Exam Schedule, Grade Calculator এবং Prerequisite Checker-এর মতো tools academic workflow-এর বিভিন্ন অংশে সাহায্য করে।',
    'Tools section থেকে প্রয়োজনের tool খুলে আপনার Course/semester-related information ব্যবহার করুন।',
    'Marketplace-এর বাইরে দৈনন্দিন academic planning-এর কিছু কাজও একই platform-এ রাখা যায়।',
    'Tool-এর result আপনার input-এর ওপর নির্ভর করে—প্রয়োজন হলে official academic source দিয়ে cross-check করুন।',
    'Open Academic Tools', '/tools/academic-calendar', 'none',
    null, null, null, 'published', 200
  )
  on conflict (slug) do update set
    section_group = excluded.section_group,
    title = excluded.title,
    summary = excluded.summary,
    what_is = excluded.what_is,
    how_to = excluded.how_to,
    benefits = excluded.benefits,
    notes = excluded.notes,
    action_label = excluded.action_label,
    action_href = excluded.action_href,
    required_access = excluded.required_access,
    locked_message = excluded.locked_message,
    locked_action_label = excluded.locked_action_label,
    locked_action_href = excluded.locked_action_href,
    status = excluded.status,
    sort_order = excluded.sort_order,
    updated_at = now();

  -- Concise A-Z overview: one intro + only the useful top-level capability/workflow cards.
  update public.guide_overview_items
  set
    role_scope = 'general',
    kind = 'intro',
    title = 'EWU StudyHub এক নজরে',
    summary = 'EWU StudyHub হলো EWU students-এর জন্য একটি Academic Resource Platform & Marketplace—যেখানে Resource খুঁজে পাওয়া, Preview, Save, Purchase এবং নিজের Resource Share/Sell করে value তৈরি করা যায়।',
    benefit = 'Student হিসেবে প্রয়োজনের Resource ব্যবহার করতে পারেন; নিজের Resource থাকলে Creator/Seller workflow-এ গিয়ে Earnings-এর opportunity তৈরি করতে পারেন।',
    action_label = 'Read the Full Story',
    action_href = '/about',
    required_access = 'none',
    locked_message = null,
    locked_action_label = null,
    locked_action_href = null,
    status = 'published',
    sort_order = 10,
    updated_at = now()
  where slug = 'overview-intro';

  update public.guide_overview_items
  set
    summary = 'Course, Department বা Search ব্যবহার করে প্রয়োজনের Resource খুঁজুন এবং available Preview দেখে shortlist করুন।',
    benefit = 'কম সময়ে relevant Resource খুঁজে পাওয়া সহজ হয়।',
    action_label = 'Search Resources', action_href = '/search',
    sort_order = 20, status = 'published', updated_at = now()
  where slug = 'overview-student-discover';

  update public.guide_overview_items
  set
    title = 'Student journey',
    summary = 'Search → Preview → Save/Purchase → Approval → View/Download।',
    benefit = 'Student হিসেবে মূল flow এক নজরে বোঝা যায়।',
    sort_order = 30, status = 'published', updated_at = now()
  where slug = 'overview-student-flow';

  update public.guide_overview_items
  set
    title = 'Seller হওয়া',
    summary = 'EWU verification → Admin review → Seller → Upload → Publish → Approved Sale → Earnings।',
    benefit = 'Student থেকে Resource Creator/Seller হওয়ার পথটা পরিষ্কার থাকে।',
    action_label = 'Become a Seller', action_href = '/dashboard/become-seller',
    required_access = 'authenticated_student',
    locked_message = 'Seller workflow শুরু করতে আগে Login করতে হবে।',
    locked_action_label = 'Login করুন', locked_action_href = '/login',
    sort_order = 40, status = 'published', updated_at = now()
  where slug = 'overview-seller-access';

  update public.guide_overview_items
  set
    title = 'Resource Upload',
    summary = 'File Preview করুন, Course ও semester/yearসহ metadata ঠিক করুন, তারপর review-এর জন্য Submit করুন।',
    benefit = 'ভালো metadata buyer-এর জন্য Resource-এর context পরিষ্কার করে।',
    sort_order = 50, status = 'published', updated_at = now()
  where slug = 'overview-seller-upload';

  update public.guide_overview_items
  set
    title = 'Earnings & Payout',
    summary = 'Approved Paid Sale থেকে Earnings তৈরি হয়; eligible balance থেকে Payout workflow ব্যবহার করা যায়।',
    benefit = 'Sale → Earnings → Payout flow কোথায় আছে তা বুঝতে সুবিধা হয়।',
    action_label = 'Open Sales', action_href = '/dashboard/sales',
    sort_order = 60, status = 'published', updated_at = now()
  where slug = 'overview-seller-finance';

  update public.guide_overview_items
  set
    title = 'Seller journey',
    summary = 'Verification → Upload → Review → Publish → Approved Sale → Earnings → Payout।',
    benefit = 'পুরো seller lifecycle একবারে বোঝা যায়।',
    sort_order = 70, status = 'published', updated_at = now()
  where slug = 'overview-seller-flow';

  update public.guide_overview_items
  set
    title = 'Admin operations',
    summary = 'Users, Sellers, Resources, Payments, Payouts, Reports, Notifications ও Storage-এর core operations manage করা যায়।',
    benefit = 'Operational কাজের জায়গাগুলো এক নজরে বোঝা যায়।',
    action_label = 'Open Admin', action_href = '/admin',
    sort_order = 80, status = 'published', updated_at = now()
  where slug = 'overview-admin-operations';

  update public.guide_overview_items
  set status = 'archived', updated_at = now()
  where slug in ('overview-student-purchase','overview-student-save-request','overview-student-notifications','overview-admin-finance','overview-admin-storage');

  -- Keep only one public Help CTA in the rendered Guide; contextual Info content remains available elsewhere in the product.
end $$;
