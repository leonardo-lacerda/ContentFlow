window.CF_CONFIG = {
  id: 'thread',
  name: 'Thread',
  tag: '08 · Thread',
  home: 'list',
  crumbs: {
    list: 'Fila de revisão', empty: 'Empty', detail: 'Peça', thread: 'Discussão',
    an: 'Analytics', cal: 'Calendário', brands: 'Marcas', brand: 'DNA',
    swipe: 'Swipe', studio: 'Studio', jobs: 'Jobs', settings: 'Settings',
  },
  nav: [
    { label: 'Revisão', items: [
      { view: 'list', label: 'Fila', cnt: 12 },
      { view: 'thread', label: 'Em discussão', cnt: 3 },
      { view: 'swipe', label: 'Swipe ideias', cnt: 5 },
    ]},
    { label: 'Produção', items: [
      { view: 'studio', label: 'AI Images' },
      { view: 'cal', label: 'Calendário' },
      { view: 'jobs', label: 'Jobs' },
    ]},
    { label: 'Base', items: [
      { view: 'an', label: 'Analytics' },
      { view: 'brands', label: 'Marcas' },
    ]},
  ],
};
