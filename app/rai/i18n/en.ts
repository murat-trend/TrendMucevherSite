/*
 * RAI i18n — İngilizce (ANA sözlük; tip kaynağı budur).
 * Diğer diller (tr/ru/ar) RaiDict tipini karşılamak zorundadır —
 * anahtar eksikse build kırılır, sessiz eksik çeviri olmaz.
 * Başlıklar {pre, gold, post} üçlüsüyle modellenir: kelime sırası
 * dilden dile değiştiği için altın vurgulu kelime ayrı taşınır.
 */
export const en = {
  meta: {
    title: "REMAURA AI — The Jewelry Operating System",
    description:
      "The world's first Digital Jewelry Operating System. Design, manufacture, market, and sell — all in one platform.",
    studioTitle: "Jewelry Design Studio",
  },
  nav: {
    home: "Home",
    jewelryDesign: "Jewelry Design",
    jewelryOS: "Jewelry OS",
    aiSuite: "AI Suite",
    manufacturing: "Manufacturing",
    ecommerce: "E-Commerce",
    pricing: "Pricing",
    documentation: "Documentation",
    startFreeDemo: "Start Free Demo",
    viewDocumentation: "View Documentation",
    aiDesignCategory: "AI Design",
    aiVisualizationCategory: "AI Visualization",
    menuItems: [
      { label: "Jewelry Design AI", description: "Generate professional jewelry concepts from text or images" },
      { label: "Background Remover", description: "Automatically remove backgrounds for product photography" },
      { label: "Photo Edit", description: "Enhance jewelry images using AI" },
      { label: "Object Remover", description: "Remove unwanted objects from product photos" },
      { label: "Virtual Try On", description: "Preview jewelry on hands, ears or neck using AI" },
      { label: "Remaura AI 3D", description: "Generate production-ready 3D jewelry models" },
      { label: "3D Converter", description: "Convert STL, OBJ, GLB, FBX, STEP formats" },
      { label: "Video Optimization", description: "Optimize videos for websites and social media" },
    ],
  },
  hero: {
    badge: "The World's First Jewelry Operating System",
    titlePre: "The Operating System for the",
    titleGold: "Jewelry",
    titlePost: "Industry.",
    subtitle:
      "One platform. Design. Manufacturing. Marketing. Sales. Artificial Intelligence. Everything together.",
    ctaPrimary: "Start Free Demo",
    ctaSecondary: "Book Live Presentation",
    trust: ["Enterprise Secure", "AI-Powered", "Cloud Based"],
    statTasks: "AI Tasks Today",
    statEfficiency: "Efficiency",
  },
  why: {
    tag: "Why REMAURA",
    titlePre: "Stop juggling",
    titleGold: "disconnected tools.",
    titlePost: "",
    desc: "Jewelry companies currently use dozens of disconnected software. REMAURA replaces them with one intelligent operating system.",
    oldTitle: "The Old Way",
    oldSubtitle: "8+ disconnected tools",
    oldNote: "Data scattered across platforms. No single source of truth. Manual workarounds. Lost productivity.",
    newTitle: "The REMAURA Way",
    newSubtitle: "One unified operating system",
    newNote: "Everything connected. One platform. One database. One workflow. From design to delivery.",
    features: [
      "AI-Powered Design Studio",
      "3D Model Management",
      "Manufacturing Pipeline",
      "E-Commerce Builder",
      "Inventory & CRM",
      "Analytics & Reporting",
      "Social Media Export",
      "Production Tracking",
    ],
  },
  aiSuite: {
    tag: "AI Suite",
    titlePre: "AI-powered tools for",
    titleGold: "every workflow.",
    titlePost: "",
    desc: "From design concepts to production-ready 3D models. Let AI handle the repetitive work while you focus on creativity.",
    learnMore: "Learn more",
    cta: "Explore All AI Features",
    tagMostPopular: "MOST POPULAR",
    tagNew: "NEW",
    features: [
      {
        title: "Jewelry Design AI",
        description:
          "Generate professional jewelry concepts from text descriptions or reference images. Create stunning ring, necklace, and bracelet designs in seconds.",
      },
      {
        title: "Background Remover",
        description:
          "Automatically remove backgrounds for product photography. Get clean, professional jewelry images ready for any marketplace.",
      },
      {
        title: "AI Photo Enhancement",
        description:
          "Enhance jewelry images using AI. Improve lighting, reflections, diamond fire, and overall image quality automatically.",
      },
      {
        title: "Smart Object Remover",
        description: "Remove unwanted objects, dust, fingerprints, or imperfections from product photos with one click.",
      },
      {
        title: "Virtual Try On",
        description: "Preview jewelry on hands, ears, or neck using AI. Let customers see how pieces look before purchasing.",
      },
      {
        title: "Remaura AI 3D",
        description: "Generate production-ready 3D jewelry models from text prompts or reference images. Export to any format.",
      },
      {
        title: "3D Converter",
        description: "Convert between STL, OBJ, GLB, FBX, STEP and other formats instantly. Batch conversion supported.",
      },
      {
        title: "Video Optimization",
        description: "Optimize videos for websites and social media. Auto-resize, compress, and format for any platform.",
      },
    ],
  },
  features: {
    tag: "Features",
    titlePre: "Everything you need,",
    titleGold: "nothing you don't.",
    titlePost: "",
    desc: "A complete toolkit for the modern jewelry business. From AI-powered design to manufacturing analysis and e-commerce.",
    categories: [
      {
        title: "AI & Media",
        items: [
          { name: "AI Product Photography", desc: "Professional product shots with AI lighting" },
          { name: "AI Video Generator", desc: "Create marketing videos automatically" },
          { name: "360 Product Viewer", desc: "Interactive 360-degree product spins" },
          { name: "AI Creative Studio", desc: "Banners, ads, and brand assets" },
        ],
      },
      {
        title: "3D & Production",
        items: [
          { name: "STL Manager", desc: "Organize and manage 3D file libraries" },
          { name: "GLB Viewer", desc: "Preview 3D models in browser" },
          { name: "Mesh Cleaner", desc: "Auto-repair mesh errors and holes" },
          { name: "Weight Calculator", desc: "Precise metal weight calculations" },
          { name: "Shrinkage Calculator", desc: "Compensate for casting shrinkage" },
          { name: "Gold Cost Calculator", desc: "Real-time gold price calculations" },
          { name: "Stone Manager", desc: "Track gemstones and settings" },
        ],
      },
      {
        title: "Collections & Export",
        items: [
          { name: "Collection Builder", desc: "Create and manage jewelry collections" },
          { name: "Marketplace Export", desc: "Export to all major marketplaces" },
          { name: "Social Media Export", desc: "Instagram, Facebook, Pinterest, TikTok" },
          { name: "E-Commerce Export", desc: "Etsy, Shopify, WooCommerce" },
        ],
      },
      {
        title: "Business Management",
        items: [
          { name: "Inventory Management", desc: "Track stock levels and materials" },
          { name: "CRM", desc: "Customer relationship management" },
          { name: "Order Tracking", desc: "End-to-end order lifecycle" },
          { name: "Customer Portal", desc: "Branded client experience" },
          { name: "Analytics & Reports", desc: "Business intelligence dashboards" },
          { name: "API Integrations", desc: "Connect with your existing tools" },
        ],
      },
    ],
    stats: [
      { label: "Enterprise Security", desc: "Encrypted infrastructure" },
      { label: "Reliable", desc: "Always-on infrastructure" },
      { label: "Global CDN", desc: "Fast Worldwide" },
      { label: "Support", desc: "Real humans, fast answers" },
    ],
  },
  manufacturing: {
    tag: "Manufacturing",
    titlePre: "From digital design to",
    titleGold: "physical perfection.",
    titlePost: "",
    desc: "End-to-end manufacturing pipeline. Upload your 3D model and get production-ready files with complete analysis.",
    cta: "Try Manufacturing Pipeline",
    steps: [
      { title: "Upload STL", description: "Upload your 3D jewelry model in any format. STL, OBJ, GLB, or STEP." },
      { title: "Auto Mesh Repair", description: "Automatic detection and repair of mesh errors, holes, and non-manifold geometry." },
      { title: "Wall Thickness", description: "Analyze wall thickness across the entire model. Color-coded heatmap visualization." },
      { title: "Casting Risk Analysis", description: "Identify casting risks before production. Prevent costly manufacturing failures." },
      { title: "Weight Report", description: "Precise metal weight calculation for gold, silver, platinum, and any alloy." },
      { title: "Shrinkage Calculation", description: "Automatic shrinkage compensation based on metal type and casting method." },
      { title: "Production Ready", description: "Generate production-ready files with complete reports for your manufacturing team." },
    ],
  },
  ecommerce: {
    tag: "E-Commerce",
    titlePre: "Sell everywhere from",
    titleGold: "one platform.",
    titlePost: "",
    desc: "Your own website, your own domain, integrated with every major marketplace and social platform.",
    exportTitle: "One-Click Export to Any Platform",
    exportDesc: "Publish your products everywhere instantly",
    yourWebsite: "Your Website",
    features: [
      { title: "Custom Website", description: "Every customer receives their own professional jewelry website with custom domain." },
      { title: "Hosting Included", description: "Fast, secure, and reliable hosting with global CDN. No additional hosting costs." },
      { title: "SEO Optimized", description: "Built-in SEO tools to help your jewelry store rank higher on Google search." },
      { title: "Fast Performance", description: "Lightning-fast page loads optimized for the best customer experience." },
      { title: "Product Management", description: "Manage your entire product catalog with variants, pricing, and inventory." },
      { title: "Payment Integration", description: "Accept payments via all major credit cards and payment providers." },
    ],
  },
  analytics: {
    tag: "Business Analytics",
    titlePre: "Data-driven decisions,",
    titleGold: "powered by AI.",
    titlePost: "",
    desc: "Luxury dashboards that give you complete visibility into your jewelry business. Revenue, orders, production, and AI-powered insights.",
    insightsTitle: "AI Insights",
    insightsDesc: "Smart recommendations based on your data",
    stats: [
      { label: "Revenue" },
      { label: "Orders" },
      { label: "Production" },
      { label: "Customers" },
    ],
    insights: [
      "Top-selling ring designs need reorder in 5 days",
      "Gold price trend suggests buying raw materials now",
      "Instagram campaigns driving 40% of new traffic",
      "3D-printed samples reducing return rates by 60%",
    ],
  },
  pricing: {
    tag: "Pricing",
    titlePre: "Simple, transparent",
    titleGold: "pricing.",
    titlePost: "",
    desc: "Everything you need to run your jewelry business. No hidden fees, no surprises.",
    monthly: "Monthly",
    annual: "Annual",
    save: "SAVE 33%",
    recommended: "RECOMMENDED",
    getStarted: "Get Started",
    note: "All plans include a 14-day free trial. No credit card required.",
    monthlyPlan: {
      title: "Monthly",
      subtitle: "Flexible, pay as you go",
      price: "$150",
      period: "/month",
      features: [
        "Everything Included",
        "Hosting Included",
        "AI Suite Access",
        "3D Converter",
        "E-Commerce Store",
        "Analytics Dashboard",
        "Standard Support",
        "Email Support",
      ],
    },
    annualPlan: {
      title: "Annual",
      subtitle: "Best value, commitment pays off",
      price: "$2,000",
      period: "/year",
      features: [
        "Everything in Monthly",
        "Hosting Included",
        "AI Suite Access",
        "3D Converter",
        "E-Commerce Store",
        "Analytics Dashboard",
        "Priority Support",
        "Live Video Support",
        "Dedicated Account Manager",
        "Custom Integrations",
      ],
    },
  },
  testimonials: {
    tag: "Testimonials",
    titlePre: "Trusted by jewelry",
    titleGold: "professionals worldwide.",
    titlePost: "",
    desc: "From manufacturers to retail stores, see how REMAURA AI is transforming the jewelry industry.",
    items: [
      {
        category: "Jewelry Manufacturer",
        quote:
          "REMAURA AI transformed our production workflow. What used to take 3 days now takes 3 hours. The manufacturing pipeline alone saved us $50,000 in the first quarter.",
        author: "Michael Chen",
        role: "Production Director",
        company: "AurumCraft Manufacturing",
      },
      {
        category: "Design Studio",
        quote:
          "The AI Design Suite is incredible. We generate concepts in minutes that used to take days. Our clients are amazed at how quickly we can present options. The 3D converter is a game-changer.",
        author: "Sarah Williams",
        role: "Lead Designer",
        company: "LuxeDesign Studio",
      },
      {
        category: "Retail Store",
        quote:
          "We launched our online store in one day with REMAURA. The e-commerce integration with Instagram and Etsy doubled our sales in the first month. Customer management is seamless.",
        author: "David Rodriguez",
        role: "Store Owner",
        company: "GoldenElegance Boutique",
      },
      {
        category: "Gold Workshop",
        quote:
          "The weight calculator and casting analysis features are worth the price alone. We've eliminated material waste and casting failures. REMAURA pays for itself many times over.",
        author: "Ahmed Hassan",
        role: "Master Goldsmith",
        company: "Heritage Gold Works",
      },
    ],
  },
  faq: {
    tag: "FAQ",
    titlePre: "Frequently asked",
    titleGold: "questions.",
    titlePost: "",
    desc: "Everything you need to know about REMAURA AI. Can't find the answer you're looking for? Reach out to our team.",
    items: [
      {
        question: "What is REMAURA AI?",
        answer:
          "REMAURA AI is the world's first Digital Jewelry Operating System (Jewelry OS). It centralizes the entire jewelry workflow — from design and manufacturing to marketing and sales — inside one intelligent platform, replacing dozens of disconnected software tools.",
      },
      {
        question: "Who is REMAURA AI for?",
        answer:
          "REMAURA AI is designed for jewelry manufacturers, jewelry designers, gold workshops, jewelry brands, wholesalers, retail jewelry stores, CAD designers, and production managers. Whether you're a solo designer or a large manufacturing facility, REMAURA scales to your needs.",
      },
      {
        question: "How does the AI Design feature work?",
        answer:
          'Our AI Design Suite allows you to generate professional jewelry concepts from text descriptions or reference images. Simply describe what you want (e.g., "elegant platinum engagement ring with sapphire center stone"), and the AI generates multiple design options in seconds. You can then refine, edit, and export to 3D formats.',
      },
      {
        question: "What file formats does the 3D Converter support?",
        answer:
          "The 3D Converter supports all major jewelry and 3D file formats including STL, OBJ, GLB, GLTF, FBX, STEP, IGES, and 3DM. You can convert between any of these formats with a single click, including batch conversion for large collections.",
      },
      {
        question: "How does the Manufacturing Pipeline work?",
        answer:
          "Upload your 3D model, and our system automatically performs mesh repair, wall thickness analysis, casting risk assessment, weight calculation, and shrinkage compensation. You receive a complete production report with manufacturing-ready files and recommendations.",
      },
      {
        question: "Can I sell on multiple platforms?",
        answer:
          "Yes. REMAURA includes a built-in e-commerce store with your own custom domain, plus one-click export to Instagram, Facebook, Pinterest, TikTok, Etsy, Shopify, and WooCommerce. Manage all your sales channels from one dashboard.",
      },
      {
        question: "Is my data secure?",
        answer:
          "Absolutely. REMAURA uses enterprise-grade encryption, secure cloud infrastructure, and regular security reviews. Your designs, customer data, and business information are protected.",
      },
      {
        question: "Do I need technical skills to use REMAURA?",
        answer:
          "Not at all. REMAURA is designed with an intuitive interface that requires no technical background. If you can use a smartphone, you can use REMAURA. We also provide comprehensive documentation and live video support for all plans.",
      },
      {
        question: "What is included in the free trial?",
        answer:
          "The 14-day free trial includes full access to all features — AI Design Suite, 3D Converter, Manufacturing Pipeline, E-Commerce Store, Analytics Dashboard, and all export options. No credit card required to start.",
      },
      {
        question: "How does pricing work?",
        answer:
          "We offer simple, transparent pricing: $150/month for monthly billing, or $2,000/year (save 33%) for annual billing. Both plans include everything — hosting, AI features, e-commerce, analytics, and support. No hidden fees.",
      },
      {
        question: "Can I cancel my subscription anytime?",
        answer:
          "Yes, you can cancel your subscription at any time with no penalties. If you cancel, you'll continue to have access until the end of your current billing period. We also offer a 30-day money-back guarantee.",
      },
      {
        question: "Do you offer custom enterprise plans?",
        answer:
          "Yes, we offer custom enterprise plans for large organizations with specific needs. These include dedicated infrastructure, custom integrations, SLA guarantees, and on-site training. Contact our sales team for a personalized quote.",
      },
    ],
  },
  footer: {
    ctaTitlePre: "Ready to transform your",
    ctaTitleGold: "jewelry business?",
    ctaDesc:
      "Join the jewelry professionals who are already using REMAURA AI to design, manufacture, and sell smarter.",
    ctaPrimary: "Start Free Demo",
    ctaSecondary: "Contact Sales",
    about:
      "The world's first Digital Jewelry Operating System. Design, manufacture, market, and sell — all in one platform.",
    columns: {
      product: {
        title: "Product",
        links: ["Jewelry OS", "AI Suite", "Manufacturing", "E-Commerce", "Analytics", "Pricing"],
      },
      company: {
        title: "Company",
        links: ["About Us", "Careers", "Blog", "Press Kit", "Contact"],
      },
      resources: {
        title: "Resources",
        links: ["Documentation", "API Reference", "Tutorials", "Community", "Status"],
      },
      legal: {
        title: "Legal",
        links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR"],
      },
    },
    copyright: "© 2026 REMAURA AI. All rights reserved.",
    bottomLinks: ["Privacy Policy", "Terms of Service", "Cookie Settings"],
  },
  studio: {
    tools: "Tools",
    allTools: "All Tools",
    studio: "Studio",
    credit: "Credits",
    categoryJewelry: "Jewelry Design",
    categoryBg: "Background Remover",
    categoryPhoto: "Photo Edit",
    category3d: "3D AI",
    formatLabel: "Format",
    formatPortrait: "Portrait",
    promptLabel: "What do you want to design?",
    promptPlaceholder: "E.g. 18k gold, vintage Art Deco style, diamond center stone ring...",
    promptHelp: "Detailed description = better results. Specify metal, style, stone type.",
    optimizedTitle: "Optimized",
    optimizeBtn: "Optimize Prompt",
    optimizing: "Optimizing...",
    negativeLabel: "Unwanted elements (optional)",
    negativePlaceholder: "Blurry, low quality, scratches, dark background...",
    styleLabel: "Style Reference",
    styleHint: "Upload a sample image so the designer follows its style",
    styleUpload: "Upload Image",
    styleAnalyzeBtn: "Style Analysis",
    styleAnalyzing: "Analyzing...",
    generateBtn: "Generate Image",
    generating: "Generating...",
    disclaimer: "AI-generated content is for reference purposes only.",
    emptyTitle: "Create Your Design",
    emptyDesc: 'Pick a format from the Tools menu, write a prompt and click "Generate Image".',
    emptyStep1: "Pick format",
    emptyStep2: "Write prompt",
    emptyStep3: "Generate",
    zoomHint: "Click to enlarge",
    zoomClose: "Close",
    analysisTitle: "AI Product Analysis",
    analysisDesc: "Analyzes the image and generates a title, description and tags",
    analyzeBtn: "Analyze",
    analyzing: "Analyzing...",
    resultTitle: "Title",
    resultDesc: "Description",
    resultTags: "Tags",
    resultHashtags: "Hashtags",
    exportTitle: "Platform Content",
    downloadBtn: "Download PNG",
    saveBtn: "Save to Gallery",
    comingSoon: "Coming soon.",
    comingSoonBack: "Go to Jewelry Design",
    generateFailed: "Generation failed, please try again.",
  },
};

export type RaiDict = typeof en;
