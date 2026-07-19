window.CF_CONFIG = {
  id: 'desk',
  name: 'Desk',
  tag: '05 · Desk',
  home: 'list',
  crumbs: {
    list: 'Caixa de entrada', empty: 'Empty', detail: 'Leitura', an: 'Analytics', cal: 'Calendário',
    brands: 'Marcas', brand: 'DNA', swipe: 'Swipe', studio: 'AI Images', jobs: 'Jobs',
    media: 'Media', settings: 'Settings',
  },
  nav: [
    { label: 'Filas', items: [
      { view: 'list', label: 'Caixa de entrada', cnt: 12 },
      { view: 'empty', label: 'Rascunhos', cnt: 3 },
      { view: 'cal', label: 'Agendados', cnt: 6 },
    ]},
    { label: 'Espaços', items: [
      { view: 'an', label: 'Analytics' },
      { view: 'studio', label: 'AI Images' },
      { view: 'swipe', label: 'Content Swipe' },
      { view: 'brands', label: 'Marcas' },
      { view: 'jobs', label: 'Jobs' },
      { view: 'media', label: 'Media' },
    ]},
  ],
};
