window.CF_CONFIG = {
  id: 'signal',
  name: 'Signal',
  tag: '10 · Signal',
  home: 'signal',
  crumbs: {
    signal: 'Central', list: 'Criativos', empty: 'Empty', detail: 'Item', an: 'Analytics',
    cal: 'Calendário', brands: 'Marcas', brand: 'DNA', swipe: 'Swipe', studio: 'Studio',
    jobs: 'Jobs', editorial: 'Editorial', settings: 'Settings', integrations: 'Integrações',
  },
  nav: [
    { label: 'Agora', items: [
      { view: 'signal', label: 'Central' },
      { view: 'swipe', label: 'Aprovar ideias', cnt: 5 },
      { view: 'jobs', label: 'Jobs', cnt: 3 },
    ]},
    { label: 'Trabalho', items: [
      { view: 'list', label: 'Criativos' },
      { view: 'cal', label: 'Calendário' },
      { view: 'studio', label: 'AI Images' },
      { view: 'editorial', label: 'Editorial' },
    ]},
    { label: 'Sistema', items: [
      { view: 'an', label: 'Analytics' },
      { view: 'brands', label: 'Marcas' },
      { view: 'integrations', label: 'Integrações' },
    ]},
  ],
};
