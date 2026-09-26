// Service brief questionnaires for the client portal.
//
// Each template is plain data: the wizard (components/crm/BriefWizard.jsx)
// renders it, the server actions (app/actions/brief-actions.js) validate
// against it, and renderBriefSummary() turns answers into the plain-text
// projects.brief a brand-new project is created with. Adding a question is
// a data change here; adding a brief *type* also needs the database check
// in supabase/migrations/0043_project_briefs.sql (brief_type) and the
// category mapping in submit_project_brief().
//
// Never ask for passwords or other credentials in a brief: answers are stored
// as plain jsonb and shown to staff. Access is arranged separately.

export const BRIEF_TEMPLATE_VERSION = 1;

export const BRIEF_STATUSES = Object.freeze(['draft', 'submitted']);

export const FIELD_LIMITS = Object.freeze({
  text: 200,
  url: 500,
  textarea: 3000,
});

// App-side ceiling for JSON.stringify(answers) bytes. The database check
// (project_briefs_answers_size_check) is 60000 bytes of jsonb *text*, which
// adds a space after every ':' and ','; the headroom keeps an answer set the
// app accepts from ever tripping the database check.
export const MAX_ANSWERS_BYTES = 56000;
// projects.brief is 1..10000 characters (0009/0031).
export const MAX_SUMMARY_LENGTH = 10000;

const CREDENTIALS_HELP =
  'Please do not paste passwords here. We will arrange secure access with you separately.';

const BUDGET_OPTIONS = Object.freeze([
  { value: 'under_1k', label: 'Under $1,000' },
  { value: '1k_3k', label: '$1,000 – $3,000' },
  { value: '3k_7k', label: '$3,000 – $7,000' },
  { value: '7k_15k', label: '$7,000 – $15,000' },
  { value: '15k_plus', label: '$15,000+' },
  { value: 'unsure', label: 'Not sure yet — advise me' },
]);

const MONTHLY_BUDGET_OPTIONS = Object.freeze([
  { value: 'under_500', label: 'Under $500 / month' },
  { value: '500_1500', label: '$500 – $1,500 / month' },
  { value: '1500_3000', label: '$1,500 – $3,000 / month' },
  { value: '3000_plus', label: '$3,000+ / month' },
  { value: 'unsure', label: 'Not sure yet — advise me' },
]);

const PLATFORM_OPTIONS = Object.freeze([
  { value: 'wordpress', label: 'WordPress' },
  { value: 'shopify', label: 'Shopify' },
  { value: 'wix', label: 'Wix' },
  { value: 'squarespace', label: 'Squarespace' },
  { value: 'webflow', label: 'Webflow' },
  { value: 'custom', label: 'Custom-built' },
  { value: 'unsure', label: 'Not sure' },
]);

function options(pairs) {
  return Object.freeze(pairs.map(([value, label]) => Object.freeze({ value, label })));
}

