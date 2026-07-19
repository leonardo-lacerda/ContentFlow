window.CF_CONFIG = {
  id: 'ledger',
  name: 'Ledger',
  tag: '02 · Ledger',
  home: 'list',
  crumbs: {
    list: 'Criativos', empty: 'Empty', detail: 'Detalhe', an: 'Analytics', cal: 'Calendário',
    brands: 'Marcas', brand: 'DNA', swipe: 'Swipe', studio: 'AI Images', jobs: 'Jobs',
    settings: 'Settings', affiliates: 'Afiliados', templates: 'Templates',
  },
  nav: [
    { label: 'Criar', items: [
      { view: 'studio', label: 'AI Images' },
      { view: 'list', label: 'Criativos', cnt: 12 },
      { view: 'swipe', label: 'Content Swipe', cnt: 5 },
    ]},
    { label: 'Operar', items: [
      { view: 'cal', label: 'Calendário' },
      { view: 'an', label: 'Analytics' },
      { view: 'jobs', label: 'Jobs', cnt: 3 },
    ]},
    { label: 'Crescimento', items: [
      { view: 'affiliates', label: 'Afiliados' },
      { view: 'templates', label: 'Templates' },
    ]},
    { label: 'Biblioteca', items: [
      { view: 'brands', label: 'Marcas' },
    ]},
  ],
};
