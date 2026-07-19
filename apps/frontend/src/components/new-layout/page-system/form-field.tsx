'use client';

import {
  FC,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import clsx from 'clsx';

const controlClass =
  'w-full bg-newBgColorInner border border-newTableBorder rounded-[10px] px-[12px] py-[10px] text-[13px] text-newTextColor placeholder:text-textItemBlur outline-none focus:border-btnPrimary transition-colors disabled:opacity-50';

export const FormField: FC<{
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}> = ({ label, hint, required, children, className }) => {
  return (
    <label className={clsx('flex flex-col gap-[6px]', className)}>
      <span className="text-[12px] font-[600] text-newTextColor">
        {label}
        {required ? (
          <span className="text-textItemBlur font-normal"> *</span>
        ) : null}
      </span>
      {children}
      {hint ? (
        <span className="text-[11px] text-textItemBlur">{hint}</span>
      ) : null}
    </label>
  );
};

export const FormInput: FC<
  InputHTMLAttributes<HTMLInputElement> & { className?: string }
> = ({ className, ...props }) => {
  return <input {...props} className={clsx(controlClass, className)} />;
};

export const FormTextarea: FC<
  TextareaHTMLAttributes<HTMLTextAreaElement> & { className?: string }
> = ({ className, ...props }) => {
  return (
    <textarea
      {...props}
      className={clsx(controlClass, 'resize-y min-h-[88px]', className)}
    />
  );
};

export const FormSelect: FC<
  SelectHTMLAttributes<HTMLSelectElement> & { className?: string }
> = ({ className, children, ...props }) => {
  return (
    <select {...props} className={clsx(controlClass, className)}>
      {children}
    </select>
  );
};

export { controlClass as formControlClass };