const LOGO = {
  type: 'logo',
  label: 'Logo design',
  category: 'logo_creation',
  blurb: 'Tell us about your brand so our designers can sketch concepts that fit from the first round.',
  minutes: 8,
  steps: [
    {
      id: 'brand',
      title: 'Your brand',
      intro: 'The basics your logo has to carry.',
      fields: [
        { id: 'brand_name', label: 'Exact name to appear in the logo', type: 'text', required: true, prefill: 'company.name' },
        { id: 'tagline', label: 'Tagline or slogan (if it should be part of the logo)', type: 'text' },
        { id: 'industry', label: 'Industry', type: 'text', required: true, prefill: 'company.industry', placeholder: 'e.g. Sportswear, Dental clinic, SaaS' },
        { id: 'description', label: 'What does your business do?', type: 'textarea', required: true, help: 'One or two sentences, as you would explain it to a new customer.' },
        { id: 'website', label: 'Current website', type: 'url', prefill: 'company.website' },
      ],
    },
    {
      id: 'audience',
      title: 'Audience & positioning',
      intro: 'Who the logo needs to win over, and who it must stand apart from.',
      fields: [
        { id: 'audience', label: 'Who are your ideal customers?', type: 'textarea', required: true, help: 'Age, location, type of business, what they care about.' },
        { id: 'differentiator', label: 'What makes you different from competitors?', type: 'textarea', required: true },
        { id: 'competitors', label: 'Main competitors (names or websites)', type: 'textarea' },
      ],
    },
    {
      id: 'personality',
      title: 'Brand personality',
      intro: 'Slide each scale toward the side that fits your brand. Leave the middle if you have no preference.',
      fields: [
        { id: 'tone_classic_modern', label: 'Classic ↔ Modern', type: 'scale', left: 'Classic', right: 'Modern' },
        { id: 'tone_playful_serious', label: 'Playful ↔ Serious', type: 'scale', left: 'Playful', right: 'Serious' },
        { id: 'tone_affordable_premium', label: 'Affordable ↔ Premium', type: 'scale', left: 'Affordable', right: 'Premium' },
        { id: 'tone_subtle_bold', label: 'Subtle ↔ Bold', type: 'scale', left: 'Subtle', right: 'Bold' },
        { id: 'tone_minimal_detailed', label: 'Minimal ↔ Detailed', type: 'scale', left: 'Minimal', right: 'Detailed' },
        { id: 'brand_words', label: 'Three words that should describe your brand', type: 'text', placeholder: 'e.g. fast, trustworthy, local' },
      ],
    },
    {
      id: 'style',
      title: 'Style & colour',
      intro: 'Direction for shapes, type and colour.',
      fields: [
        {
          id: 'starting_point',
          label: 'Where are we starting from?',
          type: 'select',
          required: true,
          options: options([
            ['new', 'Brand-new logo'],
            ['refresh', 'Refresh of an existing logo'],
            ['guidelines', 'New logo within existing brand guidelines'],
          ]),
        },
        {
          id: 'logo_types',
          label: 'Logo types you are open to',
          type: 'multi',
          options: options([
            ['wordmark', 'Wordmark (name in custom type)'],
            ['lettermark', 'Lettermark / monogram'],
            ['combination', 'Icon + name'],
            ['emblem', 'Emblem / badge / crest'],
            ['mascot', 'Mascot / character'],
            ['unsure', 'Not sure — recommend'],
          ]),
        },
        {
          id: 'styles_liked',
          label: 'Styles you like',
          type: 'multi',
          options: options([
            ['minimal', 'Minimal & clean'],
            ['geometric', 'Geometric'],
            ['hand_drawn', 'Hand-drawn / organic'],
            ['vintage', 'Vintage / retro'],
            ['sporty', 'Sporty / athletic'],
            ['elegant', 'Elegant / luxury'],
            ['tech', 'Tech / futuristic'],
            ['playful', 'Playful / illustrative'],
          ]),
        },
        { id: 'colors_preferred', label: 'Colours you would like', type: 'text', placeholder: 'Names or hex codes, e.g. navy, #FF6A00' },
        { id: 'colors_avoid', label: 'Colours to avoid', type: 'text' },
      ],
    },
    {
      id: 'inspiration',
      title: 'Inspiration',
      intro: 'Examples speed things up more than anything else.',
      fields: [
        { id: 'inspiration', label: 'Logos you like and why', type: 'textarea', help: 'Paste links or brand names, one per line, with a word on what you like.' },
        { id: 'dislikes', label: 'Anything you definitely do not want', type: 'textarea' },
      ],
    },
    {
      id: 'usage',
      title: 'Usage & delivery',
      intro: 'Where the logo will live decides how it is drawn.',
      fields: [
        {
          id: 'usage',
          label: 'Where will the logo be used?',
          type: 'multi',
          required: true,
          options: options([
            ['website', 'Website'],
            ['social', 'Social media'],
            ['apparel', 'Apparel, merch or embroidery'],
            ['print', 'Business cards & print'],
            ['signage', 'Signage / storefront'],
            ['packaging', 'Packaging'],
            ['vehicle', 'Vehicle wraps'],
            ['app', 'App icon'],
          ]),
        },
        {
          id: 'deliverables',
          label: 'Files and extras you need',
          type: 'multi',
          options: options([
            ['vector', 'Vector files (AI / EPS / SVG)'],
            ['png', 'Transparent PNGs'],
            ['favicon', 'Favicon'],
            ['social_kit', 'Social profile kit'],
            ['guidelines', 'Mini brand-guideline sheet'],
            ['stationery', 'Business card design'],
          ]),
        },
        { id: 'deadline', label: 'When do you need it?', type: 'date' },
        { id: 'budget', label: 'Budget', type: 'select', options: BUDGET_OPTIONS },
        { id: 'notes', label: 'Anything else we should know?', type: 'textarea' },
      ],
    },
  ],
};

