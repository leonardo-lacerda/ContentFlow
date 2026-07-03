'use client';

import { BarChart3, ArrowRight } from 'lucide-react';
import { Button } from '@gitroom/react/form/button';

export function EmptyPerformance() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-[80px] h-[80px] rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
        <BarChart3 className="w-10 h-10 text-gray-300 dark:text-gray-600" />
      </div>
      <h3 className="text-[18px] font-[600] text-black dark:text-white mb-2">
        Nenhum dado de performance ainda
      </h3>
      <p className="text-[14px] text-gray-500 dark:text-gray-400 text-center max-w-[360px] mb-6">
        Os dados de performance dos carrosséis aparecerão aqui assim que as métricas
        forem coletadas das plataformas de publicação.
      </p>
      <div className="flex gap-3">
        <Button>Coletar Métricas</Button>
      </div>
    </div>
  );
}
