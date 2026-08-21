import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCopilotContext, useCopilotReadable } from '@copilotkit/react-core';
import AutoResizingTextarea from '@gitroom/frontend/components/agents/agent.textarea';
import { useChatContext, InputProps } from '@copilotkit/react-ui';
import { useSearchParams } from 'next/navigation';
const MAX_NEWLINES = 6;

export const Input = ({
  inProgress,
  onSend,
  isVisible = false,
  onStop,
  onUpload,
  hideStopButton = false,
  onChange,
}: InputProps & { onChange: (value: string) => void }) => {
  const context = useChatContext();
  const copilotContext = useCopilotContext();
  const searchParams = useSearchParams();
  const showPoweredBy = !copilotContext.copilotApiConfig?.publicApiKey;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hydratedPromptRef = useRef<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  const handleDivClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    // If the user clicked a button or inside a button, don't focus the textarea
    if (target.closest('button')) return;

    // If the user clicked the textarea, do nothing (it's already focused)
    if (target.tagName === 'TEXTAREA') return;

    // Otherwise, focus the textarea
    textareaRef.current?.focus();
  };

  const [text, setText] = useState('');

  useEffect(() => {
    const initialPrompt = searchParams.get('prompt');
    if (!initialPrompt || text || hydratedPromptRef.current === initialPrompt) return;
    hydratedPromptRef.current = initialPrompt;
    setText(initialPrompt);
    onChange(initialPrompt);
  }, [onChange, searchParams, text]);
  const send = () => {
    if (inProgress) return;
    const sentText = text;
    // Preserve the prompt until the transport accepts it so transient errors
    // do not silently discard what the user just wrote.
    void Promise.resolve(onSend(sentText))
      .then(() => {
        setText((current) => (current === sentText ? '' : current));
      })
      .catch(() => {
        textareaRef.current?.focus();
      });

    textareaRef.current?.focus();
  };

  const isInProgress = inProgress;
  const buttonIcon =
    isInProgress && !hideStopButton
      ? context.icons.stopIcon
      : context.icons.sendIcon;

  // No LangGraph-specific interrupt gating here: the Studio agent is
  // Mastra-based, never LangGraph, so `langGraphInterruptAction` (removed
  // from CopilotContextParams entirely in @copilotkit/react-core 1.60) was
  // always undefined in practice.
  const canSend = useMemo(() => {
    return !isInProgress && text.trim().length > 0;
  }, [isInProgress, text]);

  const canStop = useMemo(() => {
    return isInProgress && !hideStopButton;
  }, [isInProgress, hideStopButton]);

  const sendDisabled = !canSend && !canStop;

  return (
    <div
      className={`copilotKitInputContainer ${
        showPoweredBy ? 'poweredByContainer' : ''
      }`}
    >
      <div className="copilotKitInput" onClick={handleDivClick}>
        <AutoResizingTextarea
          ref={textareaRef}
          placeholder={context.labels.placeholder}
          autoFocus={false}
          maxRows={MAX_NEWLINES}
          value={text}
          onChange={(event) => {
            onChange(event.target.value);
            setText(event.target.value);
          }}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
              event.preventDefault();
              if (canSend) {
                send();
              }
            }
          }}
        />
        <div className="copilotKitInputControls">
          {onUpload && (
            <button onClick={onUpload} className="copilotKitInputControlButton">
              {context.icons.uploadIcon}
            </button>
          )}

          <div style={{ flexGrow: 1 }} />
          <button
            disabled={sendDisabled}
            onClick={isInProgress && !hideStopButton ? onStop : send}
            data-copilotkit-in-progress={inProgress}
            data-test-id={
              inProgress
                ? 'copilot-chat-request-in-progress'
                : 'copilot-chat-ready'
            }
            className="copilotKitInputControlButton"
          >
            {buttonIcon}
          </button>
        </div>
      </div>
    </div>
  );
};