const WEBSITE = {
  type: 'website',
  label: 'Website',
  category: 'web_design',
  blurb: 'Scope, features and look & feel, so we can plan pages and quote accurately.',
  minutes: 12,
  steps: [
    {
      id: 'business',
      title: 'About the business',
      intro: 'A quick picture of who the site is for.',
      fields: [
        { id: 'business_name', label: 'Business name', type: 'text', required: true, prefill: 'company.name' },
        { id: 'current_site', label: 'Current website (if any)', type: 'url', prefill: 'company.website' },
        { id: 'industry', label: 'Industry', type: 'text', prefill: 'company.industry' },
        { id: 'description', label: 'What does your business do?', type: 'textarea', required: true },
      ],
    },
    {
      id: 'goals',
      title: 'Goals',
      intro: 'What the new site has to achieve.',
      fields: [
        {
          id: 'primary_goal',
          label: 'Main goal of the website',
          type: 'select',
          required: true,
          options: options([
            ['leads', 'Generate leads / enquiries'],
            ['sales', 'Sell products online'],
            ['bookings', 'Take bookings or appointments'],
            ['portfolio', 'Showcase work / portfolio'],
            ['information', 'Inform and build trust'],
          ]),
        },
        { id: 'audience', label: 'Who is the site for?', type: 'textarea', required: true },
        { id: 'success', label: 'What would success look like six months after launch?', type: 'textarea' },
      ],
    },
    {
      id: 'scope',
      title: 'Scope & features',
      intro: 'Pages and functionality. Tick everything that applies — we will refine it together.',
      fields: [
        {
          id: 'project_kind',
          label: 'Type of project',
          type: 'select',
          required: true,
          options: options([
            ['new', 'Brand-new website'],
            ['redesign', 'Redesign of an existing site'],
            ['extend', 'Add pages or features to an existing site'],
          ]),
        },
        {
          id: 'pages',
          label: 'Pages you need',
          type: 'multi',
          options: options([
            ['home', 'Home'],
            ['about', 'About'],
            ['services', 'Services'],
            ['service_detail', 'Individual service pages'],
            ['portfolio', 'Portfolio / work'],
            ['shop', 'Shop / products'],
            ['blog', 'Blog / news'],
            ['faq', 'FAQ'],
            ['testimonials', 'Testimonials / reviews'],
            ['pricing', 'Pricing'],
            ['careers', 'Careers'],
            ['contact', 'Contact'],
          ]),
        },
        {
          id: 'page_count',
          label: 'Roughly how many pages in total?',
          type: 'select',
          options: options([
            ['1_5', '1 – 5'],
            ['6_10', '6 – 10'],
            ['11_20', '11 – 20'],
            ['20_plus', '20+'],
          ]),
        },
        {
          id: 'features',
          label: 'Features',
          type: 'multi',
          options: options([
            ['forms', 'Contact / quote forms'],
            ['ecommerce', 'E-commerce checkout'],
            ['booking', 'Booking / scheduling'],
            ['cms', 'Editable content (CMS)'],
            ['accounts', 'Customer login / accounts'],
            ['chat', 'Live chat'],
            ['newsletter', 'Newsletter sign-up'],
            ['multilingual', 'Multiple languages'],
            ['customizer', 'Product customiser'],
            ['payments', 'Online payments / invoices'],
          ]),
        },
        { id: 'platform', label: 'Preferred platform', type: 'select', options: options([
          ['recommend', 'No preference — recommend one'],
          ['wordpress', 'WordPress'],
          ['shopify', 'Shopify'],
          ['webflow', 'Webflow'],
          ['custom', 'Custom-built (e.g. Next.js)'],
        ]) },
        { id: 'integrations', label: 'Tools it must connect to', type: 'text', placeholder: 'e.g. HubSpot, Mailchimp, QuickBooks, Calendly' },
        { id: 'product_count', label: 'If selling online, roughly how many products?', type: 'text' },
      ],
    },
    {
      id: 'content',
      title: 'Content & brand',
      intro: 'What already exists and what we need to create.',
      fields: [
        { id: 'logo_status', label: 'Logo', type: 'select', required: true, options: options([
          ['ready', 'We have a final logo'],
          ['refresh', 'We have one but it needs a refresh'],
          ['needed', 'We need a logo'],
        ]) },
        { id: 'copy_status', label: 'Website text (copy)', type: 'select', options: options([
          ['ready', 'All written and ready'],
          ['partial', 'Some is ready'],
          ['needed', 'We need copywriting'],
        ]) },
        { id: 'photo_status', label: 'Photos & imagery', type: 'select', options: options([
          ['ready', 'We have our own photos'],
          ['stock', 'Use stock imagery'],
          ['shoot', 'We need a photoshoot'],
        ]) },
      ],
    },
    {
      id: 'look',
      title: 'Look & feel',
      intro: 'Reference sites are the fastest way to align on design.',
      fields: [
        { id: 'references', label: 'Two or three websites you like, and what you like about them', type: 'textarea', required: true },
        { id: 'dislikes', label: 'Websites or styles you do not like', type: 'textarea' },
        { id: 'tone_minimal_rich', label: 'Minimal ↔ Rich', type: 'scale', left: 'Minimal', right: 'Rich' },
        { id: 'tone_classic_modern', label: 'Classic ↔ Modern', type: 'scale', left: 'Classic', right: 'Modern' },
        { id: 'theme', label: 'Light or dark?', type: 'select', options: options([
          ['light', 'Light'],
          ['dark', 'Dark'],
          ['either', 'No preference'],
        ]) },
      ],
    },
    {
      id: 'technical',
      title: 'Domain & hosting',
      intro: 'So launch day has no surprises.',
      fields: [
        { id: 'domain_status', label: 'Domain name', type: 'select', options: options([
          ['owned', 'We own a domain'],
          ['needed', 'We need one'],
          ['unsure', 'Not sure'],
        ]) },
        { id: 'domain', label: 'Domain (if you have one)', type: 'text', placeholder: 'example.com' },
        { id: 'hosting_status', label: 'Hosting', type: 'select', options: options([
          ['have', 'We have hosting'],
          ['needed', 'We need hosting'],
          ['unsure', 'Not sure'],
        ]) },
        { id: 'access_notes', label: 'Who manages your current site, domain or hosting?', type: 'textarea', help: CREDENTIALS_HELP },
      ],
    },
    {
      id: 'timing',
      title: 'Budget & timing',
      intro: 'Last step.',
      fields: [
        { id: 'budget', label: 'Budget', type: 'select', required: true, options: BUDGET_OPTIONS },
        { id: 'deadline', label: 'Ideal launch date', type: 'date' },
        { id: 'deadline_reason', label: 'Is an event or launch driving that date?', type: 'text' },
        { id: 'care_plan', label: 'Interested in ongoing maintenance after launch?', type: 'select', options: options([
          ['yes', 'Yes'],
          ['no', 'No'],
          ['unsure', 'Not sure'],
        ]) },
        { id: 'notes', label: 'Anything else we should know?', type: 'textarea' },
      ],
    },
  ],
};

