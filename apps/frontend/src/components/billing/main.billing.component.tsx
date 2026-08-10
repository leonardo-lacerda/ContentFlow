'use client';

import React, { FC, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@gitroom/react/form/button';
import { useFetch } from '@gitroom/helpers/utils/custom.fetch';
import { Subscription } from '@prisma/client';
import { useDebouncedCallback } from 'use-debounce';
import ReactLoading from '@gitroom/frontend/components/layout/loading';
import { deleteDialog } from '@gitroom/react/helpers/delete.dialog';
import { useToaster } from '@gitroom/react/toaster/toaster';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { pricing } from '@gitroom/nestjs-libraries/database/prisma/subscriptions/pricing';
import { FAQComponent } from '@gitroom/frontend/components/billing/faq.component';
import { useSWRConfig } from 'swr';
import { useUser } from '@gitroom/frontend/components/layout/user.context';
import { useSearchParams } from 'next/navigation';
import { useVariables } from '@gitroom/react/helpers/variable.context';
import { useModals } from '@gitroom/frontend/components/layout/new-modal';
import { Textarea } from '@gitroom/react/form/textarea';
import { useFireEvents } from '@gitroom/helpers/utils/use.fire.events';
import { useUtmUrl } from '@gitroom/helpers/utils/utm.saver';
import { useTrack } from '@gitroom/react/helpers/use.track';
import { TrackEnum } from '@gitroom/nestjs-libraries/user/track.enum';
import { useT } from '@gitroom/react/translation/get.transation.service.client';
import { FinishTrial } from '@gitroom/frontend/components/billing/finish.trial';
import { newDayjs } from '@gitroom/frontend/components/layout/set.timezone';
import { useDubClickId } from '@gitroom/frontend/components/layout/dubAnalytics';
import { LogoutComponent } from '@gitroom/frontend/components/layout/logout.component';

const dispFont = { fontFamily: "'Anton', sans-serif" };
const monoFont = { fontFamily: "'Space Mono', ui-monospace, monospace" };

export const Prorate: FC<{
  period: 'MONTHLY' | 'YEARLY';
  pack: 'STANDARD' | 'PRO' | 'TEAM';
}> = (props) => {
  const { period, pack } = props;
  const t = useT();
  const fetch = useFetch();
  const [price, setPrice] = useState<number | false>(0);
  const [loading, setLoading] = useState(false);
  const calculatePrice = useDebouncedCallback(async () => {
    setLoading(true);
    setPrice(
      (
        await (
          await fetch('/billing/prorate', {
            method: 'POST',
            body: JSON.stringify({
              period,
              billing: pack,
            }),
          })
        ).json()
      ).price
    );
    setLoading(false);
  }, 500);
  useEffect(() => {
    setPrice(false);
    calculatePrice();
  }, [period, pack]);
  if (loading) {
    return (
      <div className="pt-[12px]">
        <ReactLoading type="spin" color="#fff" width={20} height={20} />
      </div>
    );
  }
  if (price === false) {
    return null;
  }
  return (
    <div className="text-[12px] flex pt-[12px]">
      ({t('pay_today', 'Pay Today')} ${(price < 0 ? 0 : price)?.toFixed(1)})
    </div>
  );
};
export const Features: FC<{
  pack: 'FREE' | 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE';
  inverted?: boolean;
}> = (props) => {
  const { pack, inverted } = props;
  const features = useMemo(() => {
    const currentPricing = pricing[pack];
    const channelsOr = currentPricing.channel;
    const list: string[] = [];
    list.push(
      `${channelsOr} ${channelsOr === 1 ? 'canal social' : 'canais sociais'}`
    );
    list.push(
      `${currentPricing.brand_profiles} marca (Brand DNA)`
    );
    list.push(
      `${currentPricing.carousel_generations_per_month} carrosséis / mês`
    );
    list.push(
      `${currentPricing.content_ideas_per_month} ideias / mês`
    );
    if ((currentPricing as any).ad_kits_per_month != null) {
      list.push(
        `${(currentPricing as any).ad_kits_per_month} kits de anúncio / mês`
      );
    }
    if ((currentPricing as any).email_campaigns_per_month != null) {
      list.push(
        `${(currentPricing as any).email_campaigns_per_month} campanhas de e-mail / mês`
      );
    }
    if ((currentPricing as any).video_scripts_per_month != null) {
      list.push(
        `${(currentPricing as any).video_scripts_per_month} roteiros de vídeo / mês`
      );
    }
    list.push(
      `${
        currentPricing.posts_per_month > 10000
          ? 'Ilimitados'
          : currentPricing.posts_per_month
      } posts agendados / mês`
    );
    if (currentPricing?.image_generator) {
      list.push(
        `${currentPricing?.image_generation_count} imagens IA / mês`
      );
    }
    list.push(
      `${currentPricing.dna_extractions_per_month} análises de DNA / mês`
    );
    return list;
  }, [pack]);
  return (
    <ul className="flex-1 flex flex-col gap-[11px] justify-center text-[14px] font-[600] list-none">
      {features.map((feature) => (
        <li key={feature} className="flex gap-[11px] items-start">
          <span
            className={clsx(
              'shrink-0 mt-[1px] w-[22px] h-[22px] rounded-[6px] border-[1.5px] grid place-items-center text-[11px] font-[900]',
              inverted
                ? 'bg-[#C6F24E]/[0.18] border-white/40 text-[#C6F24E]'
                : 'bg-[#D6F5E8] border-[#14171A] text-[#0FB37B]'
            )}
          >
            ✓
          </span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
};

const Accept: FC<{ resolve: (res: boolean) => void }> = ({ resolve }) => {
  const [loading, setLoading] = useState(false);
  const fetch = useFetch();
  const toaster = useToaster();

  const apply = useCallback(async () => {
    setLoading(true);
    await fetch('/billing/apply-discount', {
      method: 'POST',
    });

    resolve(true);
    toaster.show('50% discount applied successfully');
  }, []);

  return (
    <div>
      <div className="mb-[20px]">
        Would you accept 50% discount for 3 months instead? 🙏🏻
      </div>
      <div className="flex gap-[10px]">
        <Button loading={loading} onClick={apply}>
          Apply 50% discount for 3 months
        </Button>
        <Button onClick={() => resolve(false)} className="!bg-red-800">
          Cancel my subscription
        </Button>
      </div>
    </div>
  );
};
const Info: FC<{
  proceed: (feedback: string) => void;
}> = (props) => {
  const [feedback, setFeedback] = useState('');
  const modal = useModals();
  const events = useFireEvents();
  const cancel = useCallback(() => {
    props.proceed(feedback);
    events('cancel_subscription');
    modal.closeAll();
  }, [modal, feedback]);

  const t = useT();

  return (
    <div className="relative flex gap-[20px] flex-col flex-1 rounded-[4px]">
      <div>
        {t(
          'would_you_mind_shortly_tell_us_what_we_could_have_done_better',
          'Would you mind shortly tell us what we could have done better?'
        )}
      </div>
      <div>
        <Textarea
          className="bg-newBgColorInner"
          label={'Feedback'}
          name="feedback"
          disableForm={true}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </div>
      <div>
        <Button disabled={feedback.length < 20} onClick={cancel}>
          {feedback.length < 20
            ? t('please_add_at_least', 'Please add at least 20 chars')
            : t('cancel_subscription', 'Cancel Subscription')}
        </Button>
      </div>
    </div>
  );
};

const billingDisplayName = (name: string) => {
  if (name === 'FREE') {
    return 'Início';
  }
  if (name === 'STANDARD') {
    return 'Starter';
  }
  if (name === 'TEAM') {
    return 'Pro';
  }
  if (name === 'ULTIMATE') {
    return 'Scale';
  }
  return name.charAt(0) + name.slice(1).toLowerCase();
};

const planTagline = (name: string) => {
  if (name === 'STANDARD') return 'Pra criar o hábito de postar toda semana';
  if (name === 'TEAM') return 'Pra quem publica sempre e quer escalar';
  if (name === 'ULTIMATE') return 'Pra agências e times sem limite de ritmo';
  return '';
};

const MainBillingContent: FC<{
  sub?: Subscription;
}> = (props) => {
  const { sub } = props;
  const { isGeneral } = useVariables();
  const { mutate } = useSWRConfig();
  const fetch = useFetch();
  const toast = useToaster();
  const user = useUser();
  const dub = useDubClickId();
  const modal = useModals();
  const utm = useUtmUrl();
  const track = useTrack();
  const t = useT();
  const queryParams = useSearchParams();
  const [finishTrial, setFinishTrial] = useState(
    !!queryParams.get('finishTrial')
  );

  const [subscription, setSubscription] = useState<Subscription | undefined>(
    sub
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY'>(
    subscription?.period || 'MONTHLY'
  );
  const [monthlyOrYearly, setMonthlyOrYearly] = useState<'on' | 'off'>(
    period === 'MONTHLY' ? 'off' : 'on'
  );
  const [initialChannels, setInitialChannels] = useState(
    sub?.totalChannels || 1
  );
  useEffect(() => {
    if (initialChannels !== sub?.totalChannels) {
      setInitialChannels(sub?.totalChannels || 1);
    }
    if (period !== sub?.period) {
      setPeriod(sub?.period || 'MONTHLY');
      setMonthlyOrYearly(
        (sub?.period || 'MONTHLY') === 'MONTHLY' ? 'off' : 'on'
      );
    }
    setSubscription(sub);
  }, [sub]);
  const updatePayment = useCallback(async () => {
    const { portal } = await (await fetch('/billing/portal')).json();
    window.location.href = portal;
  }, []);
  const currentPackage = useMemo(() => {
    if (!subscription) {
      return 'FREE';
    }
    if (period === 'YEARLY' && monthlyOrYearly === 'off') {
      return '';
    }
    if (period === 'MONTHLY' && monthlyOrYearly === 'on') {
      return '';
    }
    return subscription?.subscriptionTier;
  }, [subscription, initialChannels, monthlyOrYearly, period]);
  const moveToCheckout = useCallback(
    (billing: 'STANDARD' | 'PRO' | 'TEAM' | 'ULTIMATE' | 'FREE', reactivate = false) =>
      async () => {
        if (reactivate) {
          setLoading(true);
          const { cancel_at } = await (
            await fetch('/billing/cancel', {
              method: 'POST',
              body: JSON.stringify({
                feedback: '',
              }),
              headers: {
                'Content-Type': 'application/json',
              },
            })
          ).json();
          setSubscription((subs) => ({
            ...subs!,
            cancelAt: cancel_at,
          }));

          toast.show('Subscription reactivated successfully');
          setLoading(false);
          return;
        }

        const messages = [];
        if (
          !pricing[billing].team_members &&
          pricing[subscription?.subscriptionTier!]?.team_members
        ) {
          messages.push(
            `Your team members will be removed from your organization`
          );
        }
        if (billing === 'FREE') {
          if (
            subscription?.cancelAt ||
            (await deleteDialog(
              `Are you sure you want to cancel your subscription?
              ${messages.join(', ')}`,
              'Yes, cancel',
              'Cancel Subscription'
            ))
          ) {
            const checkDiscount = await (
              await fetch('/billing/check-discount')
            ).json();
            if (checkDiscount.offerCoupon) {
              const info = await new Promise((res) => {
                modal.openModal({
                  title: 'Before you cancel',
                  withCloseButton: true,
                  classNames: {
                    modal: 'bg-transparent text-textColor',
                  },
                  children: <Accept resolve={res} />,
                });
              });

              modal.closeAll();

              if (info) {
                return;
              }
            }

            const info = await new Promise((res) => {
              modal.openModal({
                title: t(
                  'we_are_sorry_to_see_you_go',
                  'We are sorry to see you go :('
                ),
                withCloseButton: true,
                classNames: {
                  modal: 'bg-transparent text-textColor',
                },
                children: <Info proceed={(e) => res(e)} />,
              });
            });

            setLoading(true);
            const { cancel_at } = await (
              await fetch('/billing/cancel', {
                method: 'POST',
                body: JSON.stringify({
                  feedback: info,
                }),
                headers: {
                  'Content-Type': 'application/json',
                },
              })
            ).json();
            setSubscription((subs) => ({
              ...subs!,
              cancelAt: cancel_at,
            }));
            if (cancel_at)
              toast.show('Subscription set to canceled successfully');
            setLoading(false);
          }
          return;
        }
        if (
          messages.length &&
          !(await deleteDialog(messages.join(', '), 'Yes, continue'))
        ) {
          return;
        }
        setLoading(true);
        const { url, portal } = await (
          await fetch('/billing/subscribe', {
            method: 'POST',
            body: JSON.stringify({
              period: monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY',
              utm,
              billing,
              ...(dub ? { dub } : {}),
            }),
          })
        ).json();
        if (url) {
          await track(TrackEnum.InitiateCheckout, {
            value:
              pricing[billing][
                monthlyOrYearly === 'on' ? 'year_price' : 'month_price'
              ],
          });
          window.location.href = url;
          return;
        }
        if (portal) {
          if (
            await deleteDialog(
              'We could not charge your credit card, please update your payment method',
              'Update',
              'Payment Method Required'
            )
          ) {
            window.open(portal);
          }
        } else {
          setPeriod(monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY');
          setSubscription((subs) => ({
            ...subs!,
            subscriptionTier: billing,
            cancelAt: null,
          }));
          mutate(
            '/user/self',
            {
              ...user,
              tier: billing,
            },
            {
              revalidate: false,
            }
          );
          toast.show('Subscription updated successfully');
        }
        setLoading(false);
      },
    [monthlyOrYearly, subscription, user, utm]
  );
  return (
    <div className="flex flex-col gap-[28px] text-[#14171A]">
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <div>
          <div
            className="uppercase leading-none"
            style={{ ...dispFont, fontSize: '30px', letterSpacing: '.5px' }}
          >
            {t('plans', 'Meu Plano')}
          </div>
          <div className="text-[14px] font-[600] text-[#14171A]/60 mt-[8px]">
            Escolha o plano ideal para o seu ritmo de criação.
          </div>
        </div>
        <div className="flex items-center gap-[2px] border-[1.5px] border-[#14171A] rounded-full p-[4px] bg-white shadow-[3px_3px_0_#14171A]">
          <button
            type="button"
            onClick={() => setMonthlyOrYearly('off')}
            className={clsx(
              'px-[16px] py-[8px] rounded-full text-[12px] font-[800] transition-colors',
              monthlyOrYearly === 'off'
                ? 'bg-[#14171A] text-[#EEF1EA]'
                : 'text-[#14171A]/55'
            )}
          >
            {t('monthly', 'Mensal')}
          </button>
          <button
            type="button"
            onClick={() => setMonthlyOrYearly('on')}
            className={clsx(
              'px-[16px] py-[8px] rounded-full text-[12px] font-[800] transition-colors',
              monthlyOrYearly === 'on'
                ? 'bg-[#14171A] text-[#EEF1EA]'
                : 'text-[#14171A]/55'
            )}
          >
            {t('yearly', 'Anual')}
          </button>
        </div>
      </div>

      {finishTrial && <FinishTrial close={() => setFinishTrial(false)} />}
      {/* FREE plan banner */}
      {!subscription && (
        <div className="rounded-[14px] border-2 border-dashed border-[#14171A] bg-white px-[20px] py-[16px] flex items-center gap-[14px]">
          <span className="w-[10px] h-[10px] rotate-45 bg-[#FF5A3C] border-[1.5px] border-[#14171A] shrink-0" />
          <div className="text-[14px] font-[600]">
            Você está no plano <b className="uppercase">Início (FREE)</b> —
            faça upgrade para desbloquear mais gerações, canais e recursos.
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[28px] items-stretch pt-[6px]">
        {Object.entries(pricing)
          .filter(([name]) =>
            // ContentFlow v1: 3 planos pagos na vitrine
            ['STANDARD', 'TEAM', 'ULTIMATE'].includes(name)
          )
          .map(([name, values]) => {
            const isCurrent = currentPackage === name.toUpperCase();
            const isPopular = name === 'TEAM';
            return (
              <div
                key={name}
                className={clsx(
                  'relative flex flex-col rounded-[16px] border-2 border-[#14171A] p-[32px] transition-all duration-200',
                  isPopular
                    ? 'bg-[#14171A] text-[#EEF1EA] shadow-[10px_10px_0_#2E62FF] hover:-translate-y-[7px]'
                    : 'bg-white text-[#14171A] shadow-[6px_6px_0_#14171A] hover:-translate-y-[5px] hover:shadow-[8px_8px_0_#14171A]'
                )}
              >
                {isPopular && (
                  <span
                    className="absolute -top-[16px] right-[24px] bg-[#C6F24E] text-[#14171A] border-2 border-[#14171A] px-[14px] py-[7px] rounded-full rotate-3 shadow-[3px_3px_0_#14171A] text-[11px] font-[800] uppercase tracking-[.06em]"
                    style={monoFont}
                  >
                    ★ mais assinado
                  </span>
                )}
                {isCurrent && (
                  <span
                    className="absolute -top-[14px] left-[24px] bg-[#FF5A3C] text-white border-2 border-[#14171A] px-[14px] py-[7px] rounded-full -rotate-3 shadow-[3px_3px_0_#14171A] text-[11px] font-[800] uppercase tracking-[.04em]"
                    style={monoFont}
                  >
                    seu plano
                  </span>
                )}
                <div
                  className="uppercase leading-none"
                  style={{ ...dispFont, fontSize: '27px', letterSpacing: '.5px' }}
                >
                  {billingDisplayName(name)}
                </div>
                <div
                  className={clsx(
                    'mt-[8px] text-[13px] font-[600]',
                    isPopular ? 'text-[#EEF1EA]/70' : 'text-[#14171A]/60'
                  )}
                >
                  {planTagline(name)}
                </div>
                <div className="flex items-baseline gap-[8px] mt-[22px] mb-[4px]">
                  <span
                    className={clsx('uppercase', isPopular && 'text-[#C6F24E]')}
                    style={{ ...dispFont, fontSize: '40px', lineHeight: 1 }}
                  >
                    R$
                    {monthlyOrYearly === 'on'
                      ? values.year_price
                      : values.month_price}
                  </span>
                  <span
                    className={clsx(
                      'text-[11px] font-[700]',
                      isPopular ? 'text-[#EEF1EA]/70' : 'text-[#14171A]/55'
                    )}
                    style={monoFont}
                  >
                    {monthlyOrYearly === 'on' ? '/ano' : '/mês'}
                  </span>
                </div>
                <div className="flex flex-col gap-[6px] mt-[16px] mb-[8px]">
                  {currentPackage === name.toUpperCase() &&
                  subscription?.cancelAt ? (
                    <Button
                      onClick={moveToCheckout('FREE', true)}
                      loading={loading}
                      className="!rounded-full !border-2 !border-[#14171A] !bg-[#C6F24E] !text-[#14171A] !shadow-[3px_3px_0_#14171A] hover:!shadow-[5px_5px_0_#14171A] hover:!-translate-y-[2px] !font-[800]"
                    >
                      {t('reactivate_subscription', 'Reactivate subscription')}
                    </Button>
                  ) : (
                    <Button
                      loading={loading}
                      disabled={
                        (!!subscription?.cancelAt &&
                          name.toUpperCase() === 'FREE') ||
                        isCurrent
                      }
                      className={clsx(
                        '!rounded-full !border-2 !border-[#14171A] !font-[800] !shadow-[3px_3px_0_#14171A] hover:!shadow-[5px_5px_0_#14171A] hover:!-translate-y-[2px]',
                        isCurrent
                          ? isPopular
                            ? '!bg-transparent !text-[#EEF1EA] !border-[#EEF1EA]/40 !shadow-none hover:!shadow-none hover:!translate-y-0'
                            : '!bg-white !text-[#14171A]/50 !shadow-none hover:!shadow-none hover:!translate-y-0'
                          : subscription && name.toUpperCase() === 'FREE'
                          ? '!bg-[#FF5A3C] !text-white'
                          : isPopular
                          ? '!bg-[#C6F24E] !text-[#14171A]'
                          : '!bg-[#14171A] !text-[#EEF1EA]'
                      )}
                      onClick={moveToCheckout(
                        name.toUpperCase() as
                          | 'STANDARD'
                          | 'PRO'
                          | 'TEAM'
                          | 'ULTIMATE'
                      )}
                    >
                      {isCurrent
                        ? 'Plano atual'
                        : name.toUpperCase() === 'FREE'
                        ? subscription?.cancelAt
                          ? `Downgrade on ${dayjs
                              .utc(subscription?.cancelAt)
                              .local()
                              .format('D MMM, YYYY')}`
                          : 'Cancelar assinatura'
                        : // @ts-ignore
                        (user?.tier === 'FREE' ||
                            user?.tier?.current === 'FREE') &&
                          user.allowTrial
                        ? t(
                            'start_7_days_free_trial',
                            'Start 7 days free trial'
                          )
                        : `Escolher ${billingDisplayName(name)}`}
                    </Button>
                  )}
                  {subscription &&
                    !isCurrent &&
                    name !== 'FREE' &&
                    !!name && (
                      <Prorate
                        period={
                          monthlyOrYearly === 'on' ? 'YEARLY' : 'MONTHLY'
                        }
                        pack={name.toUpperCase() as 'STANDARD' | 'PRO' | 'TEAM'}
                      />
                    )}
                </div>
                <div
                  className={clsx(
                    'border-t pt-[16px] mt-[6px]',
                    isPopular ? 'border-white/15' : 'border-[#14171A]/12'
                  )}
                >
                  <Features
                    pack={
                      name.toUpperCase() as
                        | 'FREE'
                        | 'STANDARD'
                        | 'PRO'
                        | 'TEAM'
                        | 'ULTIMATE'
                    }
                    inverted={isPopular}
                  />
                </div>
              </div>
            );
          })}
      </div>
      {!!subscription?.id && (
        <div className="flex flex-wrap justify-center gap-[12px] border-2 border-[#14171A] rounded-[14px] bg-white p-[18px]">
          <Button
            className="!rounded-full !border-2 !border-[#14171A] !bg-white !text-[#14171A] !font-[800] !shadow-[3px_3px_0_#14171A] hover:!shadow-[5px_5px_0_#14171A] hover:!-translate-y-[2px]"
            onClick={updatePayment}
          >
            {t(
              'update_payment_method_invoices_history',
              'Update Payment Method / Invoices History'
            )}
          </Button>
          {isGeneral && !subscription?.cancelAt && (
            <Button
              className="!rounded-full !border-2 !border-[#14171A] !bg-[#FF5A3C] !text-white !font-[800] !shadow-[3px_3px_0_#14171A] hover:!shadow-[5px_5px_0_#14171A] hover:!-translate-y-[2px]"
              loading={loading}
              onClick={moveToCheckout('FREE')}
            >
              {t('cancel_subscription_1', 'Cancel subscription')}
            </Button>
          )}
        </div>
      )}
      {subscription?.cancelAt && isGeneral && (
        <div className="text-center text-[13px] font-[600] text-[#14171A]/70">
          {t(
            'your_subscription_will_be_canceled_at',
            'Your subscription will be canceled at'
          )}{' '}
          <span className="text-[#14171A] font-[800]">
            {newDayjs(subscription.cancelAt).local().format('D MMM, YYYY')}
          </span>
          <br />
          {t(
            'you_will_never_be_charged_again',
            'You will never be charged again'
          )}
        </div>
      )}
      <FAQComponent />
      <div className="flex justify-center border-t-2 border-[#14171A]/15 pt-[24px]">
        <LogoutComponent />
      </div>
    </div>
  );
};

export const MainBillingComponent: FC<{
  sub?: Subscription;
}> = (props) => {
  return (
    <Suspense fallback={null}>
      <MainBillingContent {...props} />
    </Suspense>
  );
};
