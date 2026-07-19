window.CF_CONFIG = {
  id: 'grid',
  name: 'Grid',
  tag: '06 · Grid',
  home: 'grid',
  crumbs: {
    grid: 'Planilha', list: 'Tabela', empty: 'Empty', detail: 'Linha', an: 'Analytics',
    cal: 'Calendário', brands: 'Marcas', brand: 'DNA', swipe: 'Swipe', studio: 'Studio',
    jobs: 'Jobs', settings: 'Settings', media: 'Media',
  },
  nav: [
    { label: 'Dados', items: [
      { view: 'grid', label: 'Planilha criativos' },
      { view: 'list', label: 'Vista tabela' },
      { view: 'jobs', label: 'Jobs', cnt: 3 },
    ]},
    { label: 'Produção', items: [
      { view: 'studio', label: 'AI Images' },
      { view: 'swipe', label: 'Swipe' },
      { view: 'cal', label: 'Calendário' },
    ]},
    { label: 'Contexto', items: [
      { view: 'an', label: 'Analytics' },
      { view: 'brands', label: 'Marcas' },
      { view: 'media', label: 'Media' },
    ]},
  ],
};
