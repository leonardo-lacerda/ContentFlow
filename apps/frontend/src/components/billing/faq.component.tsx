'use client';

import { FC, useCallback, useState } from 'react';
import clsx from 'clsx';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
const useFaqList = () => {
  const { isGeneral } = useVariables();
  const user = useUser();
  const t = useT();
  return [
    ...(user?.allowTrial
      ? [
          {
            title: t(
              'faq_am_i_going_to_be_charged_by_contentflow',
              'Am I going to be charged by ContentFlow?'
            ),
            description: t(
              'faq_to_confirm_credit_card_information_contentflow_will_hold',
              'To confirm credit card information ContentFlow will hold $2 and release it immediately, you can cancel your subscription anytime from settings without talking to a person'
            ),
          },
        ]
      : []),
    {
      title: t(
        'faq_can_i_trust_contentflow_gitroom',
        `Can I trust ${isGeneral ? 'ContentFlow' : 'Gitroom'}?`
      ),
      description: t(
        'faq_contentflow_gitroom_is_proudly_open_source',
        `${
          isGeneral ? 'ContentFlow' : 'Gitroom'
        } is proudly open-source! We believe in an ethical and transparent culture, meaning that ${
          isGeneral ? 'ContentFlow' : 'Gitroom'
        } will live forever. You can check out the entire code or use it for personal projects. To view the open-source repository, <a href="https://github.com/gitroomhq/contentflow-app" target="_blank" style="text-decoration: underline;">click here</a>.`
      ),
    },
    {
      title: t('faq_what_are_channels', 'What are channels?'),
      description: t(
        'faq_contentflow_gitroom_allows_you_to_schedule_posts',
        `${
          isGeneral ? 'ContentFlow' : 'Gitroom'
        } allows you to schedule your posts between different channels.
A channel is a publishing platform where you can schedule your posts.
For example, you can schedule your posts on X, Facebook, Instagram, TikTok, YouTube, Reddit, Linkedin, Dribbble, Threads and Pinterest.`
      ),
    },
    {
      title: t('faq_what_are_team_members', 'What are team members?'),
      description: t(
        'faq_if_you_have_a_team_with_multiple_members',
        'If you have a team with multiple members, you can invite them to your workspace to collaborate on your posts and add their personal channels'
      ),
    },
  ];
};
export const FAQSection: FC<{
  title: string;
  description: string;
}> = (props) => {
  const { title, description } = props;
  const [show, setShow] = useState(false);
  const changeShow = useCallback(() => {
    setShow(!show);
  }, [show]);
  return (
    <div
      className="border-t-2 border-[#14171A] last:border-b-2 cursor-pointer"
      onClick={changeShow}
    >
      <div className="w-full flex justify-between items-center gap-[20px] py-[20px] font-[800] text-[15px] group">
        <div className="flex-1 group-hover:text-[#2E62FF] transition-colors">
          {title}
        </div>
        <div
          className={clsx(
            'shrink-0 text-[22px] font-[900] leading-none transition-transform duration-300',
            show ? 'rotate-45 text-[#FF5A3C]' : 'text-[#2E62FF]'
          )}
        >
          +
        </div>
      </div>
      <div
        className={clsx(
          'transition-all duration-400 overflow-hidden',
          !show ? 'max-h-[0]' : 'max-h-[500px]'
        )}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="pb-[22px] w-full text-wrap font-[500] text-[14px] leading-relaxed text-[#14171A]/65 select-text max-w-[600px]"
          dangerouslySetInnerHTML={{
            __html: description,
          }}
        />
      </div>
    </div>
  );
};
export const FAQComponent: FC = () => {
  const t = useT();
  const list = useFaqList();
  return (
    <div>
      <div
        className="uppercase mb-[16px] leading-none"
        style={{ fontFamily: "'Anton', sans-serif", fontSize: '22px', letterSpacing: '.5px' }}
      >
        {t('frequently_asked_questions', 'Perguntas frequentes')}
      </div>
      <div className="flex-col flex select-none">
        {list.map((item, index) => (
          <FAQSection key={index} {...item} />
        ))}
      </div>
    </div>
  );
};
