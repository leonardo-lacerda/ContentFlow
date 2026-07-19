window.CF_CONFIG = {
  id: 'pages',
  name: 'Pages',
  tag: '03 · Pages',
  home: 'list',
  crumbs: {
    list: 'Criativos', empty: 'Empty', detail: 'Página', an: 'Analytics', cal: 'Calendário',
    brands: 'Marcas', brand: 'DNA', swipe: 'Swipe', studio: 'AI Images', jobs: 'Jobs',
    settings: 'Settings', editorial: 'Editorial', onboarding: 'Onboarding',
  },
  nav: [
    { label: 'Privado', items: [
      { view: 'studio', label: 'AI Images' },
      { view: 'list', label: 'Criativos', cnt: 12 },
      { view: 'swipe', label: 'Content Swipe' },
      { view: 'cal', label: 'Calendário' },
      { view: 'an', label: 'Analytics' },
      { view: 'editorial', label: 'Editorial' },
      { view: 'onboarding', label: 'Onboarding' },
    ]},
    { label: 'Biblioteca', items: [
      { view: 'brands', label: 'Marcas' },
      { view: 'jobs', label: 'Jobs' },
    ]},
  ],
};