const SEO = {
  type: 'seo',
  label: 'SEO',
  category: 'marketing',
  blurb: 'Your market, goals and current setup, so we can build a search strategy that brings in customers.',
  minutes: 10,
  steps: [
    {
      id: 'site',
      title: 'Your website',
      intro: 'The site we will be optimising.',
      fields: [
        { id: 'site_url', label: 'Website address', type: 'url', required: true, prefill: 'company.website' },
        { id: 'business_name', label: 'Business name', type: 'text', required: true, prefill: 'company.name' },
        { id: 'description', label: 'What does your business do?', type: 'textarea', required: true },
        { id: 'platform', label: 'What is the site built on?', type: 'select', options: PLATFORM_OPTIONS },
      ],
    },
    {
      id: 'goals',
      title: 'Goals',
      intro: 'What more search traffic should turn into.',
      fields: [
        {
          id: 'goals',
          label: 'What do you want from SEO?',
          type: 'multi',
          required: true,
          options: options([
            ['leads', 'More calls and enquiries'],
            ['sales', 'More online sales'],
            ['local', 'Show up in Google Maps / local results'],
            ['keywords', 'Rank for specific search terms'],
            ['recover', 'Recover lost traffic'],
            ['migration', 'Launch a new site without losing rankings'],
          ]),
        },
        { id: 'kpi', label: 'How do you measure a good month today?', type: 'textarea', help: 'e.g. number of calls, form fills, orders, revenue.' },
      ],
    },
    {
      id: 'market',
      title: 'Market & keywords',
      intro: 'Where you compete and what customers search for.',
      fields: [
        { id: 'service_area', label: 'Where are your customers?', type: 'select', required: true, options: options([
          ['local', 'One city / local area'],
          ['regional', 'Several cities or a state'],
          ['national', 'Nationwide'],
          ['international', 'International'],
        ]) },
        { id: 'locations', label: 'Cities, regions or countries to rank in', type: 'textarea' },
        { id: 'priority_services', label: 'Your most valuable services or products, in priority order', type: 'textarea', required: true },
        { id: 'keywords', label: 'Search terms you think customers use', type: 'textarea', help: 'One per line. Guesses are fine — we will research the real numbers.' },
        { id: 'competitors', label: 'Competitors who show up above you', type: 'textarea' },
      ],
    },
    {
      id: 'current',
      title: 'Current state',
      intro: 'What has been tried before.',
      fields: [
        { id: 'history', label: 'Previous SEO work', type: 'select', required: true, options: options([
          ['never', 'Never done any'],
          ['diy', 'We did some ourselves'],
          ['agency_past', 'Previously used an agency'],
          ['agency_now', 'Currently working with someone'],
        ]) },
        { id: 'history_notes', label: 'What was done, and any traffic drops or penalties?', type: 'textarea' },
        { id: 'gbp', label: 'Google Business Profile', type: 'select', options: options([
          ['verified', 'Yes, verified'],
          ['unverified', 'Yes, not verified'],
          ['none', 'No'],
          ['unsure', 'Not sure'],
        ]) },
        { id: 'reviews', label: 'Roughly how many Google reviews do you have?', type: 'text' },
        { id: 'content_capacity', label: 'Blog and page content', type: 'select', options: options([
          ['in_house', 'We can write it'],
          ['review', 'You write, we review'],
          ['full', 'You handle everything'],
        ]) },
      ],
    },
    {
      id: 'tracking',
      title: 'Access & tracking',
      intro: 'Which tools are already in place.',
      fields: [
        {
          id: 'tools',
          label: 'Which of these are set up?',
          type: 'multi',
          options: options([
            ['ga4', 'Google Analytics 4'],
            ['gsc', 'Google Search Console'],
            ['gtm', 'Google Tag Manager'],
            ['gbp', 'Google Business Profile'],
            ['none', 'None / not sure'],
          ]),
        },
        { id: 'access', label: 'Can you give us access to them?', type: 'select', options: options([
          ['yes', 'Yes'],
          ['help', 'Yes, but I need help'],
          ['unsure', 'Not sure'],
        ]), help: CREDENTIALS_HELP },
      ],
    },
    {
      id: 'timing',
      title: 'Budget & timing',
      intro: 'Last step.',
      fields: [
        { id: 'monthly_budget', label: 'Monthly SEO budget', type: 'select', required: true, options: MONTHLY_BUDGET_OPTIONS },
        { id: 'start_date', label: 'Preferred start date', type: 'date' },
        { id: 'notes', label: 'Anything else we should know?', type: 'textarea' },
      ],
    },
  ],
};

