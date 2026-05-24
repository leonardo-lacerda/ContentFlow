import { Metadata } from 'next';
import { AiGenerateImagesComponent } from '@gitroom/frontend/components/ai-generate/ai-generate-images.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';

export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'ContentFlow' : 'Gitroom'} AI Images`,
  description: '',
};

export default async function Page() {
  return (
    <div className="bg-newBgColorInner flex-1 flex-col flex p-[20px] gap-[12px]">
      <AiGenerateImagesComponent />
    </div>
  );
}
