import {
  ClientInformation,
  PostDetails,
  PostResponse,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { MastodonProvider } from '@gitroom/nestjs-libraries/integrations/social/mastodon.provider';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { Integration } from '@prisma/client';
import { ssrfSafeDispatcher } from '@gitroom/nestjs-libraries/dtos/webhooks/ssrf.safe.dispatcher';

export class MastodonCustomProvider extends MastodonProvider {
  override identifier = 'mastodon-custom';
  override name = 'M. Instance';
  override maxConcurrentJob = 5; // Custom Mastodon instances typically have generous limits
  editor = 'normal' as const;

  async externalUrl(url: string) {
    // `url` is the raw `externalUrl` query param from the auth-start route
    // (integrations.controller.ts /social/:integration) — fully
    // attacker-controlled, so it goes through the same instance-URL guard
    // every other dynamic Mastodon fetch uses.
    await this.assertSafeInstanceUrl(url);

    const form = new FormData();
    form.append('client_name', 'ContentFlow');
    form.append(
      'redirect_uris',
      `${process.env.FRONTEND_URL}/integrations/social/mastodon`
    );
    form.append('scopes', this.scopes.join(' '));
    form.append('website', process.env.FRONTEND_URL!);
    const { client_id, client_secret, ...all } = await (
      await fetch(url + '/api/v1/apps', {
        method: 'POST',
        body: form,
        // @ts-expect-error undici dispatcher is supported by the runtime fetch implementation.
        dispatcher: ssrfSafeDispatcher,
      })
    ).json();

    return {
      client_id,
      client_secret,
    };
  }
  override async generateAuthUrl(
    refresh?: string,
    external?: ClientInformation
  ) {
    const state = makeId(32);
    const url = this.generateUrlDynamic(
      external?.instanceUrl!,
      state,
      external?.client_id!,
      process.env.FRONTEND_URL!,
      refresh
    );

    return {
      url,
      codeVerifier: makeId(48),
      state,
    };
  }

  override async authenticate(
    params: {
      code: string;
      codeVerifier: string;
      refresh?: string;
    },
    clientInformation?: ClientInformation
  ) {
    return this.dynamicAuthenticate(
      clientInformation?.client_id!,
      clientInformation?.client_secret!,
      clientInformation?.instanceUrl!,
      params.code
    );
  }

  override async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[]
  ): Promise<PostResponse[]> {
    return this.dynamicPost(
      id,
      accessToken,
      process.env.MASTODON_URL || 'https://mastodon.social',
      postDetails
    );
  }

  override async comment(
    id: string,
    postId: string,
    lastCommentId: string | undefined,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    return this.dynamicComment(
      id,
      postId,
      lastCommentId,
      accessToken,
      process.env.MASTODON_URL || 'https://mastodon.social',
      postDetails
    );
  }
}
