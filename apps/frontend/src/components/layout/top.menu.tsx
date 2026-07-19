'use client';

import { FC, ReactNode, memo, useMemo } from 'react';
import clsx from 'clsx';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { MenuItem } from '@gitroom/frontend/components/new-layout/menu-item';

interface MenuItemInterface {
  id?: string;
  name: string;
  icon: ReactNode;
  path: string;
  role?: string[];
  hide?: boolean;
  requireBilling?: boolean;
  onClick?: () => void;
}

const iconClass = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const Icons = {
  home: (
    <svg {...iconClass}>
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  ),
  brand: (
    <svg {...iconClass}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
    </svg>
  ),
  swipe: (
    <svg {...iconClass}>
      <rect x="3" y="4" width="14" height="16" rx="2" />
      <path d="M17 8h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8" />
    </svg>
  ),
  generate: (
    <svg {...iconClass}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 17.5h7M17.5 14v7" />
    </svg>
  ),
  posts: (
    <svg {...iconClass}>
      <path d="M4 4h16v16H4z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  ),
  publish: (
    <svg {...iconClass}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  channels: (
    <svg {...iconClass}>
      <circle cx="8" cy="8" r="3" />
      <circle cx="16" cy="8" r="3" />
      <circle cx="12" cy="16" r="3" />
      <path d="M10.5 9.5l1.5 4M13.5 9.5L12 13.5M10 8h4" />
    </svg>
  ),
  media: (
    <svg {...iconClass}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M3 16l5-4 4 3 4-5 5 6" />
    </svg>
  ),
  billing: (
    <svg {...iconClass}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  settings: (
    <svg {...iconClass}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
};

export const useMenuItem = () => {
  const t = useT();

  const firstMenu = [
    {
      name: t('studio', 'Início'),
      icon: Icons.home,
      path: '/',
    },
    {
      name: t('my_brand', 'Minha marca'),
      icon: Icons.brand,
      path: '/brand',
    },
    {
      name: t('content_swipe', 'Content Swipe'),
      icon: Icons.swipe,
      path: '/swipe',
    },
    {
      name: t('generate_carousel', 'Gerar carrossel'),
      icon: Icons.generate,
      path: '/generate',
    },
    {
      name: t('posts', 'Posts'),
      icon: Icons.posts,
      path: '/posts',
    },
    {
      name: t('calendar', 'Calendário'),
      icon: Icons.publish,
      path: '/publish',
    },
    {
      name: t('channels', 'Canais'),
      icon: Icons.channels,
      path: '/channels',
    },
    {
      name: t('media', 'Mídia'),
      icon: Icons.media,
      path: '/media',
    },
  ] satisfies MenuItemInterface[] as MenuItemInterface[];

  const secondMenu = [
    {
      name: t('billing', 'Assinatura'),
      icon: Icons.billing,
      path: '/billing',
      requireBilling: true,
    },
    {
      name: t('settings', 'Configurações'),
      icon: Icons.settings,
      path: '/settings',
      role: ['ADMIN', 'SUPERADMIN', 'USER'],
    },
  ] satisfies MenuItemInterface[] as MenuItemInterface[];

  const all = [...firstMenu, ...secondMenu];
  return {
    firstMenu,
    secondMenu,
    all,
  };
};

const MENU_SECTIONS: { id: string; label: string; paths: string[] }[] = [
  {
    id: 'estudio',
    label: 'Estúdio',
    paths: ['/'],
  },
  {
    id: 'marca',
    label: 'Marca',
    paths: ['/brand'],
  },
  {
    id: 'criar',
    label: 'Criar',
    paths: ['/swipe', '/generate', '/posts'],
  },
  {
    id: 'publicar',
    label: 'Publicar',
    paths: ['/publish', '/channels'],
  },
  {
    id: 'biblioteca',
    label: 'Biblioteca',
    paths: ['/media'],
  },
];

const MenuSectionLabel: FC<{ label: string }> = ({ label }) => (
  <div
    className={clsx(
      'px-[10px] pt-[10px] pb-[4px] text-[10px] font-[700] uppercase tracking-[0.08em] text-textItemBlur/70',
      'hidden group-hover/sidebar:block whitespace-nowrap overflow-hidden'
    )}
  >
    {label}
  </div>
);

export const TopMenu: FC = () => {
  const user = useUser();
  const { firstMenu, secondMenu } = useMenuItem();
  const { billingEnabled } = useVariables();

  const filteredFirstMenu = useMemo(
    () =>
      (firstMenu || []).filter((f) => {
        if (f.hide) return false;
        if (f.requireBilling && !billingEnabled) return false;
        if (f.role) return f.role.includes(user?.role!);
        return true;
      }),
    [firstMenu, billingEnabled, user?.role]
  );

  const filteredSecondMenu = useMemo(
    () =>
      (secondMenu || []).filter((f) => {
        if (f.hide) return false;
        if (f.requireBilling && !billingEnabled) return false;
        if (f.role) return f.role.includes(user?.role!);
        return true;
      }),
    [secondMenu, billingEnabled, user?.role]
  );

  const sectionedMenu = useMemo(() => {
    const byPath = new Map(filteredFirstMenu.map((item) => [item.path, item]));
    const used = new Set<string>();
    const sections: {
      id: string;
      label: string;
      items: typeof filteredFirstMenu;
    }[] = [];

    for (const section of MENU_SECTIONS) {
      const items = section.paths
        .map((path) => byPath.get(path))
        .filter(Boolean) as typeof filteredFirstMenu;
      items.forEach((item) => used.add(item.path));
      if (items.length) {
        sections.push({ id: section.id, label: section.label, items });
      }
    }

    const leftovers = filteredFirstMenu.filter((item) => !used.has(item.path));
    if (leftovers.length) {
      sections.push({ id: 'outros', label: 'Outros', items: leftovers });
    }

    return sections;
  }, [filteredFirstMenu]);

  // v1: Free users also see the core menu (trial of the full loop)
  const canShowFirstMenu = Boolean(user?.orgId);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-[8px]">
      <div className="flex flex-1 flex-col gap-[2px] overflow-y-auto overflow-x-hidden min-h-0 scrollbar-thin scrollbar-thumb-newBorder scrollbar-track-transparent blurMe">
        {canShowFirstMenu &&
          sectionedMenu.map((section) => (
            <div key={section.id} className="flex flex-col gap-[2px]">
              <MenuSectionLabel label={section.label} />
              {section.items.map((item) => (
                <MenuItem
                  path={item.path}
                  label={item.name}
                  icon={item.icon}
                  key={item.path + item.name}
                  onClick={item.onClick}
                />
              ))}
            </div>
          ))}
      </div>
      <div className="flex flex-col gap-[2px] shrink-0 border-t border-newSep pt-[8px] blurMe">
        <MenuSectionLabel label="Conta" />
        {filteredSecondMenu.map((item) => (
          <MenuItem
            path={item.path}
            label={item.name}
            icon={item.icon}
            key={item.path + item.name}
            onClick={item.onClick}
          />
        ))}
      </div>
    </div>
  );
};
