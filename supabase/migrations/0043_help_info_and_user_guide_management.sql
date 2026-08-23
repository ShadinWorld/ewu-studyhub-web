-- EWU StudyHub — Central Help / Info + General User Guide Management
-- Admin-controlled, bilingual-ready (currently Bangla content with English UI terms).

create table if not exists public.help_items (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  role_scope text not null default 'general' check (role_scope in ('general','student','seller','admin')),
  title text not null check (char_length(trim(title)) >= 2),
  intro text not null check (char_length(trim(intro)) >= 5),
  how_to text,
  benefits text,
  notes text,
  status text not null default 'published' check (status in ('draft','published','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_help_items_public_order
  on public.help_items(status, role_scope, sort_order, created_at desc);

alter table public.help_items enable row level security;

drop policy if exists "public can read published help" on public.help_items;
create policy "public can read published help"
  on public.help_items for select
  using ((status = 'published' and role_scope <> 'admin') or is_admin());

drop policy if exists "admins manage help" on public.help_items;
create policy "admins manage help"
  on public.help_items for all
  using (is_admin())
  with check (is_admin());

create table if not exists public.guide_sections (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  section_group text not null default 'general' check (section_group in ('general','student','seller','admin')),
  title text not null check (char_length(trim(title)) >= 2),
  summary text not null check (char_length(trim(summary)) >= 5),
  what_is text not null check (char_length(trim(what_is)) >= 5),
  how_to text,
  benefits text,
  notes text,
  action_label text,
  action_href text,
  required_access text not null default 'none' check (required_access in ('none','verified_student','seller','admin')),
  locked_message text,
  locked_action_label text,
  locked_action_href text,
  status text not null default 'published' check (status in ('draft','published','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_guide_sections_public_order
  on public.guide_sections(status, section_group, sort_order, created_at desc);

alter table public.guide_sections enable row level security;

drop policy if exists "public can read published guide" on public.guide_sections;
create policy "public can read published guide"
  on public.guide_sections for select
  using ((status = 'published' and section_group <> 'admin') or is_admin());

drop policy if exists "admins manage guide" on public.guide_sections;
create policy "admins manage guide"
  on public.guide_sections for all
  using (is_admin())
  with check (is_admin());

create or replace function public.touch_help_content_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_help_items_updated_at on public.help_items;
create trigger trg_help_items_updated_at
before update on public.help_items
for each row execute function public.touch_help_content_updated_at();

drop trigger if exists trg_guide_sections_updated_at on public.guide_sections;
create trigger trg_guide_sections_updated_at
before update on public.guide_sections
for each row execute function public.touch_help_content_updated_at();

insert into public.help_items (slug, role_scope, title, intro, how_to, benefits, notes, status, sort_order)
values
('dashboard_overview','general','Dashboard কীভাবে ব্যবহার করবেন','Dashboard হলো আপনার StudyHub-এর প্রধান কাজের জায়গা। এখান থেকে প্রয়োজনীয় section, recent activity এবং আপনার account-এর গুরুত্বপূর্ণ কাজগুলো দ্রুত খুঁজে নিতে পারবেন.','Dashboard-এর card, quick action এবং navigation ব্যবহার করে প্রয়োজনের জায়গায় যান। নতুন user হলে আগে Profile সম্পূর্ণ করুন, তারপর Courses, Search এবং Resource section ব্যবহার করুন.','এক জায়গা থেকে গুরুত্বপূর্ণ কাজ খুঁজে পাওয়ায় সময় কম লাগে এবং কোন কাজ pending আছে তা দ্রুত বোঝা যায়.','কোনো action কাজ না করলে আগে আপনার account status এবং প্রয়োজনীয় verification ঠিক আছে কি না দেখুন.','published',10),
('search_resources','general','Search ও Filter কীভাবে ব্যবহার করবেন','Search ব্যবহার করে Resource, Course code, Course name বা প্রয়োজনীয় keyword দিয়ে দ্রুত Resource খুঁজে নিতে পারবেন.','Search box-এ keyword দিন এবং প্রয়োজন অনুযায়ী Course, Department, pricing বা অন্য available Filter ব্যবহার করুন.','অপ্রয়োজনীয় Resource কম দেখে আপনার প্রয়োজনের Resource দ্রুত বের করতে পারবেন.','Search result দেখার সময় title-এর পাশাপাশি Course, category এবং description মিলিয়ে দেখুন.','published',20),
('resource_access','general','Resource Access কীভাবে কাজ করে','Resource-এর Free/Paid status, ownership এবং Preview/Download access আলাদা নিয়মে কাজ করে.','Resource detail page-এ price, preview এবং ownership status দেখুন। Paid Resource হলে purchase approval-এর পরে original access পাওয়া যায়.','Access rules পরিষ্কার থাকায় আপনি আগে থেকেই বুঝতে পারবেন কোন file এখনই দেখা বা download করা যাবে এবং কোনটির জন্য Purchase দরকার.','Resource owner নিজের Resource access করতে পারে; অন্য user-এর জন্য paid original authorization ছাড়া available নয়.','published',25),
('resource_preview','general','Resource Preview কীভাবে কাজ করে','Preview হলো কোনো Resource কেনার আগে তার available sample দেখে নেওয়ার সুবিধা। Paid Resource-এর ক্ষেত্রে Preview সাধারণত সম্পূর্ণ file নয়.','Resource detail page-এ Preview option ব্যবহার করুন। Preview দেখে file-এর topic, quality এবং আপনার প্রয়োজনের সাথে মিল যাচাই করুন.','কেনার আগে Resource আপনার প্রয়োজনের কিনা বুঝতে সাহায্য করে এবং ভুল purchase-এর ঝুঁকি কমায়.','Preview limited হতে পারে। Original protected file purchase অনুমোদন ছাড়া পাওয়া যাবে না.','published',30),
('purchase_resource','student','Paid Resource কীভাবে Purchase করবেন','Purchase করার আগে Resource-এর Preview, Seller Price, Platform Fee এবং Buyer Pays amount দেখে সিদ্ধান্ত নিন.','Checkout-এ গিয়ে প্রয়োজনীয় payment information দিন এবং payment submit করার পরে Purchase status দেখুন.','সঠিক Resource বেছে নিয়ে পরিষ্কারভাবে মোট খরচ বুঝে Purchase করতে পারবেন.','Payment pending থাকলে একই Resource-এর জন্য আবার payment submit করবেন না.','published',40),
('download_resource','general','Download কীভাবে কাজ করে','Download option আপনার access থাকা Resource-এর original file পাওয়ার জন্য ব্যবহার করা হয়.','Purchase approved হলে Purchases বা Resource detail থেকে Download করুন। Free Resource হলে অনুমোদিত download সরাসরি পাওয়া যেতে পারে.','আপনার প্রয়োজনীয় Resource device-এ রেখে পরে offline ব্যবহার করতে পারবেন.','Paid Resource-এর original file কেবল authorized access-এর পরে পাওয়া যায়.','published',50),
('saved_resources','student','Save ব্যবহার কেন করবেন','Save option দিয়ে পরে দরকার হতে পারে এমন Resource আলাদা করে রাখতে পারবেন.','Resource-এর Save option ব্যবহার করুন এবং পরে Saved section থেকে সেগুলো দেখুন.','বারবার Search না করে গুরুত্বপূর্ণ Resource দ্রুত খুঁজে পাবেন.','Save করা মানেই Purchase বা ownership নয়.','published',60),
('resource_requests','student','Resource Request কীভাবে কাজ করে','কোনো প্রয়োজনীয় Resource খুঁজে না পেলে Request দিয়ে অন্য user বা seller-এর কাছে প্রয়োজনটি জানাতে পারেন.','Request section-এ প্রয়োজনীয় Course, topic এবং কী ধরনের Resource দরকার তা পরিষ্কারভাবে লিখুন.','আপনার প্রয়োজনের Resource marketplace-এ আসার সম্ভাবনা বাড়ে.','একই ধরনের request বারবার না করে existing request status আগে দেখুন.','published',70),
('notifications','general','Notifications কী জানায়','Notifications আপনার account, Purchase, approval, seller activity, request এবং গুরুত্বপূর্ণ system update সম্পর্কে জানায়.','Notification খুলে নির্দিষ্ট message পড়ুন এবং প্রয়োজন হলে linked action-এ যান.','গুরুত্বপূর্ণ কাজ pending আছে কি না দ্রুত বুঝতে পারবেন.','Payment, approval বা security-related notification সময়মতো দেখে নিন.','published',80),
('account_profile','general','Profile ও Account কীভাবে ব্যবহার করবেন','Account section-এ আপনার profile information, verification এবং account-related settings থাকে.','Profile information update করুন এবং প্রয়োজনীয় phone, EWU email বা verification status সম্পূর্ণ রাখুন.','সঠিক profile information থাকলে verification, seller workflow এবং support অনেক সহজ হয়.','অপ্রয়োজনীয় personal information share করবেন না এবং নিজের account access অন্যকে দেবেন না.','published',90),
('become_seller','seller','Seller হতে কী প্রয়োজন','Seller হলে approved Resource upload করে marketplace-এর মাধ্যমে earning করার সুযোগ পাবেন.','Account ও প্রয়োজনীয় verification সম্পূর্ণ করে Become a Seller workflow অনুসরণ করুন.','নিজের useful study material share করে earning করার সুযোগ তৈরি হবে এবং Student হিসেবে platform-এর অন্য সুবিধাগুলোও ব্যবহার করা যাবে.','Seller হওয়ার আগে file quality, copyright এবং pricing rules বুঝে নিন.','published',100),
('seller_upload','seller','Resource Upload কীভাবে করবেন','Upload করার সময় Resource-এর file, Course, title, description, category এবং pricing সঠিকভাবে দেওয়া গুরুত্বপূর্ণ.','File select করুন, selected file Preview করে ভুল থাকলে Remove করুন, তারপর Course, details, pricing এবং অন্যান্য required information পূরণ করে Submit for review করুন.','সঠিক information দিলে review দ্রুত বুঝতে সুবিধা হয় এবং students Resource সম্পর্কে পরিষ্কার ধারণা পায়.','এক batch-এ সর্বোচ্চ {{MAX_UPLOAD_BATCH_FILES}}টি file এবং প্রতিটি file-এর {{MAX_UPLOAD_FILE_SIZE_MB}}MB size limit মেনে চলুন। ZIP, RAR বা 7Z archive দেওয়া যাবে না.','published',110),
('seller_pricing','seller','Pricing কীভাবে কাজ করে','Seller নিজের Resource-এর Seller Price নির্ধারণ করেন। Buyer-এর মোট payable amount-এর সাথে applicable Platform Fee যোগ হতে পারে.','Price set করার আগে Resource-এর value, quality এবং buyer-এর জন্য usefulness বিবেচনা করুন.','পরিষ্কার pricing buyer-এর trust বাড়ায় এবং sale-এর হিসাব বুঝতে সহজ হয়.','Seller Price আর Buyer Pays একই সংখ্যা নাও হতে পারে.','published',120),
('seller_sales','seller','Sales ও Earnings কীভাবে দেখবেন','Sales section-এ approved Purchase থেকে আপনার earning-এর তথ্য দেখতে পারবেন.','Sales বা Earnings section-এ transaction status, seller earning এবং payout-related information দেখুন.','কোন Resource থেকে sale হচ্ছে এবং earning কীভাবে তৈরি হচ্ছে তা পরিষ্কার থাকে.','UI-এর cached balance-এর বদলে authoritative transaction status-কে গুরুত্ব দিন.','published',130),
('wallet_payout','seller','Wallet ও Payout কীভাবে কাজ করে','Wallet আপনার seller earning-এর summary দেখায় এবং eligible earning payout workflow-এর মাধ্যমে receive করা যায়.','Payment এবং seller eligibility অনুযায়ী Wallet ও Payout status দেখুন. প্রয়োজনীয় Payment Settings সম্পূর্ণ রাখুন.','Earning এবং payout status আলাদা করে বুঝতে পারবেন এবং payment-related confusion কমবে.','Pending বা processing payout থাকলে একই amount-এর জন্য duplicate action করবেন না.','published',140),
('admin_moderation','admin','Admin Moderation কীভাবে কাজ করে','Admin uploaded Resource, seller verification, payment এবং report review করে marketplace-এর quality ও security বজায় রাখেন.','Pending queue থেকে item খুলে file, seller, Course, pricing এবং policy match যাচাই করে appropriate action নিন.','Consistent review করলে students ভালো Resource পায় এবং marketplace-এর trust বজায় থাকে.','কোনো moderation decision নেওয়ার আগে authoritative record ও original workflow check করুন.','published',150),
('admin_storage','admin','Storage Health কীভাবে বুঝবেন','Storage Health দেখায় কোন bucket-এ কত file রাখা আছে, usage কীভাবে বাড়ছে এবং কোন object cleanup-এর candidate হতে পারে.','Storage page-এ Originals, Previews, Thumbnails, growth trend এবং orphan candidates দেখুন.','Storage আগেভাগে monitor করলে quota pressure এবং unnecessary duplicate file কমানো যায়.','Storage, Egress এবং Processing আলাদা usage dimension—একটি বাড়লেই অন্যটি একইভাবে বাড়বে এমন নয়.','published',160)
on conflict (slug) do update set role_scope=excluded.role_scope, title=excluded.title, intro=excluded.intro, how_to=excluded.how_to, benefits=excluded.benefits, notes=excluded.notes, status=excluded.status, sort_order=excluded.sort_order;

insert into public.guide_sections (
  slug, section_group, title, summary, what_is, how_to, benefits, notes,
  action_label, action_href, required_access, locked_message, locked_action_label, locked_action_href,
  status, sort_order
)
values
('general-getting-started','general','Getting Started','StudyHub-এ প্রথমবার এলে কোন জিনিসগুলো আগে বুঝবেন এবং কোথা থেকে শুরু করবেন।','EWU StudyHub হলো Student-focused marketplace ও study ecosystem যেখানে Course অনুযায়ী Resource খোঁজা, Preview, Purchase, Download, Save, Request এবং Seller workflow ব্যবহার করা যায়.','প্রথমে Account সম্পূর্ণ করুন। এরপর Courses বা Search থেকে Resource দেখুন এবং প্রয়োজন অনুযায়ী Guide-এর অন্য section পড়ুন.','শুরু থেকেই সঠিক workflow জানলে ভুল action কম হবে এবং প্রয়োজনীয় feature দ্রুত খুঁজে পাওয়া সহজ হবে.','আপনার account status বা verification pending থাকলে কিছু action সীমিত থাকতে পারে.','Open Dashboard','/dashboard','none',null,null,null,'published',10),
('general-account','general','Account & Profile','Account-এর basic information ঠিক রাখলে platform-এর বিভিন্ন workflow smooth থাকে।','Account section-এ profile, contact information, verification এবং account-related settings manage করা হয়.','Account খুলে প্রয়োজনীয় information review করুন এবং required phone বা verification step থাকলে complete করুন.','সঠিক information থাকলে verification, Seller workflow এবং support সহজ হয়.','Password বা account access অন্যকে দেবেন না.','Open Account','/account','none',null,null,null,'published',20),
('general-courses','general','Courses ও Departments','Course ও Department ব্যবহার করে নির্দিষ্ট academic area-এর Resource খুঁজে নিতে পারবেন।','Courses academic content-কে সাজানোভাবে দেখায় এবং Department অনুযায়ী Resource discovery সহজ করে.','Courses বা Departments থেকে আপনার subject area নির্বাচন করে Resource list দেখুন.','অনেক বড় Search result-এর বদলে নির্দিষ্ট academic context-এ Resource খুঁজতে পারবেন.','Course code যেমন CSE303 ব্যবহার করলে Search আরও নির্দিষ্ট হয়.','Browse Courses','/courses','none',null,null,null,'published',30),
('general-search','general','Search & Filters','Search এবং Filter ব্যবহার করে আপনার দরকারি Resource দ্রুত খুঁজে বের করুন।','Search title, Course code, Course name বা keyword-এর ভিত্তিতে Resource খুঁজে দেয়। Filter result আরও নির্দিষ্ট করে.','Keyword লিখে Search করুন, তারপর Course, Department, pricing বা available Filter ব্যবহার করুন.','Relevant Resource দ্রুত পাওয়া যায় এবং unnecessary browsing কমে.','শুধু title নয়, Course ও description মিলিয়ে Resource নির্বাচন করুন.','Search Resources','/search','none',null,null,null,'published',40),
('general-preview','general','Preview & Resource Access','কোনো Resource কেনার আগে available Preview দেখে suitability যাচাই করুন।','Preview হলো safe sample view; Paid Resource-এর original file purchase approval-এর আগে protected থাকে.','Resource detail page থেকে Preview খুলুন এবং sample pages বা supported preview দেখুন.','কেনার আগে content quality ও topic match বোঝা যায়, ফলে ভুল Purchase-এর risk কমে.','Preview complete file-এর replacement নয়.','Open Search','/search','none',null,null,null,'published',50),
('general-purchase','student','Purchase & Payment','Paid Resource নেওয়ার আগে price breakdown বুঝে Purchase করুন।','Seller Price, applicable Platform Fee এবং Buyer Pays amount মিলিয়ে মোট payable amount বোঝা যায়.','Resource select করে Checkout-এ যান, payment information submit করুন এবং Purchase status Notifications/Purchases-এ দেখুন.','মোট খরচ পরিষ্কার থাকে এবং payment status track করা সহজ হয়.','Pending payment থাকলে duplicate payment submit করবেন না.','Open Purchases','/purchases','none',null,null,null,'published',60),
('general-download','student','Download & Purchases','Approved Purchase-এর Resource পরে আবার খুঁজে ব্যবহার করতে পারবেন।','Purchases section আপনার completed purchase-এর history ও authorized access দেখায়.','Purchase approved হলে Purchase detail থেকে View বা Download ব্যবহার করুন.','একবার approved হলে Resource বারবার খুঁজে না নিয়ে Purchases থেকে access পাওয়া সহজ হয়.','Original file access authorization-এর ওপর নির্ভর করে.','Open Purchases','/purchases','none',null,null,null,'published',70),
('general-saved-requests','student','Saved & Resource Requests','পছন্দের Resource Save করুন এবং প্রয়োজনীয় unavailable material-এর জন্য Request দিন।','Save পরে দ্রুত ফিরে আসতে সাহায্য করে, আর Request নতুন Resource-এর প্রয়োজন জানাতে ব্যবহার করা হয়.','Resource save করতে Save ব্যবহার করুন। না পাওয়া material-এর জন্য Requests section-এ পরিষ্কার description দিন.','সময় বাঁচে এবং marketplace-এ আপনার academic demand প্রকাশ পায়.','Duplicate request করার আগে existing request status দেখুন.','Open Requests','/requests','none',null,null,null,'published',80),
('general-notifications','general','Notifications & Support','Important account ও marketplace update মিস না করার জন্য Notifications এবং Support ব্যবহার করুন।','Notifications system event জানায় এবং Support সমস্যা বা question structuredভাবে admin-এর কাছে পাঠাতে সাহায্য করে.','Notification খুলে linked action করুন। সমস্যা হলে Support থেকে category অনুযায়ী request দিন.','Pending কাজ, payment, approval এবং support status সময়মতো বোঝা যায়.','Security বা payment-related notification ignore করবেন না.','Open Notifications','/notifications','none',null,null,null,'published',90),
('seller-overview','seller','Seller System','Seller workflow Student-এর পাশাপাশি additional Resource selling features দেয়।','Seller হয়ে approved Resource upload, pricing, sales, earning ও payout workflow ব্যবহার করা যায়.','Become a Seller/verification complete করে Seller features ব্যবহার করুন.','Useful study material share করে earning করার সুযোগ পাওয়া যায় এবং Student features-ও ব্যবহার করা যায়.','Seller feature ব্যবহার করতে account ও verification status অনুযায়ী eligibility প্রয়োজন.','Open Seller Dashboard','/dashboard','seller','Seller features ব্যবহার করতে আগে Seller হতে হবে।','Become a Seller','/dashboard/become-seller','published',100),
('seller-upload','seller','Resource Upload','Resource upload-এর সময় file ও academic information সঠিক রাখা সবচেয়ে গুরুত্বপূর্ণ।','Upload form-এ title, description, Course, category, files, semester/year এবং pricing information দেওয়া হয়.','File select করে Preview করুন, ভুল হলে Remove করুন, তারপর required fields পূরণ করে Submit for review করুন.','সঠিক metadata দিলে students Resource বুঝতে পারে এবং moderation সহজ হয়.','সর্বোচ্চ {{MAX_UPLOAD_BATCH_FILES}}টি file per batch; প্রতি file সর্বোচ্চ {{MAX_UPLOAD_FILE_SIZE_MB}}MB; archive file দেওয়া যাবে না.','Upload Resource','/dashboard/upload','seller','Resource upload করতে আগে Seller হওয়া প্রয়োজন।','Become a Seller','/dashboard/become-seller','published',110),
('seller-approval','seller','Review & Approval','Submit করার পরে Resource admin review-এর মধ্য দিয়ে published হতে পারে।','Pending review মানে Resource marketplace-এ final publish হওয়ার আগে moderation queue-এ আছে.','Notifications বা Seller Resource list থেকে status দেখুন। Rejected হলে reason পড়ে প্রয়োজনীয় correction করুন.','Review workflow quality ও marketplace trust বজায় রাখতে সাহায্য করে.','Repeatedly একই file submit না করে rejection reason আগে বুঝুন.','Seller Resources','/dashboard','seller','Seller Resource workflow দেখতে আগে Seller হতে হবে।','Become a Seller','/dashboard/become-seller','published',120),
('seller-sales','seller','Sales, Earnings & Wallet','Seller হিসেবে sale হওয়ার পরে earning কোথা থেকে আসছে তা track করুন।','Sales, Earnings ও Wallet pages transaction ও payout status বোঝার জন্য ব্যবহার হয়.','Sales detail খুলে Purchase, seller earning এবং payout-related status দেখুন.','আপনার earning-এর flow transparentভাবে বোঝা যায় এবং হিসাব মিলানো সহজ হয়.','Pending/processing payout থাকলে duplicate action করবেন না.','Open Sales','/dashboard/sales','seller','Sales & earnings দেখতে আগে Seller হতে হবে।','Become a Seller','/dashboard/become-seller','published',130),
('seller-payout','seller','Payout & Payment Settings','Eligible seller earning payout workflow-এ transfer হওয়ার জন্য Payment Settings সঠিক রাখা জরুরি।','Payment Settings-এ payout-এর প্রয়োজনীয় payment information রাখা হয় এবং approved earning payout statusে দেখা যায়.','Payment Settings complete করুন এবং Payout page-এ status monitor করুন.','Payout delay বা missing setup দ্রুত ধরা যায়.','Payout amount authoritative transaction record-এর সাথে সম্পর্কিত; শুধু cached wallet value ধরে সিদ্ধান্ত নেবেন না.','Payment Settings','/dashboard/payment-settings','seller','Payout setup ব্যবহার করতে আগে Seller হতে হবে।','Become a Seller','/dashboard/become-seller','published',140),
('admin-operations','admin','Admin Operations','Admin account-এ moderation, payment, seller, storage ও support operations পরিচালিত হয়।','Admin Panel marketplace-এর authoritative operational controls রাখে.','Needs Attention, Pending Work এবং individual management pages ব্যবহার করে queue অনুযায়ী কাজ করুন.','System-এর গুরুত্বপূর্ণ workflow এক জায়গা থেকে পরিচালনা করা যায়.','Sensitive action করার আগে source record, role এবং authorization যাচাই করুন.','Open Admin Panel','/admin','admin','এই section কেবল Admin account-এর জন্য।',null,null,'published',200),
('admin-storage','admin','Storage Health','Storage page-এ file growth, preview usage, orphan candidates এবং usage trend monitor করুন।','Storage Health physical stored objects এবং related monitoring metrics দেখায়.','Originals, Previews, Thumbnails ও growth trend দেখুন এবং cleanup candidate যাচাই করুন.','Storage quota pressure আগেভাগে বোঝা যায় এবং unnecessary object cleanup করা যায়.','Storage, Egress ও Processing আলাদা concern; কোনো file delete করার আগে financial/history dependency check করুন.','Open Storage','/admin/storage','admin','Storage management কেবল Admin account-এর জন্য।',null,null,'published',210),
('admin-finance','admin','Payments & Payouts','Admin financial pages Purchase, platform fee, seller earning এবং payout workflow যাচাই করতে ব্যবহার হয়।','Payment verification ও payout completion authoritative records-এর ওপর নির্ভর করে.','Payment/Payout queue থেকে record খুলে amount, purchase linkage ও status যাচাই করুন.','Duplicate বা incorrect financial action-এর risk কমে এবং seller/buyer records consistent থাকে.','Manual balance বা stale UI number দিয়ে financial decision নেবেন না.','Open Payments','/admin/payments','admin','Financial operations কেবল Admin account-এর জন্য।',null,null,'published',220)
on conflict (slug) do update set section_group=excluded.section_group, title=excluded.title, summary=excluded.summary, what_is=excluded.what_is, how_to=excluded.how_to, benefits=excluded.benefits, notes=excluded.notes, action_label=excluded.action_label, action_href=excluded.action_href, required_access=excluded.required_access, locked_message=excluded.locked_message, locked_action_label=excluded.locked_action_label, locked_action_href=excluded.locked_action_href, status=excluded.status, sort_order=excluded.sort_order;

-- Guide/help content is intentionally non-destructive; admins can archive/edit from the UI later.
