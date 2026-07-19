window.CF_CONFIG = {
  id: 'board',
  name: 'Board',
  tag: '07 · Board',
  home: 'board',
  crumbs: {
    board: 'Quadro', list: 'Lista', empty: 'Empty', detail: 'Card', an: 'Analytics',
    cal: 'Calendário', brands: 'Marcas', brand: 'DNA', swipe: 'Swipe', studio: 'Studio',
    jobs: 'Jobs', editorial: 'Editorial', settings: 'Settings',
  },
  nav: [
    { label: 'Board', items: [
      { view: 'board', label: 'Produção' },
      { view: 'list', label: 'Lista' },
      { view: 'editorial', label: 'Editorial' },
    ]},
    { label: 'Criar', items: [
      { view: 'studio', label: 'AI Images' },
      { view: 'swipe', label: 'Swipe', cnt: 5 },
    ]},
    { label: 'Operar', items: [
      { view: 'cal', label: 'Calendário' },
      { view: 'an', label: 'Analytics' },
      { view: 'jobs', label: 'Jobs' },
      { view: 'brands', label: 'Marcas' },
    ]},
  ],
};
