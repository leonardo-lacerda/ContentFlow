window.CF_CONFIG = {
  id: 'operator',
  name: 'Operator',
  tag: '01 · Operator',
  home: 'list',
  crumbs: {
    list: 'Criativos', empty: 'Empty', detail: 'Detalhe', an: 'Analytics', cal: 'Calendário',
    brands: 'Marcas', brand: 'DNA', swipe: 'Swipe', studio: 'AI Images', jobs: 'Jobs',
    media: 'Media', editorial: 'Editorial', settings: 'Settings',
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
      { view: 'editorial', label: 'Editorial' },
    ]},
    { label: 'Biblioteca', items: [
      { view: 'brands', label: 'Marcas' },
      { view: 'media', label: 'Media' },
    ]},
  ],
};