const PPC = {
  type: 'ppc',
  label: 'PPC ads',
  category: 'marketing',
  blurb: 'Offer, audience and budget for Google, Meta and other paid campaigns.',
  minutes: 10,
  steps: [
    {
      id: 'offer',
      title: 'Business & offer',
      intro: 'What the ads will promote.',
      fields: [
        { id: 'business_name', label: 'Business name', type: 'text', required: true, prefill: 'company.name' },
        { id: 'site_url', label: 'Website', type: 'url', prefill: 'company.website' },
        { id: 'offer', label: 'What exactly do you want to advertise?', type: 'textarea', required: true, help: 'Products, services, or a specific offer or promotion.' },
        { id: 'usp', label: 'Why should someone choose you over a competitor?', type: 'textarea' },
        { id: 'customer_value', label: 'Average value of a new customer or sale', type: 'text', placeholder: 'e.g. $450' },
      ],
    },
    {
      id: 'goals',
      title: 'Platforms & goals',
      intro: 'Where to advertise and what counts as a result.',
      fields: [
        {
          id: 'platforms',
          label: 'Platforms',
          type: 'multi',
          required: true,
          options: options([
            ['google_search', 'Google Search'],
            ['google_pmax', 'Google Shopping / Performance Max'],
            ['youtube', 'YouTube'],
            ['meta', 'Facebook & Instagram'],
            ['linkedin', 'LinkedIn'],
            ['tiktok', 'TikTok'],
            ['microsoft', 'Microsoft / Bing'],
            ['recommend', 'Not sure — recommend'],
          ]),
        },
        { id: 'conversion', label: 'Main result you want', type: 'select', required: true, options: options([
          ['calls', 'Phone calls'],
          ['leads', 'Form leads'],
          ['purchases', 'Online purchases'],
          ['bookings', 'Bookings'],
          ['store_visits', 'Store visits'],
          ['awareness', 'Brand awareness'],
        ]) },
        { id: 'target_cpa', label: 'Target cost per lead or sale (if known)', type: 'text' },
      ],
    },
    {
      id: 'audience',
      title: 'Audience & targeting',
      intro: 'Who should see the ads, and where.',
      fields: [
        { id: 'locations', label: 'Locations to target', type: 'textarea', required: true, help: 'Cities, ZIP codes, radius around an address, states or countries.' },
        { id: 'audience', label: 'Describe your ideal customer', type: 'textarea', required: true, help: 'Age, interests, job titles, business type.' },
        { id: 'schedule', label: 'When should ads run?', type: 'select', options: options([
          ['always', 'All the time'],
          ['business_hours', 'Business hours only'],
          ['custom', 'Specific days / times'],
        ]) },
        { id: 'exclusions', label: 'Areas, audiences or search terms to exclude', type: 'textarea' },
      ],
    },
    {
      id: 'budget',
      title: 'Budget',
      intro: 'Ad spend goes to the platform; management is separate.',
      fields: [
        { id: 'ad_spend', label: 'Monthly ad spend', type: 'select', required: true, options: options([
          ['under_1k', 'Under $1,000 / month'],
          ['1k_3k', '$1,000 – $3,000 / month'],
          ['3k_10k', '$3,000 – $10,000 / month'],
          ['10k_plus', '$10,000+ / month'],
          ['unsure', 'Not sure — advise me'],
        ]) },
        { id: 'duration', label: 'Campaign length', type: 'select', options: options([
          ['ongoing', 'Ongoing'],
          ['fixed', 'Fixed dates (e.g. seasonal promotion)'],
        ]) },
        { id: 'campaign_dates', label: 'Campaign dates (if fixed)', type: 'text' },
      ],
    },
    {
      id: 'setup',
      title: 'Current setup',
      intro: 'What exists already and what we need to build.',
      fields: [
        { id: 'history', label: 'Advertising history', type: 'select', required: true, options: options([
          ['never', 'Never advertised online'],
          ['running', 'Running ads now'],
          ['past', 'Ran ads in the past'],
        ]) },
        { id: 'history_notes', label: 'What worked, what did not, and past results', type: 'textarea' },
        {
          id: 'accounts',
          label: 'Which of these do you already have?',
          type: 'multi',
          options: options([
            ['google_ads', 'Google Ads account'],
            ['meta_bm', 'Meta Business Manager'],
            ['ga4', 'Google Analytics 4'],
            ['gtm', 'Google Tag Manager'],
            ['merchant', 'Google Merchant Center'],
            ['tracking', 'Conversion tracking installed'],
            ['none', 'None / not sure'],
          ]),
          help: CREDENTIALS_HELP,
        },
        { id: 'landing_pages', label: 'Landing pages', type: 'select', options: options([
          ['ready', 'We have pages ready'],
          ['needed', 'We need new landing pages'],
          ['unsure', 'Not sure'],
        ]) },
        { id: 'creative', label: 'Ad creative', type: 'select', options: options([
          ['ready', 'We have ads / images ready'],
          ['copy', 'We need ad copy'],
          ['full', 'We need copy, design and/or video'],
        ]) },
      ],
    },
    {
      id: 'timing',
      title: 'Timing',
      intro: 'Last step.',
      fields: [
        { id: 'start_date', label: 'Preferred start date', type: 'date' },
        { id: 'notes', label: 'Anything else we should know?', type: 'textarea' },
      ],
    },
  ],
};

