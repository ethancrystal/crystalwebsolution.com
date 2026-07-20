export const V2_SERVICES = Object.freeze([
  Object.freeze({
    id: 'ai-automation',
    index: '01',
    title: 'AI Automation',
    value:
      'Use practical AI systems to reduce repetitive cognitive work and improve response speed.',
    deliverables: Object.freeze([
      'AI assistants and chatbots',
      'Knowledge-base and retrieval systems',
      'AI-assisted support, content, and analysis',
    ]),
    outcome:
      'Faster, more consistent execution without presenting an invented performance number.',
    relatedProject: null,
  }),
  Object.freeze({
    id: 'workflow-automation',
    index: '02',
    title: 'Workflow Automation',
    value:
      'Connect business tools and automate repeatable handoffs so operational work moves without constant manual intervention.',
    deliverables: Object.freeze([
      'CRM and lead-routing workflows',
      'Client onboarding and document generation',
      'Email, proposal, invoice, and task automation',
    ]),
    outcome:
      'Fewer manual handoffs, clearer ownership, and more reliable operations.',
    relatedProject: null,
  }),
  Object.freeze({
    id: 'web-platforms',
    index: '03',
    title: 'Web Platforms & Development',
    value:
      'Design and engineer fast, scalable websites and applications that support acquisition, service delivery, and growth.',
    deliverables: Object.freeze([
      'Marketing websites and conversion landing pages',
      'Ecommerce and authenticated web applications',
      'CMS, integrations, and performance engineering',
    ]),
    outcome:
      'A maintainable digital platform that can evolve with the business.',
    relatedProject: null,
  }),
  Object.freeze({
    id: 'product-ux',
    index: '04',
    title: 'Product & UX Design',
    value:
      'Turn complex requirements into clear product structures, usable interfaces, and coherent interaction systems.',
    deliverables: Object.freeze([
      'Product discovery and experience architecture',
      'UI systems and interaction design',
      'Prototypes and usability validation',
    ]),
    outcome:
      'A product experience people can understand and use with confidence.',
    relatedProject: null,
  }),
  Object.freeze({
    id: 'brand-growth',
    index: '05',
    title: 'Brand, Growth & Optimization',
    value:
      'Build a coherent digital identity and improve how the complete experience attracts, persuades, and converts.',
    deliverables: Object.freeze([
      'Brand systems and digital identity',
      'SEO and conversion optimization',
      'Analytics, experimentation, and growth support',
    ]),
    outcome:
      'A recognizable brand and a disciplined framework for continuous improvement.',
    relatedProject: null,
  }),
]);

export function getV2Service(serviceId) {
  return V2_SERVICES.find((service) => service.id === serviceId) ?? null;
}
