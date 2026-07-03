'use client';

import React, { FC, Fragment, memo, useCallback } from 'react';
import {
  Integrations,
  useCalendar,
} from '@gitroom/frontend/components/launches/calendar.context';
import dayjs from 'dayjs';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { ExistingDataContextProvider } from '@gitroom/frontend/components/launches/helpers/use.existing.data';
import { useDrag } from 'react-dnd';
import { Integration, Post, State, Tags } from '@prisma/client';
import { useToaster } from '@gitroom/react/toaster/toaster';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import SafeImage from '@gitroom/react/helpers/safe.image';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { AddEditModal } from '@gitroom/frontend/components/new-launch/add.edit.modal';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { StatisticsModal } from '@gitroom/frontend/components/launches/statistics';
import { MissingReleaseModal } from '@gitroom/frontend/components/launches/missing-release.modal';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import copy from 'copy-to-clipboard';
import { stripHtmlValidation } from '@gitroom/helpers/utils/strip.html.validation';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { isUSCitizen } from './helpers/isuscitizen.utils';
import clsx from 'clsx';
import {
  CopyDebug,
  Duplicate,
  Preview,
  Statistics,
  DeletePost,
} from './calendar-icons';

// Shared hook for post actions (edit, delete, statistics)
export const usePostActions = (onMutate?: () => void) => {
  const t = useT();
  const fetch = useFetch();
  const modal = useModals();
  const toaster = useToaster();
  const { integrations, reloadCalendarView } = useCalendar();

  const mutate = useCallback(() => {
    reloadCalendarView();
    onMutate?.();
  }, [reloadCalendarView, onMutate]);

  const editPost = useCallback(
    (loadPost: any, isDuplicate?: boolean) => async () => {
      const post = {
        ...loadPost,
        publishDate: loadPost.actualDate || loadPost.publishDate,
      };

      const data = await (await fetch(`/posts/group/${post.group}`)).json();
      const date = !isDuplicate
        ? null
        : (await (await fetch('/posts/find-slot')).json()).date;
      const publishDate = dayjs
        .utc(date || data.posts[0].publishDate)
        .local();
      const ExistingData = !isDuplicate
        ? ExistingDataContextProvider
        : Fragment;
      modal.openModal({
        id: 'add-edit-modal',
        closeOnClickOutside: false,
        removeLayout: true,
        closeOnEscape: false,
        withCloseButton: false,
        askClose: true,
        fullScreen: true,
        classNames: {
          modal: 'w-[100%] max-w-[1400px] text-textColor',
        },
        children: (
          <ExistingData value={data}>
            <AddEditModal
              {...(isDuplicate
                ? {
                    onlyValues: data.posts.map(
                      ({ image, settings, content }: any) => ({
                        image,
                        settings,
                        content,
                      })
                    ),
                  }
                : {})}
              allIntegrations={integrations.map((p) => ({ ...p }))}
              reopenModal={editPost(post)}
              mutate={mutate}
              integrations={
                isDuplicate
                  ? integrations
                  : integrations
                      .slice(0)
                      .filter((f) => f.id === data.integration)
                      .map((p) => ({
                        ...p,
                        picture: data.integrationPicture,
                      }))
              }
              date={publishDate}
            />
          </ExistingData>
        ),
        size: '80%',
        title: ``,
      });
    },
    [integrations, fetch, modal, mutate]
  );

  const copyDebugJson = useCallback(
    (post: any) => async () => {
      try {
        const data = await (
          await fetch(`/posts/group/${post.group}/debug-export`)
        ).json();
        copy(JSON.stringify(data, null, 2));
        toaster.show(
          t('debug_json_copied', 'Debug JSON copied to clipboard'),
          'success'
        );
      } catch {
        toaster.show(
          t('debug_json_copy_failed', 'Failed to copy debug data'),
          'warning'
        );
      }
    },
    [fetch, toaster, t]
  );

  const deletePost = useCallback(
    (post: any) => async () => {
      if (
        !(await deleteDialog(
          t(
            'are_you_sure_you_want_to_delete_post',
            'Are you sure you want to delete post?'
          )
        ))
      ) {
        return;
      }

      await fetch(`/posts/${post.group}`, {
        method: 'DELETE',
      });

      toaster.show(
        t('post_deleted_successfully', 'Post deleted successfully'),
        'success'
      );

      mutate();
    },
    [toaster, t, fetch, mutate]
  );

  const openStatistics = useCallback(
    (id: string) => () => {
      modal.openModal({
        title: t('statistics', 'Statistics'),
        closeOnClickOutside: true,
        closeOnEscape: true,
        withCloseButton: true,
        classNames: {
          modal: 'w-[100%] max-w-[1400px]',
        },
        children: <StatisticsModal postId={id} />,
        size: '80%',
      });
    },
    [modal, t]
  );

  const openMissingRelease = useCallback(
    (id: string) => () => {
      modal.openModal({
        title: t('connect_post', 'Connect Post'),
        closeOnClickOutside: true,
        closeOnEscape: true,
        withCloseButton: true,
        classNames: {
          modal: 'w-[100%] max-w-[800px]',
        },
        children: (
          <MissingReleaseModal postId={id} onSuccess={mutate} />
        ),
        size: '60%',
      });
    },
    [modal, t, mutate]
  );

  return { editPost, deletePost, copyDebugJson, openStatistics, openMissingRelease };
};

