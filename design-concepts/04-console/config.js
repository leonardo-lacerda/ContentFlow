window.CF_CONFIG = {
  id: 'console',
  name: 'Console',
  tag: '04 · Console',
  home: 'list',
  crumbs: {
    list: 'Criativos', empty: 'Empty', detail: 'Detalhe', an: 'Analytics', cal: 'Calendário',
    brands: 'Marcas', brand: 'DNA', swipe: 'Swipe', studio: 'AI Images', jobs: 'Jobs',
    settings: 'Settings', integrations: 'Integrações', billing: 'Billing',
  },
  nav: [
    { label: 'Criar', items: [
      { view: 'studio', label: 'AI Images' },
      { view: 'list', label: 'Criativos' },
      { view: 'swipe', label: 'Content Swipe' },
    ]},
    { label: 'Operar', items: [
      { view: 'cal', label: 'Calendário' },
      { view: 'an', label: 'Analytics' },
      { view: 'jobs', label: 'Jobs' },
    ]},
    { label: 'Conta', items: [
      { view: 'brands', label: 'Marcas' },
      { view: 'integrations', label: 'Integrações' },
      { view: 'billing', label: 'Billing' },
    ]},
  ],
};
