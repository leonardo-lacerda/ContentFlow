window.CF_CONFIG = {
  id: 'shelf',
  name: 'Shelf',
  tag: '09 · Shelf',
  home: 'shelf',
  crumbs: {
    shelf: 'Estante', list: 'Peças', empty: 'Empty', detail: 'Item', templates: 'Templates',
    media: 'Arquivos', brands: 'Marcas', brand: 'DNA', an: 'Analytics', cal: 'Calendário',
    studio: 'Studio', swipe: 'Swipe', jobs: 'Jobs', settings: 'Settings',
  },
  nav: [
    { label: 'Biblioteca', items: [
      { view: 'shelf', label: 'Estante' },
      { view: 'list', label: 'Todas as peças', cnt: 12 },
      { view: 'templates', label: 'Templates' },
      { view: 'media', label: 'Arquivos' },
    ]},
    { label: 'Criar', items: [
      { view: 'studio', label: 'AI Images' },
      { view: 'swipe', label: 'Swipe' },
    ]},
    { label: 'Operar', items: [
      { view: 'cal', label: 'Calendário' },
      { view: 'an', label: 'Analytics' },
      { view: 'brands', label: 'Marcas' },
      { view: 'jobs', label: 'Jobs' },
    ]},
  ],
};