export const CalendarItem: FC<{
  date: dayjs.Dayjs;
  isBeforeNow: boolean;
  editPost: () => void;
  duplicatePost: () => void;
  copyDebugJson?: () => void;
  deletePost: () => void;
  statistics: () => void;
  missingRelease?: () => void;
  integrations: Integrations[];
  state: State;
  display: 'day' | 'week' | 'month';
  showTime?: boolean;
  post: Post & {
    integration: Integration;
    tags: {
      tag: Tags;
    }[];
  };
}> = memo((props) => {
  const t = useT();
  const {
    editPost,
    statistics,
    duplicatePost,
    copyDebugJson,
    post,
    date,
    isBeforeNow,
    state,
    display,
    deletePost,
    showTime,
    missingRelease,
  } = props;
  const { disableXAnalytics } = useVariables();
  const preview = useCallback(() => {
    window.open(`/p/` + post.id + '?share=true', '_blank');
  }, [post]);
  const [{ opacity }, dragRef] = useDrag(
    () => ({
      type: 'post',
      item: {
        id: post.id,
        interval: !!post.intervalInDays,
        date,
      },
      collect: (monitor) => ({
        opacity: monitor.isDragging() ? 0 : 1,
      }),
    }),
    []
  );
  return (
    <div
      // @ts-ignore
      ref={dragRef}
      className={clsx(
        'w-full flex h-full flex-1 flex-col group',
        'relative',
        state === 'ERROR' && 'rounded-[10px] ring-2 ring-red-500'
      )}
      style={{
        opacity,
      }}
    >
      {state === 'ERROR' && (
        <div
          className="absolute -top-[6px] -left-[6px] z-20 w-[18px] h-[18px] rounded-full bg-red-500 flex items-center justify-center text-white text-[11px] font-bold cursor-pointer"
          data-tooltip-id="tooltip"
          data-tooltip-content={post.error || 'An error occurred while publishing this post'}
        >
          !
        </div>
      )}
      <div
        className={clsx(
          'text-white text-[11px] max-h-[24px] h-[24px] min-h-[24px] w-full rounded-tr-[10px] rounded-tl-[10px] flex items-center justify-center gap-[10px] px-[5px] bg-btnPrimary'
        )}
        style={{
          backgroundColor: post?.tags?.[0]?.tag?.color,
        }}
      >
        <div
          className={clsx(
            post?.tags?.[0]?.tag?.color ? 'mix-blend-difference' : '',
            'group-hover:hidden cursor-pointer'
          )}
        >
          {post.tags.map((p) => p.tag.name).join(', ')}
        </div>
        {copyDebugJson && (
          <div
            className={clsx(
              'hidden group-hover:block hover:underline cursor-pointer',
              post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
            )}
            onClick={copyDebugJson}
          >
            <CopyDebug />
          </div>
        )}
        <div
          className={clsx(
            'hidden group-hover:block hover:underline cursor-pointer',
            post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
          )}
          onClick={duplicatePost}
        >
          <Duplicate />
        </div>
        <div
          className={clsx(
            'hidden group-hover:block hover:underline cursor-pointer',
            post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
          )}
          onClick={preview}
        >
          <Preview />
        </div>{' '}
        {((post.integration.providerIdentifier === 'x' && disableXAnalytics) || !post.releaseId) ? (
          <></>
        ) : post.releaseId === 'missing' && missingRelease ? (
          <div
            className={clsx(
              'hidden group-hover:block hover:underline cursor-pointer',
              post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
            )}
            onClick={missingRelease}
          >
            <Statistics />
          </div>
        ) : post.releaseId !== 'missing' ? (
          <div
            className={clsx(
              'hidden group-hover:block hover:underline cursor-pointer',
              post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
            )}
            onClick={statistics}
          >
            <Statistics />
          </div>
        ) : (
          <></>
        )}{' '}
        <div
          className={clsx(
            'hidden group-hover:block hover:underline cursor-pointer',
            post?.tags?.[0]?.tag?.color && 'mix-blend-difference'
          )}
          onClick={deletePost}
        >
          <DeletePost />
        </div>
      </div>
      <div
        onClick={editPost}
        className={clsx(
          'gap-[5px] w-full flex h-full flex-1 rounded-br-[10px] rounded-bl-[10px] p-[8px] text-[14px] bg-newColColor',
          'relative',
          isBeforeNow && '!grayscale'
        )}
      >
        <div className={clsx('relative min-w-[20px]')}>
          <img
            className="w-[20px] h-[20px] rounded-[8px]"
            src={post.integration.picture! || '/no-picture.jpg'}
          />
          <img
            className="w-[12px] h-[12px] rounded-[8px] absolute z-10 top-[10px] end-0 border border-fifth"
            src={`/icons/platforms/${post.integration?.providerIdentifier}.png`}
          />
        </div>
        <div className="w-full flex-1 flex flex-col min-h-[40px]">
          <div className="text-start">
            {state === 'DRAFT' ? t('draft', 'Draft') + ': ' : ''}
          </div>
            <div className="w-full relative">
              <div className="absolute top-0 start-0 w-full text-ellipsis break-words line-clamp-1 text-start">
                {stripHtmlValidation('none', post.content, false, true, false) ||
                  t('no_content', 'no content')}
              </div>
            </div>
        </div>
        {showTime && (
          <div className="text-textColor/50 text-[12px] whitespace-nowrap flex items-center">
            {newDayjs(post.publishDate).local().format(isUSCitizen() ? 'hh:mm A' : 'HH:mm')}
          </div>
        )}
      </div>
    </div>
  );
});