function freezeTemplate(template) {
  return Object.freeze({
    ...template,
    steps: Object.freeze(
      template.steps.map((step) =>
        Object.freeze({ ...step, fields: Object.freeze(step.fields.map((field) => Object.freeze({ ...field }))) }),
      ),
    ),
  });
}

export const BRIEF_TEMPLATES = Object.freeze({
  logo: freezeTemplate(LOGO),
  website: freezeTemplate(WEBSITE),
  seo: freezeTemplate(SEO),
  ppc: freezeTemplate(PPC),
});

export const BRIEF_TYPES = Object.freeze(Object.keys(BRIEF_TEMPLATES));

export function isBriefType(value) {
  return typeof value === 'string' && Object.hasOwn(BRIEF_TEMPLATES, value);
}

export function getBriefTemplate(type) {
  return isBriefType(type) ? BRIEF_TEMPLATES[type] : null;
}

export function briefTypeLabel(type) {
  return getBriefTemplate(type)?.label ?? type;
}

export function templateFields(template) {
  return template.steps.flatMap((step) => step.fields);
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

// String#slice by UTF-16 code units, but never ending on the first half of
// a surrogate pair (an emoji cut in half is invalid JSON for Postgres).
function sliceSafe(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}

function cleanText(value, max, { multiline = false } = {}) {
  if (typeof value !== 'string') return '';
  // Strip control characters except newline/tab in multi-line answers.
  const stripped = multiline
    ? value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
    : value.replace(/[\u0000-\u001F\u007F]/g, ' ');
  return sliceSafe(stripped.trim(), max).trim();
}

function cleanValue(field, raw) {
  switch (field.type) {
    case 'text':
      return cleanText(raw, FIELD_LIMITS.text);
    case 'url':
      return cleanText(raw, FIELD_LIMITS.url);
    case 'textarea':
      return cleanText(raw, FIELD_LIMITS.textarea, { multiline: true });
    case 'date':
      return typeof raw === 'string' && validDate(raw) ? raw : '';
    case 'select':
      return field.options.some((option) => option.value === raw) ? raw : '';
    case 'multi': {
      if (!Array.isArray(raw)) return [];
      const allowed = new Set(field.options.map((option) => option.value));
      return [...new Set(raw.filter((value) => allowed.has(value)))];
    }
    case 'scale': {
      const number = typeof raw === 'number' ? raw : Number.parseInt(raw, 10);
      return Number.isInteger(number) && number >= 1 && number <= 5 ? number : null;
    }
    default:
      return undefined;
  }
}

export function isEmptyAnswer(value) {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

// Keeps only known fields with well-formed values, dropping empties, so the
// stored jsonb is exactly what the template can render. Safe for drafts.
export function sanitizeBriefAnswers(type, answers) {
  const template = getBriefTemplate(type);
  if (!template || !answers || typeof answers !== 'object' || Array.isArray(answers)) return {};

  const clean = {};
  for (const field of templateFields(template)) {
    if (!Object.hasOwn(answers, field.id)) continue;
    const value = cleanValue(field, answers[field.id]);
    if (!isEmptyAnswer(value)) clean[field.id] = value;
  }
  return clean;
}

// Required-field check for submission. Returns [{ stepId, fieldId, label }].
export function missingRequiredAnswers(type, answers) {
  const template = getBriefTemplate(type);
  if (!template) return [];
  const clean = sanitizeBriefAnswers(type, answers);

  return template.steps.flatMap((step) =>
    step.fields
      .filter((field) => field.required && isEmptyAnswer(clean[field.id]))
      .map((field) => ({ stepId: step.id, fieldId: field.id, label: field.label })),
  );
}

export function stepProgress(type, answers) {
  const template = getBriefTemplate(type);
  if (!template) return { answered: 0, total: 0 };
  const clean = sanitizeBriefAnswers(type, answers);
  const fields = templateFields(template);
  return {
    answered: fields.filter((field) => !isEmptyAnswer(clean[field.id])).length,
    total: fields.length,
  };
}

// Pre-fill from what the client already told us (company record). Only
// fills blanks; never overwrites an answer.
export function prefillBriefAnswers(type, answers, { company } = {}) {
  const template = getBriefTemplate(type);
  if (!template) return {};
  const next = { ...(answers ?? {}) };
  const sources = { 'company.name': company?.name, 'company.website': company?.website, 'company.industry': company?.industry };

  for (const field of templateFields(template)) {
    if (!field.prefill || !isEmptyAnswer(next[field.id])) continue;
    const value = sources[field.prefill];
    if (typeof value === 'string' && value.trim()) next[field.id] = value.trim();
  }
  return sanitizeBriefAnswers(type, next);
}

export function formatAnswer(field, value) {
  if (isEmptyAnswer(value)) return '';
  switch (field.type) {
    case 'select':
      return field.options.find((option) => option.value === value)?.label ?? String(value);
    case 'multi':
      return value
        .map((item) => field.options.find((option) => option.value === item)?.label ?? item)
        .join(', ');
    case 'scale': {
      const labels = ['', `Strongly ${field.left}`, field.left, 'Balanced', field.right, `Strongly ${field.right}`];
      return labels[value] ?? String(value);
    }
    default:
      return String(value);
  }
}

// Structured read model for display: [{ id, title, rows: [{ id, label, value }] }],
// skipping unanswered questions and empty sections.
export function briefSections(type, answers) {
  const template = getBriefTemplate(type);
  if (!template) return [];
  const clean = sanitizeBriefAnswers(type, answers);

  return template.steps
    .map((step) => ({
      id: step.id,
      title: step.title,
      rows: step.fields
        .filter((field) => !isEmptyAnswer(clean[field.id]))
        .map((field) => ({ id: field.id, label: field.label, value: formatAnswer(field, clean[field.id]) })),
    }))
    .filter((section) => section.rows.length > 0);
}

// Plain-text rendering used as projects.brief when a brief creates a project.
export function renderBriefSummary(type, answers) {
  const template = getBriefTemplate(type);
  if (!template) return '';

  const lines = [`${template.label} brief`];
  for (const section of briefSections(type, answers)) {
    lines.push('', section.title.toUpperCase());
    for (const row of section.rows) {
      lines.push(`${row.label}: ${row.value}`);
    }
  }

  const text = lines.join('\n');
  if (text.length <= MAX_SUMMARY_LENGTH) return text;
  return `${sliceSafe(text, MAX_SUMMARY_LENGTH - 1)}…`;
}

// Display title for a brief: "Logo design — Acme Co".
export function briefDisplayTitle(type, answers) {
  const label = briefTypeLabel(type);
  const clean = sanitizeBriefAnswers(type, answers);
  const name = clean.brand_name || clean.business_name;
  return (name ? `${label} — ${name}` : `${label} brief`).slice(0, 120);
}
